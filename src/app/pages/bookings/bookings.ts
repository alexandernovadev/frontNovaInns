import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BookingsService, IBooking, FinancialSummary } from '../../core/services/bookings.service';
import { ApartmentsService, IApartment } from '../../core/services/apartments.service';

type ModalTab = 'general' | 'guests' | 'billing';
type IdType = 'FRONT' | 'BACK' | 'SELFIE';

interface IdentPhoto { url: string; publicId: string; type: IdType; }
interface GuestForm  { fullName: string; idNumber: string; country: string; city: string; identifications: IdentPhoto[]; }

@Component({
  selector: 'app-bookings',
  imports: [FormsModule],
  templateUrl: './bookings.html',
})
export class BookingsComponent implements OnInit {
  private svc    = inject(BookingsService);
  private aptSvc = inject(ApartmentsService);

  bookings  = signal<IBooking[]>([]);
  meta      = signal({ total: 0, page: 1, limit: 20, totalPages: 1 });
  summary   = signal<FinancialSummary>({ totalExpected: 0, totalReceived: 0, totalPending: 0 });
  loading   = signal(false);
  saving    = signal(false);

  search         = '';
  statusFilter   = '';
  platformFilter = '';

  apartments = signal<IApartment[]>([]);

  showCreate  = signal(false);
  showPayment = signal(false);
  showDelete  = signal(false);
  selected    = signal<IBooking | null>(null);
  payAmount   = 0;

  isEditing  = false;
  editingId  = '';
  modalTab = signal<ModalTab>('general');

  // Form state
  formGeneral = this.blankGeneral();
  formBilling = this.blankBilling();
  host: GuestForm = this.blankGuest();
  members: GuestForm[] = [];

  // Upload tracking: key = 'host' | 'member-{idx}', value = IdType being uploaded
  uploading: Record<string, IdType | null> = {};

  readonly MODAL_TABS: { key: ModalTab; label: string }[] = [
    { key: 'general', label: 'General'    },
    { key: 'guests',  label: 'Huéspedes'  },
    { key: 'billing', label: 'Pagos'      },
  ];

  readonly PLATFORMS = ['Booking', 'AirBnB', 'Directo'] as const;
  readonly METHODS   = ['Efectivo', 'Nequi', 'Bancolombia', 'None'] as const;
  readonly STATUSES  = ['PAGADO', 'FALTA PAGO', 'NO SHOW'] as const;
  readonly ID_TYPES: IdType[] = ['FRONT', 'BACK', 'SELFIE'];
  readonly ID_LABELS: Record<IdType, string> = { FRONT: 'Frontal', BACK: 'Trasera', SELFIE: 'Selfie' };

  readonly PLATFORM_CLASS: Record<string, string> = {
    Booking: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    AirBnB:  'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    Directo: 'bg-brand/15 text-brand border border-brand/30',
  };
  readonly STATUS_CLASS: Record<string, string> = {
    'PAGADO':     'bg-success/15 text-success',
    'FALTA PAGO': 'bg-warning/15 text-warning',
    'NO SHOW':    'bg-error/15 text-error',
  };
  readonly BORDER_CLASS: Record<string, string> = {
    'PAGADO':     'border-l-success',
    'FALTA PAGO': 'border-l-warning',
    'NO SHOW':    'border-l-error',
  };

