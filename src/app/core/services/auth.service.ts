import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';

import { API } from '../../shared/constants/api.constant';
const TOKEN_KEY = 'nova_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  isLoggedIn = signal<boolean>(this.hasToken());

  login(email: string, password: string) {
    return this.http.post<{ access_token: string; user: any }>(`${API}/auth/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem(TOKEN_KEY, res.access_token);
        this.isLoggedIn.set(true);
      })
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    this.isLoggedIn.set(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }
}
