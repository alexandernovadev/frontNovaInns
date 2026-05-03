import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API = 'http://localhost:3000/api';

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
