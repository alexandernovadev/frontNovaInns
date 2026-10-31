import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { EnvironmentService } from '../core/services/environment.service';
import { AlertNova } from '../shared/components/alert-nova';
import { LucideAngularModule, CalendarDays, Calendar, Building2, BarChart3, Receipt, LogOut, Menu, ChevronLeft, Shield } from 'lucide-angular';

@Component({
  selector: 'app-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule, AlertNova],
  templateUrl: './layout.html',
})
export class LayoutComponent {
  auth = inject(AuthService);
  environmentService = inject(EnvironmentService);
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
  readonly BarChart3 = BarChart3;
  readonly Receipt = Receipt;
  readonly LogOut = LogOut;
  readonly Menu = Menu;
  readonly ChevronLeft = ChevronLeft;
  readonly Shield = Shield;

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  closeSidebar() { this.sidebarOpen.set(false); }
  toggleCollapsed() {
    const v = !this.collapsed();
    this.collapsed.set(v);
    localStorage.setItem('sidebar_collapsed', String(v));
  }

  logo() {
    return this.environmentService.isDev()
      ? 'assets/images/logodev.png'
      : 'assets/images/LogoNovaInns.png';
  }

  navItems = [
    { label: 'Reservas', route: '/bookings', icon: CalendarDays },
    { label: 'Apartamentos', route: '/apartments', icon: Building2 },
    { label: 'Calendario', route: '/calendar', icon: Calendar },
    { label: 'Gastos', route: '/expenses', icon: Receipt },
    { label: 'Analítica', route: '/analytics', icon: BarChart3 },
    { label: 'Admin', route: '/admin', icon: Shield },
  ];
}
