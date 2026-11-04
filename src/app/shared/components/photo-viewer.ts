import { Component, input, output, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';

@Component({
  selector: 'photo-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    @if (url()) {
      <div class="viewer" (click)="close()">
        <button (click)="close()" data-icon aria-label="Cerrar" class="close">
          <lucide-icon [img]="X" [size]="22" [strokeWidth]="2" />
        </button>
        <img [src]="url()!" alt="Foto" (click)="$event.stopPropagation()" />
      </div>
    }
  `,
  styles: `
    .viewer { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: var(--sp-4); background: rgb(10 10 12 / 0.92); animation: lai-reveal var(--t-base) ease both; }
    .close { position: absolute; top: var(--sp-4); right: var(--sp-4); z-index: 1; }
    img { max-width: 100%; max-height: 90dvh; object-fit: contain; border-radius: var(--r-lg); animation: lai-pop var(--t-slow) var(--spring); }
  `,
})
export class PhotoViewer {
  readonly X = X;

  url = input<string | null>(null);
  closed = output<void>();

  close() {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.url()) this.close();
  }
}
