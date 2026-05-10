import { Component, input, output, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';

@Component({
  selector: 'photo-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    @if (url()) {
      <div
        class="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        (click)="close()"
      >
        <button
          (click)="close()"
          class="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer z-10"
        >
          <lucide-icon [img]="X" class="w-6 h-6" [strokeWidth]="2" />
        </button>
        <img
          [src]="url()!"
          class="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
          (click)="$event.stopPropagation()"
        />
      </div>
    }
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
