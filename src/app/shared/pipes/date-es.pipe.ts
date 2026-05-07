import { Pipe, PipeTransform } from '@angular/core';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const MONTHS_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function parseDate(value: string): Date | null {
  const parts = value.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  return new Date(+parts[0], +parts[1] - 1, +parts[2]);
}

@Pipe({ name: 'dateEs' })
export class DateEsPipe implements PipeTransform {
  transform(value: string | undefined | null, format: 'full' | 'short' | 'check' = 'full'): string {
    if (!value) return '';
    const date = parseDate(value);
    if (!date) return value;

    const d = date.getDate(),
      m = date.getMonth(),
      y = date.getFullYear();

    switch (format) {
      case 'short':
        return `${d} ${MONTHS_SHORT[m]} ${y}`;
      case 'check': {
        const weekday = WEEKDAYS[date.getDay()];
        const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
        return `${cap(weekday)} | ${d}-${cap(MONTHS[m])}/${String(y).slice(2)}`;
      }
      default:
        return `${d}-${MONTHS[m]}-${y}`;
    }
  }
}
