import { Component, inject, input, output, signal, computed, effect, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Braces, FileCode, Copy, Check, ClipboardPaste, Building2 } from 'lucide-angular';
import { ModalNova } from '../../../shared/components/modal-nova';
import { AutocompleteSelect, AutocompleteOption } from '../../../shared/components/autocomplete-select';
import { ApartmentsService } from '../../../core/services/apartments.service';
import { PLATFORMS, METHODS, STATUSES } from '../../../shared/constants/booking.constants';

// Plantilla del tab "Modelo" (forma de POST /bookings, sin apartmentId: sale del select)
const BOOKING_MODEL = {
  group: {
    host: {
      fullName: 'Juan Pérez',
      idNumber: '1234567890',
      birthDate: '1990-05-20',
      location: { countryCode: 'CO', countryName: 'Colombia', department: 'Antioquia', city: 'Medellín' },
    },
    members: [{ fullName: 'María Gómez', idNumber: '0987654321' }],
  },
  stay: { checkIn: '2026-11-01', checkOut: '2026-11-04', status: 'PENDIENTE' },
  billing: {
    basePrice: 450000,
    extraServices: [],
    totalAmount: 450000,
    amountReceived: 0,
    platform: 'Directo',
    paymentMethod: 'None',
    status: 'FALTA PAGO',
  },
  observations: '',
};

const MODEL_TEXT = JSON.stringify(BOOKING_MODEL, null, 2);

type Tab = 'model' | 'json';

@Component({
  selector: 'booking-json-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideAngularModule, ModalNova, AutocompleteSelect],
  template: `
    <modal-nova [visible]="visible()" title="Reserva desde JSON" size="lg" (closed)="closed.emit()"
      [footerTemplate]="footer">

      <!-- ── Apartamento (obligatorio): su id se agrega al JSON al crear ── -->
      <div class="mb-4">
        <label class="text-text-secondary text-sm mb-1.5 flex items-center gap-1.5">
          <lucide-icon [img]="Building2" class="w-4 h-4 text-brand" [strokeWidth]="2" />
          Apartamento <span class="text-error">*</span>
        </label>
        <autocomplete-select
          [options]="apartmentOptions()"
          [value]="selectedApt()"
          (valueChange)="selectedApt.set($event)"
          [readonly]="true"
          placeholder="Seleccionar apartamento" />
        @if (!selectedApt() && text().trim()) {
          <p class="mt-1.5 text-xs text-error">Selecciona un apartamento para crear la reserva</p>
        }
      </div>

      <!-- ── Tabs ── -->
      <div class="flex gap-1 bg-bg border border-border rounded-2xl p-1 mb-4">
        <button (click)="tab.set('model')"
          class="flex-1 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          [class]="tab() === 'model' ? 'bg-brand text-bg' : 'text-text-secondary hover:text-text-primary'">
          <lucide-icon [img]="FileCode" class="w-4 h-4" [strokeWidth]="2" />
          Modelo
        </button>
        <button (click)="tab.set('json')"
          class="flex-1 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          [class]="tab() === 'json' ? 'bg-brand text-bg' : 'text-text-secondary hover:text-text-primary'">
          <lucide-icon [img]="Braces" class="w-4 h-4" [strokeWidth]="2" />
          Insertar JSON
        </button>
      </div>

      <!-- ══════ TAB: MODELO ══════ -->
      @if (tab() === 'model') {
        <p class="text-text-secondary text-sm mb-3">
          Copia este modelo, reemplaza los datos y pégalo en <span class="text-text-primary font-medium">Insertar JSON</span>.
        </p>
        <div class="relative">
          <pre class="bg-bg border border-border rounded-xl p-4 text-xs text-text-primary font-mono overflow-auto max-h-[45vh]">{{ modelText }}</pre>
          <button (click)="copyModel()" title="Copiar modelo"
            class="absolute top-2 right-2 p-1.5 rounded-lg bg-elevated border border-border text-text-secondary hover:text-brand transition-colors cursor-pointer">
            <lucide-icon [img]="copied() ? Check : Copy" class="w-4 h-4" [strokeWidth]="2" />
          </button>
        </div>
        <ul class="mt-3 space-y-1 text-xs text-text-secondary">
          <li><span class="text-text-primary font-medium">platform:</span> {{ PLATFORMS.join(' · ') }}</li>
          <li><span class="text-text-primary font-medium">paymentMethod:</span> {{ METHODS.join(' · ') }}</li>
          <li><span class="text-text-primary font-medium">status:</span> {{ STATUSES.join(' · ') }}</li>
          <li><span class="text-text-primary font-medium">extraServices.type:</span> PARKING · LAUNDRY · OTHER</li>
        </ul>
      }

      <!-- ══════ TAB: INSERTAR JSON ══════ -->
      @if (tab() === 'json') {
        <div class="flex items-center justify-between mb-2">
          <label class="text-text-secondary text-sm">Pega aquí el JSON de la reserva</label>
          <button (click)="useModel()"
            class="text-xs text-text-secondary hover:text-brand flex items-center gap-1 cursor-pointer transition-colors">
            <lucide-icon [img]="ClipboardPaste" class="w-3.5 h-3.5" [strokeWidth]="2" />
            Usar modelo
          </button>
        </div>
        <textarea [ngModel]="text()" (ngModelChange)="text.set($event)" rows="16" spellcheck="false" autocomplete="off"
          placeholder='{ "group": { ... }, "stay": { ... }, "billing": { ... } }'
          class="w-full bg-input border rounded-xl px-4 py-2.5 text-text-primary font-mono text-xs
                 placeholder:text-text-disabled focus:outline-none resize-none transition-colors"
          [class]="errors().length ? 'border-error focus:border-error' : 'border-border focus:border-brand'"></textarea>

        @if (errors().length) {
          <ul class="mt-2 space-y-0.5 text-xs text-error">
            @for (e of errors(); track e) { <li>• {{ e }}</li> }
          </ul>
        } @else if (text().trim()) {
          <p class="mt-2 text-xs text-success">JSON válido</p>
        }
      }
    </modal-nova>

    <ng-template #footer>
      <div class="flex gap-3">
        <button (click)="closed.emit()"
          class="flex-1 border border-border text-text-secondary hover:text-text-primary py-2.5 rounded-xl text-sm cursor-pointer">Cancelar</button>
        <button (click)="submit()" [disabled]="tab() !== 'json' || !parsed() || !selectedApt() || saving()"
          class="flex-1 bg-brand hover:bg-brand-accent text-bg font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 cursor-pointer">
          {{ saving() ? 'Guardando...' : 'Crear reserva' }}
        </button>
      </div>
    </ng-template>
  `,
})
export class BookingJsonModal implements OnInit {
  private apartmentsService = inject(ApartmentsService);

