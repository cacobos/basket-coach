import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, from, of, map, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';

export const familyGuard = (): Observable<boolean | ReturnType<Router['parseUrl']>> => {
  const auth = inject(AuthService);
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  return from(auth.ready).pipe(
    switchMap(() => {
      if (!auth.isAuthenticated()) return of(router.parseUrl('/login'));

      const userId = auth.user()?.id;
      if (!userId) return of(router.parseUrl('/login'));

      return from(
        supabase.client
          .from('player_guardians')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
      ).pipe(
        map(({ count }) => {
          if (count && count > 0) return true;
          return router.parseUrl('/dashboard');
        })
      );
    })
  );
};
