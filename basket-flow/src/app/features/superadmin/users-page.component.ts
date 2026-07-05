import { Component, inject } from '@angular/core';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import { from, BehaviorSubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SupabaseService } from '../../core/supabase/supabase.service';

@Component({
  selector: 'app-sa-users',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe],
  template: `
    <h1 class="sa-page-title">Usuarios</h1>
    <table class="sa-table" *ngIf="vm$ | async as vm; else loadingTmpl">
      <thead>
        <tr>
          <th>Email</th>
          <th>Nombre</th>
          <th>Superadmin</th>
          <th>Creado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let u of vm.users">
          <td>{{ u.email }}</td>
          <td>{{ u.full_name || '—' }}</td>
          <td>{{ u.is_superadmin ? '✓' : '—' }}</td>
          <td>{{ u.created_at?.slice(0,10) }}</td>
          <td>
            <button class="btn-toggle" (click)="toggleSuperadmin(u, vm)" *ngIf="u.id !== vm.currentUserId">
              {{ u.is_superadmin ? 'Revocar' : 'Promover' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <ng-template #loadingTmpl><p class="empty">Cargando…</p></ng-template>
  `,
  styles: [`
    .sa-page-title { font-size: 32px; font-weight: 800; color: #dfe0ff; margin: 0 0 24px; }
    .sa-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .sa-table th { text-align: left; padding: 10px 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #908f9d; border-bottom: 1px solid rgba(69,70,82,0.3); }
    .sa-table td { padding: 10px 6px; color: #c6c5d4; border-bottom: 1px solid rgba(69,70,82,0.1); }
    .btn-toggle { background: rgba(0,104,237,0.15); border: none; color: #bdc2ff; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; cursor: pointer; }
    .btn-toggle:hover { background: rgba(0,104,237,0.25); }
  `]
})
export class SuperadminUsersPage {
  private supabase = inject(SupabaseService);
  private refresh$ = new BehaviorSubject<void>(undefined);

  vm$ = this.refresh$.pipe(
    switchMap(() =>
      from(this.supabase.client.auth.getUser()).pipe(
        switchMap(({ data: authUser }) =>
          from(
            this.supabase.client
              .from('profiles')
              .select('*')
              .order('created_at', { ascending: false })
          ).pipe(
            map(({ data }) => ({
              currentUserId: authUser.user?.id || '',
              users: (data as any[]) || [],
            }))
          )
        )
      )
    )
  );

  async toggleSuperadmin(user: any, vm: any) {
    const newVal = !user.is_superadmin;
    await this.supabase.client
      .from('profiles')
      .update({ is_superadmin: newVal })
      .eq('id', user.id);
    this.refresh$.next();
  }
}
