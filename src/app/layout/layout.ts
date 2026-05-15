import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { AlertNova } from '../shared/components/alert-nova';
import { LucideAngularModule, CalendarDays, Calendar, Building2, Users, ArrowUpDown, Info, BarChart3, LogOut, Menu, ChevronLeft } from 'lucide-angular';

@Component({
  selector: 'app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, AlertNova],
  templateUrl: './layout.html',
})
export class LayoutComponent {
  auth = inject(AuthService);
  collapsed = signal(localStorage.getItem('sidebar_collapsed') === 'true');
  sidebarOpen = signal(false);
  tooltip = signal<{ label: string; top: number } | null>(null);

  setTooltip(label: string, e: Event) {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    this.tooltip.set({ label, top: rect.top + rect.height / 2 });
  }

  clearTooltip() {
    this.tooltip.set(null);
  }

  readonly CalendarDays = CalendarDays;
  readonly Calendar = Calendar;
  readonly Building2 = Building2;
  readonly Users = Users;
  readonly ArrowUpDown = ArrowUpDown;
  readonly BarChart3 = BarChart3;
  readonly Info = Info;
  readonly LogOut = LogOut;
  readonly Menu = Menu;
  readonly ChevronLeft = ChevronLeft;

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  closeSidebar() { this.sidebarOpen.set(false); }
  toggleCollapsed() {
    const v = !this.collapsed();
    this.collapsed.set(v);
    localStorage.setItem('sidebar_collapsed', String(v));
  }

  navItems = [
    { label: 'Reservas', route: '/bookings', icon: CalendarDays },
    { label: 'Apartamentos', route: '/apartments', icon: Building2 },
    { label: 'Usuarios', route: '/users', icon: Users },
    { label: 'Import / Export', route: '/data', icon: ArrowUpDown },
    { label: 'Calendario', route: '/calendar', icon: Calendar },
    { label: 'Analítica', route: '/analytics', icon: BarChart3 },
    { label: 'Info Sistema', route: '/info', icon: Info },
  ];
}
