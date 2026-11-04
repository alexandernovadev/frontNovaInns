import { Component, input, ChangeDetectionStrategy } from '@angular/core';

/** Tono pastel (data-tone del sistema de diseño) + texto de cada estado. */
const MAPS: Record<string, Record<string, { tone: string; label: string }>> = {
  billing: {
    PAGADO: { tone: 'success', label: 'Pagado' },
    'FALTA PAGO': { tone: 'warning', label: 'Falta pago' },
    'NO SHOW': { tone: 'danger', label: 'No show' },
  },
  lifecycle: {
    PENDIENTE: { tone: 'info', label: 'Pendiente' },
    'CHECK-IN': { tone: 'success', label: 'Check-in' },
    'CHECK-OUT': { tone: 'ai', label: 'Check-out' },
  },
  apartment: {
    ACTIVE: { tone: 'success', label: 'Activo' },
    MAINTENANCE: { tone: 'warning', label: 'Mantenimiento' },
    INACTIVE: { tone: 'danger', label: 'Inactivo' },
  },
};

@Component({
  selector: 'status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="pill" [attr.data-tone]="entry().tone">
      @if (showDot()) {
        <span class="dot"></span>
      }
      {{ entry().label }}
    </span>
  `,
})
export class StatusBadge {
  value = input.required<string>();
  type = input<'billing' | 'lifecycle' | 'apartment'>('billing');
  showDot = input(true);

  protected entry() {
    return MAPS[this.type()]?.[this.value()] ?? { tone: null, label: this.value() };
  }
}
