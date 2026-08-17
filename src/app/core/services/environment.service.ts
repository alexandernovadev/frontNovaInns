import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class EnvironmentService {
  private http = inject(HttpClient);

  version = signal('');
  environment = signal('development');
  isDev = computed(() => this.environment() !== 'production');

  constructor() {
    this.http
      .get<{ version: string; environment: string }>('/assets/version.json')
      .subscribe({
        next: (res) => {
          this.version.set(res.version);
          this.environment.set(res.environment);
        },
      });
  }
}
