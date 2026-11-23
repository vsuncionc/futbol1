import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const token = authService.accessToken();

  const isAuthEndpoint = req.url.includes('/api/v1/auth/login') ||
                         req.url.includes('/api/v1/auth/refresh-token') ||
                         req.url.includes('/api/v1/auth/register') ||
                         req.url.includes('/api/v1/auth/forgot-password') ||
                         req.url.includes('/api/v1/auth/reset-password') ||
                         req.url.includes('/api/v1/auth/registration-status');

  let modifiedReq = req;

  // Si tenemos token válido (JWT real) y la ruta no es de autenticación pública, inyectamos el Bearer token
  if (token && token !== 'demo-token' && !isAuthEndpoint) {
    modifiedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      },
      withCredentials: true
    });
  } else {
    modifiedReq = req.clone({
      withCredentials: true
    });
  }

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el servidor retorna 401 y no es un endpoint de autenticación pública
      if (error.status === 401 && !isAuthEndpoint) {
        // Si no había token activo ni válido, no intentar refresco silencioso
        if (!token || token === 'demo-token') {
          return throwError(() => error);
        }

        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((newToken) => {
              isRefreshing = false;
              refreshTokenSubject.next(newToken);
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                },
                withCredentials: true
              });
              return next(retryReq);
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              refreshTokenSubject.next(null);
              authService.logout();
              return throwError(() => refreshErr);
            })
          );
        } else {
          // Peticiones concurrentes en vuelo esperan la resolución del token único
          return refreshTokenSubject.pipe(
            filter((t): t is string => t !== null),
            take(1),
            switchMap((newToken) => {
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                },
                withCredentials: true
              });
              return next(retryReq);
            })
          );
        }
      }

      return throwError(() => error);
    })
  );
};
