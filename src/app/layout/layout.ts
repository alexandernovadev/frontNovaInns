import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { LucideAngularModule, CalendarDays, Building2, Users, ArrowUpDown, Info, LogOut, Menu } from 'lucide-angular';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  templateUrl: './layout.html',
})
export class LayoutComponent {
  auth = inject(AuthService);
  sidebarOpen = signal(false);

  readonly CalendarDays = CalendarDays;
  readonly Building2 = Building2;
  readonly Users = Users;
  readonly ArrowUpDown = ArrowUpDown;
  readonly Info = Info;
  readonly LogOut = LogOut;
  readonly Menu = Menu;

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  closeSidebar() { this.sidebarOpen.set(false); }

  navItems = [
    { label: 'Reservas', route: '/bookings', icon: CalendarDays },
    { label: 'Apartamentos', route: '/apartments', icon: Building2 },
    { label: 'Usuarios', route: '/users', icon: Users },
    { label: 'Import / Export', route: '/data', icon: ArrowUpDown },
    { label: 'Info Sistema', route: '/info', icon: Info },
  ];
}
