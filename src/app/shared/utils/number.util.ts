const _nf = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

export function fmtNumber(n: number | undefined | null): string {
  return n ? _nf.format(n) : '';
}
