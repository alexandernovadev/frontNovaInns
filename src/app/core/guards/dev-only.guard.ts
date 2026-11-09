import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { EnvironmentService } from '../services/environment.service';

// Bloquea rutas marcadas como de desarrollo cuando el entorno es producción.
export const devOnlyGuard: CanActivateFn = async () => {
  const env = inject(EnvironmentService);
  const router = inject(Router);

  await env.ready();

  if (!env.isDev()) return router.createUrlTree(['/bookings']);
  return true;
};
