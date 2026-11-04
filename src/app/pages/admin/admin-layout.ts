import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LucideAngularModule, Shield, Users, MessageSquare, ArrowUpDown, Info, Trash2, History } from 'lucide-angular';

// Contenedor de Admin: header + tabs; cada tab es una sub-ruta (/admin/users, /admin/messages...)
@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div class="stack" style="--gap: 2px">
          <h1 class="page-title">
            <span class="icon-tile"><lucide-icon [img]="ShieldIcon" [size]="18" [strokeWidth]="2.4" /></span>
            <span>Admin</span>
          </h1>
          <p class="page-sub">Usuarios, mensajes, datos y sistema</p>
        </div>
      </header>

      <nav class="subnav" aria-label="Secciones de admin">
        @for (t of tabs(); track t.route) {
          <a [routerLink]="t.route" routerLinkActive="on" class="tab">
            <lucide-icon [img]="t.icon" [size]="16" [strokeWidth]="2.2" />
            {{ t.label }}
          </a>
        }
      </nav>

      <router-outlet />
    </div>
  `,
  styles: `
    .subnav {
      display: flex; gap: 4px; padding: 4px; overflow-x: auto; scrollbar-width: none;
      background: var(--bg-2); border: var(--border) solid var(--line); border-radius: var(--r-full);
      box-shadow: inset 0 var(--depth) 0 rgb(0 0 0 / 0.18);
    }
    .tab {
      flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 40px; padding: 0 var(--sp-4);
      font-family: var(--font-display); font-weight: var(--fw-display); font-size: 0.95rem; white-space: nowrap; text-decoration: none;
      color: var(--text-3); border: var(--border) solid transparent; border-radius: var(--r-full);
      transition: color var(--t-fast) ease, background-color var(--t-fast) ease, transform var(--t-base) var(--spring);
    }
    .tab:hover { color: var(--text-1); }
    .tab:active { transform: scale(0.96); }
    .tab.on { color: var(--brand); background: var(--brand-soft); border-color: var(--brand); box-shadow: 0 var(--depth) 0 var(--brand-deep); }
  `,
})
export class AdminLayoutComponent {
  readonly ShieldIcon = Shield;

  private auth = inject(AuthService);

  private allTabs = [
    { label: 'Usuarios', route: 'users', icon: Users },
    { label: 'Mensajes', route: 'messages', icon: MessageSquare },
    { label: 'Import / Export', route: 'data', icon: ArrowUpDown },
    { label: 'Info Sistema', route: 'info', icon: Info },
    { label: 'Historial NovaAI', route: 'nova-history', icon: History },
    { label: 'Vaciar datos', route: 'clear', icon: Trash2, superAdminOnly: true },
  ];

  tabs = computed(() =>
    this.allTabs.filter(t => !t.superAdminOnly || this.auth.role() === 'SUPER_ADMIN'),
  );
}
