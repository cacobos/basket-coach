import { Component, inject } from '@angular/core';
import { NgIf, NgFor, AsyncPipe, CurrencyPipe } from '@angular/common';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from '../../core/supabase/supabase.service';

@Component({
  selector: 'app-sa-plans',
  standalone: true,
  imports: [NgIf, NgFor, AsyncPipe, CurrencyPipe],
  template: `
    <h1 class="sa-page-title">Planes de Suscripción</h1>
    <table class="sa-table" *ngIf="plans$ | async as plans; else loadingTmpl">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Slug</th>
          <th>Precio/mes</th>
          <th>Precio/año</th>
          <th>Jugadores</th>
          <th>Equipos</th>
          <th>Match</th>
          <th>Planif</th>
          <th>Táctica</th>
          <th>Eval</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let p of plans">
          <td><strong>{{ p.name }}</strong></td>
          <td>{{ p.slug }}</td>
          <td>{{ p.price_monthly | currency:'EUR' }}</td>
          <td>{{ p.price_yearly | currency:'EUR' }}</td>
          <td>{{ p.max_players }}</td>
          <td>{{ p.max_teams }}</td>
          <td>{{ p.feature_match_analysis ? '✓' : '✗' }}</td>
          <td>{{ p.feature_planning ? '✓' : '✗' }}</td>
          <td>{{ p.feature_tactics ? '✓' : '✗' }}</td>
          <td>{{ p.feature_evaluations ? '✓' : '✗' }}</td>
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
    .empty { color: #908f9d; padding: 40px; text-align: center; }
  `]
})
export class SuperadminPlansPage {
  private supabase = inject(SupabaseService);

  plans$ = from(
    this.supabase.client
      .from('subscription_plans')
      .select('*')
      .order('sort_order')
  ).pipe(
    map(({ data }) => (data as any[]) || [])
  );
}
