import { ChangeDetectorRef, Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BookingsService } from '../../../core/services/bookings.service';
import { ApartmentsService } from '../../../core/services/apartments.service';
import { IBooking, IApartment, IExtraService } from '../../../core/interfaces';
import { COUNTRIES_DATA, CountryData } from './countries';
import { PlatformIcon } from '../../../shared/components/platform-icon';
import { PaymentMethodIcon } from '../../../shared/components/payment-method-icon';
import { AutocompleteSelect, AutocompleteOption } from '../../../shared/components/autocomplete-select';
import { CurrencyCopPipe } from '../../../shared/pipes/currency-cop.pipe';
import { DateEsPipe } from '../../../shared/pipes/date-es.pipe';
import { fmtNumber } from '../../../shared/utils/number.util';
import { PLATFORMS, METHODS, ID_TYPES, ID_LABELS, PLATFORM_CLASS, LIFECYCLE_STATUSES } from '../../../shared/constants/booking.constants';
import {
  LucideAngularModule,
  CalendarDays,
  Building2,
  LogIn,
  LogOut,
  MessageSquare,
  User,
  UserPlus,
  X,
  CreditCard,
  Banknote,
  Wallet,
  ScanLine,
  MapPin,
  IdCard,
  ArrowLeft,
  Car,
  Shirt,
  Package,
  Bike,
  Plus,
} from 'lucide-angular';

type FormTab = 'general' | 'guests' | 'billing';
type IdType = 'FRONT' | 'BACK' | 'SELFIE';

interface IdentPhoto {
  url: string;
  publicId: string;
  type: IdType;
}
interface GuestForm {
  uid: string;
  fullName: string;
  idNumber: string;
  birthDate: string;
  countryCode: string;
  department: string;
  city: string;
  identifications: IdentPhoto[];
}

@Component({
  selector: 'app-booking-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideAngularModule, PlatformIcon, PaymentMethodIcon, CurrencyCopPipe, DateEsPipe, AutocompleteSelect],
  templateUrl: './booking-form.html',
})
export class BookingFormComponent implements OnInit {
  readonly CalendarDays = CalendarDays;
  readonly Building2 = Building2;
  readonly LogIn = LogIn;
  readonly LogOut = LogOut;
  readonly MessageSquare = MessageSquare;
  readonly User = User;
  readonly UserPlus = UserPlus;
  readonly X = X;
  readonly CreditCard = CreditCard;
  readonly Banknote = Banknote;
  readonly Wallet = Wallet;
  readonly ScanLine = ScanLine;
  readonly MapPin = MapPin;
  readonly IdCard = IdCard;
  readonly ArrowLeft = ArrowLeft;
  readonly Car = Car;
  readonly Shirt = Shirt;
  readonly Package = Package;
  readonly Bike = Bike;
  readonly Plus = Plus;

  private bookingsService = inject(BookingsService);
  private apartmentsService = inject(ApartmentsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  isEditing = false;
  editingId = '';
  saving = signal(false);
  loading = signal(false);
  tab = signal<FormTab>('general');
  apartments = signal<IApartment[]>([]);

  formGeneral = this.blankGeneral();
  formBilling = this.blankBilling();
  host: GuestForm = this.blankGuest();
  members: GuestForm[] = [];
  uploading: Record<string, IdType | null> = {};

  readonly COUNTRIES_DATA = COUNTRIES_DATA;
  selectedCountry: CountryData | null = null;

  readonly TABS: { key: FormTab; label: string; icon: any }[] = [
    { key: 'general', label: 'General', icon: Building2 },
    { key: 'guests', label: 'Huéspedes', icon: User },
    { key: 'billing', label: 'Pagos', icon: CreditCard },
  ];

  readonly PLATFORMS = PLATFORMS;
  readonly METHODS = METHODS;
  readonly ID_TYPES = ID_TYPES;
  readonly ID_LABELS = ID_LABELS;
  readonly PLATFORM_CLASS = PLATFORM_CLASS;
  readonly LIFECYCLE_STATUSES = LIFECYCLE_STATUSES;
  lifecycleOptions = (): AutocompleteOption[] => this.LIFECYCLE_STATUSES.map(s => ({ label: s, value: s }));

  apartmentOptions = (): AutocompleteOption[] =>
    this.apartments().map(a => ({ label: a.internalName, value: a._id }));

  // Autocomplete helpers
  countryOptions = (): AutocompleteOption[] => this.COUNTRIES_DATA.map(c => ({ label: c.name, value: c.code }));
  deptOptions = (countryCode: string): AutocompleteOption[] => this.getDepartments(countryCode).map(d => ({ label: d.name, value: d.name }));
  cityOptions = (countryCode: string, dept: string): AutocompleteOption[] => this.getCities(countryCode, dept).map(c => ({ label: c, value: c }));

  ngOnInit() {
    this.apartmentsService
      .findAll({ limit: 100 } as any)
      .subscribe({ next: (r) => this.apartments.set(r.data) });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing = true;
      this.editingId = id;
      this.loading.set(true);
      this.bookingsService.findById(id).subscribe({
        next: (b) => {
          this.populateForm(b);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.router.navigate(['/bookings']);
        },
      });
    }
  }

