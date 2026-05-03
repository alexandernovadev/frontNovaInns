import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyCop' })
export class CurrencyCopPipe implements PipeTransform {
  transform(value: number | undefined | null): string {
    if (value == null) return '';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }
}
