import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { FinanceStore } from '../store/finance.store';
import { DataService } from '../../../core/services/data.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';

@Component({
  selector: 'app-fee-plan-form',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="header">
        <a routerLink="/finance/fee-plans" class="btn-back">&#8592; Planes de Cuota</a>
        <h1>Nuevo Plan de Cuota</h1>
      </div>

      <div class="form-card">
        <div class="field">
          <label for="name">Nombre</label>
          <input id="name" type="text" [(ngModel)]="name" placeholder="Ej: Cuota mensual" class="input" />
        </div>

        <div class="field">
          <label for="team">Equipo (opcional)</label>
          <select id="team" [(ngModel)]="teamId" class="input">
            <option value="">Todos los equipos</option>
            @for (team of teams(); track team.id) {
              <option [value]="team.id">{{ team.name }}</option>
            }
          </select>
        </div>

        <div class="field">
          <label for="amount">Importe (€)</label>
          <input id="amount" type="number" step="0.01" min="0" [(ngModel)]="amount" class="input" />
        </div>

        <div class="field">
          <label for="frequency">Frecuencia</label>
          <select id="frequency" [(ngModel)]="frequency" class="input">
            <option value="monthly">Mensual</option>
            <option value="seasonal">Por temporada</option>
            <option value="one_time">Pago único</option>
          </select>
        </div>

        <div class="actions">
          <button class="btn-primary" (click)="submit()" [disabled]="!name || !amount || submitting()">
            {{ submitting() ? 'Creando...' : 'Crear Plan' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 600px; margin: 0 auto; }
    .header { margin-bottom: 24px; }
    .header h1 { margin: 8px 0 0; font-size: 22px; font-weight: 700; color: var(--text-primary); }
    .btn-back { color: var(--text-secondary); text-decoration: none; font-size: 14px; transition: color 0.15s; }
    .btn-back:hover { color: var(--text-primary); }
    .form-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 18px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; }
    .input { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px 14px; color: var(--text-primary); font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.15s; }
    .input:focus { border-color: #818cf8; }
    .actions { margin-top: 4px; }
    .btn-primary { background: #bdc2ff; color: #030737; padding: 10px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: opacity 0.2s; }
    .btn-primary:hover:not(:disabled) { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class FeePlanFormComponent {
  private store = inject(FinanceStore);
  private dataService = inject(DataService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  name = '';
  teamId = '';
  amount = 0;
  frequency: 'monthly' | 'seasonal' | 'one_time' = 'monthly';
  teams = signal<any[]>([]);
  submitting = signal(false);

  constructor() {
    const club = this.dataService.currentClub();
    if (club) {
      this.loadTeams(club.id);
    }
  }

  private async loadTeams(clubId: string) {
    const { data } = await this.supabase.client
      .from('teams').select('id, name').eq('club_id', clubId);
    if (data) this.teams.set(data);
  }

  async submit() {
    if (!this.name || !this.amount || this.submitting()) return;
    this.submitting.set(true);
    try {
      const club = this.dataService.currentClub();
      if (!club) return;
      await this.store.createFeePlan({
        club_id: club.id,
        team_id: this.teamId || null,
        name: this.name,
        amount: this.amount,
        frequency: this.frequency,
        is_active: true,
      });
      this.router.navigate(['/finance/fee-plans']);
    } finally {
      this.submitting.set(false);
    }
  }
}
