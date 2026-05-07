import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <div class="flex items-center justify-between px-5 py-3.5 border-t border-border">
        <span class="text-text-disabled text-sm">Página {{ page() }} de {{ totalPages() }}</span>
        <div class="flex gap-1">
          <button
            (click)="go(page() - 1)"
            [disabled]="page() === 1"
            class="px-3 py-1.5 rounded-lg text-sm text-text-secondary border border-border
                   hover:border-brand hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            ‹
          </button>
          @for (p of pages(); track p) {
            <button
              (click)="go(p)"
              class="px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors"
              [class]="
                p === page()
                  ? 'bg-brand text-bg font-bold'
                  : 'text-text-secondary border border-border hover:border-brand hover:text-brand'
              "
            >
              {{ p }}
            </button>
          }
          <button
            (click)="go(page() + 1)"
            [disabled]="page() === totalPages()"
            class="px-3 py-1.5 rounded-lg text-sm text-text-secondary border border-border
                   hover:border-brand hover:text-brand disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            ›
          </button>
        </div>
      </div>
    }
  `,
})
export class Pagination {
  page = input.required<number>();
  totalPages = input.required<number>();
  pageChange = output<number>();

  protected pages() {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }

  protected go(p: number) {
    this.pageChange.emit(p);
  }
}
