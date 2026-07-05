import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, from, of, map, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../services/permission.service';
import { DataService } from '../services/data.service';

export const adminGuard = (): Observable<boolean | import('@angular/router').UrlTree> => {
  const auth = inject(AuthService);
  const perms = inject(PermissionService);
  const data = inject(DataService);
  const router = inject(Router);

  return from(auth.ready).pipe(
    switchMap(() => {
      if (!auth.isAuthenticated()) return of(router.parseUrl('/login'));
      if (auth.profile()?.is_superadmin) return of(true);

      const clubId = data.currentClub()?.id;
      if (!clubId) return of(router.parseUrl('/dashboard'));

      return perms.getRoleInClub(clubId).pipe(
        map(role => {
          if (perms.hasPermission(role, 'configuration.manage')) return true;
          return router.parseUrl('/dashboard');
        })
      );
    })
  );
};
