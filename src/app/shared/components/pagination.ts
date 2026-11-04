import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages() > 1) {
      <nav class="pager" aria-label="Paginación">
        <span class="small muted">Página {{ page() }} de {{ totalPages() }}</span>
        <div class="row" style="--gap: 4px">
          <button (click)="go(page() - 1)" [disabled]="page() === 1" data-size="sm" aria-label="Anterior">‹</button>
          @for (p of pages(); track p) {
            <button (click)="go(p)" data-size="sm" [attr.data-tone]="p === page() ? 'brand' : null" [attr.aria-current]="p === page() ? 'page' : null">
              {{ p }}
            </button>
          }
          <button (click)="go(page() + 1)" [disabled]="page() === totalPages()" data-size="sm" aria-label="Siguiente">›</button>
        </div>
      </nav>
    }
  `,
  styles: `
    .pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--sp-3); padding: var(--sp-3) var(--sp-1); }
    button { min-width: 40px; padding: 0 var(--sp-3); }
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
