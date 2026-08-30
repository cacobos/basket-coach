import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { from, map, switchMap, of } from 'rxjs';
import { PermissionService } from '../services/permission.service';
import { DataService } from '../services/data.service';

export function featureGuard(feature: string) {
  return () => {
    const perms = inject(PermissionService);
    const data = inject(DataService);
    const router = inject(Router);

    // Espera de forma determinista a que el club activo esté cargado antes de evaluar.
    return from(data.ensureClubLoaded()).pipe(
      switchMap(club => {
        if (!club) return of(router.createUrlTree(['/dashboard']));
        return perms.hasFeatureAccess(feature, club.id).pipe(
          map(hasAccess => (hasAccess ? true : router.createUrlTree(['/upgrade'])))
        );
      })
    );
  };
}
