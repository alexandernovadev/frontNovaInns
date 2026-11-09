import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { TrackerService } from '../../core/services/tracker.service';
import { AssistantService, ChatMessage } from '../../core/services/assistant.service';
import { ApartmentsService } from '../../core/services/apartments.service';
import { renderRich } from '../nova-ai/rich-text';
import { BookingDetailModal, BookingCardQuery } from '../../shared/components/booking-detail-modal';
import { CurrencyCopPipe } from '../../shared/pipes/currency-cop.pipe';
import { isHoliday } from '../../shared/constants/holidays.constant';
import { prettyDate } from '../../shared/utils/pretty-date';
import {
  LucideAngularModule,
  AlertTriangle,
  ArrowUpDown,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  ExternalLink,
  MapPin,
  Radar,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from 'lucide-angular';

const STORAGE_KEY = 'nova_tracker_snapshots_v1';
const CATALOG_KEY = 'nova_tracker_catalog_v1';
const MAX_SNAPSHOTS = 120;

export interface CatalogEntry {
  slug: string;
  name: string;
  url: string;
  image?: string;
  distance: string;
  score?: number | null;
  reviewLabel?: string;
  reviewsCount?: number | null;
  unitType?: string;
  unitConfig?: string;
  beds?: string;
  lastRoom: string;
  lastPrice: number | null;
  lastTaxes: number | null;
  lastTaxesIncluded: boolean;
  lastTotal: number | null;
  lastSeenAt: string;
  firstSeenAt: string;
}

export interface BookingItem {
  name: string;
  url: string;
  slug: string;
  image?: string;
  distance: string;
  score?: number | null;
  reviewLabel?: string;
  reviewsCount?: number | null;
  secondaryScore?: string;
  unitType?: string;
  unitConfig?: string;
  beds?: string;
  breakfastIncluded?: boolean;
  freeCancellation?: boolean;
  noPrepayment?: boolean;
  room: string;
  price: number | null;
  taxes: number | null;
  taxesIncluded: boolean;
  total: number | null;
}

export interface TrackerSnapshot {
  id: string;
  savedAt: string;
  searchKey: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  childAge: number;
  totalResults: number;
  results: BookingItem[];
}

export interface SnapshotDiff {
  previousAt: string;
  bookedOut: BookingItem[];
  newOnes: BookingItem[];
  priceChanges: {
    slug: string;
    name: string;
    previousTotal: number;
    currentTotal: number;
    delta: number;
  }[];
  bySlug: Record<
    string,
    { status: 'new' | 'up' | 'down' | 'same'; delta?: number; previousTotal?: number }
  >;
}

interface CalDay {
  day: number;
  iso: string;
  past: boolean;
  isToday: boolean;
  isStart: boolean;
  isEnd: boolean;
  inRange: boolean;
  holiday: string | null;
}

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

@Component({
  selector: 'app-tracker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, CurrencyCopPipe, LucideAngularModule, BookingDetailModal],
  templateUrl: './tracker.html',
  styleUrl: './tracker.css',
})
export class TrackerComponent implements OnInit {
  readonly Radar = Radar;
  readonly Search = Search;
  readonly CalendarDays = CalendarDays;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;
  readonly ExternalLink = ExternalLink;
  readonly AlertTriangle = AlertTriangle;
  readonly RefreshCw = RefreshCw;
  readonly Building2 = Building2;
  readonly MapPin = MapPin;
  readonly ArrowUpDown = ArrowUpDown;
  readonly Sparkles = Sparkles;
  readonly Send = Send;
  readonly X = X;
  readonly Clock = Clock;
  readonly Trash2 = Trash2;
  readonly Database = Database;

  readonly dayHeaders = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  readonly quickPrompts = [
    '¿Qué apartamentos míos están libres esas fechas y a qué precio competimos?',
    '¿Cuáles de Booking se reservaron o cambiaron de precio?',
    '¿Cómo está mi tarifa promedio frente a estos alojamientos?',
    'Top 5 más baratos con IVA incluido',
  ];

  private tracker = inject(TrackerService);
  private assistant = inject(AssistantService);
  private apartmentsService = inject(ApartmentsService);
  private host = inject(ElementRef<HTMLElement>);

  apartmentNames = signal<Record<string, string>>({});
  private richCache = new Map<string, string>();

  rich(text: string) {
    const apartments = this.apartmentNames();
    let html = this.richCache.get(text);
    if (html === undefined) {
      html = renderRich(text, apartments);
      this.richCache.set(text, html);
    }
    return html;
  }

  readonly today = this.isoDate(new Date());
  checkIn = this.isoDate(this.addDays(7));
  checkOut = this.isoDate(this.addDays(10));
  adults = 4;
  children = 1;
  childAge = 4;

  calendarOpen = signal<'checkIn' | 'checkOut' | null>(null);
  calendarMonth = signal(this.monthStart(this.checkIn));
  hoverDay = signal<string | null>(null);

  snapshots = signal<TrackerSnapshot[]>([]);
  catalog = signal<Record<string, CatalogEntry>>({});
  activeSnapshotId = signal<string | null>(null);
  bookingResults = signal<TrackerSnapshot | null>(null);
  showMissing = signal(true);

  loading = signal(false);
  error = signal<string | null>(null);
  sortBy = signal<'rank' | 'asc' | 'desc'>('rank');

  // ── Barrido día por día ──
  sweepRunning = signal(false);
  sweepProgress = signal<{
    current: number;
    total: number;
    date: string;
    foundLast: number;
  } | null>(null);
  private sweepCancel = false;

  // ── Burbuja de IA (usa NovaAI con acceso a MongoDB + contexto Tracker) ──
  chatOpen = signal(false);
  chatLoading = signal(false);
  chatInput = '';
  chatMessages = this.assistant.chat;

  // Diff automático entre la captura activa y la captura inmediatamente anterior
  // para las mismas fechas + huéspedes (o la anterior en el historial).
  diff = computed<SnapshotDiff | null>(() => {
    const current = this.bookingResults();
    if (!current) return null;
    const all = this.snapshots();
    const curIdx = all.findIndex((s) => s.id === current.id);
    const candidates = curIdx >= 0 ? all.slice(curIdx + 1) : all;
    const prev =
      candidates.find((s) => s.searchKey === current.searchKey) ??
      candidates.find(
        (s) => s.checkIn === current.checkIn && s.checkOut === current.checkOut,
      );
    if (!prev) return null;

    const prevMap = new Map<string, BookingItem>();
    for (const item of prev.results) {
      prevMap.set(this.keyOf(item), item);
    }
    const curMap = new Map<string, BookingItem>();
    for (const item of current.results) {
      curMap.set(this.keyOf(item), item);
    }

    const bookedOut: BookingItem[] = [];
    for (const [k, oldItem] of prevMap) {
      if (!curMap.has(k)) bookedOut.push(oldItem);
    }

    const newOnes: BookingItem[] = [];
    const priceChanges: SnapshotDiff['priceChanges'] = [];
    const bySlug: SnapshotDiff['bySlug'] = {};

    for (const [k, curItem] of curMap) {
      const oldItem = prevMap.get(k);
      if (!oldItem) {
        newOnes.push(curItem);
        bySlug[k] = { status: 'new' };
        continue;
      }
      if (oldItem.total != null && curItem.total != null && oldItem.total !== curItem.total) {
        const delta = curItem.total - oldItem.total;
        priceChanges.push({
          slug: k,
          name: curItem.name,
          previousTotal: oldItem.total,
          currentTotal: curItem.total,
          delta,
        });
        bySlug[k] = {
          status: delta > 0 ? 'up' : 'down',
          delta,
          previousTotal: oldItem.total,
        };
      } else {
        bySlug[k] = { status: 'same' };
      }
    }

    return {
      previousAt: prev.savedAt,
      bookedOut,
      newOnes,
      priceChanges,
      bySlug,
    };
  });

  // Alojamientos del catálogo maestro que NO aparecieron en el barrido actual
  // (reservados / sin cupo para estas fechas y huéspedes).
  missingFromCatalog = computed<CatalogEntry[]>(() => {
    const current = this.bookingResults();
    if (!current) return [];
    const present = new Set(current.results.map((r) => this.keyOf(r)));
    return Object.values(this.catalog())
      .filter((entry) => !present.has(entry.slug))
      .sort((a, b) => (a.lastTotal ?? 0) - (b.lastTotal ?? 0));
  });

  catalogSize = computed(() => Object.keys(this.catalog()).length);

  ngOnInit() {
    this.loadCatalog();
    this.loadSnapshots();
    this.apartmentsService.findAll().subscribe({
      next: (res) => {
        this.richCache.clear();
        this.apartmentNames.set(
          Object.fromEntries(res.data.map((a) => [a._id, a.internalName])),
        );
      },
      error: () => undefined,
    });
  }

  @HostListener('document:mousedown', ['$event'])
  onDocClick(ev: MouseEvent) {
    if (!this.calendarOpen()) return;
    if (!this.host.nativeElement.contains(ev.target as Node)) {
      this.calendarOpen.set(null);
      this.hoverDay.set(null);
    }
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.calendarOpen()) {
      this.calendarOpen.set(null);
      this.hoverDay.set(null);
    } else if (this.chatOpen()) {
      this.chatOpen.set(false);
    }
  }

  // ── Búsqueda y persistencia en localStorage ──
  runBookingSearch() {
    if (this.loading() || this.sweepRunning()) return;
    this.calendarOpen.set(null);
    this.loading.set(true);
    this.error.set(null);
    this.tracker
      .bookingSearch({
        checkIn: this.checkIn,
        checkOut: this.checkOut,
        adults: this.adults,
        children: this.children,
        childAge: this.childAge,
      })
      .subscribe({
        next: (data) => {
          const snap = this.saveSnapshot(data);
          this.bookingResults.set(snap);
          this.activeSnapshotId.set(snap.id);
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(
            err?.error?.message ?? 'No se pudo consultar Booking.',
          );
          this.loading.set(false);
        },
      });
  }

  // Barrido día por día (1 noche cada día):
  // - mode 'range': recorre desde checkIn hasta el día anterior a checkOut
  // - mode 'month': recorre todos los días restantes del mes de checkIn
  async runDailySweep(mode: 'range' | 'month') {
    if (this.loading() || this.sweepRunning()) return;
    this.calendarOpen.set(null);

    const days = this.buildSweepDays(mode);
    if (!days.length) return;

    this.sweepCancel = false;
    this.sweepRunning.set(true);
    this.error.set(null);

    for (let i = 0; i < days.length; i++) {
      if (this.sweepCancel) break;
      const dayIn = days[i];
      const dayOut = this.nextDayIso(dayIn);
      this.sweepProgress.set({
        current: i + 1,
        total: days.length,
        date: dayIn,
        foundLast: this.bookingResults()?.totalResults ?? 0,
      });

      try {
        const data = await firstValueFrom(
          this.tracker.bookingSearch({
            checkIn: dayIn,
            checkOut: dayOut,
            adults: this.adults,
            children: this.children,
            childAge: this.childAge,
          }),
        );
        const snap = this.saveSnapshot(data);
        this.bookingResults.set(snap);
        this.activeSnapshotId.set(snap.id);
        this.sweepProgress.set({
          current: i + 1,
          total: days.length,
          date: dayIn,
          foundLast: snap.totalResults,
        });
      } catch (err: any) {
        this.error.set(
          `Error en ${dayIn}: ${err?.error?.message ?? 'No se pudo consultar Booking.'}`,
        );
      }
    }

    this.sweepRunning.set(false);
    this.sweepProgress.set(null);
  }

  stopDailySweep() {
    this.sweepCancel = true;
  }

  monthSweepLabel() {
    const d = new Date(`${this.checkIn}T12:00:00`);
    return d.toLocaleDateString('es-CO', { month: 'long' });
  }

  monthDaysCount() {
    return this.buildSweepDays('month').length;
  }

  private buildSweepDays(mode: 'range' | 'month'): string[] {
    const out: string[] = [];
    if (mode === 'range') {
      let cur = new Date(`${this.checkIn}T12:00:00`);
      const end = new Date(`${this.checkOut}T12:00:00`);
      while (cur < end && out.length < 31) {
        const iso = this.isoDate(cur);
        if (iso >= this.today) out.push(iso);
        cur.setDate(cur.getDate() + 1);
      }
      return out;
    }

    const ref = new Date(`${this.checkIn}T12:00:00`);
    const y = ref.getFullYear();
    const m = ref.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (iso >= this.today) out.push(iso);
    }
    return out;
  }

  private nextDayIso(iso: string) {
    const d = new Date(`${iso}T12:00:00`);
    d.setDate(d.getDate() + 1);
    return this.isoDate(d);
  }

  private loadCatalog() {
    try {
      const raw = localStorage.getItem(CATALOG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, CatalogEntry>;
      if (parsed && typeof parsed === 'object') this.catalog.set(parsed);
    } catch {
      // ignore
    }
  }

  private updateCatalog(items: BookingItem[], seenAt: string) {
    const next: Record<string, CatalogEntry> = { ...this.catalog() };
    for (const r of items) {
      const slug = this.keyOf(r);
      const prev = next[slug];
      next[slug] = {
        slug,
        name: r.name,
        url: r.url,
        image: r.image || prev?.image || '',
        distance: r.distance || prev?.distance || '',
        score: r.score ?? prev?.score ?? null,
        reviewLabel: r.reviewLabel || prev?.reviewLabel || '',
        reviewsCount: r.reviewsCount ?? prev?.reviewsCount ?? null,
        unitType: r.unitType || prev?.unitType || '',
        unitConfig: r.unitConfig || prev?.unitConfig || '',
        beds: r.beds || prev?.beds || '',
        lastRoom: r.room || prev?.lastRoom || '',
        lastPrice: r.price ?? prev?.lastPrice ?? null,
        lastTaxes: r.taxes ?? prev?.lastTaxes ?? null,
        lastTaxesIncluded: r.taxesIncluded ?? prev?.lastTaxesIncluded ?? false,
        lastTotal: r.total ?? prev?.lastTotal ?? null,
        lastSeenAt: seenAt,
        firstSeenAt: prev?.firstSeenAt ?? seenAt,
      };
    }
    this.catalog.set(next);
    try {
      localStorage.setItem(CATALOG_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  private loadSnapshots() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const list = JSON.parse(raw) as TrackerSnapshot[];
      if (!Array.isArray(list) || !list.length) return;
      this.snapshots.set(list);
      // Hidrata el catálogo maestro con todas las capturas previas si estaba vacío
      if (Object.keys(this.catalog()).length === 0) {
        for (const s of [...list].reverse()) {
          this.updateCatalog(s.results, s.savedAt);
        }
      }
      const latest = list[0];
      this.bookingResults.set(latest);
      this.activeSnapshotId.set(latest.id);
      this.checkIn = latest.checkIn;
      this.checkOut = latest.checkOut;
      this.adults = latest.adults;
      this.children = latest.children;
      this.childAge = latest.childAge;
    } catch {
      // localStorage corrupto o bloqueado
    }
  }

  private saveSnapshot(data: any): TrackerSnapshot {
    const searchKey = `${data.checkIn}_${data.checkOut}_${data.adults}a_${data.children}c`;
    const snap: TrackerSnapshot = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      savedAt: new Date().toISOString(),
      searchKey,
      destination: data.destination ?? 'Zipaquirá',
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      adults: data.adults,
      children: data.children,
      childAge: data.childAge,
      totalResults: data.totalResults ?? data.results?.length ?? 0,
      results: (data.results ?? []).map((r: any) => ({
        name: r.name,
        url: r.url,
        slug: r.slug || (r.url ? String(r.url).split('?')[0] : r.name),
        image: r.image ?? '',
        distance: r.distance ?? '',
        score: r.score ?? null,
        reviewLabel: r.reviewLabel ?? '',
        reviewsCount: r.reviewsCount ?? null,
        secondaryScore: r.secondaryScore ?? '',
        unitType: r.unitType ?? '',
        unitConfig: r.unitConfig ?? '',
        beds: r.beds ?? '',
        breakfastIncluded: !!r.breakfastIncluded,
        freeCancellation: !!r.freeCancellation,
        noPrepayment: !!r.noPrepayment,
        room: r.room ?? '',
        price: r.price ?? null,
        taxes: r.taxes ?? null,
        taxesIncluded: !!r.taxesIncluded,
        total: r.total ?? null,
      })),
    };
    const next = [snap, ...this.snapshots()].slice(0, MAX_SNAPSHOTS);
    this.snapshots.set(next);
    this.updateCatalog(snap.results, snap.savedAt);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // cuota llena: guarda al menos las últimas 10
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 10)));
      } catch {
        // ignore
      }
    }
    return snap;
  }

  selectSnapshot(id: string) {
    const found = this.snapshots().find((s) => s.id === id);
    if (!found) return;
    this.activeSnapshotId.set(found.id);
    this.bookingResults.set(found);
    this.checkIn = found.checkIn;
    this.checkOut = found.checkOut;
    this.adults = found.adults;
    this.children = found.children;
    this.childAge = found.childAge;
  }

  clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CATALOG_KEY);
    this.snapshots.set([]);
    this.catalog.set({});
    this.bookingResults.set(null);
    this.activeSnapshotId.set(null);
  }

  keyOf(item: BookingItem) {
    return item.slug || (item.url ? item.url.split('?')[0] : item.name);
  }

  itemChange(item: BookingItem) {
    return this.diff()?.bySlug[this.keyOf(item)] ?? null;
  }

  // ── Ordenamiento de tabla ──
  sortedResults() {
    const list: BookingItem[] = this.bookingResults()?.results ?? [];
    const mode = this.sortBy();
    if (mode === 'rank') return list;
    return [...list].sort((a, b) => {
      const ta = a.total ?? Number.MAX_SAFE_INTEGER;
      const tb = b.total ?? Number.MAX_SAFE_INTEGER;
      return mode === 'asc' ? ta - tb : tb - ta;
    });
  }

  cycleSort() {
    const cur = this.sortBy();
    this.sortBy.set(cur === 'rank' ? 'asc' : cur === 'asc' ? 'desc' : 'rank');
  }

  sortLabel() {
    const mode = this.sortBy();
    return mode === 'asc'
      ? 'Menor precio'
      : mode === 'desc'
        ? 'Mayor precio'
        : 'Orden Booking';
  }

  // ── Chat IA con contexto de la tabla + localStorage + MongoDB (NovaAI) ──
  selectedBooking = signal<BookingCardQuery | null>(null);

  onBubbleClick(e: MouseEvent) {
    const cardEl = (e.target as HTMLElement | null)?.closest?.('.rt-card[data-booking]') as HTMLElement | null;
    const raw = cardEl?.getAttribute('data-booking');
    if (!raw) return;
    try {
      this.selectedBooking.set(JSON.parse(raw) as BookingCardQuery);
    } catch {
      // ignora payload malformado
    }
  }

  toggleChat() {
    this.chatOpen.update((v) => !v);
  }

  sendPrompt(prompt?: string) {
    const text = (prompt ?? this.chatInput).trim();
    if (!text || this.chatLoading()) return;
    if (!prompt) this.chatInput = '';

    const next: ChatMessage[] = [...this.chatMessages(), { role: 'user', text }];
    this.chatMessages.set(next);
    this.chatLoading.set(true);

    this.assistant.sendChat(next, this.buildAiContext()).subscribe({
      next: (res) => {
        this.chatMessages.update((list) => [
          ...list,
          {
            role: 'model',
            text: res.reply,
            queries: res.queries,
            actions: res.actions,
          },
        ]);
        this.chatLoading.set(false);
      },
      error: (err) => {
        this.chatMessages.update((list) => [
          ...list,
          {
            role: 'model',
            text:
              err?.error?.message ??
              'No se pudo contactar a NovaAI en este momento.',
          },
        ]);
        this.chatLoading.set(false);
      },
    });
  }

  private buildAiContext(): Record<string, unknown> {
    const current = this.bookingResults();
    const diff = this.diff();
    const all = this.snapshots();
    const compactItem = (r: BookingItem) => ({
      name: r.name,
      distance: r.distance,
      score: r.score,
      reviewsCount: r.reviewsCount,
      unitType: r.unitType,
      unitConfig: r.unitConfig,
      beds: r.beds,
      breakfastIncluded: r.breakfastIncluded,
      freeCancellation: r.freeCancellation,
      noPrepayment: r.noPrepayment,
      price: r.price,
      taxes: r.taxes,
      taxesIncluded: r.taxesIncluded,
      total: r.total,
    });

    return {
      current: current
        ? {
            savedAt: current.savedAt,
            checkIn: current.checkIn,
            checkOut: current.checkOut,
            nights: this.nightsCount(),
            adults: current.adults,
            children: current.children,
            childAge: current.childAge,
            totalResults: current.totalResults,
            results: current.results.map(compactItem),
          }
        : null,
      diff: diff
        ? {
            comparedAgainstSavedAt: diff.previousAt,
            bookedOutCount: diff.bookedOut.length,
            bookedOut: diff.bookedOut.map(compactItem),
            newOnesCount: diff.newOnes.length,
            newOnes: diff.newOnes.map(compactItem),
            priceChanges: diff.priceChanges,
          }
        : null,
      catalogTotalKnown: this.catalogSize(),
      missingFromCatalogAsBookedOut: this.missingFromCatalog().map((c) => ({
        name: c.name,
        distance: c.distance,
        lastRoom: c.lastRoom,
        lastTotal: c.lastTotal,
        lastSeenAt: c.lastSeenAt,
      })),
      recentSnapshots: all.slice(0, 35).map((s) => ({
        savedAt: s.savedAt,
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        adults: s.adults,
        children: s.children,
        totalResults: s.totalResults,
        minTotal: s.results.reduce(
          (min, r) => (r.total != null && r.total < min ? r.total : min),
          Number.MAX_SAFE_INTEGER,
        ),
        hotelNames: s.results.map((r) => r.name),
      })),
    };
  }

  // ── Calendario ──
  toggleCalendar(target: 'checkIn' | 'checkOut') {
    if (this.calendarOpen() === target) {
      this.calendarOpen.set(null);
      this.hoverDay.set(null);
      return;
    }
    this.calendarOpen.set(target);
    const ref = target === 'checkIn' ? this.checkIn : this.checkOut;
    this.calendarMonth.set(this.monthStart(ref));
  }

  shiftMonth(delta: number) {
    const m = this.calendarMonth();
    this.calendarMonth.set(new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  calendarLabel() {
    return this.calendarMonth().toLocaleDateString('es-CO', {
      month: 'long',
      year: 'numeric',
    });
  }

  calendarCells(): (CalDay | null)[] {
    const m = this.calendarMonth();
    const y = m.getFullYear();
    const mo = m.getMonth();
    const first = new Date(y, mo, 1);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(y, mo + 1, 0).getDate();

    const target = this.calendarOpen();
    const hover = this.hoverDay();
    const rangeEnd =
      target === 'checkOut' && hover && hover > this.checkIn
        ? hover
        : this.checkOut;

    const cells: (CalDay | null)[] = Array.from({ length: offset }, () => null);
    for (let d = 1; d <= count; d++) {
      const iso = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const minDate = target === 'checkOut' ? this.checkIn : this.today;
      const past = target === 'checkOut' ? iso <= minDate : iso < minDate;
      cells.push({
        day: d,
        iso,
        past,
        isToday: iso === this.today,
        isStart: iso === this.checkIn,
        isEnd: iso === rangeEnd,
        inRange: iso > this.checkIn && iso < rangeEnd,
        holiday: isHoliday(iso),
      });
    }
    return cells;
  }

  chooseDay(cell: CalDay) {
    if (cell.past) return;
    if (this.calendarOpen() === 'checkIn') {
      this.checkIn = cell.iso;
      if (this.checkOut <= cell.iso) {
        const d = new Date(`${cell.iso}T12:00:00`);
        d.setDate(d.getDate() + 1);
        this.checkOut = this.isoDate(d);
      }
      this.calendarOpen.set('checkOut');
    } else {
      this.checkOut = cell.iso;
      this.calendarOpen.set(null);
      this.hoverDay.set(null);
    }
  }

  nightsCount() {
    const a = new Date(`${this.checkIn}T12:00:00`).getTime();
    const b = new Date(`${this.checkOut}T12:00:00`).getTime();
    return Math.max(1, Math.round((b - a) / 86_400_000));
  }

  dateText(value: string) {
    // Mismo formato que dateEs en toda la app: "Lun 4 Mar 2026"
    return prettyDate(value) ?? value;
  }

  snapshotLabel(s: TrackerSnapshot) {
    const dt = new Date(s.savedAt).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dt} · ${s.checkIn} → ${s.checkOut} (${s.totalResults} aloj.)`;
  }

  timeAgo(iso: string) {
    return new Date(iso).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private monthStart(iso: string) {
    const d = new Date(`${iso}T12:00:00`);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }

  private addDays(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  private isoDate(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
