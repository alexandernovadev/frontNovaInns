import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../../shared/constants/api.constant';

export interface ActionChange {
  field: string;
  before: unknown;
  after: unknown;
}

// Propuesta de NovaAI: el usuario la confirma o la cancela en una tarjeta
export interface ActionCard {
  id: string;
  type: 'update' | 'delete';
  collection: 'bookings' | 'apartments' | 'expenses';
  status: string;
  summary: string;
  expiresAt: string;
  targets: {
    id: string;
    label: string;
    changes: ActionChange[];
    details: { field: string; value: unknown }[];
  }[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  // Consultas a la base que hizo NovaAI para esta respuesta (solo para mostrar)
  queries?: string[];
  actions?: ActionCard[];
}

export interface ExtractedBooking {
  booking: Record<string, unknown>;
  model: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private http = inject(HttpClient);

  // Conversación de NovaAI: vive mientras la app esté abierta (se conserva al cambiar de página)
  chat = signal<ChatMessage[]>([]);

  // Screenshot de Booking / AirBnB → JSON de la reserva (no guarda nada)
  extractBooking(file: File, hint?: string) {
    const form = new FormData();
    form.append('file', file);
    if (hint?.trim()) form.append('hint', hint.trim());
    return this.http.post<ExtractedBooking>(`${API}/assistant/extract-booking`, form);
  }

  // El back recibe el historial completo (máx. 40 mensajes, empezando por el usuario)
  sendChat(messages: ChatMessage[]) {
    let history = messages.slice(-40).map(({ role, text }) => ({ role, text }));
    if (history[0]?.role === 'model') history = history.slice(1);
    return this.http.post<{ reply: string; model: string; queries: string[]; actions: ActionCard[] }>(`${API}/assistant/chat`, { messages: history });
  }

  // Ejecuta la propuesta. 409 si venció, ya no estaba pendiente o el documento cambió
  confirmAction(id: string) {
    return this.http.post<{ id: string; status: string }>(`${API}/assistant/actions/${id}/confirm`, {});
  }

  cancelAction(id: string) {
    return this.http.post<{ id: string; status: string }>(`${API}/assistant/actions/${id}/cancel`, {});
  }
}