  private populateForm(b: IBooking) {
    const aptId = typeof b.apartmentId === 'string' ? b.apartmentId : b.apartmentId._id;
    this.formGeneral = {
      apartmentId: aptId,
      checkIn: new Date(b.stay.checkIn).toISOString().slice(0, 10),
      checkOut: new Date(b.stay.checkOut).toISOString().slice(0, 10),
      platform: b.billing.platform,
      observations: b.observations,
      status: b.stay.status || 'PENDIENTE',
    };
    this.formBilling = {
      basePrice: b.billing.basePrice,
      amountReceived: b.billing.amountReceived,
      paymentMethod: b.billing.paymentMethod,
    };
    this.host = {
      uid: 'host',
      fullName: b.group.host.fullName,
      idNumber: b.group.host.idNumber ?? '',
      birthDate: b.group.host.birthDate ?? '',
      countryCode: b.group.host.location?.countryCode ?? '',
      department: b.group.host.location?.department ?? '',
      city: b.group.host.location?.city ?? '',
      identifications: (b.group.host.identifications ?? []).map((i) => ({
        url: i.url,
        publicId: i.publicId ?? '',
        type: i.type as IdType,
      })),
    };
    this.members = b.group.members.map((m, i) => ({
      uid: `g-${i}`,
      fullName: m.fullName,
      idNumber: m.idNumber ?? '',
      birthDate: m.birthDate ?? '',
      countryCode: m.location?.countryCode ?? '',
      department: m.location?.department ?? '',
      city: m.location?.city ?? '',
      identifications: (m.identifications ?? []).map((i) => ({
        url: i.url,
        publicId: i.publicId ?? '',
        type: i.type as IdType,
      })),
    }));
    this.extraServices = (b.billing.extraServices ?? []).map(s => ({ ...s }));
  }

  goBack() {
    this.router.navigate(['/bookings'], { queryParamsHandling: 'preserve' });
  }

