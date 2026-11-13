import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
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
  // create: apartamento sugerido por NovaAI (el select arranca con este)
  apartmentId?: string | null;
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
  // Conversación donde quedó guardado el turno (nueva si no se mandó una)
  conversationId: string;
}

// Conversación guardada (se borra sola a los 90 días sin uso)
export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: string;
}

interface ConversationDetail {
  id: string;
  title: string;
  messages: { role: 'user' | 'model'; text: string; queries: string[]; actions: ActionCard[] }[];
}

export interface ExtractedBooking {
  booking: Record<string, unknown>;
  model: string;
}

@Injectable({ providedIn: 'root' })
export class AssistantService {
  private http = inject(HttpClient);

  // Conversación abierta de NovaAI (se conserva al cambiar de página). Se
  // guarda en el back; conversationId null = conversación nueva sin mensajes
  chat = signal<ChatMessage[]>([]);
  conversationId = signal<string | null>(null);
  conversations = signal<ConversationSummary[]>([]);
  // La primera vez que se abre NovaAI en la sesión se retoma la última conversación
  autoOpened = false;

  // Screenshot de Booking / AirBnB → JSON de la reserva (no guarda nada)
  extractBooking(file: File, hint?: string) {
    const form = new FormData();
    form.append('file', file);
    if (hint?.trim()) form.append('hint', hint.trim());
    return this.http.post<ExtractedBooking>(`${API}/assistant/extract-booking`, form);
  }

  // Solo viaja el texto nuevo: el back arma el historial con la conversación
  // guardada. Va también el contexto de Booking guardado en localStorage por el Tracker.
  sendChat(text: string, customTrackerContext?: Record<string, unknown>) {
    const trackerContext = customTrackerContext ?? this.readTrackerContextFromStorage();
    return this.http
      .post<ChatReply>(`${API}/assistant/chat`, {
        text,
        conversationId: this.conversationId() ?? undefined,
        trackerContext,
      })
      .pipe(tap((r) => this.saved(r.conversationId)));
  }

  // ── Conversaciones guardadas ──
  loadConversations(): Observable<ConversationSummary[]> {
    return this.http
      .get<ConversationSummary[]>(`${API}/assistant/conversations`)
      .pipe(tap((list) => this.conversations.set(list)));
  }

  // Abre una conversación: sus mensajes y tarjetas con el estado actual
  openConversation(id: string) {
    return this.http.get<ConversationDetail>(`${API}/assistant/conversations/${id}`).pipe(
      tap((c) => {
        this.conversationId.set(c.id);
        this.chat.set(c.messages.map((m) => ({ role: m.role, text: m.text, queries: m.queries, actions: m.actions })));
      }),
      map(() => undefined),
    );
  }

  newConversation() {
    this.conversationId.set(null);
    this.chat.set([]);
  }

  renameConversation(id: string, title: string) {
    return this.http.patch<{ id: string; title: string }>(`${API}/assistant/conversations/${id}`, { title }).pipe(
      tap((r) => this.conversations.update((list) => list.map((c) => (c.id === id ? { ...c, title: r.title } : c)))),
    );
  }

  deleteConversation(id: string) {
    return this.http.delete(`${API}/assistant/conversations/${id}`).pipe(
      tap(() => {
        this.conversations.update((list) => list.filter((c) => c.id !== id));
        if (this.conversationId() === id) this.newConversation();
      }),
    );
  }

  // Tras cada turno: la conversación queda abierta y la lista al día (título, orden)
  private saved(id: string) {
    this.conversationId.set(id);
    this.loadConversations().subscribe({ error: () => undefined });
  }

  private readTrackerContextFromStorage(): Record<string, unknown> | null {
    try {
      const snapsRaw = localStorage.getItem('nova_tracker_snapshots_v1');
      const catRaw = localStorage.getItem('nova_tracker_catalog_v1');
      const snapshots: any[] = snapsRaw ? JSON.parse(snapsRaw) : [];
      const catalog: Record<string, any> = catRaw ? JSON.parse(catRaw) : {};
      if (!snapshots.length && !Object.keys(catalog).length) return null;

      const latest = snapshots[0] ?? null;
      const presentSlugs = new Set<string>(
        (latest?.results ?? []).map(
          (r: any) => r.slug || (r.url ? String(r.url).split('?')[0] : r.name),
        ),
      );
      const bookedOutFromCatalog = Object.values(catalog)
        .filter((c: any) => !presentSlugs.has(c.slug))
        .map((c: any) => ({
          name: c.name,
          distance: c.distance,
          lastRoom: c.lastRoom,
          lastTotal: c.lastTotal,
          lastSeenAt: c.lastSeenAt,
        }));

      return {
        latestSearch: latest
          ? {
              savedAt: latest.savedAt,
              checkIn: latest.checkIn,
              checkOut: latest.checkOut,
              adults: latest.adults,
              children: latest.children,
              totalResults: latest.totalResults,
              results: (latest.results ?? []).map((r: any) => ({
                name: r.name,
                distance: r.distance,
                room: r.room,
                price: r.price,
                taxes: r.taxes,
                taxesIncluded: r.taxesIncluded,
                total: r.total,
              })),
            }
          : null,
        catalogTotalKnown: Object.keys(catalog).length,
        bookedOutFromCatalog,
        recentSnapshots: snapshots.slice(0, 35).map((s: any) => ({
          savedAt: s.savedAt,
          checkIn: s.checkIn,
          checkOut: s.checkOut,
          adults: s.adults,
          children: s.children,
          totalResults: s.totalResults,
          hotelNames: (s.results ?? []).map((r: any) => r.name),
        })),
      };
    } catch {
      return null;
    }
  }

  // Screenshot de Booking / AirBnB en el chat → propuesta "Crear reserva"
  chatImage(file: File, hint?: string) {
    const form = new FormData();
    form.append('file', file);
    if (hint?.trim()) form.append('hint', hint.trim());
    const id = this.conversationId();
    if (id) form.append('conversationId', id);
    return this.http
      .post<ChatReply>(`${API}/assistant/chat-image`, form)
      .pipe(tap((r) => this.saved(r.conversationId)));
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
