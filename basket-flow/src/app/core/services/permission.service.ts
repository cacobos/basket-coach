import { Injectable, inject, signal, Injector } from '@angular/core';
import { Observable, from, of, switchMap, map } from 'rxjs';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';

export const PERMISSION_LABELS: Record<string, string> = {
  'club.members.manage': 'Gestionar miembros del club',
  'team.staff.manage': 'Gestionar staff de equipos',
  'team.manage': 'Gestionar equipos',
  'player.manage': 'Gestionar jugadores',
  'session.manage': 'Gestionar sesiones',
  'exercise.manage': 'Gestionar ejercicios',
  'evaluation.manage': 'Gestionar evaluaciones',
  'match.manage': 'Gestionar partidos',
  'planning.manage': 'Gestionar planificación',
  'configuration.manage': 'Gestionar configuración',
  'tactics.manage': 'Pizarra táctica',
  'attendance.manage': 'Control de asistencia',
  'documents.manage': 'Gestión documental',
  'announcements.manage': 'Comunicación / Avisos',
  'finance.manage': 'Gestión financiera (cuotas)',
  'advanced_stats.manage': 'Estadísticas avanzadas',
};

export type Role = 'club_admin' | 'team_admin' | 'coach' | 'family';
export type Permission = keyof typeof PERMISSION_LABELS;

export const FEATURE_PERMISSION_MAP: Record<string, Permission> = {
  match_analysis: 'match.manage',
  planning: 'planning.manage',
  tactics: 'tactics.manage',
  evaluations: 'evaluation.manage',
  advanced_stats: 'advanced_stats.manage',
  documents: 'documents.manage',
  announcements: 'announcements.manage',
  finance: 'finance.manage',
};

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private supabase = inject(SupabaseService);
  private injector = inject(Injector);

  readonly cache = signal<Record<string, boolean>>({});

  private get auth(): AuthService {
    return this.injector.get(AuthService);
  }

  private async withAuthRetry<T>(query: () => PromiseLike<{ data: T | null }>): Promise<T | null> {
    let { data } = await query();
    if (!data) {
      await new Promise(r => setTimeout(r, 400));
      ({ data } = await query());
    }
    return data;
  }

  async load(): Promise<void> {
    const data = await this.withAuthRetry(() =>
      this.supabase.client.from('role_permissions').select('role, permission, granted')
    );
    if (!data) return;
    const map: Record<string, boolean> = {};
    for (const row of data as any[]) {
      map[`${row.role}:${row.permission}`] = row.granted;
    }
    this.cache.set(map);
  }

  async ensureLoaded(): Promise<void> {
    if (Object.keys(this.cache()).length === 0) {
      await this.load();
    }
  }

  hasPermission(role: Role | null | undefined, permission: Permission): boolean {
    if (!role) return false;
    return this.cache()[`${role}:${permission}`] ?? false;
  }

  getGrantedPermissions(role: Role): Permission[] {
    const all = Object.keys(PERMISSION_LABELS) as Permission[];
    return all.filter(p => this.hasPermission(role, p));
  }

  getRoles(): Role[] {
    return ['club_admin', 'team_admin', 'coach', 'family'];
  }

  getAllPermissions(): Permission[] {
    return Object.keys(PERMISSION_LABELS) as Permission[];
  }

  getPermissionLabel(permission: Permission): string {
    return PERMISSION_LABELS[permission] ?? permission;
  }

  getRoleInClub(clubId: string): Observable<Role | null> {
    return from(this.auth.ready).pipe(
      switchMap(() => {
        const userId = this.auth.user()?.id;
        if (!userId) return of(null);
        const query = () =>
          this.supabase.client
            .from('club_members')
            .select('role')
            .eq('club_id', clubId)
            .eq('user_id', userId)
            .maybeSingle();
        return from(this.withAuthRetry(query)).pipe(
          map(data => (data as { role: Role } | null)?.role ?? null)
        );
      })
    );
  }

  hasFeatureAccess(feature: string, clubId: string): Observable<boolean> {
    const profile = this.auth.profile();
    if (profile?.is_superadmin) return of(true);
    const permission = FEATURE_PERMISSION_MAP[feature];
    if (!permission) return of(false);
    return this.getRoleInClub(clubId).pipe(
      map(role => this.hasPermission(role, permission))
    );
  }

  async updatePermission(role: Role, permission: Permission, granted: boolean): Promise<void> {
    await this.supabase.client
      .from('role_permissions')
      .upsert({ role, permission, granted }, { onConflict: 'role,permission' });
    this.cache.update(m => ({ ...m, [`${role}:${permission}`]: granted }));
  }
}
