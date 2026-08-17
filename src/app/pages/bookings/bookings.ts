import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BookingsService } from '../../core/services/bookings.service';
import { IBooking, FinancialSummary } from '../../core/interfaces';
import { ModalNova } from '../../shared/components/modal-nova';
import { StatusBadge } from '../../shared/components/status-badge';
import { PlatformIcon } from '../../shared/components/platform-icon';
import { Pagination } from '../../shared/components/pagination';
import { CurrencyCopPipe } from '../../shared/pipes/currency-cop.pipe';
import { DateEsPipe } from '../../shared/pipes/date-es.pipe';
import { fmtNumber } from '../../shared/utils/number.util';
import { PLATFORMS, PLATFORM_CLASS, STATUSES, LIFECYCLE_STATUSES, LIFECYCLE_CLASS } from '../../shared/constants/booking.constants';
import { AlertService } from '../../shared/components/services/alert.service';
import { LucideAngularModule, CalendarDays, LayoutGrid, Rows3, MessageSquare } from 'lucide-angular';
import { AutocompleteSelect } from '../../shared/components/autocomplete-select';
import { loadList } from '../../shared/utils/list.util';
import { DeleteState, openDelete, confirmDelete } from '../../shared/utils/delete.util';

@Component({
  selector: 'app-bookings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideAngularModule, ModalNova, StatusBadge, PlatformIcon, Pagination, CurrencyCopPipe, DateEsPipe, AutocompleteSelect],
  templateUrl: './bookings.html',
})
export class BookingsComponent implements OnInit {
  readonly CalendarDays = CalendarDays;
  readonly LayoutGrid = LayoutGrid;
  readonly Rows3 = Rows3;
  readonly MessageSquare = MessageSquare;

  private bookingsService    = inject(BookingsService);
  private router = inject(Router);
  private route  = inject(ActivatedRoute);
  private alert  = inject(AlertService);

  bookings  = signal<IBooking[]>([]);
  meta      = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  summary   = signal<FinancialSummary>({ totalExpected: 0, totalReceived: 0, totalPending: 0 });
  loading   = signal(false);
  saving    = signal(false);

  viewMode = signal<'cards' | 'table'>(localStorage.getItem('bookingsView') as 'cards' | 'table' || 'cards');

  toggleView() {
    this.viewMode.update(m => {
      const next = m === 'cards' ? 'table' : 'cards';
      localStorage.setItem('bookingsView', next);
      return next;
    });
  }

  showFilters = signal(false);
  lifecycleFilter = signal('');

  resetFilters() {
    this.search = '';
    this.statusFilter = '';
    this.platformFilter = '';
    this.lifecycleFilter.set('');
    this.yearFilter.set(String(new Date().getFullYear()));
    this.monthFilter.set(BookingsComponent.defaultMonth());
    this.load(1);
    this.syncUrl();
  }

  updateLifecycleStatus(b: IBooking, e: Event) {
    e.stopPropagation();
    if (b.stay.status === 'CHECK-OUT') return;
    const next = b.stay.status === 'PENDIENTE' ? 'CHECK-IN' : 'CHECK-OUT';
    this.bookingsService.updateStatus(b._id, next).subscribe({
      next: (updated) => {
        this.bookings.update(list => list.map(item => item._id === updated._id ? updated : item));
      },
      error: () => this.alert.error('Error al actualizar estado'),
    });
  }

  search         = '';
  statusFilter   = '';
  platformFilter = '';
  yearFilter = signal(String(new Date().getFullYear()));

  // Mês padrão = mês calendário atual
  private static defaultMonth(): string {
    return String(new Date().getMonth());
  }
  monthFilter = signal(BookingsComponent.defaultMonth());

  // Opções de ano: de 2026 (primeiro ano da empresa) até ano atual + 1
  yearOptions = computed(() => {
    const y = new Date().getFullYear();
    const opts: { label: string; value: string }[] = [{ label: 'Todos', value: '' }];
    for (let i = 2026; i <= y + 1; i++) {
      opts.push({ label: String(i), value: String(i) });
    }
    return opts;
  });

  // 12 meses del año, rango = mes completo (1ro → 1ro del mes siguiente)
  monthOptions = computed(() => {
    const ms = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const opts: { label: string; value: string }[] = [{ label: 'Todos', value: '' }];
    for (let m = 0; m < 12; m++) {
      // value = índice 0-11, usado no load() para calcular datas do mês selecionado
      opts.push({ label: ms[m], value: String(m) });
    }
    return opts;
  });

  showPayment = signal(false);
  paymentSelected = signal<IBooking | null>(null);
  observationsBooking = signal<IBooking | null>(null);

  closeObservations() { this.observationsBooking.set(null); }

  openObservations(b: IBooking, e: Event) {
    e.stopPropagation();
    this.observationsBooking.set(b);
  }
  payAmount   = 0;

