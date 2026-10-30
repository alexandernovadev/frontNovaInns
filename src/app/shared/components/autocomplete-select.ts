import { Component, input, model, signal, computed, effect, HostListener, ElementRef, viewChild, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface AutocompleteOption {
  label: string;
  value: string;
}

@Component({
  selector: 'autocomplete-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative" #container>
      <!-- Input -->
      <input
        type="text"
        [value]="displayText()"
        (input)="onInput($event)"
        (focus)="onFocus()"
        (click)="onClick()"
        (keydown)="onKeydown($event)"
        (click)="$event.stopPropagation()"
        [placeholder]="placeholder()"
        [readonly]="readonly() || sheetMode()"
        autocomplete="off"
        class="w-full bg-input border border-border rounded-xl pl-3 pr-8 py-2.5 text-text-primary text-sm truncate
               placeholder:text-text-disabled focus:outline-none focus:border-brand transition-colors"
        [class.cursor-pointer]="readonly() || sheetMode()"
      />

      <!-- Icon - dropdown arrow -->
      <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-disabled pointer-events-none transition-transform"
           [class.rotate-180]="isOpen()"
           fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
      </svg>

      <!-- Dropdown -->
      @if (isOpen() && !sheetMode() && filteredOptions().length > 0) {
        <div class="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl overflow-hidden shadow-2xl">
          @for (opt of filteredOptions(); track opt.value; let i = $index) {
            @let selected = opt.value === value() && opt.value !== '';
            <button
              type="button"
              (click)="selectOption(opt)"
              (mousedown)="$event.preventDefault()"
              class="w-full text-left px-3 py-2.5 text-sm transition-colors"
              [class]="selected
                ? 'bg-brand/20 text-brand font-semibold cursor-default'
                : i === highlightedIndex()
                  ? 'bg-white/10 text-text-primary cursor-pointer'
                  : 'text-text-secondary hover:bg-white/5 hover:text-text-primary cursor-pointer'">
              {{ opt.label }}
            </button>
          }
        </div>
      }

      <!-- Bottom sheet (móvil/tablet). Se mueve a <body> para que ningún
           ancestro con transform/backdrop-filter rompa el position: fixed -->
      @if (isOpen() && sheetMode()) {
        <div #sheet class="fixed inset-0 z-[60] flex flex-col justify-end" (keydown)="onKeydown($event)">
          <div class="absolute inset-0 bg-black/60 touch-none sheet-fade" (click)="close()"></div>
          <div class="relative bg-surface border-t border-border rounded-t-2xl max-h-[75vh] flex flex-col sheet-up
                      pb-[env(safe-area-inset-bottom)]">
            <div class="flex justify-center pt-2.5 pb-1 shrink-0">
              <span class="w-10 h-1 rounded-full bg-border"></span>
            </div>
            @if (placeholder()) {
              <p class="px-5 pt-1 pb-3 text-text-primary font-bold text-base shrink-0">{{ placeholder() }}</p>
            }
            @if (!readonly()) {
              <div class="px-4 pb-3 shrink-0">
                <input #sheetSearch type="text" [value]="searchTerm()" (input)="onSheetSearch($event)"
                  placeholder="Buscar..." autocomplete="off"
                  class="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm
                         placeholder:text-text-disabled focus:outline-none focus:border-brand transition-colors" />
              </div>
            }
            <div class="overflow-y-auto overscroll-contain px-2 pb-3">
              @for (opt of filteredOptions(); track opt.value) {
                @let selected = opt.value === value();
                <button type="button" (click)="selectOption(opt)" [attr.data-selected]="selected || null"
                  class="w-full flex items-center justify-between gap-3 text-left px-3 py-3.5 rounded-xl text-sm transition-colors cursor-pointer"
                  [class]="selected ? 'bg-brand/15 text-brand font-semibold' : 'text-text-primary active:bg-white/10 hover:bg-white/5'">
                  <span class="truncate">{{ opt.label }}</span>
                  @if (selected) {
                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  }
                </button>
              } @empty {
                <p class="px-3 py-6 text-center text-text-disabled text-sm">Sin resultados</p>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .sheet-up { animation: sheet-up 0.22s ease-out; }
    .sheet-fade { animation: sheet-fade 0.2s ease-out; }
    @keyframes sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes sheet-fade { from { opacity: 0; } to { opacity: 1; } }
  `,
})
export class AutocompleteSelect implements OnDestroy {
  containerRef = viewChild<ElementRef<HTMLElement>>('container');
  sheetRef = viewChild<ElementRef<HTMLElement>>('sheet');
  sheetSearchRef = viewChild<ElementRef<HTMLInputElement>>('sheetSearch');

  // Móvil y tablet (< lg) usan bottom sheet en vez del dropdown
  private mq = window.matchMedia('(max-width: 1023.98px)');
  sheetMode = signal(this.mq.matches);
  private onMqChange = (e: MediaQueryListEvent) => {
    this.sheetMode.set(e.matches);
    this.isOpen.set(false);
  };

  constructor() {
    this.mq.addEventListener('change', this.onMqChange);
    effect(() => {
      const sheet = this.sheetRef()?.nativeElement;
      if (sheet && sheet.parentElement !== document.body) {
        document.body.appendChild(sheet);
        sheet.querySelector('[data-selected]')?.scrollIntoView({ block: 'center' });
      }
    });
  }

  ngOnDestroy() {
    this.mq.removeEventListener('change', this.onMqChange);
    // El sheet vive en <body>; si el componente se destruye abierto, quitarlo
    this.sheetRef()?.nativeElement.remove();
  }

  options = input<AutocompleteOption[]>([]);
  placeholder = input('');
  readonly = input(false);
  value = model('');

  searchTerm = signal('');
  isOpen = signal(false);
  highlightedIndex = signal(-1);

  filteredOptions = computed(() => {
    if (this.readonly()) return this.options();
    const term = this.searchTerm().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return this.options().filter(o => o.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term));
  });

  displayText = computed(() => {
    const v = this.value();
    const match = v ? this.options().find(o => o.value === v) : undefined;
    if (match) return match.label;
    // En modo sheet la búsqueda vive dentro del sheet, no en el trigger
    return this.sheetMode() ? '' : this.searchTerm();
  });

  onInput(e: Event) {
    if (this.readonly()) return;
    const el = e.target as HTMLInputElement;
    this.searchTerm.set(el.value);
    this.isOpen.set(true);
    this.highlightedIndex.set(-1);
    // Clear value if user changes text
    this.value.set('');
  }

  onFocus() {
    if (this.sheetMode()) return;
    if (this.readonly()) return;
    this.searchTerm.set('');
    this.isOpen.set(true);
    this.highlightedIndex.set(-1);
  }

  onClick() {
    if (this.sheetMode()) {
      this.searchTerm.set('');
      this.isOpen.set(true);
      return;
    }
    if (this.readonly()) {
      this.isOpen.update(v => !v);
    }
  }

  onSheetSearch(e: Event) {
    this.searchTerm.set((e.target as HTMLInputElement).value);
  }

  close() {
    this.searchTerm.set('');
    this.isOpen.set(false);
  }

  selectOption(opt: AutocompleteOption) {
    this.value.set(opt.value);
    this.searchTerm.set('');
    this.isOpen.set(false);
    this.highlightedIndex.set(-1);
  }

  onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.isOpen.set(false);
      return;
    }
    if (this.readonly()) return;
    const filtered = this.filteredOptions();
    const current = this.highlightedIndex();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.highlightedIndex.set(current < filtered.length - 1 ? current + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.highlightedIndex.set(current > 0 ? current - 1 : filtered.length - 1);
    } else if (e.key === 'Enter' && current >= 0 && filtered[current]) {
      e.preventDefault();
      this.selectOption(filtered[current]);
    } else if (e.key === 'Escape') {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(e: Event) {
    const container = this.containerRef();
    const sheet = this.sheetRef()?.nativeElement;
    if (sheet?.contains(e.target as Node)) return;
    if (container && !container.nativeElement.contains(e.target as Node)) {
      this.isOpen.set(false);
    }
  }
}
