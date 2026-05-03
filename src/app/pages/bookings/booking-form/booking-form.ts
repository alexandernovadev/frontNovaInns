import { ChangeDetectorRef, Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingsService, IBooking } from '../../../core/services/bookings.service';
import { ApartmentsService, IApartment } from '../../../core/services/apartments.service';
import {
  LucideAngularModule,
  CalendarDays, Building2, LogIn, LogOut,
  MessageSquare, User, UserPlus, X, CreditCard,
  Banknote, Wallet, ScanLine, MapPin, IdCard, ArrowLeft,
} from 'lucide-angular';

type FormTab = 'general' | 'guests' | 'billing';
type IdType  = 'FRONT' | 'BACK' | 'SELFIE';

interface IdentPhoto { url: string; publicId: string; type: IdType; }
interface GuestForm  { fullName: string; idNumber: string; country: string; city: string; identifications: IdentPhoto[]; }

@Component({
  selector: 'app-booking-form',
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './booking-form.html',
})
export class BookingFormComponent implements OnInit {
  readonly CalendarDays  = CalendarDays;
  readonly Building2     = Building2;
  readonly LogIn         = LogIn;
  readonly LogOut        = LogOut;
  readonly MessageSquare = MessageSquare;
  readonly User          = User;
  readonly UserPlus      = UserPlus;
  readonly X             = X;
  readonly CreditCard    = CreditCard;
  readonly Banknote      = Banknote;
  readonly Wallet        = Wallet;
  readonly ScanLine      = ScanLine;
  readonly MapPin        = MapPin;
  readonly IdCard        = IdCard;
  readonly ArrowLeft     = ArrowLeft;

  private svc    = inject(BookingsService);
  private aptSvc = inject(ApartmentsService);
  private route  = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr   = inject(ChangeDetectorRef);

  isEditing  = false;
  editingId  = '';
  saving     = signal(false);
  loading    = signal(false);
  tab        = signal<FormTab>('general');
  apartments = signal<IApartment[]>([]);

  formGeneral = this.blankGeneral();
  formBilling = this.blankBilling();
  host: GuestForm   = this.blankGuest();
  members: GuestForm[] = [];
  uploading: Record<string, IdType | null> = {};

  readonly TABS: { key: FormTab; label: string; icon: any }[] = [
    { key: 'general', label: 'General',   icon: Building2  },
    { key: 'guests',  label: 'Huéspedes', icon: User       },
    { key: 'billing', label: 'Pagos',     icon: CreditCard },
  ];

  readonly PLATFORMS = ['Booking', 'AirBnB', 'Directo'] as const;
  readonly METHODS   = ['Efectivo', 'Nequi', 'Bancolombia', 'None'] as const;
  readonly ID_TYPES: IdType[] = ['FRONT', 'BACK', 'SELFIE'];
  readonly ID_LABELS: Record<IdType, string> = { FRONT: 'Frontal', BACK: 'Trasera', SELFIE: 'Selfie' };

  readonly PLATFORM_CLASS: Record<string, string> = {
    Booking: 'bg-blue-500/15 text-blue-400 border-2 border-blue-500/40',
    AirBnB:  'bg-rose-500/15 text-rose-400 border-2 border-rose-500/40',
    Directo: 'bg-brand/15 text-brand border-2 border-brand/40',
  };