  submit() {
    if (
      !this.formGeneral.apartmentId ||
      !this.host.fullName ||
      !this.formGeneral.checkIn ||
      !this.formGeneral.checkOut
    )
      return;
    this.saving.set(true);
    const payload = {
      apartmentId: this.formGeneral.apartmentId,
      group: {
        host: {
          fullName: this.host.fullName,
          idNumber: this.host.idNumber,
          birthDate: this.host.birthDate || undefined,
          location: this.host.countryCode
            ? { countryCode: this.host.countryCode, countryName: this.getCountryName(this.host.countryCode), department: this.host.department, city: this.host.city }
            : undefined,
          identifications: this.host.identifications,
        },
        members: this.members.map((m) => ({
          fullName: m.fullName,
          idNumber: m.idNumber,
          birthDate: m.birthDate || undefined,
          location: m.countryCode
            ? { countryCode: m.countryCode, countryName: this.getCountryName(m.countryCode), department: m.department, city: m.city }
            : undefined,
          identifications: m.identifications,
        })),
      },
      stay: { checkIn: this.formGeneral.checkIn, checkOut: this.formGeneral.checkOut, status: this.formGeneral.status || 'PENDIENTE' },
      billing: {
        basePrice: this.formBilling.basePrice,
        extraServices: this.extraServices,
        totalAmount: this.totalAmount,
        amountReceived: this.formBilling.amountReceived,
        platform: this.formGeneral.platform,
        paymentMethod: this.formBilling.paymentMethod,
        status:
          this.formBilling.amountReceived >= this.formBilling.basePrice ? 'PAGADO' : 'FALTA PAGO',
      },
      observations: this.formGeneral.observations,
    };
    const req$ = this.isEditing
      ? this.bookingsService.update(this.editingId, payload)
      : this.bookingsService.create(payload);
    req$.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/bookings'], { queryParamsHandling: 'preserve' });
      },
      error: () => this.saving.set(false),
    });
  }

  // ── Cascade selects ──
  onCountryChange(target: GuestForm) {
    target.department = '';
    target.city = '';
    this.selectedCountry = this.COUNTRIES_DATA.find((c) => c.code === target.countryCode) ?? null;
  }

  onDepartmentChange(target: GuestForm) {
    target.city = '';
  }

  getDepartments(countryCode: string): { name: string; cities: string[] }[] {
    const country = this.COUNTRIES_DATA.find((c) => c.code === countryCode);
    return country ? country.departments : [];
  }

  getCities(countryCode: string, department: string): string[] {
    const country = this.COUNTRIES_DATA.find((c) => c.code === countryCode);
    const dept = country?.departments.find((d) => d.name === department);
    return dept ? dept.cities : [];
  }

  getCountryName(code: string): string {
    return this.COUNTRIES_DATA.find((c) => c.code === code)?.name ?? '';
  }

  // ── Guests ──
  addMember() {
    this.members.push(this.blankGuest());
  }

  private deleteOldPhoto(guest: GuestForm | undefined, type: IdType) {
    const old = guest?.identifications?.find((i) => i.type === type);
    if (old?.publicId) this.bookingsService.deleteImage(old.publicId).subscribe();
  }

  uploadPhoto(file: File, key: string, type: IdType, target: GuestForm) {
    this.uploading[key] = type;
    if (target) this.deleteOldPhoto(target, type);
    this.bookingsService.uploadImage(file).subscribe({
      next: (res) => {
        if (!target) {
          this.uploading[key] = null;
          this.cdr.detectChanges();
          return;
        }
        const url = res.url;
        const publicId = res.publicId;
        const idx = target.identifications.findIndex((i) => i.type === type);
        if (idx !== -1) {
          target.identifications[idx] = { url, publicId, type };
        } else {
          target.identifications = [...target.identifications, { url, publicId, type }];
        }
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
    guest.identifications = guest.identifications.filter((i) => i.type !== type);
  }

  removeMember(i: number) {
    const member = this.members[i];
    if (member) {
      member.identifications.forEach((id) => {
        if (id.publicId) this.bookingsService.deleteImage(id.publicId).subscribe();
      });
    }
    this.members.splice(i, 1);
  }

  onHostPhoto(e: Event, type: IdType) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.uploadPhoto(file, 'host', type, this.host);
    (e.target as HTMLInputElement).value = '';
  }

  onMemberPhoto(e: Event, member: GuestForm, type: IdType) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      this.uploadPhoto(file, member.uid, type, member);
    }
    (e.target as HTMLInputElement).value = '';
  }

  getPhoto(guest: GuestForm, type: IdType) {
    return guest.identifications.find((i) => i.type === type);
  }

  // ── Extra Services ──
  readonly EXTRA_SERVICE_TYPES = ['PARKING', 'LAUNDRY', 'OTHER'] as const;
  readonly VEHICLE_TYPES = ['CAR', 'MOTORCYCLE', 'BICYCLE', 'OTHER'] as const;

  extraServices: IExtraService[] = [];

  get totalAmount(): number {
    const extrasTotal = this.extraServices.reduce((sum, s) => sum + s.price * s.quantity, 0);
    return this.formBilling.basePrice + extrasTotal;
  }

  extrasTotal(): number {
    return this.extraServices.reduce((sum, s) => sum + s.price * s.quantity, 0);
  }

  addExtraService() {
    this.extraServices = [...this.extraServices, {
      type: 'OTHER',
      description: '',
      quantity: 1,
      price: 0,
    }];
  }

  removeExtraService(idx: number) {
    this.extraServices = this.extraServices.filter((_, i) => i !== idx);
  }

  onExtraServicePriceInput(e: Event, idx: number) {
    const input = e.target as HTMLInputElement;
    const raw = input.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    const num = parseInt(raw, 10) || 0;
    this.extraServices[idx] = { ...this.extraServices[idx], price: num };
    input.value = num
      ? new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(num)
      : '';
  }

  onExtraServiceTypeChange(value: string, idx: number) {
    this.extraServices[idx] = {
      ...this.extraServices[idx],
      type: value as IExtraService['type'],
      vehicleType: undefined,
      weightKg: undefined,
    };
  }

  onVehicleTypeChange(value: string, idx: number) {
    this.extraServices[idx] = { ...this.extraServices[idx], vehicleType: value as IExtraService['vehicleType'] };
  }

  // ── Billing ──
  onPriceInput(e: Event, field: 'basePrice' | 'amountReceived') {
    const input = e.target as HTMLInputElement;
    const raw = input.value.replace(/\./g, '').replace(/[^0-9]/g, '');
    const num = parseInt(raw, 10) || 0;
    this.formBilling[field] = num;
    input.value = num
      ? new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(num)
      : '';
  }

  fmtNumber = fmtNumber;

  formPaidPct() {
    const total = this.totalAmount;
    if (!total) return 0;
    return Math.min(100, Math.round((this.formBilling.amountReceived / total) * 100));
  }

  private blankGeneral(): {
    apartmentId: string;
    checkIn: string;
    checkOut: string;
    platform: string;
    observations: string;
    status: string;
  } {
    return { apartmentId: '', checkIn: '', checkOut: '', platform: 'Directo', observations: '', status: 'PENDIENTE' };
  }
  private blankBilling(): { basePrice: number; amountReceived: number; paymentMethod: string } {
    return { basePrice: 0, amountReceived: 0, paymentMethod: 'Efectivo' };
  }
  private uidCounter = 0;
  private blankGuest(): GuestForm {
    return {
      uid: `g-${++this.uidCounter}`,
      fullName: '',
      idNumber: '',
      birthDate: '',
      countryCode: '',
      department: '',
      city: '',
      identifications: [],
    };
  }
}
