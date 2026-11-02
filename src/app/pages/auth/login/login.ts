import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LucideAngularModule, Mail, Lock, ArrowRight, LoaderCircle } from 'lucide-angular';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './login.html',
})
export class LoginComponent {
  readonly Mail = Mail;
  readonly Lock = Lock;
  readonly ArrowRight = ArrowRight;
  readonly LoaderCircle = LoaderCircle;

  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  year = new Date().getFullYear();
  loading = signal(false);
  error = signal('');

  submit() {
    if (!this.email || !this.password) {
      this.error.set('Completa todos los campos');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.auth.login(this.email, this.password).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: () => {
        this.error.set('Credenciales inválidas');
        this.loading.set(false);
      },
    });
  }
}
