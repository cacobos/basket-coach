import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';

export const calendarRedirectGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const supabase = inject(SupabaseService);
  const auth = inject(AuthService);
  const router = inject(Router);

  return from(auth.ready).pipe(
    switchMap(() => {
      const userId = auth.user()?.id;
      if (!userId) return of(true);
      return from(
        supabase.client.from('player_guardians').select('player_id').eq('user_id', userId)
      ).pipe(
        map(({ data }) =>
          data?.length
            ? true
            : router.createUrlTree(['/sessions'], { queryParams: { view: 'calendar' } })
        )
      );
    })
  );
};
