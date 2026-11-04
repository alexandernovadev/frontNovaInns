import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-angular';
import { AlertService } from './services/alert.service';

const ICON_MAP: Record<string, any> = { success: CheckCircle, error: AlertCircle, warning: AlertTriangle, info: Info };
const TONE: Record<string, string> = { success: 'success', error: 'danger', warning: 'warning', info: 'brand' };

// Avisos: suben con resorte arriba a la derecha (abajo en móvil)
@Component({
  selector: 'alert-nova',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <div class="region" aria-live="polite">
      @for (alert of alertService.alertsSignal(); track alert.id) {
        <div class="toast" [attr.data-tone]="TONE[alert.type]" role="status">
          <span class="ic"><lucide-icon [img]="ICON_MAP[alert.type]" [size]="18" [strokeWidth]="2.4" /></span>
          <div class="txt">
            <p class="title">{{ alert.title }}</p>
            @if (alert.message) {
              <p class="msg">{{ alert.message }}</p>
            }
          </div>
          <button (click)="alertService.dismiss(alert.id)" class="icon-btn" aria-label="Cerrar">
            <lucide-icon [img]="X" [size]="16" [strokeWidth]="2" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .region {
      position: fixed; top: var(--sp-4); right: var(--sp-4); z-index: 100;
      display: flex; flex-direction: column; gap: var(--sp-2); width: min(420px, calc(100vw - 2 * var(--sp-4)));
    }
    .toast {
      display: flex; align-items: flex-start; gap: var(--sp-3); padding: var(--sp-3) var(--sp-3) var(--sp-3) var(--sp-4);
      background: var(--bg-2); border: var(--border) solid var(--c-deep); border-radius: var(--r-md);
      box-shadow: 0 var(--depth) 0 var(--c-deep), 0 12px 32px rgb(0 0 0 / 0.35);
      animation: in var(--t-slow) var(--spring) both;
    }
    @keyframes in { from { opacity: 0; translate: 24px 0; scale: 0.95; } to { opacity: 1; translate: 0 0; scale: 1; } }
    .ic { flex: none; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; color: var(--ink); background: var(--c); }
    .txt { flex: 1; min-width: 0; padding-top: 3px; }
    .title { font-size: var(--fs-small); font-weight: var(--fw-semibold); color: var(--text-1); }
    .msg { margin-top: 2px; font-size: var(--fs-caption); color: var(--text-2); }
    @media (width < 40rem) {
      .region { top: auto; bottom: calc(var(--sp-4) + env(safe-area-inset-bottom, 0px)); right: 50%; translate: 50% 0; }
    }
  `,
})
export class AlertNova {
  readonly X = X;
  protected readonly ICON_MAP = ICON_MAP;
  protected readonly TONE = TONE;
  protected alertService = inject(AlertService);
}
