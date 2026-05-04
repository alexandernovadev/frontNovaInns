import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { API } from '../constants/api.constant';

export interface UploadResult {
  url: string;
  publicId: string;
}

@Injectable({ providedIn: 'root' })
export class UploadService {
  private http = inject(HttpClient);

  upload(file: File, folder: 'bookings' | 'apartments'): Observable<UploadResult> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<UploadResult>(`${API}/upload/${folder}`, form);
  }

  delete(publicId: string): Observable<void> {
    return this.http.delete<void>(`${API}/upload`, { params: { publicId } });
  }
}
