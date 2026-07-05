import { Component, inject } from '@angular/core';
import { AsyncPipe, NgFor, NgIf, CurrencyPipe } from '@angular/common';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_players: number;
  max_teams: number;
  feature_match_analysis: boolean;
  feature_planning: boolean;
  feature_tactics: boolean;
  feature_evaluations: boolean;
  feature_advanced_stats: boolean;
  sort_order: number;
}

@Component({
  selector: 'app-upgrade',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, CurrencyPipe],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1 class="page-title">Planes</h1>
          <p class="page-sub">Elige el plan que mejor se adapte a tu club.</p>
        </div>
      </header>

      <div class="plans-grid" *ngIf="plans$ | async as plans">
        <div class="plan-card" *ngFor="let plan of plans" [class.featured]="plan.slug === 'pro'">
          <div class="plan-header">
            <h2 class="plan-name">{{ plan.name }}</h2>
            <p class="plan-desc">{{ plan.description }}</p>
            <div class="plan-price">
              <span class="price-amount">{{ plan.price_monthly | currency:'EUR':'symbol':'1.2-2' }}</span>
              <span class="price-period">/mes</span>
            </div>
            <div class="plan-price-yearly" *ngIf="plan.price_yearly > 0">
              {{ plan.price_yearly | currency:'EUR':'symbol':'1.2-2' }}/año
            </div>
          </div>
          <ul class="plan-features">
            <li [class.check]="plan.feature_planning">Planificación de sesiones</li>
            <li [class.check]="plan.feature_tactics">Pizarra táctica</li>
            <li [class.check]="plan.feature_evaluations">Evaluaciones</li>
            <li [class.check]="plan.feature_match_analysis">Análisis de partidos</li>
            <li [class.check]="plan.feature_advanced_stats">Estadísticas avanzadas</li>
            <li>Hasta {{ plan.max_players }} jugadores</li>
            <li>Hasta {{ plan.max_teams }} equipos</li>
          </ul>
          <button class="plan-btn" (click)="contact()">{{ plan.price_monthly === 0 ? 'Comenzar gratis' : 'Contactar' }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 40px; max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 48px; text-align: center; }
    .page-title { font-size: 48px; font-weight: 800; letter-spacing: -0.02em; color: #dfe0ff; margin: 0 0 8px; }
    .page-sub { font-size: 18px; color: #c6c5d4; margin: 0; }
    .plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
    .plan-card {
      background: #161b48; border-radius: 16px; padding: 32px;
      border: 1px solid rgba(69,70,82,0.2); display: flex; flex-direction: column;
      transition: all 0.2s;
    }
    .plan-card:hover { border-color: rgba(69,70,82,0.4); transform: translateY(-2px); }
    .plan-card.featured {
      border-color: #0068ed; box-shadow: 0 8px 32px rgba(0,104,237,0.15);
    }
    .plan-header { text-align: center; margin-bottom: 24px; }
    .plan-name { font-size: 24px; font-weight: 800; color: #dfe0ff; margin: 0 0 8px; }
    .plan-desc { font-size: 14px; color: #908f9d; margin: 0 0 24px; }
    .plan-price { margin-bottom: 4px; }
    .price-amount { font-size: 36px; font-weight: 800; color: #bdc2ff; }
    .price-period { font-size: 14px; color: #908f9d; }
    .plan-price-yearly { font-size: 13px; color: #908f9d; }
    .plan-features { list-style: none; padding: 0; margin: 0 0 24px; flex: 1; }
    .plan-features li {
      padding: 8px 0; font-size: 14px; color: #c6c5d4;
      border-bottom: 1px solid rgba(69,70,82,0.1);
    }
    .plan-features li.check { color: #69f0ae; }
    .plan-features li.check::before { content: '✓ '; }
    .plan-features li:not(.check)::before { content: '— '; color: #3a3f6a; }
    .plan-btn {
      width: 100%; padding: 14px; border-radius: 12px;
      border: none; font-size: 15px; font-weight: 700;
      cursor: pointer; transition: all 0.2s;
      background: #0068ed; color: white;
    }
    .plan-btn:hover { opacity: 0.9; }
    @media (max-width: 768px) {
      .page { padding: 20px; }
      .page-title { font-size: 28px; }
      .plans-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class UpgradeComponent {
  private supabase = inject(SupabaseService);

  plans$ = from(
    this.supabase.client
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
  ).pipe(
    map(({ data }: { data: Plan[] | null }) => (data as Plan[]) || [])
  );

  contact() {
    window.location.href = 'mailto:sales@basketcoach.app?subject=Quiero%20contratar%20un%20plan';
  }
}
