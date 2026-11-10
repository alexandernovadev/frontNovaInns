import { Pipe, PipeTransform } from '@angular/core';
import { cdn } from '../utils/cdn.util';

/** `{{ photo.url | cdn:320 }}` → versión recortada de Cloudinary (f_auto + q_auto) */
@Pipe({ name: 'cdn' })
export class CdnPipe implements PipeTransform {
  transform(url: string | null | undefined, width?: number): string {
    return width ? cdn(url, width) : cdn(url);
  }
}
