import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

const API = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);

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
}
