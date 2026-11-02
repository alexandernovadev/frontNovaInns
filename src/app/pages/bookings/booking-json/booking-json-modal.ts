import { Component, inject, input, output, signal, computed, effect, untracked, OnInit, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Braces, FileCode, Copy, Check, ClipboardPaste, Building2, ImageUp, Sparkles, LoaderCircle } from 'lucide-angular';
import { ModalNova } from '../../../shared/components/modal-nova';
import { AutocompleteSelect, AutocompleteOption } from '../../../shared/components/autocomplete-select';
import { ApartmentsService } from '../../../core/services/apartments.service';
import { AssistantService } from '../../../core/services/assistant.service';
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

type Tab = 'model' | 'json' | 'image';

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
          [class]="tab() === 'model' ? 'tab-active' : 'text-text-secondary hover:text-text-primary'">
          <lucide-icon [img]="FileCode" class="w-4 h-4" [strokeWidth]="2" />
          Modelo
        </button>
        <button (click)="tab.set('json')"
          class="flex-1 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          [class]="tab() === 'json' ? 'tab-active' : 'text-text-secondary hover:text-text-primary'">
          <lucide-icon [img]="Braces" class="w-4 h-4" [strokeWidth]="2" />
          Insertar JSON
        </button>
        <button (click)="tab.set('image')"
          class="flex-1 py-2 text-sm font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          [class]="tab() === 'image' ? 'tab-active' : 'text-text-secondary hover:text-text-primary'">
          <lucide-icon [img]="ImageUp" class="w-4 h-4" [strokeWidth]="2" />
          Imagen
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

      <!-- ══════ TAB: IMAGEN (screenshot → JSON con IA) ══════ -->
      @if (tab() === 'image') {
        <p class="text-text-secondary text-sm mb-3">
          Sube o pega (Ctrl/Cmd+V) el screenshot de Booking o AirBnB. La IA arma el JSON y lo revisas antes de crear.
        </p>
        <label
          class="block border-2 border-dashed rounded-xl p-4 text-center transition-colors"
          [class]="reading() ? 'border-border opacity-60' : dragging() ? 'border-brand bg-brand/5 cursor-pointer' : 'border-border hover:border-brand cursor-pointer'"
          (dragover)="$event.preventDefault(); dragging.set(true)"
          (dragleave)="dragging.set(false)"
          (drop)="onDrop($event)">
          <input type="file" accept="image/*" class="hidden" (change)="onFileInput($event)" [disabled]="reading()" />
          @if (imagePreview(); as src) {
            <img [src]="src" alt="Screenshot de la reserva" class="max-h-[35vh] mx-auto rounded-lg" />
            <p class="mt-2 text-xs text-text-secondary truncate">{{ imageFile()?.name }} · clic para cambiar</p>
          } @else {
            <lucide-icon [img]="ImageUp" class="w-8 h-8 text-text-disabled mx-auto mb-2" [strokeWidth]="1.5" />
            <p class="text-sm text-text-secondary">Arrastra, pega o haz clic para elegir la imagen</p>
          }
        </label>
        <input [ngModel]="hint()" (ngModelChange)="hint.set($event)" [disabled]="reading()"
          placeholder="Nota opcional para la IA (ej: son 2 adultos y un niño)"
          class="mt-3 w-full bg-input border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm
                 placeholder:text-text-disabled focus:outline-none focus:border-brand transition-colors" />
        @if (reading()) {
          <p class="mt-3 text-xs text-text-secondary flex items-center gap-1.5">
            <lucide-icon [img]="LoaderCircle" class="w-4 h-4 animate-spin text-brand" [strokeWidth]="2" />
            Leyendo imagen… puede tardar hasta un par de minutos.
          </p>
        } @else if (readError(); as err) {
          <p class="mt-3 text-xs text-error">{{ err }}</p>
        }
      }
    </modal-nova>

    <ng-template #footer>
      <div class="flex gap-3">
        <button (click)="closed.emit()"
          class="flex-1 border border-border text-text-secondary hover:text-text-primary py-2.5 rounded-xl text-sm cursor-pointer">Cancelar</button>
        @if (tab() === 'image') {
          <button (click)="readImage()" [disabled]="!imageFile() || reading()"
            class="flex-1 bg-brand hover:bg-brand-accent text-bg font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5">
            <lucide-icon [img]="reading() ? LoaderCircle : Sparkles" class="w-4 h-4" [class.animate-spin]="reading()" [strokeWidth]="2" />
            {{ reading() ? 'Leyendo...' : 'Leer con IA' }}
          </button>
        } @else {
          <button (click)="submit()" [disabled]="tab() !== 'json' || !parsed() || !selectedApt() || saving()"
            class="flex-1 bg-brand hover:bg-brand-accent text-bg font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 cursor-pointer">
            {{ saving() ? 'Guardando...' : 'Crear reserva' }}
          </button>
        }
      </div>
    </ng-template>
  `,
})
export class BookingJsonModal implements OnInit {
  private apartmentsService = inject(ApartmentsService);
  private assistantService = inject(AssistantService);

  readonly Braces = Braces;
  readonly FileCode = FileCode;
  readonly Copy = Copy;
  readonly Check = Check;
  readonly ClipboardPaste = ClipboardPaste;
  readonly Building2 = Building2;
  readonly ImageUp = ImageUp;
  readonly Sparkles = Sparkles;
  readonly LoaderCircle = LoaderCircle;
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

  // Tab "Imagen"
  imageFile = signal<File | null>(null);
  imagePreview = signal<string | null>(null);
  hint = signal('');
  dragging = signal(false);
  reading = signal(false);
  readError = signal<string | null>(null);
  private readSub: Subscription | null = null;

  constructor() {
    // Al abrir: arranca en "Modelo" con todo limpio. Al cerrar: cancela la lectura en curso.
    // untracked: el effect solo debe depender de visible(), no de las señales que limpia
    effect(() => {
      const open = this.visible();
      untracked(() => {
        if (open) {
          this.tab.set('model');
          this.text.set('');
          this.selectedApt.set('');
          this.setImage(null);
          this.hint.set('');
        } else {
          this.cancelRead();
        }
      });
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

  // Pegar un screenshot con Ctrl/Cmd+V mientras está abierto el tab "Imagen"
  @HostListener('document:paste', ['$event'])
  onPaste(e: ClipboardEvent) {
    if (!this.visible() || this.tab() !== 'image' || this.reading()) return;
    const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      this.setImage(file);
    }
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging.set(false);
    if (this.reading()) return;
    const file = Array.from(e.dataTransfer?.files ?? []).find((f) => f.type.startsWith('image/'));
    if (file) this.setImage(file);
  }

  onFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.setImage(file);
    input.value = '';
  }

  private setImage(file: File | null) {
    const prev = this.imagePreview();
    if (prev) URL.revokeObjectURL(prev);
    this.imageFile.set(file);
    this.imagePreview.set(file ? URL.createObjectURL(file) : null);
    this.readError.set(null);
  }

  readImage() {
    const file = this.imageFile();
    if (!file || this.reading()) return;
    this.reading.set(true);
    this.readError.set(null);
    this.readSub = this.assistantService.extractBooking(file, this.hint()).subscribe({
      next: (r) => {
        this.reading.set(false);
        // Pasa al tab JSON con el resultado para revisarlo, elegir apto y crear
        this.text.set(JSON.stringify(r.booking, null, 2));
        this.tab.set('json');
      },
      error: (err) => {
        this.reading.set(false);
        this.readError.set(err?.error?.message ?? 'No se pudo leer la imagen. Intenta de nuevo.');
      },
    });
  }

  private cancelRead() {
    this.readSub?.unsubscribe();
    this.readSub = null;
    this.reading.set(false);
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
