import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { LucideAngularModule, LucideIconData, Sparkles } from 'lucide-angular';

// Estado vacío con el estilo Nova (ícono dorado + título + pista)
@Component({
  selector: 'nova-empty',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <div class="flex flex-col items-center gap-3 py-12 px-4 text-center nova-in">
      <span class="nova-icon-tile w-12 h-12 rounded-2xl">
        <lucide-icon [img]="icon()" class="w-6 h-6" [strokeWidth]="2" />
      </span>
      <p class="text-text-primary font-semibold">{{ title() }}</p>
      @if (hint()) {
        <p class="text-text-secondary text-sm max-w-xs">{{ hint() }}</p>
      }
    </div>
  `,
})
export class EmptyState {
  icon = input<LucideIconData>(Sparkles);
  title = input('Sin resultados');
  hint = input('');
}
