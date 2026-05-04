import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, Info, Server, Globe } from 'lucide-angular';

import { API } from '../../shared/constants/api.constant';

interface AppInfo {
  name: string;
  version: string;
  environment: string;
  releaseDate: string;
  timestamp: string;
  nodeVersion: string;
}

@Component({
  selector: 'app-info',
  imports: [LucideAngularModule],
  templateUrl: './info.html',
})
export class InfoComponent {
  readonly Info = Info;
  readonly Server = Server;
  readonly Globe = Globe;

  private http = inject(HttpClient);

  frontInfo = signal<AppInfo | null>(null);
  backInfo = signal<AppInfo | null>(null);
  frontError = signal<string | null>(null);
  backError = signal<string | null>(null);

  constructor() {
    this.http.get<AppInfo>('/assets/version.json').subscribe({
      next: (res) => this.frontInfo.set(res),
      error: () => this.frontError.set('Error al cargar info del frontend'),
    });

    this.http.get<AppInfo>(`${API}/info`).subscribe({
      next: (res) => this.backInfo.set(res),
      error: () => this.backError.set('Error de conexión con el backend'),
    });
  }
}
