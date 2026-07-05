import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../../core/services/data.service';
import { PlayerRepository } from '../../../core/repositories/player.repository';
import { MatchService } from '../services/match.service';
import { ConfigurationService } from '../services/configuration.service';
import type { Team, Player } from '../../../core/models/models';

@Component({
  selector: 'app-match-form',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <a routerLink="/matches" class="btn-back">← Volver</a>
        <h1>Nuevo Partido</h1>
      </div>

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }

      @if (showCatalogBanner()) {
        <div class="alert-warning">
          <span>No hay catálogos de partido configurados. Inicializa los valores por defecto para empezar.</span>
          <button class="btn-outline" (click)="seedCatalogs()" [disabled]="seeding()">
            {{ seeding() ? 'Inicializando…' : 'Inicializar catálogos' }}
          </button>
        </div>
      }

      <form (ngSubmit)="onSubmit()" class="form">
        <div class="form-group">
          <label>Equipo</label>
          <select [(ngModel)]="formData.team_id" name="team_id" required (change)="onTeamChange()">
            <option value="">Seleccionar equipo...</option>
            @for (team of teams(); track team.id) {
              <option [value]="team.id">{{ team.name }}</option>
            }
          </select>
        </div>

        <div class="form-group">
          <label>Rival</label>
          <input type="text" [(ngModel)]="formData.rival" name="rival" required
                 placeholder="Nombre del equipo rival">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Competición</label>
            <input type="text" [(ngModel)]="formData.competition" name="competition"
                   placeholder="Ej: Liga Regular">
          </div>
          <div class="form-group">
            <label>Jornada</label>
            <input type="text" [(ngModel)]="formData.round" name="round"
                   placeholder="Ej: 5">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Fecha</label>
            <input type="datetime-local" [(ngModel)]="formData.date" name="date" required>
          </div>
          <div class="form-group">
            <label>Ubicación</label>
            <input type="text" [(ngModel)]="formData.location" name="location"
                   placeholder="Pabellón">
          </div>
        </div>

        @if (availablePlayers().length > 0) {
          <div class="card">
            <div class="card-title">Convocatoria</div>
            <p class="card-subtitle">
              Selecciona las jugadoras convocadas para este partido (mínimo 5)
              — <strong>{{ squadIds().length }}</strong> seleccionadas
            </p>
            <div class="roster-grid">
              @for (p of availablePlayers(); track p.id) {
                <button type="button"
                        class="roster-player"
                        [class.selected]="isInSquad(p.id)"
                        [class.starter]="isStarter(p.id)"
                        (click)="togglePlayer(p.id)">
                  <span class="rp-name">{{ p.first_name }} {{ p.last_name }}</span>
                  @if (p.jersey_number) {
                    <span class="rp-number">#{{ p.jersey_number }}</span>
                  }
                  @if (p.position) {
                    <span class="rp-position">{{ p.position }}</span>
                  }
                </button>
              }
            </div>
          </div>
        }

        @if (squadIds().length >= 5) {
          <div class="card">
            <div class="card-title">Quinteto inicial</div>
            <p class="card-subtitle">
              Toca la ★ en las 5 jugadoras titulares
              — <strong>{{ starterIds().length }}/5</strong>
            </p>
            <div class="roster-grid">
              @for (id of squadIds(); track id) {
                <button type="button"
                        class="roster-player starter-select"
                        [class.starter]="isStarter(id)"
                        (click)="toggleStarter(id)">
                  <span class="rp-star">{{ isStarter(id) ? '★' : '☆' }}</span>
                  <span class="rp-name">{{ getPlayerName(id) }}</span>
                  @if (getPlayerNum(id); as num) {
                    <span class="rp-number">#{{ num }}</span>
                  }
                </button>
              }
            </div>
          </div>
        }

        <div class="form-actions">
          <button type="submit" class="btn-primary" [disabled]="saving()">
            {{ saving() ? 'Creando...' : 'Crear Partido' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 600px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .page-header h1 { font-size: 24px; font-weight: 700; margin: 0; flex: 1; }
    .btn-back { color: var(--text-secondary); text-decoration: none; font-size: 14px; }
    .btn-back:hover { color: var(--text-primary); }
    .btn-primary { background: #bdc2ff; color: #030737; padding: 10px 24px; border-radius: 8px; border: none; font-weight: 600; font-size: 14px; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { opacity: 0.9; }
    .btn-outline { background: transparent; border: 1px solid #f59e0b; color: #fbbf24; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; }
    .btn-outline:disabled { opacity: 0.5; cursor: not-allowed; }
    .alert-error { background: rgba(239,68,68,0.15); color: #fca5a5; padding: 12px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.3); margin-bottom: 16px; font-size: 14px; }
    .alert-warning { background: rgba(245,158,11,0.12); color: #fbbf24; padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(245,158,11,0.3); margin-bottom: 16px; font-size: 14px; display: flex; align-items: center; gap: 16px; }
    .form { display: flex; flex-direction: column; gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .form-group label { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .form-group input, .form-group select { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px 14px; font-size: 14px; outline: none; transition: border-color 0.2s; }
    .form-group input:focus, .form-group select:focus { border-color: #bdc2ff; }
    .form-group input::placeholder { color: var(--text-secondary); }
    .form-row { display: flex; gap: 16px; }
    .form-actions { margin-top: 8px; }

    .card { border-top: 1px solid var(--border-subtle); padding-top: 16px; }
    .card-title { font-size: 14px; font-weight: 600; margin: 0 0 4px; }
    .card-subtitle { font-size: 0.85rem; color: var(--text-secondary); margin: 4px 0 12px; }
    .roster-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .roster-player {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.04);
      color: #b0b3e0; cursor: pointer; transition: all 0.15s; font-size: 0.9rem;
    }
    .roster-player:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.3); }
    .roster-player.selected { background: rgba(79,110,247,0.15); border-color: #4f6ef7; }
    .roster-player.starter { background: rgba(79,110,247,0.25); border-color: #4f6ef7; color: #fff; }
    .rp-star { font-size: 1.2rem; color: #ffd700; }
    .rp-name { font-weight: 500; }
    .rp-number, .rp-position { font-size: 0.8rem; color: var(--text-secondary); }
  `]
})
export class MatchFormPage {
  private dataService = inject(DataService);
  private playerRepo = inject(PlayerRepository);
  private matchService = inject(MatchService);
  private configService = inject(ConfigurationService);
  private router = inject(Router);

  teams = signal<Team[]>([]);
  availablePlayers = signal<Player[]>([]);
  squadIds = signal<string[]>([]);
  starterIds = signal<string[]>([]);
  saving = signal(false);
  error = signal<string | null>(null);
  showCatalogBanner = signal(false);
  seeding = signal(false);

  formData = {
    team_id: '',
    rival: '',
    competition: '',
    round: '',
    location: '',
    date: new Date().toISOString().slice(0, 16),
  };

  constructor() {
    this.init();
  }

  private async init() {
    await this.waitForClub();
    await this.loadTeams();
    await this.checkCatalogs();
  }

  private async checkCatalogs() {
    const club = this.dataService.currentClub();
    if (!club) return;
    await this.configService.loadCatalogs(club.id);
    const empty = this.configService.attackTypes().length === 0
      || this.configService.results().length === 0
      || this.configService.initTypes().length === 0;
    this.showCatalogBanner.set(empty);
  }

  async seedCatalogs() {
    const club = this.dataService.currentClub();
    if (!club) return;
    this.seeding.set(true);
    try {
      await this.configService.seedCatalogs(club.id);
      this.showCatalogBanner.set(false);
    } finally {
      this.seeding.set(false);
    }
  }

  private async waitForClub() {
    while (!this.dataService.currentClub()) {
      await new Promise(r => setTimeout(r, 50));
    }
  }

  private async loadTeams() {
    const club = this.dataService.currentClub();
    if (club) {
      this.teams.set(await this.dataService.getTeams(club.id));
    }
  }

  async onTeamChange() {
    this.availablePlayers.set([]);
    this.squadIds.set([]);
    this.starterIds.set([]);
    if (!this.formData.team_id) return;
    const club = this.dataService.currentClub();
    if (!club) return;
    const players = await this.playerRepo.findByClub(club.id);
    this.availablePlayers.set(players.filter(p => p.is_active !== false));
  }

  isInSquad(playerId: string): boolean {
    return this.squadIds().includes(playerId);
  }

  isStarter(playerId: string): boolean {
    return this.starterIds().includes(playerId);
  }

  togglePlayer(playerId: string): void {
    const current = [...this.squadIds()];
    const idx = current.indexOf(playerId);
    if (idx >= 0) {
      current.splice(idx, 1);
      this.squadIds.set(current);
      this.starterIds.set(this.starterIds().filter(id => id !== playerId));
    } else {
      current.push(playerId);
      this.squadIds.set(current);
    }
  }

  toggleStarter(playerId: string): void {
    const current = [...this.starterIds()];
    const idx = current.indexOf(playerId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      if (current.length >= 5) return;
      current.push(playerId);
    }
    this.starterIds.set(current);
  }

  getPlayerName(id: string): string {
    const p = this.availablePlayers().find(x => x.id === id);
    return p ? `${p.first_name} ${p.last_name}` : '';
  }

  getPlayerNum(id: string): string | null {
    return this.availablePlayers().find(x => x.id === id)?.jersey_number?.toString() ?? null;
  }

  async onSubmit() {
    const club = this.dataService.currentClub();
    if (!club || !this.formData.team_id || !this.formData.rival) return;

    if (this.squadIds().length < 5) {
      this.error.set('Debes convocar al menos 5 jugadoras.');
      return;
    }
    if (this.starterIds().length !== 5) {
      this.error.set('Debes seleccionar exactamente 5 titulares.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const result = await this.matchService.createMatch({
      club_id: club.id,
      team_id: this.formData.team_id,
      rival: this.formData.rival,
      competition: this.formData.competition || undefined,
      round: this.formData.round || undefined,
      location: this.formData.location || undefined,
      date: new Date(this.formData.date).toISOString(),
    });

    if (result.success && result.data) {
      const members = this.squadIds().map(playerId => ({
        player_id: playerId,
        starter: this.starterIds().includes(playerId),
      }));
      await this.matchService.saveSquad(result.data.id, members);
      await this.router.navigate(['/matches', result.data.id]);
    } else {
      this.error.set(result.error || 'Error al crear el partido');
      this.saving.set(false);
    }
  }
}