  ngOnInit() {
    this.aptSvc.findAll({ limit: 100 } as any).subscribe({ next: r => this.apartments.set(r.data) });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing = true;
      this.editingId = id;
      this.loading.set(true);
      this.svc.findById(id).subscribe({
        next: b => { this.populateForm(b); this.loading.set(false); },
        error: () => { this.loading.set(false); this.router.navigate(['/bookings']); },
      });
    }
  }

  private populateForm(b: IBooking) {
    const aptId = typeof b.apartmentId === 'string' ? b.apartmentId : b.apartmentId._id;
    this.formGeneral = {
      apartmentId:  aptId,
      checkIn:      new Date(b.stay.checkIn).toISOString().slice(0, 10),
      checkOut:     new Date(b.stay.checkOut).toISOString().slice(0, 10),
      platform:     b.billing.platform,
      observations: b.observations,
    };
    this.formBilling = {
      basePrice:      b.billing.basePrice,
      amountReceived: b.billing.amountReceived,
      paymentMethod:  b.billing.paymentMethod,
    };
    this.host = {
      fullName: b.group.host.fullName,
      idNumber: b.group.host.idNumber ?? '',
      country:  b.group.host.country  ?? '',
      city:     b.group.host.city     ?? '',
      identifications: (b.group.host.identifications ?? []).map(i => ({ url: i.url, publicId: i.publicId ?? '', type: i.type as IdType })),
    };
    this.members = b.group.members.map(m => ({
      fullName: m.fullName,
      idNumber: m.idNumber ?? '',
      country:  m.country  ?? '',
      city:     m.city     ?? '',
      identifications: (m.identifications ?? []).map(i => ({ url: i.url, publicId: i.publicId ?? '', type: i.type as IdType })),
    }));
  }

  goBack() { this.router.navigate(['/bookings']); }

  submit() {
    if (!this.formGeneral.apartmentId || !this.host.fullName || !this.formGeneral.checkIn || !this.formGeneral.checkOut) return;
    this.saving.set(true);
    const payload = {
      apartmentId: this.formGeneral.apartmentId,
      group: {
        host:    { fullName: this.host.fullName, idNumber: this.host.idNumber, country: this.host.country, city: this.host.city, identifications: this.host.identifications },
        members: this.members.map(m => ({ fullName: m.fullName, idNumber: m.idNumber, country: m.country, city: m.city, identifications: m.identifications })),
      },
      stay:    { checkIn: this.formGeneral.checkIn, checkOut: this.formGeneral.checkOut },
      billing: {
        basePrice:      this.formBilling.basePrice,
        extraServices:  [],
        totalAmount:    this.formBilling.basePrice,
        amountReceived: this.formBilling.amountReceived,
        platform:       this.formGeneral.platform,
        paymentMethod:  this.formBilling.paymentMethod,
        status: this.formBilling.amountReceived >= this.formBilling.basePrice ? 'PAGADO' : 'FALTA PAGO',
      },
      observations: this.formGeneral.observations,
    };
    const req$ = this.isEditing ? this.svc.update(this.editingId, payload) : this.svc.create(payload);
    req$.subscribe({
      next: () => { this.saving.set(false); this.router.navigate(['/bookings']); },
      error: () => this.saving.set(false),
    });
  }

  // ── Guests ──
  addMember() { this.members.push(this.blankGuest()); }

  private deleteOldPhoto(guest: GuestForm, type: IdType) {
    const old = guest.identifications.find(i => i.type === type);
    if (old?.publicId) this.svc.deleteImage(old.publicId).subscribe();
  }

  uploadPhoto(file: File, key: string, type: IdType, target: GuestForm) {
    this.uploading[key] = type;
    this.deleteOldPhoto(target, type);
    this.svc.uploadImage(file).subscribe({
      next: res => {
        const idx = target.identifications.findIndex(i => i.type === type);
        if (idx !== -1) target.identifications[idx] = { url: res.url, publicId: res.publicId, type };
        else            target.identifications.push({ url: res.url, publicId: res.publicId, type });
        this.uploading[key] = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.uploading[key] = null;
        this.cdr.detectChanges();
      },
    });
  }

  removePhoto(guest: GuestForm, type: IdType) {
    this.deleteOldPhoto(guest, type);
    guest.identifications = guest.identifications.filter(i => i.type !== type);
  }

  removeMember(i: number) {
    const member = this.members[i];
    if (member) member.identifications.forEach(id => { if (id.publicId) this.svc.deleteImage(id.publicId).subscribe(); });
    this.members.splice(i, 1);
  }

  onHostPhoto(e: Event, type: IdType) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.uploadPhoto(file, 'host', type, this.host);
    (e.target as HTMLInputElement).value = '';
  }

  onMemberPhoto(e: Event, idx: number, type: IdType) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.uploadPhoto(file, `member-${idx}`, type, this.members[idx]);
    (e.target as HTMLInputElement).value = '';
  }

  getPhoto(guest: GuestForm, type: IdType) { return guest.identifications.find(i => i.type === type); }

  // ── Billing ──
  onPriceInput(e: Event, field: 'basePrice' | 'amountReceived') {
    const input = e.target as HTMLInputElement;
    const raw = input.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    const num = parseInt(raw, 10) || 0;
    this.formBilling[field] = num;
    input.value = num ? new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(num) : '';
  }

  fmtNumber(n: number) {
    return n ? new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n) : '';
  }

  fmtCOP(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  fmtCheckDate(d: string): string {
    if (!d) return '';
    const date = new Date(d + 'T12:00:00');
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    return `${cap(date.toLocaleDateString('es-CO', { weekday: 'long' }))} | ${date.getDate()}-${cap(date.toLocaleDateString('es-CO', { month: 'long' }))}/${String(date.getFullYear()).slice(2)}`;
  }

  formPaidPct() {
    if (!this.formBilling.basePrice) return 0;
    return Math.min(100, Math.round(this.formBilling.amountReceived / this.formBilling.basePrice * 100));
  }

  private blankGeneral(): { apartmentId: string; checkIn: string; checkOut: string; platform: string; observations: string } {
    return { apartmentId: '', checkIn: '', checkOut: '', platform: 'Directo', observations: '' };
  }
  private blankBilling(): { basePrice: number; amountReceived: number; paymentMethod: string } {
    return { basePrice: 0, amountReceived: 0, paymentMethod: 'Efectivo' };
  }
  private blankGuest(): GuestForm {
    return { fullName: '', idNumber: '', country: '', city: '', identifications: [] };
  }
}
