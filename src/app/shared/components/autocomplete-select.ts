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
    <div class="wrap" #container>
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
        [class.pick]="readonly() || sheetMode()"
        autocomplete="off"
      />
      <svg class="chev" [class.open]="isOpen()" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
      </svg>

      <!-- Menú desplegable (escritorio) -->
      @if (isOpen() && !sheetMode() && filteredOptions().length > 0) {
        <div class="menu" role="listbox">
          @for (opt of filteredOptions(); track opt.value; let i = $index) {
            @let selected = opt.value === value() && opt.value !== '';
            <button type="button" role="option" class="opt" [attr.aria-selected]="selected"
              [class.selected]="selected" [class.hl]="!selected && i === highlightedIndex()"
              (click)="selectOption(opt)" (mousedown)="$event.preventDefault()">
              <span class="truncate">{{ opt.label }}</span>
              @if (selected) { <span class="check">✓</span> }
            </button>
          }
        </div>
      }

      <!-- Hoja inferior (móvil/tablet). Se mueve a <body> para que ningún
           ancestro con transform/backdrop-filter rompa el position: fixed -->
      @if (isOpen() && sheetMode()) {
        <div #sheet class="sheet" (keydown)="onKeydown($event)">
          <div class="scrim" (click)="close()"></div>
          <div class="panel">
            <span class="handle"></span>
            @if (placeholder()) {
              <p class="sheet-title">{{ placeholder() }}</p>
            }
            @if (!readonly()) {
              <div class="search">
                <input #sheetSearch type="search" [value]="searchTerm()" (input)="onSheetSearch($event)" placeholder="Buscar..." autocomplete="off" />
              </div>
            }
            <div class="list">
              @for (opt of filteredOptions(); track opt.value) {
                @let selected = opt.value === value();
                <button type="button" class="opt big" [class.selected]="selected" [attr.data-selected]="selected || null" (click)="selectOption(opt)">
                  <span class="truncate">{{ opt.label }}</span>
                  @if (selected) { <span class="check">✓</span> }
                </button>
              } @empty {
                <p class="none">Sin resultados</p>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .wrap { position: relative; }
    input { padding-right: calc(var(--sp-4) + 22px); text-overflow: ellipsis; }
    input.pick { cursor: pointer; }
    .chev { position: absolute; right: var(--sp-4); top: 50%; translate: 0 -50%; color: var(--brand); pointer-events: none; transition: rotate var(--t-base) var(--spring); }
    .chev.open { rotate: 180deg; }

    .menu {
      position: absolute; z-index: 50; top: calc(100% + var(--sp-2)); left: 0; right: 0; max-height: 300px; overflow-y: auto;
      padding: var(--sp-2); background: var(--bg-1); border: var(--border) solid var(--line); border-radius: var(--r-md);
      box-shadow: 0 var(--depth) 0 var(--bg-3), 0 16px 40px rgb(0 0 0 / 0.35);
      animation: drop var(--t-base) var(--spring) both; transform-origin: top center;
    }
    @keyframes drop { from { opacity: 0; translate: 0 -6px; scale: 0.97; } }
    .opt {
      display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); width: 100%; min-height: 40px;
      padding: 0 var(--sp-3); font-family: var(--font-body); font-size: var(--fs-small); font-weight: var(--fw-regular); letter-spacing: 0;
      text-align: left; color: var(--text-2); background: transparent; border: 0; border-radius: var(--r-sm); box-shadow: none; filter: none;
    }
    .opt:hover, .opt.hl { color: var(--text-1); background: var(--bg-2); }
    .opt.selected { color: var(--brand); background: var(--brand-soft); font-weight: var(--fw-semibold); }
    .opt:active { transform: none; }
    .check { color: var(--brand); font-weight: var(--fw-heavy); }

    .sheet { position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; justify-content: flex-end; }
    .scrim { position: absolute; inset: 0; background: rgb(20 20 24 / 0.66); touch-action: none; animation: fade var(--t-base) ease both; }
    .panel {
      position: relative; display: flex; flex-direction: column; max-height: 75dvh; width: min(640px, 100%); margin: 0 auto;
      padding-bottom: env(safe-area-inset-bottom, 0px); background: var(--bg-1); border: var(--border) solid var(--line); border-bottom: 0;
      border-radius: var(--r-lg) var(--r-lg) 0 0; animation: up var(--t-slow) var(--ease-sheet) both;
    }
    .handle { align-self: center; width: 44px; height: 5px; margin: 10px 0 var(--sp-2); border-radius: var(--r-full); background: var(--line); }
    .sheet-title { padding: 0 var(--sp-5) var(--sp-3); font-family: var(--font-display); font-weight: var(--fw-display); font-size: var(--fs-h3); color: var(--text-1); }
    .search { padding: 0 var(--sp-4) var(--sp-3); }
    .list { overflow-y: auto; overscroll-behavior: contain; padding: 0 var(--sp-3) var(--sp-4); }
    .opt.big { min-height: 52px; font-size: 1.05rem; }
    .none { padding: var(--sp-6) var(--sp-3); text-align: center; color: var(--text-3); font-size: var(--fs-small); }
    @keyframes up { from { translate: 0 100%; } }
    @keyframes fade { from { opacity: 0; } }
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
