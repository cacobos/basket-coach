import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-import-players-wizard',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <h1>Importar Jugadores</h1>

      @if (step() === 1) {
        <div class="step">
          <h2>1. Selecciona un equipo</h2>
          <select [(ngModel)]="selectedTeamId" class="input">
            <option value="">Seleccionar equipo...</option>
            @for (team of teams(); track team.id) {
              <option [value]="team.id">{{ team.name }} ({{ team.category }})</option>
            }
          </select>
          <div class="actions">
            <button class="btn-primary" [disabled]="!selectedTeamId" (click)="nextStep()">Siguiente</button>
          </div>
        </div>
      }

      @if (step() === 2) {
        <div class="step">
          <h2>2. Introduce los jugadores</h2>
          <p class="hint">Introduce un nombre por línea. Formato: <strong>Nombre Apellido, Dorsal, Posición</strong></p>
          <textarea [(ngModel)]="rawData" rows="10" class="input" placeholder="Juan Pérez, 7, Base&#10;Ana García, 10, Alero&#10;Carlos López, 5, Pívot"></textarea>

          <div class="actions">
            <button class="btn-secondary" (click)="prevStep()">Atrás</button>
            <button class="btn-primary" [disabled]="!rawData.trim()" (click)="parseAndImport()">
              {{ importing() ? 'Importando...' : 'Importar ' + parsedCount() + ' jugadores' }}
            </button>
          </div>

          @if (result(); as r) {
            <div class="result" [class.success]="r.success > 0" [class.error]="r.failed > 0">
              <p><strong>{{ r.success }}</strong> jugadores importados correctamente.</p>
              @if (r.failed > 0) {
                <p><strong>{{ r.failed }}</strong> errores. Revisa el formato de las líneas con errores.</p>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 700px; margin: 0 auto; }
    h1 { font-size: 24px; font-weight: 700; margin: 0 0 24px; color: var(--text-primary); }
    .step { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 24px; }
    .step h2 { font-size: 16px; font-weight: 600; margin: 0 0 16px; color: var(--text-primary); }
    .hint { font-size: 14px; color: var(--text-secondary); margin: 0 0 12px; }
    .input { width: 100%; background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px 14px; color: var(--text-primary); font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.15s; box-sizing: border-box; }
    .input:focus { border-color: #818cf8; }
    textarea.input { resize: vertical; min-height: 200px; }
    .actions { display: flex; gap: 12px; margin-top: 18px; }
    .btn-primary { background: #bdc2ff; color: #030737; padding: 10px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: opacity 0.2s; }
    .btn-primary:hover:not(:disabled) { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-secondary { background: transparent; color: var(--text-primary); padding: 10px 24px; border: 1px solid var(--border-subtle); border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: all 0.15s; }
    .btn-secondary:hover { border-color: rgba(189,194,255,0.3); }
    .result { margin-top: 18px; padding: 14px 18px; border-radius: 8px; font-size: 14px; }
    .success { background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); color: #10b981; }
    .error { background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; }
  `]
})
export class ImportPlayersWizard {
  private supabase = inject(SupabaseService);
  private dataService = inject(DataService);
  private router = inject(Router);

  step = signal(1);
  teams = signal<any[]>([]);
  selectedTeamId = '';
  rawData = '';
  importing = signal(false);
  result = signal<{ success: number; failed: number } | null>(null);

  parsedCount = signal(0);

  constructor() {
    const club = this.dataService.currentClub();
    if (club) this.loadTeams(club.id);
  }

  private async loadTeams(clubId: string) {
    const { data } = await this.supabase.client
      .from('teams').select('id, name, category').eq('club_id', clubId);
    if (data) this.teams.set(data);
  }

  nextStep() {
    this.step.set(2);
  }

  prevStep() {
    this.step.set(1);
  }

  async parseAndImport() {
    if (!this.selectedTeamId || !this.rawData.trim()) return;
    this.importing.set(true);
    this.result.set(null);

    const lines = this.rawData.trim().split('\n').map(l => l.trim()).filter(Boolean);
    let success = 0;
    let failed = 0;

    const club = this.dataService.currentClub();

    for (const line of lines) {
      try {
        const parts = line.split(',').map(p => p.trim());
        const nameParts = parts[0].split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';
        const jerseyNumber = parts[1] ? parseInt(parts[1], 10) || null : null;
        const position = parts[2] || null;

        if (!firstName || !lastName) {
          failed++;
          continue;
        }

        await this.supabase.client.from('players').insert({
          team_id: this.selectedTeamId,
          club_id: club?.id,
          first_name: firstName,
          last_name: lastName,
          jersey_number: jerseyNumber,
          position,
          is_active: true,
        });
        success++;
      } catch {
        failed++;
      }
    }

    this.result.set({ success, failed });
    this.importing.set(false);
  }
}
