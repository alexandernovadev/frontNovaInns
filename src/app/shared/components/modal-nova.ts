import { Component, input, output, HostListener, ElementRef, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X } from 'lucide-angular';

const SIZE_MAP: Record<string, number> = { sm: 400, md: 520, lg: 680, xl: 900 };

// Modal: entra con resorte y difumina el fondo; en móvil es una hoja inferior
@Component({
  selector: 'modal-nova',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (visible()) {
      <div class="backdrop" (click)="onBackdrop()" (keydown)="onKeydown($event)" #overlay>
        <div class="panel" [style.max-width.px]="sizePx()" (click)="$event.stopPropagation()" tabindex="0" role="dialog" aria-modal="true" [attr.aria-label]="title()" #modalRef>
          <header class="head">
            <h2 class="truncate">{{ title() }}</h2>
            @if (closable()) {
              <button (click)="close()" class="icon-btn" aria-label="Cerrar">
                <lucide-icon [img]="X" [size]="20" [strokeWidth]="2" />
              </button>
            }
          </header>
          <div class="body">
            <ng-content />
          </div>
          @if (footerTemplate()) {
            <footer class="foot">
              <ng-container [ngTemplateOutlet]="footerTemplate()!" />
            </footer>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop {
      position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: var(--sp-4);
      background: rgb(20 20 24 / 0.66); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      animation: fade var(--t-base) ease both;
    }
    @keyframes fade { from { opacity: 0; } }
    .panel {
      display: flex; flex-direction: column; width: 100%; max-height: 90dvh; overflow: hidden;
      background: var(--bg-1); border: var(--border) solid var(--line); border-radius: var(--r-lg);
      box-shadow: 0 var(--depth) 0 var(--bg-3); outline: none;
      animation: pop var(--t-slow) var(--spring) both;
    }
    @keyframes pop { from { opacity: 0; scale: 0.9; translate: 0 12px; } }
    .head { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); padding: var(--sp-4) var(--sp-5) var(--sp-3); }
    .head h2 { font-size: var(--fs-h3); }
    .body { padding: var(--sp-2) var(--sp-5) var(--sp-5); overflow-y: auto; }
    .foot { flex: none; padding: 0 var(--sp-5) var(--sp-5); }
    @media (width < 40rem) {
      .backdrop { align-items: flex-end; padding: 0; }
      .panel {
        max-width: 100% !important; max-height: 88dvh; border-bottom: 0; border-radius: var(--r-lg) var(--r-lg) 0 0;
        padding-bottom: env(safe-area-inset-bottom, 0px); animation: sheet var(--t-slow) var(--ease-sheet) both;
      }
      .panel::before { content: ''; align-self: center; width: 44px; height: 5px; margin-top: 10px; border-radius: var(--r-full); background: var(--line); }
      @keyframes sheet { from { translate: 0 100%; } }
    }
  `,
})
export class ModalNova {
  readonly X = X;

  overlayRef = viewChild<ElementRef<HTMLElement>>('overlay');

  visible = input(true);
  title = input('');
  size = input<string>('md');
  closable = input(true);
  footerTemplate = input<any>(undefined);

  closed = output<void>();

  protected sizePx() {
    return SIZE_MAP[this.size()] ?? SIZE_MAP['md'];
  }

  close() {
    this.closed.emit();
  }

  onBackdrop() {
    if (this.closable()) this.close();
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.closable()) this.close();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.closable()) this.close();
  }
}
