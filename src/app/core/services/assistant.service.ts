import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../../shared/constants/api.constant';

export interface ExtractedBooking {
  booking: Record<string, unknown>;
  model: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private http = inject(HttpClient);

  // Screenshot de Booking / AirBnB → JSON de la reserva (no guarda nada)
  extractBooking(file: File, hint?: string) {
    const form = new FormData();
    form.append('file', file);
    if (hint?.trim()) form.append('hint', hint.trim());
    return this.http.post<ExtractedBooking>(`${API}/assistant/extract-booking`, form);
  }
}
