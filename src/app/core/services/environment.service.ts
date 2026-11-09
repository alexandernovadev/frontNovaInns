import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EnvironmentService {
  private http = inject(HttpClient);

  version = signal('');
  environment = signal('development');
  isDev = computed(() => this.environment() !== 'production');

  // Resuelve cuando version.json ya fue leído: los guards esperan esto para
  // no tomar decisiones con el valor por defecto ('development').
  private readonly readyPromise: Promise<void>;

  constructor() {
    this.readyPromise = firstValueFrom(
      this.http.get<{ version: string; environment: string }>('/assets/version.json'),
    )
      .then((res) => {
        this.version.set(res.version);
        this.environment.set(res.environment);
      })
      .catch(() => undefined);
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }
}
