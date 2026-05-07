import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingsService, IBooking, FinancialSummary } from '../../core/services/bookings.service';
import { ModalNova } from '../../shared/components/modal-nova';
import { StatusBadge } from '../../shared/components/status-badge';
import { PlatformIcon } from '../../shared/components/platform-icon';
import { Pagination } from '../../shared/components/pagination';
import { CurrencyCopPipe } from '../../shared/pipes/currency-cop.pipe';
import { DateEsPipe } from '../../shared/pipes/date-es.pipe';
import { PLATFORMS, PLATFORM_CLASS, STATUSES } from '../../shared/constants/booking.constants';
import { AlertService } from '../../shared/components/services/alert.service';
import { LucideAngularModule, CalendarDays } from 'lucide-angular';
import { loadList } from '../../shared/utils/list.util';
import { DeleteState, openDelete, confirmDelete } from '../../shared/utils/delete.util';

@Component({
  selector: 'app-bookings',
  imports: [FormsModule, LucideAngularModule, ModalNova, StatusBadge, PlatformIcon, Pagination, CurrencyCopPipe, DateEsPipe],
  templateUrl: './bookings.html',
})
export class BookingsComponent implements OnInit {
  readonly CalendarDays = CalendarDays;

  private bookingsService    = inject(BookingsService);
  private router = inject(Router);
  private alert  = inject(AlertService);

  bookings  = signal<IBooking[]>([]);
  meta      = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  summary   = signal<FinancialSummary>({ totalExpected: 0, totalReceived: 0, totalPending: 0 });
  loading   = signal(false);
  saving    = signal(false);

  search         = '';
  statusFilter   = '';
  platformFilter = '';

  showPayment = signal(false);
  paymentSelected = signal<IBooking | null>(null);
  payAmount   = 0;

  deleteState: DeleteState<IBooking> = {
    selected: signal<IBooking | null>(null),
    show: signal(false),
    saving: signal(false),
  };

  readonly PLATFORMS = PLATFORMS;
  readonly STATUSES  = STATUSES;
  readonly PLATFORM_CLASS = PLATFORM_CLASS;

  ngOnInit() {
    this.load();
    this.loadSummary();
  }

  load(page = 1) {
    loadList(
      this.loading,
      this.bookings,
      this.meta,
      this.bookingsService.findAll({ search: this.search, status: this.statusFilter, platform: this.platformFilter, page }),
    );
  }

  loadSummary() {
    this.bookingsService.financialSummary().subscribe({ next: s => this.summary.set(s) });
  }

  openDetail(b: IBooking) { this.router.navigate(['/bookings', b._id]); }
  openCreate()            { this.router.navigate(['/bookings/new']); }
  openEdit(b: IBooking, e: Event) {
    e.stopPropagation();
    this.router.navigate(['/bookings', b._id, 'edit']);
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
    this.payAmount = 0;
    this.showPayment.set(true);
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

}
