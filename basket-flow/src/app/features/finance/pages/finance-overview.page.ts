import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FinanceStore } from '../store/finance.store';
import { DataService } from '../../../core/services/data.service';

@Component({
  selector: 'app-finance-overview',
  standalone: true,
  imports: [RouterLink, DatePipe, DecimalPipe],
  template: `
    <div class="page">
      <h1>Gestión Financiera</h1>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Planes de cuota</span>
          <span class="stat-value">{{ store.feePlans().length }}</span>
        </div>
        <div class="stat-card warn">
          <span class="stat-label">Impagos totales</span>
          <span class="stat-value">{{ store.totalOverdue() | number:'1.2-2' }} €</span>
        </div>
        <div class="stat-card pending">
          <span class="stat-label">Pendiente de cobro</span>
          <span class="stat-value">{{ store.totalPending() | number:'1.2-2' }} €</span>
        </div>
      </div>

      <div class="nav-grid">
        <a routerLink="/finance/fee-plans" class="nav-card">
          <span class="nav-icon">&#128203;</span>
          <span class="nav-title">Planes de Cuota</span>
          <span class="nav-desc">Configurar cuotas por equipo</span>
        </a>
        <a routerLink="/finance/payments" class="nav-card">
          <span class="nav-icon">&#128179;</span>
          <span class="nav-title">Pagos Registrados</span>
          <span class="nav-desc">Historial de cobros</span>
        </a>
      </div>

      @if (store.overdueFees().length > 0) {
        <section class="section">
          <h2>Impagos ({{ store.overdueFees().length }})</h2>
          <table class="table">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Plan</th>
                <th>Equipo</th>
                <th>Vencimiento</th>
                <th>Importe</th>
              </tr>
            </thead>
            <tbody>
              @for (fee of store.overdueFees(); track fee.player_fee_id) {
                <tr>
                  <td class="name">{{ fee.first_name }} {{ fee.last_name }}</td>
                  <td>{{ fee.plan_name }}</td>
                  <td>{{ fee.team_name }}</td>
                  <td>{{ fee.due_date | date:'dd/MM/yyyy' }}</td>
                  <td class="amount due">{{ fee.amount | number:'1.2-2' }} €</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1000px; margin: 0 auto; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 24px; color: var(--text-primary); }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card {
      background: var(--bg-card); border: 1px solid var(--border-subtle);
      border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 6px;
    }
    .stat-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-secondary); }
    .stat-value { font-size: 24px; font-weight: 700; color: var(--text-primary); }
    .warn .stat-value { color: #ef4444; }
    .pending .stat-value { color: #f59e0b; }
    .nav-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
    .nav-card {
      background: var(--bg-card); border: 1px solid var(--border-subtle);
      border-radius: 12px; padding: 20px; text-decoration: none;
      display: flex; flex-direction: column; gap: 8px; transition: border-color 0.15s;
    }
    .nav-card:hover { border-color: rgba(189,194,255,0.3); }
    .nav-icon { font-size: 28px; }
    .nav-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
    .nav-desc { font-size: 13px; color: var(--text-secondary); }
    .section { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 20px; }
    .section h2 { margin: 0 0 16px; font-size: 16px; font-weight: 600; color: var(--text-primary); }
    .table { width: 100%; border-collapse: collapse; }
    .table th { text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle); }
    .table td { padding: 10px 12px; border-bottom: 1px solid var(--border-subtle); font-size: 14px; color: var(--text-primary); }
    .name { font-weight: 600; }
    .amount { font-weight: 700; }
    .due { color: #ef4444; }
  `]
})
export class FinanceOverviewComponent {
  store = inject(FinanceStore);
  private dataService = inject(DataService);

  constructor() {
    const club = this.dataService.currentClub();
    if (club) {
      this.store.loadFeePlans(club.id);
      this.store.loadOverdueFees(club.id);
    }
  }
}
