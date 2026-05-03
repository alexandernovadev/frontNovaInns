import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BookingsService, IBooking, FinancialSummary } from '../../core/services/bookings.service';
import { ModalNova } from '../../shared/components/modal-nova';
import { StatusBadge } from '../../shared/components/status-badge';
import { PlatformIcon } from '../../shared/components/platform-icon';
import { PLATFORMS, PLATFORM_CLASS, STATUSES } from '../../shared/constants/booking.constants';
import { AlertService } from '../../shared/components/services/alert.service';
import { LucideAngularModule, CalendarDays } from 'lucide-angular';

@Component({
  selector: 'app-bookings',
  imports: [FormsModule, LucideAngularModule, ModalNova, StatusBadge, PlatformIcon],
  templateUrl: './bookings.html',
})
export class BookingsComponent implements OnInit {
  readonly CalendarDays = CalendarDays;

  private svc    = inject(BookingsService);
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
  showDelete  = signal(false);
  selected    = signal<IBooking | null>(null);
  payAmount   = 0;

  readonly PLATFORMS = PLATFORMS;
  readonly STATUSES  = STATUSES;
  readonly PLATFORM_CLASS = PLATFORM_CLASS;

  ngOnInit() {
    this.load();
    this.loadSummary();
  }

  load(page = 1) {
    this.loading.set(true);
    this.svc.findAll({ search: this.search, status: this.statusFilter, platform: this.platformFilter, page }).subscribe({
      next: res => { this.bookings.set(res.data); this.meta.set(res.meta); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  loadSummary() {
    this.svc.financialSummary().subscribe({ next: s => this.summary.set(s) });
  }

  openDetail(b: IBooking) { this.router.navigate(['/bookings', b._id]); }
  openCreate()            { this.router.navigate(['/bookings/new']); }
  openEdit(b: IBooking, e: Event) {
    e.stopPropagation();
    this.router.navigate(['/bookings', b._id, 'edit']);
  }

  openDeleteConfirm(b: IBooking, e: Event) {
    e.stopPropagation();
    this.selected.set(b);
    this.showDelete.set(true);
  }

  onDeleteClosed() { this.showDelete.set(false); }

  onPaymentClosed() { this.showPayment.set(false); }

  confirmDelete() {
    const id = this.selected()?._id;
    if (!id) return;
    this.saving.set(true);
    this.svc.delete(id).subscribe({
      next: () => { this.showDelete.set(false); this.saving.set(false); this.load(1); this.loadSummary(); this.alert.success('Reserva eliminada'); },
      error: () => { this.saving.set(false); this.alert.error('Error al eliminar reserva'); },
    });
  }

  openPayment(b: IBooking, e: Event) {
    e.stopPropagation();
    this.selected.set(b);
    this.payAmount = 0;
    this.showPayment.set(true);
  }

  confirmPayment() {
    const id = this.selected()?._id;
    if (!id || !this.payAmount) return;
    this.saving.set(true);
    this.svc.registerPayment(id, this.payAmount).subscribe({
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

  totalGuests(b: IBooking) { return 1 + b.group.members.length; }
  nights(b: IBooking)      { return this.svc.nights(b); }
  pending(b: IBooking)     { return this.svc.pending(b); }
  aptName(b: IBooking)     { return this.svc.aptName(b); }

  paidPct(b: IBooking) {
    if (!b.billing.totalAmount) return 0;
    return Math.min(100, Math.round((b.billing.amountReceived / b.billing.totalAmount) * 100));
  }

  fmtCOP(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  fmtDate(d: string) {
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  pages() { return Array.from({ length: this.meta().totalPages }, (_, i) => i + 1); }
}
