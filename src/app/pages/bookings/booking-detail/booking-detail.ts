import { Component, HostListener, effect, ElementRef, inject, signal, viewChild, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingsService, IBooking } from '../../../core/services/bookings.service';
import {
  LucideAngularModule,
  CalendarDays, Building2, LogIn, LogOut,
  User, Users, CreditCard, Banknote, Wallet,
  ArrowLeft, Pencil, Trash2, MapPin, IdCard,
  MessageSquare, Moon, X, Hash,
} from 'lucide-angular';

@Component({
  selector: 'app-booking-detail',
  imports: [FormsModule, LucideAngularModule],
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

  private svc    = inject(BookingsService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);

  booking     = signal<IBooking | null>(null);
  loading     = signal(true);
  saving      = signal(false);
  showPayment = signal(false);
  showDelete  = signal(false);
  showPhoto   = signal<string | null>(null);
  payAmount   = 0;
  photoOverlay = viewChild<ElementRef<HTMLElement>>('photoOverlay');

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.showPhoto()) this.showPhoto.set(null);
  }

  readonly STATUS_CLASS: Record<string, string> = {
    'PAGADO':     'bg-success/15 text-success',
    'FALTA PAGO': 'bg-warning/15 text-warning',
    'NO SHOW':    'bg-error/15 text-error',
  };
  readonly PLATFORM_CLASS: Record<string, string> = {
    Booking: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    AirBnB:  'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    Directo: 'bg-brand/15 text-brand border border-brand/30',
  };
  readonly ID_LABELS: Record<string, string> = {
    FRONT: 'Frontal', BACK: 'Trasera', SELFIE: 'Selfie',
  };

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.svc.findById(id).subscribe({
      next: b => { this.booking.set(b); this.loading.set(false); },
      error: () => { this.loading.set(false); this.router.navigate(['/bookings']); },
    });
  }

  goBack() { this.router.navigate(['/bookings']); }
  goEdit() { this.router.navigate(['/bookings', this.booking()!._id, 'edit']); }

  openPayment() { this.payAmount = 0; this.showPayment.set(true); }

  confirmPayment() {
    const id = this.booking()?._id;
    if (!id || !this.payAmount) return;
    this.saving.set(true);
    this.svc.registerPayment(id, this.payAmount).subscribe({
      next: updated => { this.booking.set(updated); this.showPayment.set(false); this.saving.set(false); },
      error: () => this.saving.set(false),
    });
  }

  confirmDelete() {
    const id = this.booking()?._id;
    if (!id) return;
    this.saving.set(true);
    this.svc.delete(id).subscribe({
      next: () => { this.saving.set(false); this.router.navigate(['/bookings']); },
      error: () => this.saving.set(false),
    });
  }

  nights()      { const b = this.booking(); return b ? this.svc.nights(b) : 0; }
  pending()     { const b = this.booking(); return b ? this.svc.pending(b) : 0; }
  aptName()     { const b = this.booking(); return b ? this.svc.aptName(b) : ''; }
  totalGuests() { const b = this.booking(); return b ? 1 + b.group.members.length : 0; }

  onPhotoKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.showPhoto.set(null);
    }
  }

  paidPct() {
    const b = this.booking();
    if (!b || !b.billing.totalAmount) return 0;
    return Math.min(100, Math.round(b.billing.amountReceived / b.billing.totalAmount * 100));
  }

  fmtCOP(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  fmtDate(d: string) {
    if (!d) return '';
    const p = d.split('T')[0].split('-');
    if (p.length !== 3) return d;
    const date = new Date(+p[0], +p[1] - 1, +p[2]);
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  fmtCheckDate(d: string): string {
    if (!d) return '';
    const p = d.split('T')[0].split('-');
    if (p.length !== 3) return d;
    const date = new Date(+p[0], +p[1] - 1, +p[2]);
    const weekday = date.toLocaleDateString('es-CO', { weekday: 'long' });
    const day = date.getDate();
    const month = date.toLocaleDateString('es-CO', { month: 'long' });
    const year = String(date.getFullYear()).slice(2);
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return `${cap(weekday)} | ${day}-${cap(month)}/${year}`;
  }

  fmtCreatedAt(d: string) {
    return new Date(d).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }
}
