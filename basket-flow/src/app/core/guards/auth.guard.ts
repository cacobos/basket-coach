import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, from, map } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const authGuard = (): Observable<boolean | import('@angular/router').UrlTree> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return from(auth.ready).pipe(
    map(() => auth.isAuthenticated() ? true : router.parseUrl('/login'))
  );
};
