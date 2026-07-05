import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map } from 'rxjs';
import { PermissionService } from '../services/permission.service';
import { DataService } from '../services/data.service';

export function featureGuard(feature: string) {
  return () => {
    const perms = inject(PermissionService);
    const data = inject(DataService);
    const router = inject(Router);

    const clubId = data.currentClub()?.id;
    if (!clubId) return router.createUrlTree(['/dashboard']);

    return perms.hasFeatureAccess(feature, clubId).pipe(
      map(hasAccess => hasAccess ? true : router.createUrlTree(['/upgrade']))
    );
  };
}
