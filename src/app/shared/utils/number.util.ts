const _nf = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

export function fmtNumber(n: number | undefined | null): string {
  return n ? _nf.format(n) : '';
}

// En Colombia no se usan centavos: el dinero va en múltiplos de 100 COP.
// 556.874 se guarda y se muestra como 556.800
export function roundCopDown(n: number | undefined | null): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
  return Math.floor(n / 100) * 100;
}
