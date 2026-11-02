import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { NgClass, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-angular';
import { BookingsService } from '../../core/services/bookings.service';
import type { IBooking } from '../../core/interfaces';
import { isHoliday } from '../../shared/constants/holidays.constant';
import { CurrencyCopPipe } from '../../shared/pipes/currency-cop.pipe';
import { apartmentColor, apartmentShortName } from '../../shared/utils/apartment-color';

interface DayInfo {
  dateStr: string;
  day: number;
  bookings: IBooking[];
  holiday: string | null;
  isToday: boolean;
  isPadding: boolean;
  // Colores de los apartamentos ocupados ese día (uno por apartamento)
  aptColors: string[];
}

interface PopoverData {
  x: number;
  y: number;
  dayStr: string;
  bookings: IBooking[];
  holiday: string | null;
}

@Component({
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, RouterLink, LucideAngularModule, CurrencyCopPipe],
  selector: 'app-calendar',
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class CalendarComponent implements OnInit {
  readonly CalendarDays = CalendarDays;
  readonly ChevronLeft = ChevronLeft;
  readonly ChevronRight = ChevronRight;

  private bookingsService = inject(BookingsService);

  year = signal(new Date().getFullYear());
  rawBookings = signal<IBooking[]>([]);
  loading = signal(true);

  popover = signal<PopoverData | null>(null);

  // Móvil: un mes a la vez (empieza en el mes actual)
  mobileMonth = signal(new Date().getMonth());
  prevMonth() {
    if (this.mobileMonth() === 0) { this.mobileMonth.set(11); this.prevYear(); }
    else this.mobileMonth.update(m => m - 1);
  }
  nextMonth() {
    if (this.mobileMonth() === 11) { this.mobileMonth.set(0); this.nextYear(); }
    else this.mobileMonth.update(m => m + 1);
  }

  // Leyenda: apartamentos con reservas este año, con su color
  apartments = computed(() => {
    const seen = new Map<string, { name: string; color: string }>();
    for (const b of this.rawBookings()) {
      const id = this.aptId(b);
      if (id && !seen.has(id)) seen.set(id, { name: apartmentShortName(this.aptName(b)), color: apartmentColor(id) });
    }
    return [...seen.values()];
  });

  monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  dayHeaders = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

  months = computed(() => {
    const y = this.year();
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const bkMap = new Map<string, IBooking[]>();
    for (const b of this.rawBookings()) {
      const ci = b.stay.checkIn.slice(0, 10).split('-');
      const co = b.stay.checkOut.slice(0, 10).split('-');
      const fromY = +ci[0], fromM = +ci[1], fromD = +ci[2];
      const toY   = +co[0], toM   = +co[1], toD   = +co[2];
      const from = new Date(fromY, fromM - 1, fromD);
      const to   = new Date(toY,   toM - 1, toD);
      const d = new Date(from);
      while (d < to) {
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        if (!bkMap.has(key)) bkMap.set(key, []);
        bkMap.get(key)!.push(b);
        d.setDate(d.getDate() + 1);
      }
    }

    const result: { month: number; name: string; days: DayInfo[]; holidays: { day: number; name: string }[] }[] = [];
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const firstDay = (new Date(y, m, 1).getDay() + 6) % 7;
      const days: DayInfo[] = [];
      for (let p = 0; p < firstDay; p++) {
        days.push({ dateStr: '', day: 0, bookings: [], holiday: null, isToday: false, isPadding: true, aptColors: [] });
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const bookings = bkMap.get(dateStr) || [];
        days.push({
          dateStr,
          day: d,
          bookings,
          holiday: isHoliday(dateStr),
          isToday: dateStr === todayStr,
          isPadding: false,
          aptColors: [...new Set(bookings.map(b => apartmentColor(this.aptId(b))))],
        });
      }
      const holidays = days.filter(x => x.holiday).map(x => ({ day: x.day, name: x.holiday! }));
      result.push({ month: m, name: this.monthNames[m], days, holidays });
    }
    return result;
  });

  prevYear() { this.year.update(y => y - 1); this.loadYear(); }
  nextYear() { this.year.update(y => y + 1); this.loadYear(); }

  onDayClick(e: MouseEvent, day: DayInfo) {
    e.stopPropagation();
    // Sin reservas ni festivo no hay nada que mostrar
    if (day.isPadding || (!day.bookings.length && !day.holiday)) {
      this.popover.set(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const popoverWidth = 300;
    const popoverHeight = Math.min(day.bookings.length * 56 + 60, 360);
    let x = rect.left;
    let y = rect.bottom + 4;
    if (x + popoverWidth > window.innerWidth) x = window.innerWidth - popoverWidth - 8;
    if (y + popoverHeight > window.innerHeight) y = rect.top - popoverHeight - 4;
    this.popover.set({
      x: Math.max(8, x),
      y: Math.max(8, y),
      dayStr: day.dateStr,
      bookings: day.bookings,
      holiday: day.holiday,
    });
  }

  closePopover() { this.popover.set(null); }

  nights(b: IBooking) {
    const ci = b.stay.checkIn.slice(0, 10).split('-');
    const co = b.stay.checkOut.slice(0, 10).split('-');
    const from = new Date(+ci[0], +ci[1] - 1, +ci[2]);
    const to   = new Date(+co[0], +co[1] - 1, +co[2]);
    return Math.round((to.getTime() - from.getTime()) / 86400000);
  }

  aptId(b: IBooking): string {
    const a = b.apartmentId as any;
    return typeof a === 'string' ? a : a?._id ?? '';
  }

  aptColor(b: IBooking) { return apartmentColor(this.aptId(b)); }

  aptName(b: IBooking) {
    const a = b.apartmentId as any;
    return a?.internalName || a?.name || '—';
  }

  private scrollEl: HTMLElement | null = null;

  ngOnInit() {
    this.loadYear();
    document.addEventListener('click', this.onDocClick);
    window.addEventListener('wheel', this.onScroll, { passive: true });
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.onDocClick);
    window.removeEventListener('wheel', this.onScroll);
  }

  onDocClick = () => this.popover.set(null);
  private onScroll = () => this.popover.set(null);

  private loadYear() {
    this.loading.set(true);
    this.popover.set(null);
    const y = this.year();
    this.bookingsService.findCalendar(`${y}-01-01`, `${y}-12-31`).subscribe({
      next: (res: any) => {
        const raw: any[] = res.data || [];
        // keep only what the calendar needs
        this.rawBookings.set(res.data || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
