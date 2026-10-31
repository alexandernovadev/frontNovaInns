import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LucideAngularModule, Shield, Users, MessageSquare, ArrowUpDown, Info, Trash2 } from 'lucide-angular';

// Contenedor de Admin: header + tabs; cada tab es una sub-ruta (/admin/users, /admin/messages...)
@Component({
  selector: 'app-admin-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <div class="p-6 space-y-6">
      <div class="page-header flex items-center justify-between">
        <div>
          <h1 class="text-text-primary text-2xl font-bold flex items-center gap-2">
            <lucide-icon [img]="ShieldIcon" class="w-6 h-6 text-brand" [strokeWidth]="2" />
            Admin
          </h1>
          <p class="text-text-secondary text-sm mt-0.5">Usuarios, mensajes, datos y sistema</p>
        </div>
      </div>

      <nav class="flex gap-1 glass rounded-2xl p-1 overflow-x-auto">
        @for (t of tabs(); track t.route) {
          <a [routerLink]="t.route"
            routerLinkActive="bg-brand text-bg"
            #rla="routerLinkActive"
            class="flex-1 py-2 px-3 text-sm font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap"
            [class.text-text-secondary]="!rla.isActive"
            [class.hover:text-text-primary]="!rla.isActive">
            <lucide-icon [img]="t.icon" class="w-4 h-4 shrink-0" [strokeWidth]="2" />
            {{ t.label }}
          </a>
        }
      </nav>

      <router-outlet />
    </div>
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
    { label: 'Vaciar datos', route: 'clear', icon: Trash2, superAdminOnly: true },
  ];

  tabs = computed(() =>
    this.allTabs.filter(t => !t.superAdminOnly || this.auth.role() === 'SUPER_ADMIN'),
  );
}
