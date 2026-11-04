import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, LucideIconData, Sparkles } from 'lucide-angular';

// Estado vacío: caja de icono pastel + título + pista
@Component({
  selector: 'nova-empty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <div class="empty">
      <span class="icon-tile lg"><lucide-icon [img]="icon()" [size]="26" [strokeWidth]="2" /></span>
      <p>{{ title() }}</p>
      @if (hint()) {
        <p class="hint">{{ hint() }}</p>
      }
    </div>
  `,
  styles: `.hint { max-width: 22rem; }`,
})
export class EmptyState {
  icon = input<LucideIconData>(Sparkles);
  title = input('Sin resultados');
  hint = input('');
}