  ngOnInit() {
    this.load();
    this.loadSummary();
    this.aptSvc.findAll({ limit: 100 } as any).subscribe({ next: r => this.apartments.set(r.data) });
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

  openCreate() {
    this.isEditing   = false;
    this.editingId   = '';
    this.formGeneral = this.blankGeneral();
    this.formBilling = this.blankBilling();
    this.host        = this.blankGuest();
    this.members     = [];
    this.uploading   = {};
    this.modalTab.set('general');
    this.showCreate.set(true);
  }

  openEdit(b: IBooking, e: Event) {
    e.stopPropagation();
    this.isEditing = true;
    this.editingId = b._id;
    const aptId = typeof b.apartmentId === 'string' ? b.apartmentId : b.apartmentId._id;
    this.formGeneral = {
      apartmentId:  aptId,
      checkIn:      new Date(b.stay.checkIn).toISOString().slice(0, 10),
      checkOut:     new Date(b.stay.checkOut).toISOString().slice(0, 10),
      platform:     b.billing.platform,
      observations: b.observations,
    };
    this.formBilling = {
      basePrice:     b.billing.basePrice,
      amountReceived: b.billing.amountReceived,
      paymentMethod: b.billing.paymentMethod,
    };
    this.host = {
      fullName: b.group.host.fullName,
      idNumber: b.group.host.idNumber ?? '',
      country:  b.group.host.country  ?? '',
      city:     b.group.host.city     ?? '',
      identifications: (b.group.host.identifications ?? []).map(i => ({ url: i.url, publicId: '', type: i.type as IdType })),
    };
    this.members = b.group.members.map(m => ({
      fullName: m.fullName,
      idNumber: m.idNumber ?? '',
      country:  m.country  ?? '',
      city:     m.city     ?? '',
      identifications: (m.identifications ?? []).map(i => ({ url: i.url, publicId: '', type: i.type as IdType })),
    }));
    this.uploading = {};
    this.modalTab.set('general');
    this.showCreate.set(true);
  }

  openDeleteConfirm(b: IBooking, e: Event) {
    e.stopPropagation();
    this.selected.set(b);
    this.showDelete.set(true);
  }

  confirmDelete() {
    const id = this.selected()?._id;
    if (!id) return;
    this.saving.set(true);
    this.svc.delete(id).subscribe({
      next: () => {
        this.showDelete.set(false);
        this.saving.set(false);
        this.load(1);
        this.loadSummary();
      },
      error: () => this.saving.set(false),
    });
  }

  submitCreate() {
    if (!this.formGeneral.apartmentId || !this.host.fullName || !this.formGeneral.checkIn || !this.formGeneral.checkOut) return;
    this.saving.set(true);
    const payload = {
      apartmentId: this.formGeneral.apartmentId,
      group: {
        host:    { fullName: this.host.fullName,   idNumber: this.host.idNumber,   country: this.host.country,   city: this.host.city,   identifications: this.host.identifications },
        members: this.members.map(m => ({ fullName: m.fullName, idNumber: m.idNumber, country: m.country, city: m.city, identifications: m.identifications })),
      },
      stay:  { checkIn: this.formGeneral.checkIn, checkOut: this.formGeneral.checkOut },
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
    const req$ = this.isEditing
      ? this.svc.update(this.editingId, payload)
      : this.svc.create(payload);
    req$.subscribe({
      next: () => { this.showCreate.set(false); this.saving.set(false); this.load(1); this.loadSummary(); },
      error: () => this.saving.set(false),
    });
  }

  // ---- Guests ----
  addMember()       { this.members.push(this.blankGuest()); }
  removeMember(idx: number) { this.members.splice(idx, 1); }

  uploadPhoto(file: File, guestKey: string, type: IdType, target: GuestForm) {
    this.uploading[guestKey] = type;
    this.svc.uploadImage(file).subscribe({
      next: res => {
        const existing = target.identifications.findIndex(i => i.type === type);
        if (existing !== -1) target.identifications[existing] = { ...res, type };
        else target.identifications.push({ ...res, type });
        this.uploading[guestKey] = null;
      },
      error: () => { this.uploading[guestKey] = null; },
    });
  }

  onHostPhoto(event: Event, type: IdType) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.uploadPhoto(file, 'host', type, this.host);
    (event.target as HTMLInputElement).value = '';
  }

  onMemberPhoto(event: Event, idx: number, type: IdType) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.uploadPhoto(file, `member-${idx}`, type, this.members[idx]);
    (event.target as HTMLInputElement).value = '';
  }

  getPhoto(guest: GuestForm, type: IdType) {
    return guest.identifications.find(i => i.type === type);
  }

  removePhoto(guest: GuestForm, type: IdType) {
    guest.identifications = guest.identifications.filter(i => i.type !== type);
  }

  // ---- Payment modal ----
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
      },
      error: () => this.saving.set(false),
    });
  }

  // ---- Helpers ----
  totalGuests(b: IBooking) { return 1 + b.group.members.length; }
  nights(b: IBooking)      { return this.svc.nights(b); }
  pending(b: IBooking)     { return this.svc.pending(b); }
  aptName(b: IBooking)     { return this.svc.aptName(b); }

  paidPct(b: IBooking) {
    if (!b.billing.totalAmount) return 0;
    return Math.min(100, Math.round((b.billing.amountReceived / b.billing.totalAmount) * 100));
  }

  fmtNumber(n: number): string {
    if (!n) return '';
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n);
  }

  onPriceInput(e: Event, field: 'basePrice' | 'amountReceived') {
    const input = e.target as HTMLInputElement;
    const raw = input.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    const num = parseInt(raw, 10) || 0;
    this.formBilling[field] = num;
    input.value = num ? new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(num) : '';
  }

  fmtCOP(n: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  }

  fmtDate(d: string) {
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  pages() { return Array.from({ length: this.meta().totalPages }, (_, i) => i + 1); }

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
