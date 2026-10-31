import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'bookings', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layout/layout').then((m) => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'bookings',
        loadComponent: () => import('./pages/bookings/bookings').then((m) => m.BookingsComponent),
      },
      {
        path: 'bookings/new',
        loadComponent: () =>
          import('./pages/bookings/booking-form/booking-form').then((m) => m.BookingFormComponent),
      },
      {
        path: 'bookings/:id/edit',
        loadComponent: () =>
          import('./pages/bookings/booking-form/booking-form').then((m) => m.BookingFormComponent),
      },
      {
        path: 'bookings/:id',
        loadComponent: () =>
          import('./pages/bookings/booking-detail/booking-detail').then(
            (m) => m.BookingDetailComponent,
          ),
      },
      {
        path: 'apartments',
        loadComponent: () =>
          import('./pages/apartments/apartments').then((m) => m.ApartmentsComponent),
      },
      {
        path: 'apartments/:id',
        loadComponent: () =>
          import('./pages/apartments/apartment-detail/apartment-detail').then(
            (m) => m.ApartmentDetailComponent,
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./pages/analytics/analytics').then((m) => m.AnalyticsComponent),
      },
      {
        path: 'expenses',
        loadComponent: () =>
          import('./pages/expenses/expenses').then((m) => m.ExpensesComponent),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./pages/calendar/calendar').then((m) => m.CalendarComponent),
      },
      {
        path: 'admin',
        loadComponent: () =>
          import('./pages/admin/admin-layout').then((m) => m.AdminLayoutComponent),
        children: [
          { path: '', redirectTo: 'users', pathMatch: 'full' },
          {
            path: 'users',
            loadComponent: () => import('./pages/users/users').then((m) => m.UsersComponent),
          },
          {
            path: 'messages',
            loadComponent: () =>
              import('./pages/messages/messages').then((m) => m.MessagesComponent),
          },
          {
            path: 'data',
            loadComponent: () => import('./pages/data/data').then((m) => m.DataComponent),
          },
          {
            path: 'info',
            loadComponent: () => import('./pages/info/info').then((m) => m.InfoComponent),
          },
          {
            path: 'clear',
            loadComponent: () => import('./pages/admin/admin').then((m) => m.AdminComponent),
          },
        ],
      },
      // Rutas viejas → tabs de Admin
      { path: 'users', redirectTo: '/admin/users', pathMatch: 'full' },
      { path: 'messages', redirectTo: '/admin/messages', pathMatch: 'full' },
      { path: 'data', redirectTo: '/admin/data', pathMatch: 'full' },
      { path: 'info', redirectTo: '/admin/info', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'bookings' },
];
