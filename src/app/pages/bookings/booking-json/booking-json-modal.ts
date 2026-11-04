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
      <div class="stack" style="--gap: var(--sp-4)">

      <!-- ── Apartamento (obligatorio): su id se agrega al JSON al crear ── -->
      <div class="field">
        <span class="field-label lbl">
          <lucide-icon [img]="Building2" [size]="16" [strokeWidth]="2" />
          Apartamento <span class="t-danger">*</span>
        </span>
        <autocomplete-select
          [options]="apartmentOptions()"
          [value]="selectedApt()"
          (valueChange)="selectedApt.set($event)"
          [readonly]="true"
          placeholder="Seleccionar apartamento" />
        @if (!selectedApt() && text().trim()) {
          <p class="tiny t-danger">Selecciona un apartamento para crear la reserva</p>
        }
      </div>

      <!-- ── Tabs ── -->
      <div class="tabs full" role="tablist">
        <button role="tab" [attr.aria-selected]="tab() === 'model'" (click)="tab.set('model')">
          <lucide-icon [img]="FileCode" [size]="16" [strokeWidth]="2" />
          Modelo
        </button>
        <button role="tab" [attr.aria-selected]="tab() === 'json'" (click)="tab.set('json')">
          <lucide-icon [img]="Braces" [size]="16" [strokeWidth]="2" />
          Insertar JSON
        </button>
        <button role="tab" [attr.aria-selected]="tab() === 'image'" (click)="tab.set('image')">
          <lucide-icon [img]="ImageUp" [size]="16" [strokeWidth]="2" />
          Imagen
        </button>
      </div>

      <!-- ══════ TAB: MODELO ══════ -->
      @if (tab() === 'model') {
        <p class="small soft">
          Copia este modelo, reemplaza los datos y pégalo en <span class="strong">Insertar JSON</span>.
        </p>
        <div class="code-wrap">
          <pre class="code">{{ modelText }}</pre>
          <button class="icon-btn copy" (click)="copyModel()" title="Copiar modelo" aria-label="Copiar modelo">
            <lucide-icon [img]="copied() ? Check : Copy" [size]="16" [strokeWidth]="2" />
          </button>
        </div>
        <ul class="enums">
          <li><b>platform:</b> {{ PLATFORMS.join(' · ') }}</li>
          <li><b>paymentMethod:</b> {{ METHODS.join(' · ') }}</li>
          <li><b>status:</b> {{ STATUSES.join(' · ') }}</li>
          <li><b>extraServices.type:</b> PARKING · LAUNDRY · OTHER</li>
        </ul>
      }

      <!-- ══════ TAB: INSERTAR JSON ══════ -->
      @if (tab() === 'json') {
        <div class="field">
          <div class="row between">
            <span class="field-label">Pega aquí el JSON de la reserva</span>
            <button data-size="sm" data-variant="ghost" (click)="useModel()">
              <lucide-icon [img]="ClipboardPaste" [size]="14" [strokeWidth]="2" />
              Usar modelo
            </button>
          </div>
          <textarea class="mono" [ngModel]="text()" (ngModelChange)="text.set($event)" rows="16" spellcheck="false" autocomplete="off"
            placeholder='{ "group": { ... }, "stay": { ... }, "billing": { ... } }'
            [attr.aria-invalid]="errors().length ? true : null"></textarea>

          @if (errors().length) {
            <ul class="errs">
              @for (e of errors(); track e) { <li>• {{ e }}</li> }
            </ul>
          } @else if (text().trim()) {
            <p class="tiny t-success">JSON válido</p>
          }
        </div>
      }

      <!-- ══════ TAB: IMAGEN (screenshot → JSON con IA) ══════ -->
      @if (tab() === 'image') {
        <p class="small soft">
          Sube o pega (Ctrl/Cmd+V) el screenshot de Booking o AirBnB. La IA arma el JSON y lo revisas antes de crear.
        </p>
        <label class="drop" [class.busy]="reading()" [class.over]="dragging()"
          (dragover)="$event.preventDefault(); dragging.set(true)"
          (dragleave)="dragging.set(false)"
          (drop)="onDrop($event)">
          <input type="file" accept="image/*" (change)="onFileInput($event)" [disabled]="reading()" />
          @if (imagePreview(); as src) {
            <img [src]="src" alt="Screenshot de la reserva" class="shot" />
            <p class="tiny soft truncate">{{ imageFile()?.name }} · clic para cambiar</p>
          } @else {
            <lucide-icon [img]="ImageUp" [size]="32" [strokeWidth]="1.6" />
            <p>Arrastra, pega o haz clic para elegir la imagen</p>
          }
        </label>
        <input [ngModel]="hint()" (ngModelChange)="hint.set($event)" [disabled]="reading()"
          placeholder="Nota opcional para la IA (ej: son 2 adultos y un niño)" />
        @if (reading()) {
          <p class="tiny soft row" style="--gap: 6px">
            <lucide-icon class="spin t-brand" [img]="LoaderCircle" [size]="16" [strokeWidth]="2" />
            Leyendo imagen… puede tardar hasta un par de minutos.
          </p>
        } @else if (readError(); as err) {
          <p class="tiny t-danger">{{ err }}</p>
        }
      }
      </div>
    </modal-nova>

    <ng-template #footer>
      <div class="modal-actions">
        <button data-variant="ghost" (click)="closed.emit()">Cancelar</button>
        @if (tab() === 'image') {
          <button data-tone="ai" (click)="readImage()" [disabled]="!imageFile() || reading()" [attr.aria-busy]="reading() || null">
            @if (!reading()) { <lucide-icon [img]="Sparkles" [size]="16" [strokeWidth]="2.2" /> }
            {{ reading() ? 'Leyendo...' : 'Leer con IA' }}
          </button>
        } @else {
          <button data-tone="brand" (click)="submit()" [disabled]="tab() !== 'json' || !parsed() || !selectedApt() || saving()" [attr.aria-busy]="saving() || null">
            {{ saving() ? 'Guardando...' : 'Crear reserva' }}
          </button>
        }
      </div>
    </ng-template>
  `,
  styles: `
    .lbl { display: flex; align-items: center; gap: 6px; }
    .lbl lucide-icon { color: var(--brand); }
    .code-wrap { position: relative; }
    .code {
      margin: 0;
      max-height: 45vh;
      overflow: auto;
      padding: var(--sp-4);
      font-family: var(--font-mono);
      font-size: var(--fs-caption);
      color: var(--text-1);
      background: var(--bg-0);
      border: var(--border) solid var(--line);
      border-radius: var(--r-md);
    }
    .copy { position: absolute; top: var(--sp-2); right: var(--sp-2); background: var(--bg-2); }
    .enums { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; font-size: var(--fs-caption); color: var(--text-2); }
    .enums b { color: var(--text-1); font-weight: var(--fw-semibold); }
    textarea.mono { font-family: var(--font-mono); font-size: var(--fs-caption); resize: vertical; }
    .errs { margin: 0; padding: 0; list-style: none; font-size: var(--fs-caption); color: var(--danger); }
    .shot { max-height: 35vh; margin-inline: auto; border-radius: var(--r-sm, 10px); }
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
