import { Component, input } from '@angular/core';

const SIZES: Record<string, string> = {
  sm: 'w-5 h-5',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
};

const IMAGES: Record<string, string> = {
  Booking: '/assets/images/booking_logo.png',
  AirBnB: '/assets/images/airbnb_logo.png',
  Directo: '/assets/images/LogoNovaInns.png',
};

@Component({
  selector: 'platform-icon',
  template: `
    @if (img()) {
      <img [src]="img()" [class]="imgClass()" [alt]="platform()" />
    }
  `,
})
export class PlatformIcon {
  platform = input.required<string>();
  size = input<string>('md');

  protected img() {
    return IMAGES[this.platform()] || null;
  }

  protected imgClass() {
    return `${SIZES[this.size()] || SIZES['md']} object-contain`;
  }
}
