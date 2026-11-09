import { Pipe, PipeTransform } from '@angular/core';

const MONTHS_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];
const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sá'];
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Fecha calendario (YYYY-MM-DD) o timestamp ISO → fecha legible.
// - 'full' / 'short' → "Lun 4 Mar 2026" (formato único de toda la app)
// - 'check'          → "Lunes 4 Mar 2026" (línea de color junto al check-in/out)
function parseDate(value: string): Date | null {
  const [day, time] = value.split('T');
  const parts = day.split('-');
  if (parts.length !== 3 || parts.some((p) => !/^\d+$/.test(p))) return null;

  // Con hora real (createdAt, fotos) se lee en hora local; la medianoche UTC
  // es una fecha pura de reserva y se toma tal cual, sin correr un día.
  if (time && !/^00:00:00/.test(time)) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
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

    const weekday = WEEKDAYS_SHORT[date.getDay()];
    const short = `${weekday} ${d} ${MONTHS_SHORT[m]} ${y}`;

    if (format === 'check') return `${WEEKDAYS[date.getDay()]} ${d} ${MONTHS_SHORT[m]} ${y}`;
    return short;
  }
}
