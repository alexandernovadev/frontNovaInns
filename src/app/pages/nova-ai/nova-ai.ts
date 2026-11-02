import { Component, inject, signal, effect, viewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Sparkles, SendHorizontal, RotateCcw, LoaderCircle } from 'lucide-angular';
import { AssistantService, ChatMessage } from '../../core/services/assistant.service';

@Component({
  selector: 'app-nova-ai',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideAngularModule],
  template: `
    <div class="p-6 h-full flex flex-col gap-4">
      <!-- Header -->
      <div class="page-header flex items-center justify-between gap-3">
        <div>
          <h1 class="text-text-primary text-2xl font-bold flex items-center gap-2">
            <lucide-icon [img]="Sparkles" class="w-6 h-6 text-brand" [strokeWidth]="2" />
            NovaAI
          </h1>
          <p class="text-text-secondary text-sm mt-0.5">Pregúntale a tu negocio</p>
        </div>
        @if (messages().length) {
          <button (click)="reset()" [disabled]="sending()" title="Nueva conversación"
            class="flex items-center gap-1.5 text-sm text-text-secondary hover:text-brand transition-colors cursor-pointer disabled:opacity-50 shrink-0">
            <lucide-icon [img]="RotateCcw" class="w-4 h-4" [strokeWidth]="2" />
            <span class="hidden sm:inline">Nueva conversación</span>
          </button>
        }
      </div>

      <!-- Mensajes -->
      <div #scroller class="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        @if (!messages().length) {
          <div class="h-full flex flex-col items-center justify-center text-center gap-4 py-8">
            <lucide-icon [img]="Sparkles" class="w-10 h-10 text-brand" [strokeWidth]="1.5" />
            <p class="text-text-secondary text-sm max-w-sm">Pregunta lo que quieras sobre Nova Inns: reservas, pagos, gastos, huéspedes…</p>
            <div class="flex flex-wrap justify-center gap-2 max-w-xl">
              @for (s of suggestions; track s) {
                <button (click)="send(s)"
                  class="px-3 py-1.5 rounded-full border border-border bg-surface text-xs text-text-secondary hover:border-brand hover:text-brand transition-colors cursor-pointer">
                  {{ s }}
                </button>
              }
            </div>
          </div>
        }
        @for (m of messages(); track $index) {
          <div class="flex" [class.justify-end]="m.role === 'user'">
            <div class="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words"
              [class]="m.role === 'user'
                ? 'bg-brand text-bg rounded-br-md'
                : 'bg-surface border border-border text-text-primary rounded-bl-md'">{{ m.text }}</div>
          </div>
        }
        @if (sending()) {
          <div class="flex">
            <div class="bg-surface border border-border rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-text-secondary flex items-center gap-2">
              <lucide-icon [img]="LoaderCircle" class="w-4 h-4 animate-spin text-brand" [strokeWidth]="2" />
              Pensando…
            </div>
          </div>
        }
        @if (error(); as err) {
          <div class="flex items-center gap-3 text-xs text-error">
            <span>{{ err }}</span>
            <button (click)="retry()" class="underline cursor-pointer hover:text-text-primary">Reintentar</button>
          </div>
        }
      </div>

      <!-- Caja de texto -->
      <form (submit)="$event.preventDefault(); send(draft())" class="flex items-end gap-2">
        <textarea [ngModel]="draft()" (ngModelChange)="draft.set($event)" name="draft"
          (keydown.enter)="onEnter($any($event))"
          rows="1" placeholder="Pregúntale a NovaAI…"
          class="flex-1 bg-input border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm resize-none max-h-40
                 placeholder:text-text-disabled focus:outline-none focus:border-brand transition-colors"></textarea>
        <button type="submit" [disabled]="!draft().trim() || sending()" title="Enviar"
          class="w-11 h-11 flex items-center justify-center rounded-xl bg-brand hover:bg-brand-accent text-bg transition-colors cursor-pointer disabled:opacity-50 shrink-0">
          <lucide-icon [img]="SendHorizontal" class="w-5 h-5" [strokeWidth]="2" />
        </button>
      </form>
    </div>
  `,
})
export class NovaAiComponent {
  readonly Sparkles = Sparkles;
  readonly SendHorizontal = SendHorizontal;
  readonly RotateCcw = RotateCcw;
  readonly LoaderCircle = LoaderCircle;

  private assistant = inject(AssistantService);
  private scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  messages = this.assistant.chat;
  draft = signal('');
  sending = signal(false);
  error = signal<string | null>(null);

  readonly suggestions = [
    '¿Cuánto gané este mes?',
    '¿Quién entra mañana?',
    '¿Qué falta por cobrar?',
    'Escribe un mensaje de bienvenida para un huésped',
  ];

  constructor() {
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
    if (this.messages().at(-1)?.role === 'user') this.request();
  }

  reset() {
    this.messages.set([]);
    this.error.set(null);
  }

  private request() {
    this.sending.set(true);
    this.error.set(null);
    this.assistant.sendChat(this.messages()).subscribe({
      next: (r) => {
        this.messages.update((m) => [...m, { role: 'model', text: r.reply } as ChatMessage]);
        this.sending.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'NovaAI no pudo responder.');
        this.sending.set(false);
      },
    });
  }
}
