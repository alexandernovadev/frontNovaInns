// Color fijo por apartamento (mismo id → mismo color en toda la app)
const PALETTE = ['#2DD4BF', '#A78BFA', '#38BDF8', '#FB923C', '#F472B6', '#A3E635'];

export function apartmentColor(id: string | undefined | null): string {
  if (!id) return '#6E6E73';
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// "Apartamento Cathedral Gamma" → "Cathedral Gamma"
export function apartmentShortName(name: string | undefined | null): string {
  return (name ?? '').replace(/^Apartamento\s+/i, '') || '—';
}
