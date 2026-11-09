import { Component, input, output, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, Pencil, Trash2, ArrowRight, CalendarPlus, TriangleAlert, Building2 } from 'lucide-angular';
import { ActionCard } from '../../core/services/assistant.service';
import { ACTION_STATUS_TEXT, fieldLabel, formatValue, prettyDatesIn } from './nova-format';

// Estilo de cada tipo de propuesta (tono del sistema: data-tone)
const KIND = {
  create: { title: '¿Crear reserva?', icon: CalendarPlus, tone: 'success', action: 'Crear reserva' },
  update: { title: '¿Editar?', icon: Pencil, tone: 'brand', action: 'Confirmar' },
  delete: { title: '¿Eliminar?', icon: Trash2, tone: 'danger', action: 'Eliminar' },
};

@Component({
  selector: 'nova-action-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    @let c = card();
    @let k = kind();
    <div class="ac nova-in" [attr.data-tone]="k.tone" [class.faded]="c.status !== 'pending' && c.status !== 'confirmed'">
      <div class="ac-head">
        <span class="icon-tile"><lucide-icon [img]="k.icon" [size]="16" [strokeWidth]="2.2" /></span>
        <div style="min-width: 0">
          <p class="ac-title">{{ k.title }}</p>
          <p class="tiny soft">{{ c.summary }}</p>
        </div>
      </div>

      @for (w of c.warnings ?? []; track w) {
        <div class="ac-warn">
          <lucide-icon [img]="TriangleAlert" [size]="16" [strokeWidth]="2" />
          <span>{{ w }}</span>
        </div>
      }

      @for (t of c.targets; track t.id) {
        <div class="ac-block">
          <p class="tiny strong" style="margin-bottom: var(--sp-2)">{{ pretty(t.label) }}</p>
          @if (c.type !== 'update') {
            <dl class="ac-details">
              @for (d of withNights(t.details); track d.field) {
                @if (d.value !== '' && d.value !== null && d.value !== undefined) {
                  <dt>{{ label(d.field) }}</dt>
                  <dd>{{ format(d.field, d.value) }}</dd>
                }
              }
            </dl>
          } @else {
            <div class="stack" style="--gap: 6px">
              @for (ch of t.changes; track ch.field) {
                <div class="ac-change">
                  <span class="muted truncate">{{ label(ch.field) }}</span>
                  <span class="ac-diff">
                    <s>{{ format(ch.field, ch.before) }}</s>
                    <lucide-icon [img]="ArrowRight" [size]="12" [strokeWidth]="2" />
                    <b>{{ format(ch.field, ch.after) }}</b>
                  </span>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- Crear: el apartamento no viene en el screenshot, se elige aquí -->
      @if (c.type === 'create' && c.status === 'pending') {
        <label class="ac-block field">
          <span class="field-label ac-lbl">
            <lucide-icon [img]="Building2" [size]="14" [strokeWidth]="2" />
            Apartamento <span class="t-danger">*</span>
          </span>
          <select [value]="apartmentId()" (change)="apartmentId.set($any($event.target).value)">
            <option value="" disabled>Elige el apartamento…</option>
            @for (a of apartmentOptions(); track a.id) {
              <option [value]="a.id">{{ a.name }}</option>
            }
          </select>
        </label>
      }

      <div class="ac-foot">
        @if (c.status === 'pending') {
          <button data-size="sm" data-variant="ghost" (click)="cancel.emit(c.id)" [disabled]="busy()">Cancelar</button>
          <button data-size="sm" [attr.data-tone]="k.tone"
            (click)="confirm.emit({ id: c.id, apartmentId: apartmentId() || undefined })"
            [disabled]="busy() || (c.type === 'create' && !apartmentId())"
            [attr.aria-busy]="busy() || null"
            [title]="c.type === 'create' && !apartmentId() ? 'Elige el apartamento primero' : ''">
            {{ busy() ? 'Guardando…' : k.action }}
          </button>
        } @else {
          <span class="tiny" [class]="c.status === 'confirmed' ? 't-success strong' : c.status === 'failed' ? 't-danger' : 'muted'">
            {{ statusText(c.status) }}
          </span>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; width: 100%; }
    .ac {
      width: 100%;
      margin-top: 10px;
      overflow: hidden;
      background: var(--bg-1);
      border: var(--border) solid color-mix(in srgb, var(--c) 45%, var(--line));
      border-top: 4px solid var(--c);
      border-radius: var(--r-md);
      box-shadow: 0 var(--depth) 0 var(--c-deep);
    }
    .ac.faded { opacity: 0.6; }
    .ac-head { display: flex; align-items: flex-start; gap: var(--sp-3); padding: var(--sp-3) var(--sp-4); border-bottom: 1px solid var(--line); }
    .ac-title { font-size: var(--fs-small); font-weight: var(--fw-semibold); color: var(--c); }
    .ac-warn {
      display: flex; gap: var(--sp-2); margin: var(--sp-3) var(--sp-4) 0; padding: 10px;
      font-size: var(--fs-caption); color: var(--warning);
      background: var(--warning-soft); border: 1px solid color-mix(in srgb, var(--warning) 35%, transparent); border-radius: var(--r-sm);
    }
    .ac-warn lucide-icon { flex: none; }
    .ac-block { padding: var(--sp-3) var(--sp-4); border-bottom: 1px solid var(--line); }
    .ac-details { display: grid; grid-template-columns: auto 1fr; gap: 4px var(--sp-3); margin: 0; font-size: var(--fs-caption); }
    .ac-details dt { color: var(--text-3); }
    .ac-details dd { margin: 0; color: var(--text-2); overflow-wrap: anywhere; }
    .ac-change { display: grid; grid-template-columns: minmax(0, 7rem) 1fr; gap: var(--sp-3); align-items: baseline; font-size: var(--fs-caption); }
    .ac-diff { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-width: 0; }
    .ac-diff s { color: var(--text-3); overflow-wrap: anywhere; }
    .ac-diff lucide-icon { color: var(--text-3); flex: none; }
    .ac-diff b { padding: 1px 6px; border-radius: 6px; background: var(--brand-soft); color: var(--brand); overflow-wrap: anywhere; }
    .ac-lbl { display: flex; align-items: center; gap: 6px; font-size: var(--fs-caption); }
    .ac-lbl lucide-icon { color: var(--c); }
    .ac-foot { display: flex; align-items: center; justify-content: flex-end; gap: var(--sp-2); padding: var(--sp-3) var(--sp-4); background: rgb(0 0 0 / 0.15); }
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

  pretty(text: string) {
    return prettyDatesIn(text);
  }

  statusText(status: string) {
    return ACTION_STATUS_TEXT[status] ?? status;
  }

  format(field: string, value: unknown): string {
    return formatValue(field, value, this.apartmentNames());
  }

  withNights(details: { field: string; value: unknown }[]) {
    if (details.some((d) => d.field === 'stay.nights')) return details;
    const ci = details.find((d) => d.field === 'stay.checkIn')?.value;
    const co = details.find((d) => d.field === 'stay.checkOut')?.value;
    if (!ci || !co) return details;
    const nights = Math.round((new Date(String(co)).getTime() - new Date(String(ci)).getTime()) / 86_400_000);
    if (!(nights >= 1)) return details;
    const out: { field: string; value: unknown }[] = [];
    for (const d of details) {
      out.push(d);
      if (d.field === 'stay.checkOut') {
        out.push({ field: 'stay.nights', value: `${nights} ${nights === 1 ? 'noche' : 'noches'}` });
      }
    }
    return out;
  }
}
