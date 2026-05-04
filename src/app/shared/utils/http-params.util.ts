import { HttpParams } from '@angular/common/http';

export function buildParams(obj: Record<string, any>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value != null && value !== '') {
      params = params.set(key, String(value));
    }
  }
  return params;
}
