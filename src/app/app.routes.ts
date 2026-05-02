import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'bookings', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login').then(m => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'bookings',
        loadComponent: () => import('./pages/bookings/bookings').then(m => m.BookingsComponent),
      },
      {
        path: 'apartments',
        loadComponent: () => import('./pages/apartments/apartments').then(m => m.ApartmentsComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users').then(m => m.UsersComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'bookings' },
];
