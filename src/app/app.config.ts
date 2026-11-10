import { ApplicationConfig, Injectable, provideBrowserGlobalErrorListeners, LOCALE_ID } from '@angular/core';
import { provideRouter, withPreloading, PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';

registerLocaleData(localeEs);

// Las vistas ligeras y de uso continuo se adelantan en idle (el clic no espera
// chunk). Las pesadas —Analytics con gráficas, Tracker, NovaAI y los formularios—
// se bajan solo al entrar, para no castigar la conexión ni el móvil.
const PRELOAD_ROUTES = new Set(['bookings', 'apartments', 'calendar', 'expenses', 'admin', 'data']);

@Injectable({ providedIn: 'root' })
class SelectivePreloading implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return PRELOAD_ROUTES.has(route.path ?? '') ? load() : of(null);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Las vistas ya son lazy: se pre-cargan en idle para que el clic no espere chunk
    provideRouter(routes, withPreloading(SelectivePreloading)),
    provideHttpClient(withFetch(), withInterceptors([jwtInterceptor])),
    { provide: LOCALE_ID, useValue: 'es' },
  ],
};
