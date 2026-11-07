import { Component, inject, signal, effect, viewChild, ElementRef, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Sparkles, SendHorizontal, RotateCcw, Database, Paperclip, ImageUp } from 'lucide-angular';
import { AssistantService, ChatMessage, ChatReply } from '../../core/services/assistant.service';
import { Observable } from 'rxjs';
import { ApartmentsService } from '../../core/services/apartments.service';
import { AlertService } from '../../shared/components/services/alert.service';
import { NovaActionCard } from './action-card';
import { renderRich } from './rich-text';

@Component({
  selector: 'app-nova-ai',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideAngularModule, NovaActionCard],
  template: `
    <div class="page chat"
      (dragenter)="onDragEnter($event)" (dragover)="$event.preventDefault()"
      (dragleave)="onDragLeave($event)" (drop)="onDrop($event)">
      <!-- Soltar screenshot -->
      @if (dragging()) {
        <div class="dropping nova-in">
          <span class="orb md nova-glow"><lucide-icon [img]="ImageUp" [size]="30" [strokeWidth]="2" /></span>
          <p class="display drop-title">Suelta el screenshot aquí</p>
          <p class="small soft">NovaAI lee la reserva de Booking o AirBnB y te la arma</p>
        </div>
      }
      <!-- Resplandor decorativo -->
      <div class="halo"></div>

      <!-- Header -->
      <header class="page-header">
        <div class="stack" style="--gap: 2px; min-width: 0">
          <h1 class="page-title">
            <span class="icon-tile"><lucide-icon [img]="Sparkles" [size]="18" [strokeWidth]="2.2" /></span>
            <span>NovaAI</span>
          </h1>
          <p class="page-sub">Pregúntale a tu negocio</p>
        </div>
        @if (messages().length) {
          <button data-size="sm" data-variant="ghost" (click)="reset()" [disabled]="sending()" title="Nueva conversación">
            <lucide-icon [img]="RotateCcw" [size]="16" [strokeWidth]="2.2" />
            <span class="hide-sm">Nueva conversación</span>
          </button>
        }
      </header>

      <!-- Mensajes -->
      <div #scroller class="scroller">
        @if (!messages().length) {
          <div class="welcome nova-in">
            <span class="orb lg nova-glow"><lucide-icon [img]="Sparkles" [size]="36" [strokeWidth]="1.9" /></span>
            <div class="stack" style="--gap: 6px; align-items: center">
              <h2 class="welcome-title">Hola, ¿qué quieres saber?</h2>
              <p class="small soft" style="max-width: 24rem">Reservas, pagos, gastos, huéspedes… pregunta como le hablarías a tu socio, o arrastra el screenshot de una reserva.</p>
            </div>
            <div class="suggestions">
              @for (s of suggestions; track s.text) {
                <button class="suggestion" (click)="send(s.text)">
                  <span class="emoji">{{ s.icon }}</span>
                  <span>{{ s.text }}</span>
                </button>
              }
            </div>
          </div>
        }

        @for (m of messages(); track $index) {
          @if (m.role === 'user') {
            <div class="msg-user nova-in">
              @if (m.image) {
                <img [src]="m.image" alt="Screenshot enviado" class="shot" />
              }
              <div data-msg="user" class="bubble-user">{{ m.text }}</div>
            </div>
          } @else {
            <div class="msg-model nova-in">
              <span class="orb sm"><lucide-icon [img]="Sparkles" [size]="16" [strokeWidth]="2.2" /></span>
              <div class="msg-body">
                <div data-msg="model" class="bubble-model rt" [innerHTML]="rich(m.text)"></div>
                @if (m.queries?.length) {
                  <span class="queried">
                    <lucide-icon [img]="Database" [size]="12" [strokeWidth]="2" />
                    Consulté: {{ querySummary(m.queries!) }}
                  </span>
                }
                @for (a of m.actions ?? []; track a.id) {
                  <nova-action-card [card]="a" [busy]="busyAction() === a.id" [apartmentNames]="apartmentNames()"
                    (cancel)="cancelAction($event)" (confirm)="confirmAction($event.id, $event.apartmentId)" />
                }
              </div>
            </div>
          }
        }

        @if (sending()) {
          <div class="msg-model nova-in">
            <span class="orb sm nova-glow"><lucide-icon [img]="Sparkles" [size]="16" [strokeWidth]="2.2" /></span>
            <div class="bubble-model typing">
              <span class="dots"><i></i><i></i><i></i></span>
              <span class="tiny soft">{{ readingImage() ? 'Leyendo el screenshot…' : 'Consultando tu negocio…' }}</span>
            </div>
          </div>
        }
        @if (error(); as err) {
          <div class="note err nova-in" data-tone="danger">
            <span>{{ err }}</span>
            <button data-size="sm" data-variant="ghost" (click)="retry()">Reintentar</button>
          </div>
        }
      </div>

      <!-- Caja de texto -->
      <form class="composer" (submit)="$event.preventDefault(); send(draft())">
        <input #fileInput type="file" accept="image/*" hidden (change)="onFilePicked($event)" />
        <button type="button" class="icon-btn attach" (click)="fileInput.click()" [disabled]="sending()" title="Adjuntar screenshot de una reserva" aria-label="Adjuntar screenshot">
          <lucide-icon [img]="Paperclip" [size]="20" [strokeWidth]="2" />
        </button>
        <textarea [ngModel]="draft()" (ngModelChange)="draft.set($event)" name="draft"
          (keydown.enter)="onEnter($any($event))"
          rows="1" placeholder="Pregúntale a NovaAI…"></textarea>
        <button type="submit" data-tone="brand" data-icon [disabled]="!draft().trim() || sending()" title="Enviar" aria-label="Enviar">
          <lucide-icon [img]="SendHorizontal" [size]="20" [strokeWidth]="2.2" />
        </button>
      </form>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .chat { position: relative; height: 100%; gap: var(--sp-4); }
    .halo {
      pointer-events: none;
      position: absolute;
      inset: 0 0 auto;
      height: 18rem;
      background: radial-gradient(60% 100% at 50% 0%, var(--brand-soft), transparent);
    }
    .page-header { position: relative; }

    .dropping {
      pointer-events: none;
      position: absolute;
      inset: var(--sp-3);
      z-index: 30;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--sp-3);
      text-align: center;
      background: color-mix(in srgb, var(--bg-0) 94%, transparent);
      backdrop-filter: blur(10px);
      border: 2px dashed var(--brand);
      border-radius: var(--r-lg);
    }
    .drop-title { font-size: 1.3rem; color: var(--brand); }

    /* Orbe de NovaAI (pastel de marca, relieve 3D) */
    .orb {
      display: grid;
      place-items: center;
      flex: none;
      color: var(--ink);
      background: var(--brand);
      border-radius: 50%;
      box-shadow: 0 var(--depth) 0 var(--brand-deep);
    }
    .orb.sm { width: 32px; height: 32px; margin-top: 2px; }
    .orb.md { width: 64px; height: 64px; }
    .orb.lg { width: 84px; height: 84px; box-shadow: 0 4px 0 var(--brand-deep); }

    .scroller {
      position: relative;
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--sp-5);
      padding-right: 4px;
      margin-right: -4px;
    }

    /* Bienvenida */
    .welcome {
      min-height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--sp-6);
      padding-block: var(--sp-8);
      text-align: center;
    }
    .welcome-title { font-size: var(--fs-h2); color: var(--brand); }
    .suggestions {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      width: 100%;
      max-width: 36rem;
    }
    @media (width >= 40rem) { .suggestions { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    .suggestion {
      justify-content: flex-start;
      gap: var(--sp-3);
      min-height: 52px;
      padding: var(--sp-3) var(--sp-4);
      font-family: var(--font-body);
      font-weight: var(--fw-regular, 400);
      font-size: var(--fs-small);
      letter-spacing: normal;
      text-align: left;
      color: var(--text-2);
      background: var(--bg-1);
      border: var(--border) solid var(--line);
      border-radius: var(--r-md);
      box-shadow: 0 var(--depth) 0 var(--bg-3);
      filter: none;
    }
    .suggestion:hover { color: var(--text-1); border-color: var(--brand); box-shadow: 0 var(--depth) 0 var(--brand-deep); translate: 0 -2px; }
    .emoji { font-size: 1.15rem; flex: none; transition: scale var(--t-base) var(--spring); }
    .suggestion:hover .emoji { scale: 1.15; }

    /* Mensajes */
    .msg-user { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; }
    .shot {
      max-width: 60%;
      max-height: 16rem;
      object-fit: cover;
      border: 2px solid var(--brand);
      border-radius: var(--r-md) var(--r-md) 6px var(--r-md);
    }
    @media (width >= 40rem) { .shot { max-width: 280px; } }
    .bubble-user {
      max-width: 85%;
      padding: 10px var(--sp-4);
      font-size: var(--fs-small);
      font-weight: var(--fw-semibold);
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      color: var(--ink);
      background: var(--brand);
      border-radius: var(--r-md) var(--r-md) 6px var(--r-md);
      box-shadow: 0 var(--depth) 0 var(--brand-deep);
    }
    @media (width >= 40rem) { .bubble-user { max-width: 70%; } }
    .msg-model { display: flex; gap: var(--sp-3); }
    .msg-body { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; }
    .bubble-model {
      width: 100%;
      max-width: 100%;
      padding: var(--sp-3) var(--sp-4);
      font-size: var(--fs-small);
      line-height: 1.65;
      color: var(--text-2);
      overflow-wrap: anywhere;
      background: var(--bg-1);
      border: var(--border) solid var(--line);
      border-radius: 6px var(--r-md) var(--r-md) var(--r-md);
      box-shadow: 0 var(--depth) 0 var(--bg-3);
    }
    .queried {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
      padding: 4px 10px;
      font-size: 11px;
      color: var(--text-3);
      background: var(--bg-1);
      border: 1px solid var(--line);
      border-radius: var(--r-full);
    }
    .queried lucide-icon { color: var(--brand); flex: none; }
    .typing { display: flex; align-items: center; gap: var(--sp-3); width: fit-content; }
    .dots { display: flex; gap: 4px; }
    .dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--brand); animation: dot 1s var(--ease-in-out, ease-in-out) infinite; }
    .dots i:nth-child(1) { animation-delay: -0.3s; }
    .dots i:nth-child(2) { animation-delay: -0.15s; }
    @keyframes dot { 0%, 100% { translate: 0 0; } 50% { translate: 0 -5px; } }
    .err { align-items: center; width: fit-content; margin-left: 44px; color: var(--danger); font-size: var(--fs-caption); }

    /* Caja de texto */
    .composer {
      position: relative;
      display: flex;
      align-items: flex-end;
      gap: var(--sp-2);
      padding: 6px;
      background: var(--bg-1);
      border: var(--border) solid var(--line);
      border-radius: var(--r-md);
      box-shadow: 0 var(--depth) 0 var(--bg-3);
      transition: border-color var(--t-fast) ease, box-shadow var(--t-fast) ease;
    }
    .composer:focus-within { border-color: var(--brand); box-shadow: 0 var(--depth) 0 var(--brand-deep), 0 0 0 4px var(--brand-soft); }
    .composer textarea {
      flex: 1;
      min-height: 44px;
      max-height: 10rem;
      padding: 10px var(--sp-3);
      font-size: var(--fs-small);
      resize: none;
      background: transparent;
      border: 0;
      box-shadow: none;
      outline: none;
    }
    .attach { width: 44px; height: 44px; }
  `,
})
export class NovaAiComponent {
  readonly Sparkles = Sparkles;
  readonly SendHorizontal = SendHorizontal;
  readonly RotateCcw = RotateCcw;
  readonly Database = Database;
  readonly Paperclip = Paperclip;
  readonly ImageUp = ImageUp;

