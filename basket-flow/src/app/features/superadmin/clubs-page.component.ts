import { Component, inject } from '@angular/core';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import { Router } from '@angular/router';
import { from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { SupabaseService } from '../../core/supabase/supabase.service';

@Component({
  selector: 'app-sa-clubs',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe],
  template: `
    <h1 class="sa-page-title">Clubs</h1>
    <table class="sa-table" *ngIf="clubs$ | async as clubs; else loadingTmpl">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Slug</th>
          <th>Miembros</th>
          <th>Plan</th>
          <th>Creado</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let c of clubs" (click)="selectClub(c.id)" class="clickable">
          <td>{{ c.name }}</td>
          <td>{{ c.slug }}</td>
          <td>{{ c.member_count ?? '—' }}</td>
          <td>{{ c.plan_name || 'Free' }}</td>
          <td>{{ c.created_at?.slice(0,10) }}</td>
        </tr>
      </tbody>
    </table>
    <ng-template #loadingTmpl><p class="empty">Cargando…</p></ng-template>
  `,
  styles: [`
    .sa-page-title { font-size: 32px; font-weight: 800; color: #dfe0ff; margin: 0 0 24px; }
    .sa-table { width: 100%; border-collapse: collapse; }
    .sa-table th { text-align: left; padding: 12px 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #908f9d; border-bottom: 1px solid rgba(69,70,82,0.3); }
    .sa-table td { padding: 12px 8px; font-size: 14px; color: #dfe0ff; border-bottom: 1px solid rgba(69,70,82,0.1); }
    .sa-table tr.clickable { cursor: pointer; }
    .sa-table tr.clickable:hover td { color: #bdc2ff; }
    .empty { color: #908f9d; padding: 40px; text-align: center; }
  `]
})
export class SuperadminClubsPage {
  private auth = inject(AuthService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  clubs$ = from(this.auth.ready).pipe(
    switchMap(() => {
      const profile = this.auth.profile();
      const isBasketflow = profile?.email?.endsWith('@basketflow.com') ?? false;
      let query = this.supabase.client
        .from('clubs')
        .select('*, club_members(count)')
        .order('created_at', { ascending: false });
      if (!isBasketflow) {
        query = query.neq('slug', 'basketflow-demo');
      }
      return from(query);
    }),
    map(({ data }) =>
      ((data as any[]) || []).map(c => ({
        ...c,
        member_count: (c as any).club_members?.[0]?.count ?? 0,
        plan_name: 'Free',
      }))
    )
  );

  selectClub(id: string) {
    this.router.navigate(['/superadmin/clubs', id]);
  }
}
