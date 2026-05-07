import { Component, inject, signal, viewChild, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { BookingsService, IBooking } from '../../../core/services/bookings.service';
import { DateEsPipe } from '../../../shared/pipes/date-es.pipe';
import { ModalNova } from '../../../shared/components/modal-nova';
import { StatusBadge } from '../../../shared/components/status-badge';
import { PlatformIcon } from '../../../shared/components/platform-icon';
import { PaymentMethodIcon } from '../../../shared/components/payment-method-icon';
import { PhotoViewer } from '../../../shared/components/photo-viewer';
import { CurrencyCopPipe } from '../../../shared/pipes/currency-cop.pipe';
import { CalendarDays, Building2, LogIn, LogOut,
  User, Users, CreditCard, Banknote, Wallet,
  ArrowLeft, Pencil, Trash2, MapPin, IdCard,
  MessageSquare, Moon, X, Hash,
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { AlertService } from '../../../shared/components/services/alert.service';
import { PLATFORM_CLASS, ID_LABELS } from '../../../shared/constants/booking.constants';
import { DeleteState, openDelete, confirmDelete } from '../../../shared/utils/delete.util';

@Component({
  selector: 'app-booking-detail',
  imports: [FormsModule, LucideAngularModule, DatePipe, DateEsPipe, ModalNova, StatusBadge, PlatformIcon, PaymentMethodIcon, PhotoViewer, CurrencyCopPipe],
  templateUrl: './booking-detail.html',
})
export class BookingDetailComponent implements OnInit {
  readonly CalendarDays  = CalendarDays;
  readonly Building2     = Building2;
  readonly LogIn         = LogIn;
  readonly LogOut        = LogOut;
  readonly User          = User;
  readonly Users         = Users;
  readonly CreditCard    = CreditCard;
  readonly Banknote      = Banknote;
  readonly Wallet        = Wallet;
  readonly ArrowLeft     = ArrowLeft;
  readonly Pencil        = Pencil;
  readonly Trash2        = Trash2;
  readonly MapPin        = MapPin;
  readonly IdCard        = IdCard;
  readonly MessageSquare = MessageSquare;
  readonly Moon          = Moon;
  readonly X             = X;
  readonly Hash          = Hash;

  private bookingsService     = inject(BookingsService);
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private alert   = inject(AlertService);

  booking     = signal<IBooking | null>(null);
  loading     = signal(true);
  saving      = signal(false);
  showPayment = signal(false);
  payAmount   = 0;
  photoUrl    = signal<string | null>(null);
  photoOverlay = viewChild<ElementRef<HTMLElement>>('photoOverlay');
  deleteState: DeleteState<IBooking> = {
    selected: signal<IBooking | null>(null),
    show: signal(false),
    saving: signal(false),
  };

  readonly PLATFORM_CLASS = PLATFORM_CLASS;
  readonly ID_LABELS = ID_LABELS;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.bookingsService.findById(id).subscribe({
      next: b => { this.booking.set(b); this.loading.set(false); },
      error: () => { this.loading.set(false); this.router.navigate(['/bookings']); },
    });
  }

  goBack() { this.router.navigate(['/bookings']); }
  goEdit() { this.router.navigate(['/bookings', this.booking()!._id, 'edit']); }

  openPayment() { this.payAmount = 0; this.showPayment.set(true); }

  onPaymentClosed() { this.showPayment.set(false); }

  onDeleteClick(e: Event) {
    const b = this.booking();
    if (b) openDelete(this.deleteState, b, e);
  }

  onDeleteClosed() { this.deleteState.show.set(false); }

  confirmDelete() {
    confirmDelete(this.deleteState, id => this.bookingsService.delete(id), this.alert, () => {
      this.router.navigate(['/bookings']);
    }, { success: 'Reserva eliminada', error: 'Error al eliminar reserva' });
  }

  confirmPayment() {
    const id = this.booking()?._id;
    if (!id || !this.payAmount) return;
    this.saving.set(true);
    this.bookingsService.registerPayment(id, this.payAmount).subscribe({
      next: updated => { this.booking.set(updated); this.showPayment.set(false); this.saving.set(false); this.alert.success('Pago registrado'); },
      error: () => { this.saving.set(false); this.alert.error('Error al registrar pago'); },
    });
  }

  nights()      { const b = this.booking(); return b ? this.bookingsService.nights(b) : 0; }
  pending()     { const b = this.booking(); return b ? this.bookingsService.pending(b) : 0; }
  aptName()     { const b = this.booking(); return b ? this.bookingsService.aptName(b) : ''; }
  totalGuests() { const b = this.booking(); return b ? this.bookingsService.totalGuests(b) : 0; }

  paidPct() {
    const b = this.booking();
    return b ? this.bookingsService.paidPct(b) : 0;
  }
}
