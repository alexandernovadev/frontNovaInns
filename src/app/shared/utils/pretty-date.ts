const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sá'];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Fecha calendario (YYYY-MM-DD, con o sin hora) → "Lun 4 Mar 2026",
// el mismo formato que usa dateEs en toda la app.
// Se arma en UTC: las fechas de reservas se guardan a las 00:00 UTC y en hora
// Colombia caerían en el día anterior.
export function prettyDate(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCMonth() !== mo - 1) return null; // ej: 2026-02-31
  return `${DAYS_SHORT[date.getUTCDay()]} ${d} ${MONTHS_SHORT[mo - 1]} ${y}`;
}
