import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API } from '../../shared/constants/api.constant';

export type ClearableModel = 'bookings' | 'apartments' | 'expenses';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);

  getCounts() {
    return this.http.get<Record<ClearableModel, number>>(`${API}/data/counts`);
  }

  exportBookings() {
    return this.http.get<any[]>(`${API}/data/export/bookings`);
  }

  exportApartments() {
    return this.http.get<any[]>(`${API}/data/export/apartments`);
  }

  importBookings(records: any[]) {
    return this.http.post<{ inserted: number; updated: number }>(`${API}/data/import/bookings`, { records });
  }

  importApartments(records: any[]) {
    return this.http.post<{ inserted: number; updated: number }>(`${API}/data/import/apartments`, { records });
  }

  clearModel(model: ClearableModel) {
    return this.http.delete<{ deleted: number }>(`${API}/data/clear/${model}`);
  }
}
