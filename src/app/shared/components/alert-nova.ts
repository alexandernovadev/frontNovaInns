import { Component, inject } from '@angular/core';
import { LucideAngularModule, X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-angular';
import { AlertService } from './services/alert.service';

const ICON_MAP: Record<string, any> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const BORDER_MAP: Record<string, string> = {
  success: 'border-success/30',
  error: 'border-error/30',
  warning: 'border-warning/30',
  info: 'border-brand/30',
};

const TEXT_MAP: Record<string, string> = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-brand',
};

@Component({
  selector: 'alert-nova',
  imports: [LucideAngularModule],
  template: `
    <div class="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[420px]">
      @for (alert of alertService.alertsSignal(); track alert.id) {
        <div class="bg-surface border rounded-xl px-4 py-3 shadow-xl flex items-start gap-3"
             [class]="BORDER_MAP[alert.type]">
          <lucide-icon [img]="ICON_MAP[alert.type]" class="w-5 h-5 shrink-0 mt-0.5"
            [class]="TEXT_MAP[alert.type]" [strokeWidth]="2" />
          <div class="flex-1 min-w-0">
            <p class="text-text-primary text-sm font-semibold">{{ alert.title }}</p>
            @if (alert.message) {
              <p class="text-text-secondary text-xs mt-0.5">{{ alert.message }}</p>
            }
          </div>
          <button (click)="alertService.dismiss(alert.id)"
            class="p-0.5 text-text-disabled hover:text-text-primary rounded transition-colors cursor-pointer shrink-0">
            <lucide-icon [img]="X" class="w-4 h-4" [strokeWidth]="2" />
          </button>
        </div>
      }
    </div>
  `,
})
export class AlertNova {
  readonly X = X;
  readonly CheckCircle = CheckCircle;
  readonly AlertCircle = AlertCircle;
  readonly AlertTriangle = AlertTriangle;
  readonly Info = Info;
  protected readonly ICON_MAP = ICON_MAP;
  protected readonly BORDER_MAP = BORDER_MAP;
  protected readonly TEXT_MAP = TEXT_MAP;

  protected alertService = inject(AlertService);
}
