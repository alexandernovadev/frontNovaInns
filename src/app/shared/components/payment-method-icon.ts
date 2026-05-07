import { Component, input } from '@angular/core';

const IMAGES: Record<string, string> = {
  Efectivo: '/assets/images/dinero.png',
  Nequi: '/assets/images/nequi.svg',
  Bancolombia: '/assets/images/bancolombia.svg',
};

@Component({
  selector: 'payment-method-icon',
  template: `
    @if (img()) {
      <img [src]="img()" [class]="imgClass()" [alt]="method()" />
    } @else {
      <div class="w-10 h-10 rounded-xl bg-border/50 flex items-center justify-center">
        <svg
          class="w-5 h-5 text-text-disabled"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    }
  `,
})
export class PaymentMethodIcon {
  method = input.required<string>();
  size = input<string>('md');

  protected img() {
    return IMAGES[this.method()] || null;
  }

  protected imgClass() {
    const sizes: Record<string, string> = { sm: 'w-7 h-7', md: 'w-10 h-10', lg: 'w-14 h-14' };
    const cls = sizes[this.size()] || sizes['md'];
    return `${cls} object-contain`;
  }
}
