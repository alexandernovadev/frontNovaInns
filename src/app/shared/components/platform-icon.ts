import { Component, input, ChangeDetectionStrategy } from '@angular/core';

const SIZES: Record<string, number> = { sm: 20, md: 40, lg: 56 };

const IMAGES: Record<string, string> = {
  Booking: '/assets/images/booking_logo.png',
  AirBnB: '/assets/images/airbnb_logo.png',
  Directo: '/assets/images/LogoNovaInns.png',
};

@Component({
  selector: 'platform-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (img()) {
      <img [src]="img()" [alt]="platform()" [style.width.px]="px()" [style.height.px]="px()" loading="lazy" decoding="async" />
    }
  `,
  styles: `
    :host { display: inline-flex; }
    img { display: block; object-fit: contain; }
  `,
})
export class PlatformIcon {
  platform = input.required<string>();
  size = input<string>('md');

  protected img() {
    return IMAGES[this.platform()] || null;
  }

  protected px() {
    return SIZES[this.size()] ?? SIZES['md'];
  }
}
