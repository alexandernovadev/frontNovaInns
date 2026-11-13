import { Component, inject, signal, computed, effect, viewChild, ElementRef, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Sparkles, SendHorizontal, Database, Paperclip, ImageUp, Plus, Pencil, Trash2, History, X } from 'lucide-angular';
import { AssistantService, ChatMessage, ChatReply, ConversationSummary } from '../../core/services/assistant.service';
import { Observable } from 'rxjs';
import { ApartmentsService } from '../../core/services/apartments.service';
import { AlertService } from '../../shared/components/services/alert.service';
import { NovaActionCard } from './action-card';
import { BookingDetailModal, BookingCardQuery } from '../../shared/components/booking-detail-modal';
import { renderRich, findBookingCardFromElement } from './rich-text';

@Component({
  selector: 'app-nova-ai',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideAngularModule, NovaActionCard, BookingDetailModal],
  template: `
    <div class="nova-shell">
    <!-- Conversaciones guardadas: columna fija en escritorio, cajón en móvil -->
    @if (panelOpen()) {
      <div class="convs-backdrop" (click)="panelOpen.set(false)"></div>
    }
    <aside class="convs" [class.open]="panelOpen()" aria-label="Conversaciones">
      <div class="convs-head">
        <button data-size="sm" data-tone="brand" class="convs-new" (click)="newConversation()" [disabled]="sending()">
          <lucide-icon [img]="Plus" [size]="16" [strokeWidth]="2.4" />
          Nueva conversación
        </button>
        <button class="icon-btn convs-close" (click)="panelOpen.set(false)" aria-label="Cerrar conversaciones">
          <lucide-icon [img]="X" [size]="18" [strokeWidth]="2.2" />
        </button>
      </div>
      <nav class="convs-list">
        @for (g of groups(); track g.label) {
          <p class="convs-group">{{ g.label }}</p>
          @for (c of g.items; track c.id) {
            <div class="conv" [class.active]="c.id === conversationId()">
              @if (renaming() === c.id) {
                <input #rn class="conv-rename" [value]="c.title" maxlength="60" aria-label="Nuevo nombre"
                  (keydown.enter)="saveRename(c, rn.value)" (keydown.escape)="renaming.set(null)"
                  (blur)="saveRename(c, rn.value)" />
              } @else if (confirmingDelete() === c.id) {
                <span class="conv-ask">¿Eliminar?</span>
                <button data-size="sm" data-variant="ghost" (click)="confirmingDelete.set(null)">No</button>
                <button data-size="sm" data-tone="danger" (click)="deleteConversation(c.id)">Sí</button>
              } @else {
                <button class="conv-open" (click)="openConversation(c.id)" [disabled]="sending()" [title]="c.title">
                  {{ c.title || 'Sin título' }}
                </button>
                <button class="icon-btn conv-act" (click)="startRename(c.id)" title="Renombrar" aria-label="Renombrar">
                  <lucide-icon [img]="Pencil" [size]="14" [strokeWidth]="2" />
                </button>
                <button class="icon-btn conv-act" (click)="renaming.set(null); confirmingDelete.set(c.id)" [disabled]="sending()" title="Eliminar" aria-label="Eliminar">
                  <lucide-icon [img]="Trash2" [size]="14" [strokeWidth]="2" />
                </button>
              }
            </div>
          }
        } @empty {
          <p class="tiny soft convs-empty">Aquí aparecen tus conversaciones guardadas.</p>
        }
      </nav>
      <p class="convs-note">Se borran solas a los 90 días sin uso.</p>
    </aside>

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
        <div class="row header-btns" style="--gap: var(--sp-2)">
          <button data-size="sm" data-variant="ghost" class="convs-toggle" (click)="panelOpen.set(true)" title="Conversaciones" aria-label="Conversaciones">
            <lucide-icon [img]="History" [size]="16" [strokeWidth]="2.2" />
          </button>
          @if (messages().length) {
            <button data-size="sm" data-variant="ghost" (click)="newConversation()" [disabled]="sending()" title="Nueva conversación">
              <lucide-icon [img]="Plus" [size]="16" [strokeWidth]="2.2" />
              <span class="hide-sm">Nueva conversación</span>
            </button>
          }
        </div>
      </header>

      <!-- Mensajes -->
      <div #scroller class="scroller">
        @if (loadingConversation()) {
          <div class="welcome"><span class="dots"><i></i><i></i><i></i></span></div>
        } @else if (!messages().length) {
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
                <div data-msg="model" class="bubble-model rt" [innerHTML]="rich(m.text)" (click)="onBubbleClick($event)"></div>
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

      <booking-detail-modal [query]="selectedBooking()" (closed)="selectedBooking.set(null)" />
    </div>
    </div>
  `,
  styles: `
    :host { display: block; height: 100%; }
    .nova-shell { position: relative; display: flex; height: 100%; min-width: 0; }
    .chat { position: relative; flex: 1; min-width: 0; height: 100%; gap: var(--sp-4); }

    /* Conversaciones */
    .convs {
      display: flex;
      flex-direction: column;
      gap: var(--sp-3);
      width: 16rem;
      flex: none;
      padding: var(--sp-6) var(--sp-3) var(--sp-4);
      background: var(--bg-1);
      border-right: 1px solid var(--line);
    }
    .convs-head { display: flex; align-items: center; gap: var(--sp-2); }
    .convs-new { flex: 1; }
    .convs-close, .convs-backdrop { display: none; }
    .convs-list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
    .convs-group { margin: var(--sp-3) var(--sp-2) 4px; font-size: 11px; font-weight: var(--fw-semibold); color: var(--text-3); text-transform: uppercase; letter-spacing: 0.04em; }
    .convs-empty { padding: var(--sp-3) var(--sp-2); }
    .convs-note { font-size: 11px; color: var(--text-3); padding-inline: var(--sp-2); }
    .conv { display: flex; align-items: center; gap: 2px; min-height: 36px; padding-right: 4px; border-radius: var(--r-sm); }
    .conv:hover { background: var(--bg-2); }
    .conv.active { background: var(--brand-soft); }
    .conv.active .conv-open { color: var(--brand); font-weight: var(--fw-semibold); }
    .conv-open {
      flex: 1;
      min-width: 0;
      justify-content: flex-start;
      padding: 8px var(--sp-2);
      font-family: var(--font-body);
      font-size: var(--fs-caption);
      font-weight: var(--fw-regular, 400);
      letter-spacing: normal;
      color: var(--text-2);
      text-align: left;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      background: transparent;
      border: 0;
      box-shadow: none;
      filter: none;
    }
    .conv-open:hover { translate: none; }
    .conv-act { width: 28px; height: 28px; flex: none; opacity: 0; color: var(--text-3); }
    .conv:hover .conv-act, .conv.active .conv-act, .conv-act:focus-visible { opacity: 1; }
    .conv-rename { flex: 1; min-width: 0; height: 32px; font-size: var(--fs-caption); }
    .conv-ask { flex: 1; padding-left: var(--sp-2); font-size: var(--fs-caption); color: var(--danger); }
    .convs-toggle { display: none; }

    /* Móvil / tablet: el panel es un cajón */
    @media (width < 64rem) {
      .convs {
        position: fixed;
        inset: 0 auto 0 0;
        z-index: 60;
        width: min(18rem, 85vw);
        translate: -100% 0;
        transition: translate var(--t-base) ease;
        box-shadow: 0 0 40px rgb(0 0 0 / 0.4);
      }
      .convs.open { translate: 0 0; }
      .convs-close { display: grid; }
      .convs-backdrop { display: block; position: fixed; inset: 0; z-index: 59; background: rgb(0 0 0 / 0.45); }
      .convs-toggle { display: inline-flex; }
      .conv-act { opacity: 1; }
    }
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
  readonly Plus = Plus;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;
  readonly History = History;
  readonly X = X;
  readonly Database = Database;
  readonly Paperclip = Paperclip;
  readonly ImageUp = ImageUp;

  private assistant = inject(AssistantService);
  private apartmentsService = inject(ApartmentsService);
  private alert = inject(AlertService);
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  messages = this.assistant.chat;
  conversationId = this.assistant.conversationId;
  conversations = this.assistant.conversations;
  // Panel de conversaciones: cajón en móvil
  panelOpen = signal(false);
  loadingConversation = signal(false);
  renaming = signal<string | null>(null);
  confirmingDelete = signal<string | null>(null);

  // Hoy / Ayer / Últimos 7 días / Antes (por última actividad, en hora local)
  groups = computed(() => {
    const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const today = day(new Date());
    const labels = ['Hoy', 'Ayer', 'Últimos 7 días', 'Antes'];
    const buckets: ConversationSummary[][] = [[], [], [], []];
    for (const c of this.conversations()) {
      const diff = Math.round((today - day(new Date(c.updatedAt))) / 86_400_000);
      buckets[diff <= 0 ? 0 : diff === 1 ? 1 : diff < 7 ? 2 : 3].push(c);
    }
    return labels.map((label, i) => ({ label, items: buckets[i] })).filter((g) => g.items.length);
  });
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
  selectedBooking = signal<BookingCardQuery | null>(null);

  onBubbleClick(e: MouseEvent) {
    const found = findBookingCardFromElement(e.target as HTMLElement | null);
    if (found) this.selectedBooking.set({ ...found });
  }

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
    this.apartmentsService.findAllCached().subscribe({
      next: (res) => {
        this.richCache.clear(); // las tarjetas toman el color del apartamento
        this.apartmentNames.set(Object.fromEntries(res.data.map((a) => [a._id, a.internalName])));
      },
    });

    // ?c=<id> es la conversación abierta. Al volver a NovaAI sin ?c se deja la
    // que ya estaba abierta en la URL
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const c = params.get('c');
      const current = this.conversationId();
      if (c && c !== current) this.loadConversation(c);
      else if (!c && current) this.syncUrl(current);
    });

    // La primera vez en la sesión se retoma la última conversación
    this.assistant.loadConversations().subscribe({
      next: (list) => {
        const first = !this.assistant.autoOpened;
        this.assistant.autoOpened = true;
        if (first && !this.conversationId() && !this.messages().length && !this.route.snapshot.queryParamMap.get('c') && list[0])
          this.openConversation(list[0].id);
      },
      error: () => this.alert.error('No se pudieron cargar las conversaciones'),
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

  // ── Conversaciones ──
  newConversation() {
    if (this.sending()) return;
    this.assistant.newConversation();
    this.clearTransient();
    this.panelOpen.set(false);
    this.router.navigate([], { relativeTo: this.route, queryParams: {} });
  }

  openConversation(id: string) {
    if (this.sending()) return;
    this.panelOpen.set(false);
    if (id === this.conversationId()) return;
    this.router.navigate([], { relativeTo: this.route, queryParams: { c: id } });
  }

  startRename(id: string) {
    this.confirmingDelete.set(null);
    this.renaming.set(id);
    // El input aparece en el siguiente ciclo de render
    setTimeout(() => document.querySelector<HTMLInputElement>('.conv-rename')?.select());
  }

  // Enter y blur pueden llegar los dos: solo cuenta el primero
  saveRename(c: ConversationSummary, value: string) {
    if (this.renaming() !== c.id) return;
    this.renaming.set(null);
    const title = value.trim();
    if (!title || title === c.title) return;
    this.assistant.renameConversation(c.id, title).subscribe({
      error: () => this.alert.error('No se pudo renombrar la conversación'),
    });
  }

  deleteConversation(id: string) {
    this.confirmingDelete.set(null);
    const wasOpen = id === this.conversationId();
    this.assistant.deleteConversation(id).subscribe({
      next: () => {
        if (wasOpen) {
          this.clearTransient();
          this.router.navigate([], { relativeTo: this.route, queryParams: {} });
        }
      },
      error: () => this.alert.error('No se pudo eliminar la conversación'),
    });
  }

  private loadConversation(id: string) {
    this.clearTransient();
    this.loadingConversation.set(true);
    this.assistant.openConversation(id).subscribe({
      next: () => this.loadingConversation.set(false),
      error: () => {
        this.loadingConversation.set(false);
        this.alert.error('No se encontró la conversación', 'Puede que se haya eliminado o vencido (90 días sin uso).');
        this.assistant.newConversation();
        this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
      },
    });
  }

  private syncUrl(id: string) {
    this.router.navigate([], { relativeTo: this.route, queryParams: { c: id }, replaceUrl: true });
  }

  private clearTransient() {
    this.error.set(null);
    this.failedImage = null;
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
    this.handleReply(this.assistant.sendChat(this.messages().at(-1)!.text));
  }

  private handleReply(req: Observable<ChatReply>, onError?: () => void) {
    this.sending.set(true);
    this.error.set(null);
    req.subscribe({
      next: (r) => {
        this.messages.update((m) => [...m, { role: 'model', text: r.reply, queries: r.queries, actions: r.actions } as ChatMessage]);
        this.sending.set(false);
        this.readingImage.set(false);
        if (this.route.snapshot.queryParamMap.get('c') !== r.conversationId) this.syncUrl(r.conversationId);
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
