import { Component, input, output, HostListener, ElementRef, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X } from 'lucide-angular';

const SIZE_MAP: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

@Component({
  selector: 'modal-nova',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (visible()) {
      <!-- sass-disable -->
      <div
        class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        (click)="onBackdrop()"
        (keydown)="onKeydown($event)"
        #overlay
      >
        <div
          class="bg-surface border border-border rounded-2xl w-full overflow-hidden flex flex-col max-h-[90vh]"
          [class]="sizeClass()"
          (click)="$event.stopPropagation()"
          tabindex="0"
          #modalRef
        >
          <div class="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
            <h2 class="text-text-primary font-bold text-lg truncate">{{ title() }}</h2>
            @if (closable()) {
              <button
                (click)="close()"
                class="p-1.5 text-text-secondary hover:text-text-primary hover:bg-hover rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <lucide-icon [img]="X" class="w-5 h-5" [strokeWidth]="2" />
              </button>
            }
          </div>
          <div class="px-6 py-4 overflow-y-auto">
            <ng-content />
          </div>
          @if (footerTemplate()) {
            <div class="px-6 pb-6 shrink-0">
              <ng-container [ngTemplateOutlet]="footerTemplate()!" />
            </div>
          }
        </div>
      </div>
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

  protected sizeClass() {
    return SIZE_MAP[this.size()] || SIZE_MAP['md'];
  }

  close() {
    this.closed.emit();
  }

  onBackdrop() {
    if (this.closable()) this.close();
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this.closable()) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.closable()) this.close();
  }
}
