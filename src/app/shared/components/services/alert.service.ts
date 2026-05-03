import { Injectable, signal } from '@angular/core';

export interface Alert {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private alerts = signal<Alert[]>([]);
  readonly alertsSignal = this.alerts.asReadonly();

  private add(type: Alert['type'], title: string, message?: string, duration = 4000) {
    const id = crypto.randomUUID();
    this.alerts.update((a) => [...a, { id, type, title, message }]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  success(title: string, message?: string, duration = 4000) {
    this.add('success', title, message, duration);
  }

  error(title: string, message?: string, duration = 6000) {
    this.add('error', title, message, duration);
  }

  warning(title: string, message?: string, duration = 5000) {
    this.add('warning', title, message, duration);
  }

  info(title: string, message?: string, duration = 4000) {
    this.add('info', title, message, duration);
  }

  dismiss(id: string) {
    this.alerts.update((a) => a.filter((x) => x.id !== id));
  }
}
