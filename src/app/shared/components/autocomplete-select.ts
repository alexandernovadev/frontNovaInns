import { Component, input, model, signal, computed, HostListener, ElementRef, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AutocompleteOption {
  label: string;
  value: string;
}

@Component({
  selector: 'autocomplete-select',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="relative" #container>
      <!-- Input -->
      <input
        type="text"
        [value]="displayText()"
        (input)="onInput($event)"
        (focus)="onFocus()"
        (keydown)="onKeydown($event)"
        [placeholder]="placeholder()"
        autocomplete="off"
        class="w-full glass-sm rounded-xl px-3 py-2.5 text-text-primary text-sm
               placeholder:text-text-disabled focus:outline-none focus:border-brand transition-colors cursor-text"
      />

      <!-- Icon - dropdown arrow -->
      <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-disabled pointer-events-none transition-transform"
           [class.rotate-180]="isOpen()"
           fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
      </svg>

      <!-- Dropdown -->
      @if (isOpen() && filteredOptions().length > 0) {
        <div class="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl overflow-hidden shadow-2xl">
          @for (opt of filteredOptions(); track opt.value; let i = $index) {
            <button
              type="button"
              (click)="selectOption(opt)"
              (mousedown)="$event.preventDefault()"
              class="w-full text-left px-3 py-2.5 text-sm transition-colors cursor-pointer"
              [class]="i === highlightedIndex()
                ? 'bg-white/10 text-text-primary'
                : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'">
              {{ opt.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class AutocompleteSelect {
  containerRef = viewChild<ElementRef<HTMLElement>>('container');

  options = input<AutocompleteOption[]>([]);
  placeholder = input('');
  value = model('');

  searchTerm = signal('');
  isOpen = signal(false);
  highlightedIndex = signal(-1);

  filteredOptions = computed(() => {
    const term = this.searchTerm().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return this.options().filter(o => o.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term));
  });

  displayText = computed(() => {
    const v = this.value();
    if (!v) return this.searchTerm();
    const match = this.options().find(o => o.value === v);
    if (match) return match.label;
    return this.searchTerm();
  });

  onInput(e: Event) {
    const el = e.target as HTMLInputElement;
    this.searchTerm.set(el.value);
    this.isOpen.set(true);
    this.highlightedIndex.set(-1);
    // Clear value if user changes text
    this.value.set('');
  }

  onFocus() {
    this.searchTerm.set('');
    this.isOpen.set(true);
    this.highlightedIndex.set(-1);
  }

  selectOption(opt: AutocompleteOption) {
    this.value.set(opt.value);
    this.searchTerm.set('');
    this.isOpen.set(false);
    this.highlightedIndex.set(-1);
  }

  onKeydown(e: KeyboardEvent) {
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
    if (container && !container.nativeElement.contains(e.target as Node)) {
      this.isOpen.set(false);
    }
  }
}