  readonly Braces = Braces;
  readonly FileCode = FileCode;
  readonly Copy = Copy;
  readonly Check = Check;
  readonly ClipboardPaste = ClipboardPaste;
  readonly Building2 = Building2;
  readonly PLATFORMS = PLATFORMS;
  readonly METHODS = METHODS;
  readonly STATUSES = STATUSES;
  readonly modelText = MODEL_TEXT;

  visible = input(false);
  saving = input(false);

  closed = output<void>();
  submitted = output<any>();

  apartmentOptions = signal<AutocompleteOption[]>([]);
  selectedApt = signal('');

  tab = signal<Tab>('model');
  text = signal('');
  copied = signal(false);

  constructor() {
    // Al abrir: arranca en "Modelo" con el textarea limpio
    effect(() => {
      if (this.visible()) {
        this.tab.set('model');
        this.text.set('');
        this.selectedApt.set('');
      }
    });
  }

  ngOnInit() {
    this.apartmentsService.findAll({ limit: 100 } as any).subscribe({
      next: (r) => this.apartmentOptions.set(r.data.map((a) => ({ label: a.internalName, value: a._id }))),
    });
  }

  private result = computed<{ data: any; errors: string[] }>(() => {
    const raw = this.text().trim();
    if (!raw) return { data: null, errors: [] };

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return { data: null, errors: [`JSON inválido: ${(e as Error).message}`] };
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { data: null, errors: ['El JSON debe ser un objeto { ... }'] };
    }
    return { data, errors: validateBooking(data) };
  });

  errors = computed(() => this.result().errors);
  parsed = computed(() => (this.result().errors.length ? null : this.result().data));

  copyModel() {
    navigator.clipboard?.writeText(this.modelText).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    });
  }

  useModel() {
    this.text.set(this.modelText);
  }

  submit() {
    const data = this.parsed();
    const apartmentId = this.selectedApt();
    // El apartamento siempre sale del select, aunque el JSON traiga uno
    if (data && apartmentId) this.submitted.emit({ ...data, apartmentId });
  }
}

// Validación mínima de los campos requeridos por el schema del back
function validateBooking(d: any): string[] {
  const errs: string[] = [];
  const isNum = (v: any) => typeof v === 'number' && !isNaN(v);
  const isDate = (v: any) => typeof v === 'string' && !isNaN(new Date(v).getTime());

  if (!d.group?.host?.fullName) errs.push('group.host.fullName es requerido');
  if (d.group?.members !== undefined && !Array.isArray(d.group.members)) errs.push('group.members debe ser un array');

  if (!isDate(d.stay?.checkIn)) errs.push('stay.checkIn debe ser una fecha (YYYY-MM-DD)');
  if (!isDate(d.stay?.checkOut)) errs.push('stay.checkOut debe ser una fecha (YYYY-MM-DD)');
  if (isDate(d.stay?.checkIn) && isDate(d.stay?.checkOut) && new Date(d.stay.checkOut) <= new Date(d.stay.checkIn)) {
    errs.push('stay.checkOut debe ser posterior a stay.checkIn');
  }

  const b = d.billing;
  if (!b) {
    errs.push('billing es requerido');
  } else {
    if (!isNum(b.basePrice)) errs.push('billing.basePrice debe ser un número');
    if (!isNum(b.totalAmount)) errs.push('billing.totalAmount debe ser un número');
    if (b.amountReceived !== undefined && !isNum(b.amountReceived)) errs.push('billing.amountReceived debe ser un número');
    if (!PLATFORMS.includes(b.platform)) errs.push(`billing.platform debe ser: ${PLATFORMS.join(', ')}`);
    if (b.paymentMethod !== undefined && !METHODS.includes(b.paymentMethod)) errs.push(`billing.paymentMethod debe ser: ${METHODS.join(', ')}`);
    if (b.status !== undefined && !STATUSES.includes(b.status)) errs.push(`billing.status debe ser: ${STATUSES.join(', ')}`);
  }
  return errs;
}
