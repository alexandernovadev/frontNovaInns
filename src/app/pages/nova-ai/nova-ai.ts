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
    <div class="p-6 h-full flex flex-col gap-4 relative"
      (dragenter)="onDragEnter($event)" (dragover)="$event.preventDefault()"
      (dragleave)="onDragLeave($event)" (drop)="onDrop($event)">
      <!-- Soltar screenshot -->
      @if (dragging()) {
        <div class="pointer-events-none absolute inset-3 z-30 rounded-3xl border-2 border-dashed border-brand bg-bg/95 backdrop-blur-md
                    flex flex-col items-center justify-center gap-3 nova-in">
          <span class="w-16 h-16 rounded-full bg-gradient-to-br from-brand-accent to-brand-pressed flex items-center justify-center nova-glow">
            <lucide-icon [img]="ImageUp" class="w-8 h-8 text-bg" [strokeWidth]="2" />
          </span>
          <p class="text-lg font-semibold text-brand">Suelta el screenshot aquí</p>
          <p class="text-sm text-text-secondary">NovaAI lee la reserva de Booking o AirBnB y te la arma</p>
        </div>
      }
      <!-- Resplandor decorativo -->
      <div class="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(242,194,0,0.10),transparent)]"></div>

      <!-- Header -->
      <div class="page-header relative flex items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-accent to-brand-pressed flex items-center justify-center lg:shadow-[0_0_20px_rgba(242,194,0,0.35)] shrink-0">
              <lucide-icon [img]="Sparkles" class="w-4.5 h-4.5 text-bg" [strokeWidth]="2.2" />
            </span>
            <span class="bg-gradient-to-r from-white via-brand-accent to-brand bg-clip-text text-transparent">NovaAI</span>
          </h1>
          <p class="text-text-secondary text-sm mt-0.5">Pregúntale a tu negocio</p>
        </div>
        @if (messages().length) {
          <button (click)="reset()" [disabled]="sending()" title="Nueva conversación"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-sm text-text-secondary hover:text-brand hover:border-brand/50 transition-colors cursor-pointer disabled:opacity-50 shrink-0">
            <lucide-icon [img]="RotateCcw" class="w-4 h-4" [strokeWidth]="2" />
            <span class="hidden sm:inline">Nueva conversación</span>
          </button>
        }
      </div>

      <!-- Mensajes -->
      <div #scroller class="relative flex-1 min-h-0 overflow-y-auto space-y-5 pr-1 -mr-1">
        @if (!messages().length) {
          <div class="min-h-full flex flex-col items-center justify-center text-center gap-6 py-8 nova-in">
            <div class="relative">
              <div class="absolute inset-0 rounded-full bg-brand/30 blur-2xl nova-glow"></div>
              <div class="relative w-20 h-20 rounded-full bg-gradient-to-br from-brand-accent via-brand to-brand-pressed flex items-center justify-center shadow-[0_0_40px_rgba(242,194,0,0.35)]">
                <lucide-icon [img]="Sparkles" class="w-9 h-9 text-bg" [strokeWidth]="1.8" />
              </div>
            </div>
            <div class="space-y-1.5">
              <h2 class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white via-brand-accent to-brand bg-clip-text text-transparent">Hola, ¿qué quieres saber?</h2>
              <p class="text-text-secondary text-sm max-w-sm mx-auto">Reservas, pagos, gastos, huéspedes… pregunta como le hablarías a tu socio.</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl">
              @for (s of suggestions; track s.text) {
                <button (click)="send(s.text)"
                  class="group flex items-center gap-3 px-4 py-3 rounded-2xl border border-border bg-surface/80 text-left text-sm text-text-secondary
                         hover:border-brand/50 hover:text-text-primary hover:bg-elevated hover:-translate-y-0.5 transition-all cursor-pointer">
                  <span class="text-lg shrink-0 group-hover:scale-110 transition-transform">{{ s.icon }}</span>
                  <span>{{ s.text }}</span>
                </button>
              }
            </div>
          </div>
        }

        @for (m of messages(); track $index) {
          @if (m.role === 'user') {
            <div class="flex flex-col items-end gap-1.5 nova-in">
              @if (m.image) {
                <img [src]="m.image" alt="Screenshot enviado"
                  class="max-w-[60%] sm:max-w-[280px] max-h-64 object-cover rounded-2xl rounded-br-md border-2 border-brand/60 shadow-[0_4px_20px_-6px_rgba(242,194,0,0.45)]" />
              }
              <div data-msg="user"
                class="max-w-[85%] sm:max-w-[70%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm font-medium whitespace-pre-wrap break-words
                       bg-gradient-to-br from-brand-accent to-brand text-bg shadow-[0_4px_20px_-6px_rgba(242,194,0,0.45)]">{{ m.text }}</div>
            </div>
          } @else {
            <div class="flex gap-3 nova-in">
              <span class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-accent to-brand-pressed flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_14px_rgba(242,194,0,0.25)]">
                <lucide-icon [img]="Sparkles" class="w-4 h-4 text-bg" [strokeWidth]="2.2" />
              </span>
              <div class="min-w-0 flex-1 flex flex-col items-start">
                <div data-msg="model"
                  class="max-w-full sm:max-w-[85%] rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed text-text-secondary break-words
                         bg-gradient-to-b from-elevated to-surface border border-border shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  [innerHTML]="rich(m.text)"></div>
                @if (m.queries?.length) {
                  <span class="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface/60 border border-border text-[11px] text-text-disabled">
                    <lucide-icon [img]="Database" class="w-3 h-3 shrink-0 text-brand/70" [strokeWidth]="2" />
                    Consulté: {{ querySummary(m.queries!) }}
                  </span>
                }
                @for (a of m.actions ?? []; track a.id) {
                  <nova-action-card class="w-full" [card]="a" [busy]="busyAction() === a.id" [apartmentNames]="apartmentNames()"
                    (cancel)="cancelAction($event)" (confirm)="confirmAction($event.id, $event.apartmentId)" />
                }
              </div>
            </div>
          }
        }

        @if (sending()) {
          <div class="flex gap-3 nova-in">
            <span class="w-8 h-8 rounded-full bg-gradient-to-br from-brand-accent to-brand-pressed flex items-center justify-center shrink-0 nova-glow">
              <lucide-icon [img]="Sparkles" class="w-4 h-4 text-bg" [strokeWidth]="2.2" />
            </span>
            <div class="rounded-2xl rounded-tl-md px-4 py-3 bg-gradient-to-b from-elevated to-surface border border-border flex items-center gap-3">
              <span class="flex gap-1">
                <span class="w-1.5 h-1.5 rounded-full bg-brand animate-bounce [animation-delay:-0.3s]"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-brand animate-bounce [animation-delay:-0.15s]"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-brand animate-bounce"></span>
              </span>
              <span class="text-xs text-text-secondary">{{ readingImage() ? 'Leyendo el screenshot…' : 'Consultando tu negocio…' }}</span>
            </div>
          </div>
        }
        @if (error(); as err) {
          <div class="flex items-center gap-3 ml-11 px-3 py-2 rounded-xl bg-error/10 border border-error/30 text-xs text-error w-fit nova-in">
            <span>{{ err }}</span>
            <button (click)="retry()" class="font-semibold underline underline-offset-2 cursor-pointer hover:text-text-primary">Reintentar</button>
          </div>
        }
      </div>

      <!-- Caja de texto -->
      <form (submit)="$event.preventDefault(); send(draft())"
        class="relative flex items-end gap-2 p-1.5 rounded-2xl bg-surface border border-border transition-all
               focus-within:border-brand/60 focus-within:shadow-[0_0_0_4px_rgba(242,194,0,0.08),0_0_24px_-4px_rgba(242,194,0,0.25)]">
        <input #fileInput type="file" accept="image/*" class="hidden" (change)="onFilePicked($event)" />
        <button type="button" (click)="fileInput.click()" [disabled]="sending()" title="Adjuntar screenshot de una reserva"
          class="w-10 h-10 flex items-center justify-center rounded-xl text-text-secondary hover:text-brand hover:bg-brand/10 transition-colors cursor-pointer shrink-0 disabled:opacity-40">
          <lucide-icon [img]="Paperclip" class="w-5 h-5" [strokeWidth]="2" />
        </button>
        <textarea [ngModel]="draft()" (ngModelChange)="draft.set($event)" name="draft"
          (keydown.enter)="onEnter($any($event))"
          rows="1" placeholder="Pregúntale a NovaAI… o arrastra un screenshot"
          class="flex-1 bg-transparent px-3 py-2.5 text-text-primary text-sm resize-none max-h-40
                 placeholder:text-text-disabled focus:outline-none"></textarea>
        <button type="submit" [disabled]="!draft().trim() || sending()" title="Enviar"
          class="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-brand-accent to-brand text-bg cursor-pointer shrink-0
                 transition-all hover:scale-105 hover:shadow-[0_0_16px_rgba(242,194,0,0.5)] disabled:opacity-30 disabled:hover:scale-100 disabled:hover:shadow-none">
          <lucide-icon [img]="SendHorizontal" class="w-5 h-5" [strokeWidth]="2.2" />
        </button>
      </form>
    </div>
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
    let html = this.richCache.get(text);
    if (html === undefined) {
      html = renderRich(text);
      this.richCache.set(text, html);
    }
    return html;
  }

  constructor() {
    this.apartmentsService.findAll().subscribe({
      next: (res) => this.apartmentNames.set(Object.fromEntries(res.data.map((a) => [a._id, a.internalName]))),
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
