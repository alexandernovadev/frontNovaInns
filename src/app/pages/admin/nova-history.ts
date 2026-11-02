import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, History, Pencil, Trash2, Undo2, Sparkles, ArrowRight, TriangleAlert } from 'lucide-angular';
import { AssistantService, HistoryFilter, HistoryItem } from '../../core/services/assistant.service';
import { ApartmentsService } from '../../core/services/apartments.service';
import { AlertService } from '../../shared/components/services/alert.service';
import { ModalNova } from '../../shared/components/modal-nova';
import { ACTION_STATUS_TEXT, fieldLabel, formatValue } from '../nova-ai/nova-format';

const STATUS_PILL: Record<string, string> = {
  confirmed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  undone: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
  pending: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  cancelled: 'bg-white/5 text-text-disabled border-border',
  expired: 'bg-white/5 text-text-disabled border-border',
};

// Admin → Historial NovaAI: cada cambio que propuso/hizo NovaAI, con deshacer
@Component({
  selector: 'app-nova-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, ModalNova],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-text-primary text-lg font-semibold flex items-center gap-2">
            <lucide-icon [img]="History" class="w-5 h-5 text-brand" [strokeWidth]="2" />
            Historial NovaAI
          </h2>
          <p class="text-text-secondary text-sm mt-0.5">Cada cambio de NovaAI con su antes y después. Puedes deshacerlo.</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex flex-wrap gap-2">
        @for (f of filters; track f.value) {
          <button (click)="setFilter(f.value)"
            class="px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors cursor-pointer"
            [class]="filter() === f.value
              ? 'bg-brand text-bg border-brand'
              : 'border-border text-text-secondary hover:text-text-primary hover:border-brand/50'">
            {{ f.label }}
          </button>
        }
        @if (total() !== null) {
          <span class="ml-auto self-center text-xs text-text-disabled">{{ total() }} registro(s)</span>
        }
      </div>

      @if (loading() && !items().length) {
        <div class="text-center py-16 text-text-disabled text-sm">Cargando historial…</div>
      } @else if (!items().length) {
        <div class="flex flex-col items-center gap-3 py-16 text-center">
          <span class="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center">
            <lucide-icon [img]="Sparkles" class="w-7 h-7 text-brand" [strokeWidth]="1.8" />
          </span>
          <p class="text-text-secondary text-sm">Todavía no hay cambios aquí.</p>
        </div>
      } @else {
        <ol class="relative space-y-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border">
          @for (it of items(); track it.id) {
            @let isUndo = it.type === 'undo';
            @let isDelete = it.type === 'delete';
            <li class="relative flex gap-4 nova-in">
              <span class="relative z-10 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                [class]="isUndo ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                  : isDelete ? 'bg-error/15 border-error/30 text-error'
                  : 'bg-brand/15 border-brand/30 text-brand'">
                <lucide-icon [img]="isUndo ? Undo2 : isDelete ? Trash2 : Pencil" class="w-4.5 h-4.5" [strokeWidth]="2" />
              </span>

              <div class="min-w-0 flex-1 rounded-2xl border border-border bg-gradient-to-b from-elevated to-surface overflow-hidden"
                [class.opacity-60]="it.status === 'cancelled' || it.status === 'expired'">
                <div class="px-4 py-3 flex flex-wrap items-start gap-x-3 gap-y-1.5">
                  <div class="min-w-0 flex-1">
                    <p class="text-text-primary text-sm font-semibold">{{ it.summary || (isDelete ? 'Eliminar' : 'Editar') }}</p>
                    <p class="text-text-disabled text-xs mt-0.5">{{ when(it) }}</p>
                  </div>
                  <span class="px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap" [class]="pill(it.status)">
                    {{ statusText(it.status) }}
                  </span>
                </div>

                @if (it.request) {
                  <p class="px-4 pb-2 text-xs text-text-secondary italic">Le pediste: “{{ it.request }}”</p>
                }

                @for (t of it.targets; track t.id) {
                  <div class="px-4 py-3 border-t border-border">
                    <p class="text-text-primary text-xs font-medium mb-2">{{ t.label }}</p>
                    @if (t.changes.length) {
                      <div class="space-y-1.5">
                        @for (ch of t.changes; track ch.field) {
                          <div class="grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 text-xs items-baseline">
                            <span class="text-text-disabled truncate">{{ label(ch.field) }}</span>
                            <span class="flex flex-wrap items-center gap-1.5 min-w-0">
                              <span class="text-text-disabled line-through break-words">{{ format(ch.field, ch.before) }}</span>
                              <lucide-icon [img]="ArrowRight" class="w-3 h-3 text-text-disabled shrink-0" [strokeWidth]="2" />
                              <span class="px-1.5 py-px rounded-md bg-brand/10 text-brand-accent font-semibold break-words">{{ format(ch.field, ch.after) }}</span>
                            </span>
                          </div>
                        }
                      </div>
                    } @else if (t.details.length) {
                      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                        @for (d of t.details; track d.field) {
                          <dt class="text-text-disabled">{{ label(d.field) }}</dt>
                          <dd class="text-text-secondary break-words">{{ format(d.field, d.value) }}</dd>
                        }
                      </dl>
                    } @else if (isUndo) {
                      <p class="text-xs text-purple-300">Documento restaurado completo</p>
                    }
                  </div>
                }

                @if (it.error) {
                  <p class="px-4 py-2 border-t border-border text-xs text-error flex items-start gap-1.5">
                    <lucide-icon [img]="TriangleAlert" class="w-3.5 h-3.5 shrink-0 mt-px" [strokeWidth]="2" />
                    {{ it.error }}
                  </p>
                }

                @if (it.status === 'confirmed' && !isUndo) {
                  <div class="px-4 py-2.5 border-t border-border bg-bg/40 flex justify-end">
                    <button (click)="openUndo(it)"
                      class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-purple-500/40 text-purple-300 text-xs font-semibold
                             hover:bg-purple-500/10 transition-colors cursor-pointer">
                      <lucide-icon [img]="Undo2" class="w-3.5 h-3.5" [strokeWidth]="2.2" />
                      Deshacer
                    </button>
                  </div>
                }
              </div>
            </li>
          }
        </ol>

        @if (page() < totalPages()) {
          <div class="flex justify-center">
            <button (click)="loadMore()" [disabled]="loading()"
              class="px-4 py-2 rounded-xl border border-border text-sm text-text-secondary hover:text-text-primary hover:border-brand/50 transition-colors cursor-pointer disabled:opacity-50">
              {{ loading() ? 'Cargando…' : 'Cargar más' }}
            </button>
          </div>
        }
      }
    </div>

    <!-- Modal deshacer -->
    <modal-nova [visible]="undoTarget() !== null" [title]="drift() ? 'Cambió después' : '¿Deshacer este cambio?'" size="sm"
      (closed)="closeUndo()" [footerTemplate]="undoFooter">
      @if (undoTarget(); as it) {
        <div class="space-y-3 text-sm">
          @if (drift(); as d) {
            <div class="flex gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <lucide-icon [img]="TriangleAlert" class="w-4 h-4 shrink-0" [strokeWidth]="2" />
              <div class="space-y-1">
                <p>Esto se modificó después del cambio de NovaAI:</p>
                @for (x of d; track x.label) {
                  <p class="font-semibold">{{ x.label }}: {{ labels(x.fields) }}</p>
                }
                <p>Si deshaces igual, solo se restauran los campos de NovaAI; lo demás se queda como está.</p>
              </div>
            </div>
          } @else {
            <p class="text-text-secondary">
              @if (it.type === 'delete') {
                Se va a <strong class="text-text-primary">restaurar completo</strong> lo que NovaAI eliminó:
              } @else {
                Estos campos vuelven a como estaban:
              }
            </p>
          }
          @for (t of it.targets; track t.id) {
            <div class="rounded-xl border border-border p-3">
              <p class="text-text-primary text-xs font-medium mb-1.5">{{ t.label }}</p>
              @for (ch of t.changes; track ch.field) {
                <p class="text-xs text-text-secondary">
                  {{ label(ch.field) }}: <span class="line-through text-text-disabled">{{ format(ch.field, ch.after) }}</span>
                  → <span class="text-purple-300 font-semibold">{{ format(ch.field, ch.before) }}</span>
                </p>
              }
            </div>
          }
        </div>
      }
    </modal-nova>
    <ng-template #undoFooter>
      <div class="flex gap-3">
        <button (click)="closeUndo()"
          class="flex-1 border border-border text-text-secondary hover:text-text-primary py-2.5 rounded-xl text-sm transition-colors cursor-pointer">Cancelar</button>
        <button (click)="confirmUndo()" [disabled]="undoing()"
          class="flex-1 bg-purple-500 hover:bg-purple-400 text-white font-bold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50 cursor-pointer">
          {{ undoing() ? 'Deshaciendo…' : drift() ? 'Deshacer igual' : 'Deshacer' }}
        </button>
      </div>
    </ng-template>
  `,
})
export class NovaHistoryComponent implements OnInit {
  readonly History = History;
  readonly Pencil = Pencil;
  readonly Trash2 = Trash2;
  readonly Undo2 = Undo2;
  readonly Sparkles = Sparkles;
  readonly ArrowRight = ArrowRight;
  readonly TriangleAlert = TriangleAlert;

  private assistant = inject(AssistantService);
  private apartmentsService = inject(ApartmentsService);
  private alert = inject(AlertService);

  readonly filters: { label: string; value: HistoryFilter }[] = [
    { label: 'Todos', value: '' },
    { label: 'Aplicados', value: 'applied' },
    { label: 'Deshechos', value: 'undone' },
    { label: 'Sin aplicar', value: 'other' },
  ];

  filter = signal<HistoryFilter>('');
  items = signal<HistoryItem[]>([]);
  page = signal(1);
  totalPages = signal(1);
  total = signal<number | null>(null);
  loading = signal(false);
  apartmentNames = signal<Record<string, string>>({});

  undoTarget = signal<HistoryItem | null>(null);
  drift = signal<{ label: string; fields: string[] }[] | null>(null);
  undoing = signal(false);

  ngOnInit() {
    this.apartmentsService.findAll().subscribe({
      next: (res) => this.apartmentNames.set(Object.fromEntries(res.data.map((a) => [a._id, a.internalName]))),
    });
    this.load(1);
  }

  setFilter(f: HistoryFilter) {
    this.filter.set(f);
    this.load(1);
  }

  loadMore() {
    this.load(this.page() + 1);
  }

  private load(page: number) {
    this.loading.set(true);
    this.assistant.listActions(this.filter(), page).subscribe({
      next: (r) => {
        this.items.update((cur) => (page === 1 ? r.data : [...cur, ...r.data]));
        this.page.set(r.meta.page);
        this.totalPages.set(r.meta.totalPages);
        this.total.set(r.meta.total);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.alert.error('No se pudo cargar el historial');
      },
    });
  }

  openUndo(it: HistoryItem) {
    this.drift.set(null);
    this.undoTarget.set(it);
  }

  closeUndo() {
    this.undoTarget.set(null);
    this.drift.set(null);
  }

  confirmUndo() {
    const it = this.undoTarget();
    if (!it) return;
    this.undoing.set(true);
    // Si ya se mostró el aviso de "cambió después", el segundo clic es "deshacer igual"
    this.assistant.undoAction(it.id, this.drift() !== null).subscribe({
      next: () => {
        this.undoing.set(false);
        this.closeUndo();
        this.alert.success('Cambio deshecho', it.summary);
        this.load(1);
      },
      error: (err) => {
        this.undoing.set(false);
        if (err?.status === 409 && err.error?.status === 'changed') {
          this.drift.set(err.error.drift ?? []);
          return;
        }
        this.closeUndo();
        this.alert.error('No se pudo deshacer', err?.error?.message);
        this.load(1);
      },
    });
  }

  when(it: HistoryItem) {
    const fmt = (d: string) =>
      new Date(d).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });
    if (it.undoneAt) return `Deshecho el ${fmt(it.undoneAt)}`;
    if (it.confirmedAt) return `${it.type === 'undo' ? 'Hecho' : 'Confirmado'} el ${fmt(it.confirmedAt)}`;
    return `Propuesto el ${fmt(it.createdAt)}`;
  }

  pill(status: string) {
    return STATUS_PILL[status] ?? STATUS_PILL['cancelled'];
  }

  statusText(status: string) {
    return ACTION_STATUS_TEXT[status] ?? status;
  }

  label(field: string) {
    return fieldLabel(field);
  }

  labels(fields: string[]) {
    return fields.map((f) => fieldLabel(f)).join(', ');
  }

  format(field: string, value: unknown) {
    return formatValue(field, value, this.apartmentNames());
  }
}
