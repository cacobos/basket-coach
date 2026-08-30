import { inject } from '@angular/core';
import { Router } from '@angular/router';
import type { CanActivateFn } from '@angular/router';
import { Observable, from, of, map, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { PermissionService } from '../services/permission.service';
import { DataService } from '../services/data.service';

export const clubAdminGuard: CanActivateFn = (route): Observable<boolean | import('@angular/router').UrlTree> => {
  const auth = inject(AuthService);
  const permissions = inject(PermissionService);
  const data = inject(DataService);
  const router = inject(Router);

  return from(auth.ready).pipe(
    switchMap(() => {
      if (!auth.isAuthenticated()) return of(router.parseUrl('/login'));
      if (auth.profile()?.is_superadmin) return of(true);

      const routeClubId = route.paramMap.get('id');
      const clubId$ = routeClubId
        ? of(routeClubId)
        : from(data.ensureClubLoaded()).pipe(map(club => club?.id ?? null));

      return clubId$.pipe(
        switchMap(clubId => {
          if (!clubId) return of(router.parseUrl('/clubs'));
          return permissions.getRoleInClub(clubId).pipe(
            map(role => {
              if (role && permissions.hasPermission(role, 'club.members.manage')) return true;
              return router.parseUrl('/dashboard');
            })
          );
        })
      );
    })
  );
};
