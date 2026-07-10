import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { FinanceStore } from '../store/finance.store';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'app-fee-plans',
  standalone: true,
  imports: [RouterLink, DecimalPipe],
  template: `
    <div class="page">
      <div class="header">
        <div>
          <a routerLink="/finance" class="btn-back">&#8592; Finanzas</a>
          <h1>Planes de Cuota</h1>
        </div>
        <a routerLink="/finance/fee-plans/new" class="btn-primary">+ Nuevo Plan</a>
      </div>

      @if (store.loading()) {
        <div class="loading">Cargando...</div>
      } @else if (store.feePlans().length === 0) {
        <div class="empty">
          <h3>No hay planes de cuota</h3>
          <p>Crea un plan para empezar a registrar cuotas de jugadores.</p>
        </div>
      } @else {
        <div class="plans-grid">
          @for (plan of store.feePlans(); track plan.id) {
            <div class="plan-card">
              <div class="plan-header">
                <h3>{{ plan.name }}</h3>
                <span class="plan-amount">{{ plan.amount | number:'1.2-2' }} €</span>
              </div>
              <div class="plan-meta">
                <span class="badge">{{ frequencyLabel(plan.frequency) }}</span>
                @if (!plan.is_active) {
                  <span class="badge inactive">Inactivo</span>
                }
              </div>
              <button class="btn-delete" (click)="deletePlan(plan.id)">Eliminar</button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 900px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .header h1 { margin: 8px 0 0; font-size: 22px; font-weight: 700; color: var(--text-primary); }
    .btn-back { color: var(--text-secondary); text-decoration: none; font-size: 14px; transition: color 0.15s; }
    .btn-back:hover { color: var(--text-primary); }
    .loading { text-align: center; padding: 60px; color: var(--text-secondary); }
    .empty { text-align: center; padding: 80px 24px; }
    .empty h3 { margin: 0 0 8px; color: var(--text-primary); }
    .empty p { color: var(--text-secondary); margin: 0; }
    .plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .plan-card {
      background: var(--bg-card); border: 1px solid var(--border-subtle);
      border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 12px;
    }
    .plan-header { display: flex; justify-content: space-between; align-items: center; }
    .plan-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-primary); }
    .plan-amount { font-size: 20px; font-weight: 700; color: #10b981; }
    .plan-meta { display: flex; gap: 8px; }
    .badge {
      font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px;
      text-transform: uppercase; letter-spacing: 0.3px;
      background: rgba(99,102,241,0.12); color: #818cf8;
    }
    .inactive { background: rgba(239,68,68,0.12); color: #ef4444; }
    .btn-delete {
      background: transparent; border: 1px solid var(--border-subtle);
      color: #ef4444; padding: 6px 14px; border-radius: 6px;
      font-size: 12px; font-weight: 600; cursor: pointer; align-self: flex-start;
      transition: all 0.15s;
    }
    .btn-delete:hover { background: rgba(239,68,68,0.1); border-color: #ef4444; }
    .btn-primary {
      background: #bdc2ff; color: #030737; padding: 8px 18px; border: none;
      border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;
      text-decoration: none; transition: opacity 0.2s;
    }
    .btn-primary:hover { opacity: 0.9; }
  `]
})
export class FeePlansComponent {
  store = inject(FinanceStore);
  private dataService = inject(DataService);

  constructor() {
    const club = this.dataService.currentClub();
    if (club) this.store.loadFeePlans(club.id);
  }

  frequencyLabel(f: string): string {
    const map: Record<string, string> = { monthly: 'Mensual', seasonal: 'Temporada', one_time: 'Pago único' };
    return map[f] || f;
  }

  async deletePlan(id: string) {
    if (!confirm('¿Eliminar este plan de cuota?')) return;
    await this.store.deleteFeePlan(id);
  }
}
