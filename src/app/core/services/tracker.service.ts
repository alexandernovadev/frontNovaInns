import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../../shared/constants/api.constant';
import { buildParams } from '../../shared/utils/http-params.util';
import {
  CreateCompetitorPayload,
  TrackerCompetitor,
  TrackerConfig,
  TrackerQuote,
} from '../interfaces/tracker.interface';

@Injectable({ providedIn: 'root' })
export class TrackerService {
  private http = inject(HttpClient);

  bookingSearch(data: {
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    childAge: number;
  }) {
    return this.http.post<any>(`${API}/tracker/booking-search`, data);
  }

  chat(payload: {
    message: string;
    history: { role: 'user' | 'assistant'; text: string }[];
    context: Record<string, unknown>;
  }) {
    return this.http.post<{ reply: string; model: string }>(
      `${API}/tracker/chat`,
      payload,
    );
  }

  config() {
    return this.http.get<TrackerConfig>(`${API}/tracker/config`);
  }

  competitors() {
    return this.http.get<TrackerCompetitor[]>(`${API}/tracker/competitors`);
  }

  createCompetitor(data: CreateCompetitorPayload) {
    return this.http.post<TrackerCompetitor>(`${API}/tracker/competitors`, data);
  }

  updateCompetitor(id: string, data: Partial<CreateCompetitorPayload>) {
    return this.http.patch<TrackerCompetitor>(
      `${API}/tracker/competitors/${id}`,
      data,
    );
  }

  removeCompetitor(id: string) {
    return this.http.delete(`${API}/tracker/competitors/${id}`);
  }

  quote(checkIn: string, checkOut: string, guests: number) {
    return this.http.post<TrackerQuote>(`${API}/tracker/quote`, {
      checkIn,
      checkOut,
      guests,
    });
  }

  recentQuotes(limit = 10) {
    return this.http.get<any[]>(`${API}/tracker/quotes`, {
      params: buildParams({ limit }),
    });
  }
}
