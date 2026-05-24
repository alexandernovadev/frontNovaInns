import { Component, input, ChangeDetectionStrategy } from '@angular/core';

const MAPS: Record<string, Record<string, { cls: string; dot: string; label: string }>> = {
  billing: {
    PAGADO: { cls: 'bg-success/15 text-success', dot: 'bg-success', label: 'Pagado' },
    'FALTA PAGO': { cls: 'bg-warning/15 text-warning', dot: 'bg-warning', label: 'Falta pago' },
    'NO SHOW': { cls: 'bg-error/15 text-error', dot: 'bg-error', label: 'No show' },
  },
  lifecycle: {
    PENDIENTE: { cls: 'bg-blue-500/15 text-blue-400', dot: 'bg-blue-400', label: 'Pendiente' },
    'CHECK-IN': { cls: 'bg-emerald-500/15 text-emerald-400', dot: 'bg-emerald-400', label: 'Check-in' },
    'CHECK-OUT': { cls: 'bg-purple-500/15 text-purple-400', dot: 'bg-purple-400', label: 'Check-out' },
  },
  apartment: {
    ACTIVE: { cls: 'bg-success/10 text-success', dot: 'bg-success', label: 'Activo' },
    MAINTENANCE: { cls: 'bg-warning/10 text-warning', dot: 'bg-warning', label: 'Mantenimiento' },
    INACTIVE: { cls: 'bg-error/10 text-error', dot: 'bg-error', label: 'Inactivo' },
  },
};

@Component({
  selector: 'status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"
      [class]="entry().cls"
    >
      @if (showDot()) {
        <span class="w-1.5 h-1.5 rounded-full shrink-0" [class]="entry().dot"></span>
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
    return (
      MAPS[this.type()]?.[this.value()] ?? {
        cls: 'bg-surface text-text-secondary border border-border',
        dot: 'bg-text-disabled',
        label: this.value(),
      }
    );
  }
}
