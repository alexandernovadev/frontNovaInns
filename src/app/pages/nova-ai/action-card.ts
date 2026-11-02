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
  confirmed: 'Confirmada',
  failed: 'Falló',
  undone: 'Deshecha',
};

@Component({
  selector: 'nova-action-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    @let c = card();
    @let isDelete = c.type === 'delete';
    <div class="w-full max-w-[85%] sm:max-w-[75%] mt-2 bg-surface border rounded-2xl overflow-hidden"
      [class]="isDelete ? 'border-error/50' : 'border-brand/50'"
      [class.opacity-60]="c.status !== 'pending'">
      <div class="px-4 py-3 border-b border-border flex items-start gap-2.5">
        <lucide-icon [img]="isDelete ? Trash2 : Pencil" class="w-4 h-4 mt-0.5 shrink-0"
          [class]="isDelete ? 'text-error' : 'text-brand'" [strokeWidth]="2" />
        <div class="min-w-0">
          <p class="text-text-primary text-sm font-semibold">{{ isDelete ? '¿Eliminar?' : '¿Editar?' }}</p>
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
                    <span class="text-text-primary font-semibold break-words">{{ format(ch.field, ch.after) }}</span>
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
          <button disabled title="Confirmar llega en el siguiente paso"
            class="px-4 py-2 rounded-xl text-xs font-bold opacity-40 cursor-not-allowed"
            [class]="isDelete ? 'bg-error text-white' : 'bg-brand text-bg'">
            Confirmar
          </button>
        } @else {
          <span class="text-xs text-text-disabled">{{ statusText(c.status) }}</span>
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
