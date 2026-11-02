import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API } from '../../shared/constants/api.constant';
import { buildParams } from '../../shared/utils/http-params.util';

export interface ActionChange {
  field: string;
  before: unknown;
  after: unknown;
}

// Propuesta de NovaAI: el usuario la confirma o la cancela en una tarjeta
export interface ActionCard {
  id: string;
  type: 'create' | 'update' | 'delete' | 'undo';
  collection: 'bookings' | 'apartments' | 'expenses';
  status: string;
  summary: string;
  // Avisos (ej: posible reserva duplicada)
  warnings: string[];
  expiresAt: string;
  targets: {
    id: string;
    label: string;
    changes: ActionChange[];
    details: { field: string; value: unknown }[];
  }[];
}

// Admin → Historial NovaAI
export interface HistoryItem extends ActionCard {
  request: string;
  error: string | null;
  createdAt: string;
  confirmedAt: string | null;
  undoneAt: string | null;
  undoOf: string | null;
  undoActionId: string | null;
}

export type HistoryFilter = '' | 'applied' | 'undone' | 'other';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  // Consultas a la base que hizo NovaAI para esta respuesta (solo para mostrar)
  queries?: string[];
  actions?: ActionCard[];
  // Vista previa local del screenshot que mandó el usuario (no viaja al back)
  image?: string;
}

export interface ChatReply {
  reply: string;
  model: string;
  queries: string[];
  actions: ActionCard[];
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
    return this.http.post<ChatReply>(`${API}/assistant/chat`, { messages: history });
  }

  // Screenshot de Booking / AirBnB en el chat → propuesta "Crear reserva"
  chatImage(file: File, hint?: string) {
    const form = new FormData();
    form.append('file', file);
    if (hint?.trim()) form.append('hint', hint.trim());
    return this.http.post<ChatReply>(`${API}/assistant/chat-image`, form);
  }

  // Ejecuta la propuesta. 409 si venció, ya no estaba pendiente o el documento cambió
  // apartmentId: obligatorio para crear una reserva
  confirmAction(id: string, apartmentId?: string) {
    return this.http.post<{ id: string; status: string }>(`${API}/assistant/actions/${id}/confirm`, { apartmentId });
  }

  listActions(filter: HistoryFilter, page = 1) {
    return this.http.get<{ data: HistoryItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `${API}/assistant/actions`,
      { params: buildParams({ filter, page }) },
    );
  }

  // 409 con status "changed" + drift si el documento cambió después; force = deshacer igual
  undoAction(id: string, force = false) {
    return this.http.post<{ id: string; status: string; undoActionId: string }>(`${API}/assistant/actions/${id}/undo`, { force });
  }

  cancelAction(id: string) {
    return this.http.post<{ id: string; status: string }>(`${API}/assistant/actions/${id}/cancel`, {});
  }
}
