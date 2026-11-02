const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// Fecha calendario (YYYY-MM-DD, con o sin hora) → "Domingo 4 | Octubre 2026".
// Se arma en UTC: las fechas de reservas se guardan a las 00:00 UTC y en hora
// Colombia caerían en el día anterior.
export function prettyDate(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCMonth() !== mo - 1) return null; // ej: 2026-02-31
  return `${DAYS[date.getUTCDay()]} ${d} | ${MONTHS[mo - 1]} ${y}`;
}
