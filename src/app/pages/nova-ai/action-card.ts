import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, Pencil, Trash2, ArrowRight, CalendarPlus, TriangleAlert, Building2 } from 'lucide-angular';
import { ActionCard } from '../../core/services/assistant.service';
import { ACTION_STATUS_TEXT, fieldLabel, formatValue } from './nova-format';

// Estilo de cada tipo de propuesta
const KIND = {
  create: {
    title: '¿Crear reserva?',
    icon: CalendarPlus,
    border: 'border-emerald-500/40 shadow-[0_8px_30px_-12px_rgba(34,197,94,0.35)]',
    bar: 'bg-gradient-to-r from-emerald-400 to-teal-500',
    tile: 'bg-emerald-500/15 text-emerald-400',
    text: 'text-emerald-400',
    button: 'bg-emerald-500 hover:bg-emerald-400 text-bg',
    action: 'Crear reserva',
  },
  update: {
    title: '¿Editar?',
    icon: Pencil,
    border: 'border-brand/40 shadow-[0_8px_30px_-12px_rgba(242,194,0,0.35)]',
    bar: 'bg-gradient-to-r from-brand-accent to-brand-pressed',
    tile: 'bg-brand/15 text-brand',
    text: 'text-brand',
    button: 'bg-brand hover:bg-brand-accent text-bg',
    action: 'Confirmar',
  },
  delete: {
    title: '¿Eliminar?',
    icon: Trash2,
    border: 'border-error/40 shadow-[0_8px_30px_-12px_rgba(239,68,68,0.35)]',
    bar: 'bg-gradient-to-r from-error to-rose-400',
    tile: 'bg-error/15 text-error',
    text: 'text-error',
    button: 'bg-error hover:bg-error/80 text-white',
    action: 'Eliminar',
  },
};

@Component({
  selector: 'nova-action-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    @let c = card();
    @let k = kind();
    <div class="w-full sm:max-w-[85%] mt-2.5 rounded-2xl overflow-hidden border nova-in bg-gradient-to-b from-elevated to-surface"
      [class]="k.border"
      [class.opacity-60]="c.status !== 'pending' && c.status !== 'confirmed'">
      <div class="h-1" [class]="k.bar"></div>
      <div class="px-4 py-3 border-b border-border flex items-start gap-3">
        <span class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" [class]="k.tile">
          <lucide-icon [img]="k.icon" class="w-4 h-4" [strokeWidth]="2" />
        </span>
        <div class="min-w-0">
          <p class="text-sm font-semibold" [class]="k.text">{{ k.title }}</p>
          <p class="text-text-secondary text-xs">{{ c.summary }}</p>
        </div>
      </div>

      @for (w of c.warnings ?? []; track w) {
        <div class="mx-4 mt-3 flex gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <lucide-icon [img]="TriangleAlert" class="w-4 h-4 shrink-0" [strokeWidth]="2" />
          <span>{{ w }}</span>
        </div>
      }

      @for (t of c.targets; track t.id) {
        <div class="px-4 py-3 border-b border-border last:border-0">
          <p class="text-text-primary text-xs font-medium mb-2">{{ t.label }}</p>
          @if (c.type !== 'update') {
            <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              @for (d of t.details; track d.field) {
                @if (d.value !== '' && d.value !== null && d.value !== undefined) {
                  <dt class="text-text-disabled">{{ label(d.field) }}</dt>
                  <dd class="text-text-secondary break-words">{{ format(d.field, d.value) }}</dd>
                }
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

      <!-- Crear: el apartamento no viene en el screenshot, se elige aquí -->
      @if (c.type === 'create' && c.status === 'pending') {
        <div class="px-4 py-3 border-b border-border">
          <label class="text-xs text-text-secondary flex items-center gap-1.5 mb-1.5">
            <lucide-icon [img]="Building2" class="w-3.5 h-3.5 text-emerald-400" [strokeWidth]="2" />
            Apartamento <span class="text-error">*</span>
          </label>
          <select [value]="apartmentId()" (change)="apartmentId.set($any($event.target).value)"
            class="w-full bg-input border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none cursor-pointer transition-colors"
            [class]="apartmentId() ? 'border-emerald-500/50' : 'border-border focus:border-emerald-500/60'">
            <option value="" disabled>Elige el apartamento…</option>
            @for (a of apartmentOptions(); track a.id) {
              <option [value]="a.id">{{ a.name }}</option>
            }
          </select>
        </div>
      }

      <div class="px-4 py-3 bg-bg/40 flex items-center justify-end gap-2">
        @if (c.status === 'pending') {
          <button (click)="cancel.emit(c.id)" [disabled]="busy()"
            class="px-4 py-2 rounded-xl border border-border text-text-secondary hover:text-text-primary text-xs font-medium transition-colors cursor-pointer disabled:opacity-50">
            Cancelar
          </button>
          <button (click)="confirm.emit({ id: c.id, apartmentId: apartmentId() || undefined })"
            [disabled]="busy() || (c.type === 'create' && !apartmentId())"
            [title]="c.type === 'create' && !apartmentId() ? 'Elige el apartamento primero' : ''"
            class="px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            [class]="k.button">
            {{ busy() ? 'Guardando…' : k.action }}
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
  readonly ArrowRight = ArrowRight;
  readonly TriangleAlert = TriangleAlert;
  readonly Building2 = Building2;

  card = input.required<ActionCard>();
  busy = input(false);
  // id → nombre, para mostrar el apartamento en vez de su _id
  apartmentNames = input<Record<string, string>>({});

  cancel = output<string>();
  confirm = output<{ id: string; apartmentId?: string }>();

  apartmentId = signal('');
  kind = computed(() => KIND[this.card().type as keyof typeof KIND] ?? KIND.update);
  apartmentOptions = computed(() =>
    Object.entries(this.apartmentNames()).map(([id, name]) => ({ id, name })),
  );

  label(field: string) {
    return fieldLabel(field);
  }

  statusText(status: string) {
    return ACTION_STATUS_TEXT[status] ?? status;
  }

  format(field: string, value: unknown): string {
    return formatValue(field, value, this.apartmentNames());
  }
}
