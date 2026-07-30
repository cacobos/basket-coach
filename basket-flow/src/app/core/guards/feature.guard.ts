import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, filter, first, race, timer, switchMap } from 'rxjs';
import { PermissionService } from '../services/permission.service';
import { DataService } from '../services/data.service';

export function featureGuard(feature: string) {
  return () => {
    const perms = inject(PermissionService);
    const data = inject(DataService);
    const router = inject(Router);

    const clubId = data.currentClub()?.id;
    if (clubId) {
      return perms.hasFeatureAccess(feature, clubId).pipe(
        map(hasAccess => hasAccess ? true : router.createUrlTree(['/upgrade']))
      );
    }

    return race([
      timer(10000).pipe(map(() => router.createUrlTree(['/dashboard']))),
      timer(0, 100).pipe(
        map(() => data.currentClub()?.id),
        filter(Boolean),
        first(),
        switchMap(id => perms.hasFeatureAccess(feature, id).pipe(
          map(hasAccess => hasAccess ? true : router.createUrlTree(['/upgrade']))
        )),
      ),
    ]);
  };
}
