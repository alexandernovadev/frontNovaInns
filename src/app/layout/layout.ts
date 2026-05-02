import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
})
export class LayoutComponent {
  auth = inject(AuthService);
  sidebarOpen = signal(false);

  toggleSidebar() {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.sidebarOpen.set(false);
  }

  navItems = [
    { label: 'Reservas',      route: '/bookings',   icon: 'bookings'   },
    { label: 'Apartamentos',  route: '/apartments', icon: 'apartments' },
    { label: 'Usuarios',      route: '/users',      icon: 'users'      },
  ];
}