  deleteState: DeleteState<IBooking> = {
    selected: signal<IBooking | null>(null),
    show: signal(false),
    saving: signal(false),
  };

  readonly PLATFORMS = PLATFORMS;
  readonly STATUSES  = STATUSES;
  readonly PLATFORM_CLASS = PLATFORM_CLASS;
  readonly LIFECYCLE_STATUSES = LIFECYCLE_STATUSES;
  readonly LIFECYCLE_CLASS = LIFECYCLE_CLASS;

  ngOnInit() {
    const p = this.route.snapshot.queryParams;
    this.search = p['q'] ?? '';
    this.statusFilter = p['status'] ?? '';
    this.platformFilter = p['platform'] ?? '';
    if (p['year']) this.yearFilter.set(p['year']);
    if (p['month']) this.monthFilter.set(p['month']);
    if (p['lifecycle']) this.lifecycleFilter.set(p['lifecycle']);
    this.load();
    this.syncUrl();
  }

  private dateRange(): { fromDate?: string; toDate?: string } {
    if (!this.yearFilter() || !this.monthFilter()) return {};
    const y = parseInt(this.yearFilter());
    const m = parseInt(this.monthFilter());
    const fromDate = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const next = new Date(y, m + 1, 1);
    const toDate = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`;
    return { fromDate, toDate };
  }

  load(page = 1) {
    const { fromDate, toDate } = this.dateRange();
    loadList(
      this.loading,
      this.bookings,
      this.meta,
      this.bookingsService.findAll({ search: this.search, status: this.statusFilter, lifecycle: this.lifecycleFilter(), platform: this.platformFilter, page, fromDate, toDate }),
    );
    this.loadSummary();
  }

  loadSummary() {
    const { fromDate, toDate } = this.dateRange();
    this.bookingsService.financialSummary(fromDate, toDate).subscribe({ next: s => this.summary.set(s) });
  }

  onFilterChange() {
    this.load(1);
    this.syncUrl();
  }

  private syncUrl() {
    this.router.navigate([], {
      queryParams: {
        q: this.search || undefined,
        status: this.statusFilter || undefined,
        platform: this.platformFilter || undefined,
        lifecycle: this.lifecycleFilter() || undefined,
        year: this.yearFilter() || undefined,
        month: this.monthFilter() || undefined,
      },
      replaceUrl: true,
    });
  }

  openDetail(b: IBooking) { this.router.navigate(['/bookings', b._id]); }
  openCreate()            { this.router.navigate(['/bookings/new']); }
  openEdit(b: IBooking, e: Event) {
    e.stopPropagation();
    this.router.navigate(['/bookings', b._id, 'edit'], { queryParamsHandling: 'preserve' });
  }

  openDeleteConfirm(b: IBooking, e: Event) {
    e.stopPropagation();
    openDelete(this.deleteState, b);
  }

  onDeleteClosed() { this.deleteState.show.set(false); }

  onPaymentClosed() { this.showPayment.set(false); }

  confirmDelete() {
    confirmDelete(this.deleteState, id => this.bookingsService.delete(id), this.alert, () => {
      this.load(1);
      this.loadSummary();
    }, { success: 'Reserva eliminada', error: 'Error al eliminar reserva' });
  }

  openPayment(b: IBooking, e: Event) {
    e.stopPropagation();
    this.paymentSelected.set(b);
    this.payAmount = this.pending(b);
    this.showPayment.set(true);
    setTimeout(() => {
      const el = document.querySelector<HTMLInputElement>('#payInput');
      if (el) el.value = fmtNumber(this.payAmount);
    });
  }

  onPaymentInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const raw = input.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    const num = parseInt(raw, 10) || 0;
    this.payAmount = num;
    input.value = fmtNumber(num);
  }

  confirmPayment() {
    const id = this.paymentSelected()?._id;
    if (!id || !this.payAmount) return;
    this.saving.set(true);
    this.bookingsService.registerPayment(id, this.payAmount).subscribe({
      next: updated => {
        this.bookings.update(list => list.map(b => b._id === updated._id ? updated : b));
        this.showPayment.set(false);
        this.saving.set(false);
        this.loadSummary();
        this.alert.success('Pago registrado');
      },
      error: () => { this.saving.set(false); this.alert.error('Error al registrar pago'); },
    });
  }

  totalGuests(b: IBooking) { return this.bookingsService.totalGuests(b); }
  nights(b: IBooking)      { return this.bookingsService.nights(b); }
  pending(b: IBooking)     { return this.bookingsService.pending(b); }
  aptName(b: IBooking)     { return this.bookingsService.aptName(b); }

  paidPct(b: IBooking) { return this.bookingsService.paidPct(b); }

  readonly today = new Date().toISOString().split('T')[0];

}
