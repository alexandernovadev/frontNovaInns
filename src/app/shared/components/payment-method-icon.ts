import { Component, input, ChangeDetectionStrategy } from '@angular/core';

const IMAGES: Record<string, string> = {
  Efectivo: '/assets/images/dinero.png',
  Nequi: '/assets/images/NequiFInal.png',
  Bancolombia: '/assets/images/bbcolombia1.png',
};
const SIZES: Record<string, number> = { sm: 28, md: 40, lg: 56 };

@Component({
  selector: 'payment-method-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (img()) {
      <img [src]="img()" [alt]="method()" [style.width.px]="px()" [style.height.px]="px()" loading="lazy" decoding="async" />
    } @else {
      <span class="none" [style.width.px]="px()" [style.height.px]="px()">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    }
  `,
  styles: `
    img { object-fit: contain; }
    .none { display: grid; place-items: center; border-radius: 12px; color: var(--text-3); background: var(--bg-2); }
  `,
})
export class PaymentMethodIcon {
  method = input.required<string>();
  size = input<string>('md');

  protected img() {
    return IMAGES[this.method()] || null;
  }
  protected px() {
    return SIZES[this.size()] ?? SIZES['md'];
  }
}
