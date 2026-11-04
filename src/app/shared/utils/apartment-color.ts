// Color fijo por apartamento (mismo id → mismo color en toda la app)
// Pasteles del sistema de diseño (mint, lilac, sky, peach, rose, butter)
const PALETTE = ['#91debc', '#cbbdf9', '#9bd2fa', '#f9bb92', '#f6b2b9', '#ecdc92'];

export function apartmentColor(id: string | undefined | null): string {
  if (!id) return '#b0b0b9';
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// "Apartamento Cathedral Gamma" → "Cathedral Gamma"
export function apartmentShortName(name: string | undefined | null): string {
  return (name ?? '').replace(/^Apartamento\s+/i, '') || '—';
}
