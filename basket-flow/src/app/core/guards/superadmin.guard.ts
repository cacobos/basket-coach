import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export function superadminGuard() {
  const auth = inject(AuthService);
  const router = inject(Router);
  const profile = auth.profile();
  if (profile?.is_superadmin) return true;
  return router.parseUrl('/dashboard');
}
