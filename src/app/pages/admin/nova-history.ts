import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, History, Pencil, Trash2, Undo2, Sparkles, ArrowRight, TriangleAlert, CalendarPlus } from 'lucide-angular';
import { AssistantService, HistoryFilter, HistoryItem } from '../../core/services/assistant.service';
import { ApartmentsService } from '../../core/services/apartments.service';
import { AlertService } from '../../shared/components/services/alert.service';
import { ModalNova } from '../../shared/components/modal-nova';
import { ACTION_STATUS_TEXT, fieldLabel, formatValue, prettyDatesIn } from '../nova-ai/nova-format';

const STATUS_PILL: Record<string, string> = {
  confirmed: 'tint-mint',
  undone: 'tint-lilac',
  failed: 'tint-rose',
  pending: 'tint-sky',
  cancelled: 'tint-neutral',
  expired: 'tint-neutral',
};

// Admin → Historial NovaAI: cada cambio que propuso/hizo NovaAI, con deshacer
@Component({
  selector: 'app-nova-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule, ModalNova],
  template: `
    <div class="stack" style="--gap: var(--sp-5)">
      <header class="stack" style="--gap: 2px">
        <h2 class="sec-title">
          <lucide-icon [img]="History" [size]="20" [strokeWidth]="2" />
          Historial NovaAI
        </h2>
        <p class="page-sub">Cada cambio de NovaAI con su antes y después. Puedes deshacerlo.</p>
      </header>

      <!-- Filtros -->
      <div class="row wrap" style="--gap: var(--sp-2)">
        @for (f of filters; track f.value) {
          <button data-size="sm" (click)="setFilter(f.value)"
            [attr.data-tone]="filter() === f.value ? 'brand' : null"
            [attr.data-variant]="filter() === f.value ? null : 'ghost'">
            {{ f.label }}
          </button>
        }
        @if (total() !== null) {
          <span class="spacer"></span>
          <span class="tiny muted">{{ total() }} registro(s)</span>
        }
      </div>

      @if (loading() && !items().length) {
        <div class="loading">Cargando historial…</div>
      } @else if (!items().length) {
        <div class="empty">
          <span class="icon-tile lg"><lucide-icon [img]="Sparkles" [size]="26" [strokeWidth]="1.9" /></span>
          <p class="soft small">Todavía no hay cambios aquí.</p>
        </div>
      } @else {
        <ol class="timeline">
          @for (it of items(); track it.id) {
            @let isUndo = it.type === 'undo';
            @let isDelete = it.type === 'delete';
            @let isCreate = it.type === 'create';
            <li class="nova-in">
              <span class="icon-tile node" [class]="isUndo ? 'tint-lilac' : isDelete ? 'tint-rose' : isCreate ? 'tint-mint' : 'tint-butter'">
                <lucide-icon [img]="isUndo ? Undo2 : isDelete ? Trash2 : isCreate ? CalendarPlus : Pencil" [size]="18" [strokeWidth]="2" />
              </span>

              <div class="surface entry" [class.faded]="it.status === 'cancelled' || it.status === 'expired'">
                <div class="entry-head">
                  <div class="stack" style="--gap: 2px; min-width: 0; flex: 1">
                    <p class="strong small">{{ it.summary || (isDelete ? 'Eliminar' : 'Editar') }}</p>
                    <p class="tiny muted">{{ when(it) }}</p>
                  </div>
                  <span class="pill" [class]="pill(it.status)">{{ statusText(it.status) }}</span>
                </div>

                @if (it.request) {
                  <p class="request">Le pediste: “{{ it.request }}”</p>
                }

                @for (t of it.targets; track t.id) {
                  <div class="block">
                    <p class="tiny strong target">{{ pretty(t.label) }}</p>
                    @if (t.changes.length) {
                      <div class="stack" style="--gap: 6px">
                        @for (ch of t.changes; track ch.field) {
                          <div class="change">
                            <span class="muted truncate">{{ label(ch.field) }}</span>
                            <span class="diff">
                              <s>{{ format(ch.field, ch.before) }}</s>
                              <lucide-icon [img]="ArrowRight" [size]="12" [strokeWidth]="2" />
                              <b>{{ format(ch.field, ch.after) }}</b>
                            </span>
                          </div>
                        }
                      </div>
                    } @else if (t.details.length) {
                      <dl class="details">
                        @for (d of t.details; track d.field) {
                          @if (d.value !== '' && d.value !== null && d.value !== undefined) {
                            <dt>{{ label(d.field) }}</dt>
                            <dd>{{ format(d.field, d.value) }}</dd>
                          }
                        }
                      </dl>
                    } @else if (isUndo) {
                      <p class="tiny t-ai">{{ it.summary.startsWith('Deshacer: Crear reserva') ? 'Reserva eliminada' : 'Documento restaurado completo' }}</p>
                    }
                  </div>
                }

                @if (it.error) {
                  <p class="block tiny t-danger err">
                    <lucide-icon [img]="TriangleAlert" [size]="14" [strokeWidth]="2" />
                    {{ it.error }}
                  </p>
                }

                @if (it.status === 'confirmed' && !isUndo) {
                  <div class="block foot">
                    <button data-size="sm" data-variant="soft" data-tone="ai" (click)="openUndo(it)">
                      <lucide-icon [img]="Undo2" [size]="14" [strokeWidth]="2.4" />
                      Deshacer
                    </button>
                  </div>
                }
              </div>
            </li>
          }
        </ol>

        @if (page() < totalPages()) {
          <div class="row" style="justify-content: center">
            <button data-variant="ghost" (click)="loadMore()" [disabled]="loading()" [attr.aria-busy]="loading() || null">
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
        <div class="stack small" style="--gap: var(--sp-3)">
          @if (drift(); as d) {
            <div class="warn">
              <lucide-icon [img]="TriangleAlert" [size]="16" [strokeWidth]="2" />
              <div class="stack" style="--gap: 4px">
                <p>Esto se modificó después del cambio de NovaAI:</p>
                @for (x of d; track x.label) {
                  <p class="strong">{{ x.label }}: {{ labels(x.fields) }}</p>
                }
                <p>Si deshaces igual, solo se restauran los campos de NovaAI; lo demás se queda como está.</p>
              </div>
            </div>
          } @else {
            <p class="soft">
              @if (it.type === 'delete') {
                Se va a <strong class="strong">restaurar completo</strong> lo que NovaAI eliminó:
              } @else if (it.type === 'create') {
                Se va a <strong class="strong">eliminar la reserva</strong> que creó NovaAI:
              } @else {
                Estos campos vuelven a como estaban:
              }
            </p>
          }
          @for (t of it.targets; track t.id) {
            <div class="inset stack" style="--gap: 4px">
              <p class="tiny strong">{{ pretty(t.label) }}</p>
              @for (ch of t.changes; track ch.field) {
                <p class="tiny soft">
                  {{ label(ch.field) }}: <s class="muted">{{ format(ch.field, ch.after) }}</s>
                  → <b class="t-ai">{{ format(ch.field, ch.before) }}</b>
                </p>
              }
            </div>
          }
        </div>
      }
    </modal-nova>
    <ng-template #undoFooter>
      <div class="modal-actions">
        <button data-variant="ghost" (click)="closeUndo()">Cancelar</button>
        <button data-tone="ai" (click)="confirmUndo()" [disabled]="undoing()" [attr.aria-busy]="undoing() || null">
          {{ undoing() ? 'Deshaciendo…' : drift() ? 'Deshacer igual' : 'Deshacer' }}
        </button>
      </div>
    </ng-template>
  `,
  styles: `
    .timeline {
      position: relative;
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: var(--sp-4);
    }
    .timeline::before {
      content: '';
      position: absolute;
      left: 17px;
      top: var(--sp-2);
      bottom: var(--sp-2);
      width: 2px;
      border-radius: 2px;
      background: var(--line);
    }
    .timeline > li { position: relative; display: flex; gap: var(--sp-4); }
    .node { position: relative; z-index: 1; }
    .entry { flex: 1; min-width: 0; overflow: hidden; }
    .entry.faded { opacity: 0.6; }
    .entry-head { display: flex; flex-wrap: wrap; align-items: flex-start; gap: var(--sp-2) var(--sp-3); padding: var(--sp-3) var(--sp-4); }
    .request { padding: 0 var(--sp-4) var(--sp-2); font-size: var(--fs-caption); font-style: italic; color: var(--text-2); }
    .block { padding: var(--sp-3) var(--sp-4); border-top: 1px solid var(--line); }
    .target { margin-bottom: var(--sp-2); }
    .change { display: grid; grid-template-columns: minmax(0, 7rem) 1fr; gap: var(--sp-3); align-items: baseline; font-size: var(--fs-caption); }
    .diff { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-width: 0; }
    .diff s { color: var(--text-3); overflow-wrap: anywhere; }
    .diff lucide-icon { color: var(--text-3); flex: none; }
    .diff b { padding: 1px 6px; border-radius: 6px; background: var(--brand-soft); color: var(--brand); overflow-wrap: anywhere; }
    .details { display: grid; grid-template-columns: auto 1fr; gap: 4px var(--sp-3); margin: 0; font-size: var(--fs-caption); }
    .details dt { color: var(--text-3); }
    .details dd { margin: 0; color: var(--text-2); overflow-wrap: anywhere; }
    .t-ai { color: var(--ai); }
    .err { display: flex; align-items: flex-start; gap: 6px; }
    .err lucide-icon { flex: none; margin-top: 1px; }
    .foot { display: flex; justify-content: flex-end; background: rgb(0 0 0 / 0.15); }
    .warn {
      display: flex;
      gap: var(--sp-3);
      padding: var(--sp-3);
      font-size: var(--fs-caption);
      color: var(--warning);
      background: var(--warning-soft);
      border: var(--border) solid color-mix(in srgb, var(--warning) 35%, transparent);
      border-radius: var(--r-md);
    }
    .warn lucide-icon { flex: none; }
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
  readonly CalendarPlus = CalendarPlus;

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
    this.apartmentsService.findAllCached().subscribe({
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

  pretty(text: string) {
    return prettyDatesIn(text);
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
