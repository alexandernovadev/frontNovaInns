// Las fotos de apartamentos y documentos de identidad viven en Cloudinary y se
// suben a resolución de cámara (4000×3000). Para no bajar el original en cada
// miniatura se pide la versión justa: /upload/ → /upload/f_auto,q_auto,w_320/
//
// f_auto → WebP/AVIF si el navegador los admite; q_auto → calidad según contenido.
export interface CdnOptions {
  w?: number;
  h?: number;
  /** recorte para miniaturas cuadradas: fill (default), limit, scale, thumb, pad */
  fit?: string;
}

export function cdn(url: string | null | undefined, opts: CdnOptions | number = {}): string {
  if (!url) return '';
  const options: CdnOptions = typeof opts === 'number' ? { w: opts } : opts;
  // Solo toca URLs de Cloudinary sin transformación previa (/upload/v123/ruta)
  const at = /(\/upload\/)(v\d+\/)/.exec(url);
  if (!at) return url;

  const parts = ['f_auto', 'q_auto'];
  if (options.w) parts.push(`w_${options.w}`);
  if (options.h) {
    // con h se recorta al cuadro; si no vino w, se asume el mismo valor
    parts.push(`w_${options.w ?? options.h}`, `h_${options.h}`, `c_${options.fit ?? 'fill'}`);
  }
  return url.replace(at[0], `${at[1]}${parts.join(',')}/${at[2]}`);
}
