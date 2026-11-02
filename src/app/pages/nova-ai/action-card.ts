import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, Pencil, Trash2, ArrowRight } from 'lucide-angular';
import { ActionCard } from '../../core/services/assistant.service';
import { fmtNumber } from '../../shared/utils/number.util';

// Nombre legible de cada campo que NovaAI puede proponer cambiar
const FIELD_LABELS: Record<string, string> = {
  'group.host.fullName': 'Huésped',
  'group.members': 'Acompañantes',
  apartmentId: 'Apartamento',
  'stay.checkIn': 'Entrada',
  'stay.checkOut': 'Salida',
  'stay.status': 'Estadía',
  'billing.basePrice': 'Precio base',
  'billing.extraServices': 'Servicios extra',
  'billing.totalAmount': 'Total',
  'billing.amountReceived': 'Recibido',
  'billing.platform': 'Plataforma',
  'billing.paymentMethod': 'Método de pago',
  'billing.status': 'Estado de pago',
  observations: 'Observaciones',
  internalName: 'Nombre',
  status: 'Estado',
  description: 'Descripción',
  amount: 'Monto',
  category: 'Categoría',
  date: 'Fecha',
  paymentMethod: 'Método de pago',
  notes: 'Notas',
};
const MONEY_FIELDS = new Set(['billing.basePrice', 'billing.totalAmount', 'billing.amountReceived', 'amount']);
const STATUS_TEXT: Record<string, string> = {
  cancelled: 'Cancelada',
  expired: 'Vencida',
  confirmed: '✅ Hecho',
  failed: 'No se aplicó',
  undone: 'Deshecha',
};

@Component({
  selector: 'nova-action-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    @let c = card();
    @let isDelete = c.type === 'delete';
    <div class="w-full sm:max-w-[85%] mt-2.5 rounded-2xl overflow-hidden border nova-in bg-gradient-to-b from-elevated to-surface"
      [class]="isDelete
        ? 'border-error/40 shadow-[0_8px_30px_-12px_rgba(239,68,68,0.35)]'
        : 'border-brand/40 shadow-[0_8px_30px_-12px_rgba(242,194,0,0.35)]'"
      [class.opacity-60]="c.status !== 'pending' && c.status !== 'confirmed'">
      <div class="h-1" [class]="isDelete ? 'bg-gradient-to-r from-error to-rose-400' : 'bg-gradient-to-r from-brand-accent to-brand-pressed'"></div>
      <div class="px-4 py-3 border-b border-border flex items-start gap-3">
        <span class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          [class]="isDelete ? 'bg-error/15 text-error' : 'bg-brand/15 text-brand'">
          <lucide-icon [img]="isDelete ? Trash2 : Pencil" class="w-4 h-4" [strokeWidth]="2" />
        </span>
        <div class="min-w-0">
          <p class="text-sm font-semibold" [class]="isDelete ? 'text-error' : 'text-brand'">{{ isDelete ? '¿Eliminar?' : '¿Editar?' }}</p>
          <p class="text-text-secondary text-xs">{{ c.summary }}</p>
        </div>
      </div>

      @for (t of c.targets; track t.id) {
        <div class="px-4 py-3 border-b border-border last:border-0">
          <p class="text-text-primary text-xs font-medium mb-2">{{ t.label }}</p>
          @if (isDelete) {
            <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              @for (d of t.details; track d.field) {
                <dt class="text-text-disabled">{{ label(d.field) }}</dt>
                <dd class="text-text-secondary break-words">{{ format(d.field, d.value) }}</dd>
              }
            </dl>
          } @else {
            <div class="space-y-1.5">
              @for (ch of t.changes; track ch.field) {
                <div class="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 text-xs items-baseline">
                  <span class="text-text-disabled truncate">{{ label(ch.field) }}</span>
                  <span class="flex flex-wrap items-center gap-1.5 min-w-0">
                    <span class="text-text-disabled line-through break-words">{{ format(ch.field, ch.before) }}</span>
                    <lucide-icon [img]="ArrowRight" class="w-3 h-3 text-text-disabled shrink-0" [strokeWidth]="2" />
                    <span class="px-1.5 py-px rounded-md bg-brand/10 text-brand-accent font-semibold break-words">{{ format(ch.field, ch.after) }}</span>
                  </span>
                </div>
              }
            </div>
          }
        </div>
      }

      <div class="px-4 py-3 bg-bg/40 flex items-center justify-end gap-2">
        @if (c.status === 'pending') {
          <button (click)="cancel.emit(c.id)" [disabled]="busy()"
            class="px-4 py-2 rounded-xl border border-border text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer disabled:opacity-50">
            Cancelar
          </button>
          <button (click)="confirm.emit(c.id)" [disabled]="busy()"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            [class]="isDelete ? 'bg-error hover:bg-error/80 text-white' : 'bg-brand hover:bg-brand-accent text-bg'">
            {{ busy() ? 'Guardando…' : isDelete ? 'Eliminar' : 'Confirmar' }}
          </button>
        } @else {
          <span class="text-xs" [class]="c.status === 'confirmed' ? 'text-success font-semibold' : c.status === 'failed' ? 'text-error' : 'text-text-disabled'">
            {{ statusText(c.status) }}
          </span>
        }
      </div>
    </div>
  `,
})
export class NovaActionCard {
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;
  readonly ArrowRight = ArrowRight;

  card = input.required<ActionCard>();
  busy = input(false);
  // id → nombre, para mostrar el apartamento en vez de su _id
  apartmentNames = input<Record<string, string>>({});

  cancel = output<string>();
  confirm = output<string>();

  label(field: string) {
    return FIELD_LABELS[field] ?? field;
  }

  statusText(status: string) {
    return STATUS_TEXT[status] ?? status;
  }

  format(field: string, value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (field === 'apartmentId') return this.apartmentNames()[String(value)] ?? String(value);
    // fmtNumber(0) devuelve '' → se muestra $0
    if (MONEY_FIELDS.has(field) && typeof value === 'number') return `$${fmtNumber(Math.round(value)) || '0'}`;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 10);
    if (Array.isArray(value)) return value.length ? `${value.length} elemento(s)` : 'ninguno';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}