  private assistant = inject(AssistantService);
  private apartmentsService = inject(ApartmentsService);
  private alert = inject(AlertService);
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  messages = this.assistant.chat;
  draft = signal('');
  sending = signal(false);
  error = signal<string | null>(null);
  busyAction = signal<string | null>(null);
  dragging = signal(false);
  readingImage = signal(false);
  // Último screenshot que falló, para "Reintentar"
  private failedImage: { file: File; hint: string } | null = null;
  private dragDepth = 0;
  apartmentNames = signal<Record<string, string>>({});

  readonly suggestions = [
    { icon: '💰', text: '¿Cuánto gané este mes?' },
    { icon: '🛬', text: '¿Quién entra mañana?' },
    { icon: '🧾', text: '¿Qué falta por cobrar?' },
    { icon: '✍️', text: 'Escribe un mensaje de bienvenida para un huésped' },
  ];

  // El texto de cada respuesta se formatea una sola vez
  private richCache = new Map<string, string>();
  rich(text: string) {
    const apartments = this.apartmentNames();
    let html = this.richCache.get(text);
    if (html === undefined) {
      html = renderRich(text, apartments);
      this.richCache.set(text, html);
    }
    return html;
  }

  constructor() {
    this.apartmentsService.findAll().subscribe({
      next: (res) => {
        this.richCache.clear(); // las tarjetas toman el color del apartamento
        this.apartmentNames.set(Object.fromEntries(res.data.map((a) => [a._id, a.internalName])));
      },
    });

    // Baja al último mensaje cuando llega uno nuevo
    effect(() => {
      this.messages();
      this.sending();
      const el = this.scroller()?.nativeElement;
      if (el) setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }));
    });
  }

  onEnter(e: KeyboardEvent) {
    if (e.shiftKey) return;
    e.preventDefault();
    this.send(this.draft());
  }

  send(text: string) {
    const t = text.trim();
    if (!t || this.sending()) return;
    this.draft.set('');
    this.messages.update((m) => [...m, { role: 'user', text: t }]);
    this.request();
  }

  retry() {
    if (this.messages().at(-1)?.role !== 'user') return;
    if (this.failedImage) this.readImage(this.failedImage.file, this.failedImage.hint);
    else this.request();
  }

  // ── Screenshots: arrastrar, pegar o adjuntar ──
  onDragEnter(e: DragEvent) {
    if (!e.dataTransfer?.types.includes('Files')) return;
    e.preventDefault();
    this.dragDepth++;
    this.dragging.set(true);
  }

  onDragLeave(e: DragEvent) {
    e.preventDefault();
    if (--this.dragDepth <= 0) {
      this.dragDepth = 0;
      this.dragging.set(false);
    }
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragDepth = 0;
    this.dragging.set(false);
    const file = Array.from(e.dataTransfer?.files ?? []).find((f) => f.type.startsWith('image/'));
    if (file) this.sendImage(file);
  }

  @HostListener('document:paste', ['$event'])
  onPaste(e: ClipboardEvent) {
    const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      this.sendImage(file);
    }
  }

  onFilePicked(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.sendImage(file);
  }

  private sendImage(file: File) {
    if (this.sending()) return;
    // Lo escrito en la caja va como nota para la IA (ej: "son 3 huéspedes")
    const hint = this.draft().trim();
    this.draft.set('');
    this.messages.update((m) => [
      ...m,
      { role: 'user', text: hint ? `📷 ${hint}` : '📷 Screenshot de reserva', image: URL.createObjectURL(file) },
    ]);
    this.readImage(file, hint);
  }

  private readImage(file: File, hint: string) {
    this.failedImage = null;
    this.readingImage.set(true);
    this.handleReply(this.assistant.chatImage(file, hint), () => {
      this.failedImage = { file, hint };
    });
  }

  reset() {
    this.messages.set([]);
    this.error.set(null);
  }

  confirmAction(id: string, apartmentId?: string) {
    this.busyAction.set(id);
    this.assistant.confirmAction(id, apartmentId).subscribe({
      next: (r) => {
        this.setActionStatus(id, r.status);
        this.busyAction.set(null);
        const action = this.messages().flatMap((m) => m.actions ?? []).find((a) => a.id === id);
        this.messages.update((m) => [...m, { role: 'model', text: `Listo ✅ ${action?.summary ?? 'Cambio aplicado'}.` }]);
      },
      error: (err) => {
        this.busyAction.set(null);
        // 409: venció, ya no estaba pendiente, o el documento cambió desde la propuesta
        if (err?.error?.status) this.setActionStatus(id, err.error.status);
        this.alert.error('No se aplicó el cambio', err?.error?.message);
      },
    });
  }

  cancelAction(id: string) {
    this.busyAction.set(id);
    this.assistant.cancelAction(id).subscribe({
      next: (r) => {
        this.setActionStatus(id, r.status);
        this.busyAction.set(null);
      },
      error: () => {
        this.busyAction.set(null);
        this.alert.error('No se pudo cancelar la propuesta');
      },
    });
  }

  private setActionStatus(id: string, status: string) {
    this.messages.update((msgs) =>
      msgs.map((m) =>
        m.actions?.some((a) => a.id === id)
          ? { ...m, actions: m.actions.map((a) => (a.id === id ? { ...a, status } : a)) }
          : m,
      ),
    );
  }

  // "bookings (find) ×2, apartments (find)"
  querySummary(queries: string[]) {
    const counts = new Map<string, number>();
    for (const q of queries) counts.set(q, (counts.get(q) ?? 0) + 1);
    return [...counts].map(([q, n]) => (n > 1 ? `${q} ×${n}` : q)).join(', ');
  }

  private request() {
    this.failedImage = null;
    this.handleReply(this.assistant.sendChat(this.messages()));
  }

  private handleReply(req: Observable<ChatReply>, onError?: () => void) {
    this.sending.set(true);
    this.error.set(null);
    req.subscribe({
      next: (r) => {
        this.messages.update((m) => [...m, { role: 'model', text: r.reply, queries: r.queries, actions: r.actions } as ChatMessage]);
        this.sending.set(false);
        this.readingImage.set(false);
      },
      error: (err) => {
        onError?.();
        this.error.set(err?.error?.message ?? 'NovaAI no pudo responder.');
        this.sending.set(false);
        this.readingImage.set(false);
      },
    });
  }
}
