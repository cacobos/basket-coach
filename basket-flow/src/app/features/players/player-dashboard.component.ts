import { Component, inject, ChangeDetectionStrategy, signal } from '@angular/core';
import { AsyncPipe, NgIf, NgFor, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { filter, map, startWith, switchMap, tap } from 'rxjs/operators';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { DataService } from '../../core/services/data.service';
import { PlayerRepository } from '../../core/repositories/player.repository';
import type { Player, Team, PlayerTeam, Evaluation } from '../../core/models/models';

interface PlayerTeamWithTeam extends PlayerTeam {
  teams: Team;
}

@Component({
  selector: 'app-player-dashboard',
  standalone: true,
  imports: [AsyncPipe, NgIf, NgFor, FormsModule, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-container *ngIf="vm$ | async">
      <div class="page" *ngIf="loading()">
        <div class="loading-state">
          <span class="material-symbols-outlined loading-icon">sync</span>
          <p>Cargando...</p>
        </div>
      </div>

      <div class="page" *ngIf="!loading()">
        <ng-container *ngIf="player() as p; else notFound">
          <header class="page-header">
            <button class="btn-back" (click)="goBack()">
              <span class="material-symbols-outlined">arrow_back</span>
            </button>
            <div>
              <h1 class="page-title">{{ p.first_name }} {{ p.last_name }}</h1>
              <div class="player-meta">
                <span class="meta-chip" *ngIf="p.jersey_number">#{{ p.jersey_number }}</span>
                <span class="meta-chip" *ngIf="p.position">{{ displayPosition() }}</span>
              </div>
            </div>
          </header>

          <div class="dashboard-grid">
            <section class="card">
              <h3 class="card-title">Equipos</h3>
              <div class="team-list" *ngIf="teams().length > 0">
                <div class="team-item" *ngFor="let t of teams()">
                  <span class="team-name">{{ t.teams.name }}</span>
                  <button class="btn-icon" (click)="removeTeam(t.team_id)">
                    <span class="material-symbols-outlined">close</span>
                  </button>
                </div>
              </div>
              <p class="empty-state" *ngIf="teams().length === 0">Sin equipos asignados.</p>
              <div class="add-team-row" *ngIf="availableTeams().length > 0">
                <select class="field-input" [(ngModel)]="selectedTeamId">
                  <option value="">Añadir a equipo...</option>
                  <option *ngFor="let t of availableTeams()" [value]="t.id">{{ t.name }}</option>
                </select>
                <button class="btn-add" (click)="addTeam()" [disabled]="!selectedTeamId()">Añadir</button>
              </div>
            </section>

            <section class="card">
              <h3 class="card-title">Evaluaciones</h3>
              <div class="eval-list" *ngIf="evaluations().length > 0">
                <div class="eval-item" *ngFor="let ev of evaluations()">
                  <div class="eval-header">
                    <span class="eval-date">{{ ev.date || (ev.created_at | date:'shortDate') }}</span>
                    <span class="eval-type" [class.external]="ev.type === 'external'">{{ ev.type === 'external' ? 'Externa' : 'Interna' }}</span>
                  </div>
                  <div class="eval-scores">
                    <div class="eval-score" *ngFor="let k of ratingKeys">
                      <span class="eval-score-val">{{ ev[k] ?? '—' }}</span>
                      <span class="eval-score-label">{{ ratingLabels[k] }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <p class="empty-state" *ngIf="evaluations().length === 0">Sin evaluaciones registradas.</p>
            </section>
          </div>
        </ng-container>

        <ng-template #notFound>
          <p class="empty-state">Jugador no encontrado.</p>
        </ng-template>
      </div>
    </ng-container>
  `,
  styles: [`
    .page { padding: 40px; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 32px; }
    .btn-back {
      background: #212653; border: none; color: #c6c5d4;
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0; transition: all 0.15s;
    }
    .btn-back:hover { background: #2a3160; color: #dfe0ff; }
    .page-title {
      font-size: 48px; font-weight: 800; letter-spacing: -0.02em;
      color: #dfe0ff; margin: 0 0 8px;
    }
    .player-meta { display: flex; gap: 8px; flex-wrap: wrap; }
    .meta-chip {
      font-size: 12px; color: #c6c5d4;
      background: rgba(189,194,255,0.08);
      padding: 4px 12px; border-radius: 9999px;
    }
    .dashboard-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
    }
    .card {
      background: #161b48; border-radius: 16px; padding: 24px;
      border: 1px solid rgba(69,70,82,0.2);
    }
    .card-title {
      font-size: 16px; font-weight: 700; color: #dfe0ff;
      margin: 0 0 20px;
    }
    .empty-state { color: #908f9d; font-size: 14px; text-align: center; padding: 24px; margin: 0; }
    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; }
    .loading-icon { font-size: 48px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-state p { margin: 0; font-size: 16px; }

    .team-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .team-item {
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(0,0,0,0.15); border-radius: 10px; padding: 10px 12px;
    }
    .team-name { font-size: 14px; font-weight: 600; color: #dfe0ff; }
    .btn-icon {
      background: none; border: none; color: #908f9d; cursor: pointer;
      width: 28px; height: 28px; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .btn-icon:hover { background: rgba(255,77,77,0.15); color: #ff5c5c; }
    .btn-icon .material-symbols-outlined { font-size: 16px; }

    .add-team-row { display: flex; gap: 8px; }
    .add-team-row .field-input {
      flex: 1; background: #111644; border: 1px solid rgba(69,70,82,0.3);
      color: #dfe0ff; border-radius: 8px; padding: 8px 12px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 13px; outline: none;
    }
    .add-team-row .field-input:focus { border-color: #bdc2ff; }
    .btn-add {
      padding: 8px 16px; border-radius: 8px; border: none;
      background: #0068ed; color: #f2f3ff;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 13px; font-weight: 600;
      cursor: pointer; white-space: nowrap; transition: opacity 0.15s;
    }
    .btn-add:hover { opacity: 0.9; }
    .btn-add:disabled { opacity: 0.35; cursor: default; }

    .eval-list { display: flex; flex-direction: column; gap: 8px; }
    .eval-item {
      background: rgba(0,0,0,0.15); border-radius: 10px; padding: 12px;
    }
    .eval-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .eval-date { font-size: 12px; color: #908f9d; }
    .eval-type {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      padding: 2px 8px; border-radius: 9999px;
      background: rgba(0,104,237,0.12); color: #bdc2ff;
    }
    .eval-scores { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .eval-score {
      display: flex; flex-direction: column; align-items: center;
      background: rgba(0,0,0,0.1); border-radius: 8px; padding: 6px 4px;
    }
    .eval-score-val { font-size: 16px; font-weight: 700; color: #dfe0ff; }
    .eval-score-label { font-size: 9px; color: #908f9d; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }

    @media (max-width: 768px) {
      .page { padding: 16px !important; }
      .page-title { font-size: 28px !important; }
      .dashboard-grid { grid-template-columns: 1fr !important; }
      .eval-scores { grid-template-columns: repeat(3, 1fr) !important; }
    }
    @media (max-width: 480px) {
      .page-title { font-size: 22px !important; }
      .add-team-row { flex-direction: column !important; }
    }
  `]
})
export class PlayerDashboardComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private data = inject(DataService);
  private playerRepo = inject(PlayerRepository);
  private supabase = inject(SupabaseService);

  player = signal<Player | null>(null);
  teams = signal<PlayerTeamWithTeam[]>([]);
  allClubTeams = signal<Team[]>([]);
  evaluations = signal<Evaluation[]>([]);
  loading = signal(true);
  selectedTeamId = signal('');

  ratingKeys: (keyof Evaluation)[] = ['shooting', 'dribbling', 'passing', 'defense', 'rebounding', 'iq', 'athleticism', 'teamwork', 'attitude'];
  ratingLabels: Record<string, string> = {
    shooting: 'Tiro', dribbling: 'Dribling', passing: 'Pase',
    defense: 'Defensa', rebounding: 'Rebote', iq: 'IQ',
    athleticism: 'Atletismo', teamwork: 'Trabajo eq.', attitude: 'Actitud',
  };

  displayPosition = (): string => {
    const p = this.player()?.position;
    if (!p) return '';
    const labels: Record<string, string> = {
      PG: 'Base', SG: 'Escolta', SF: 'Alero', PF: 'Ala-pívot', C: 'Pívot',
    };
    return labels[p] || p;
  };

  availableTeams = (): Team[] => {
    const assigned = this.teams();
    return this.allClubTeams().filter(t => !assigned.some(pt => pt.team_id === t.id));
  };

  private club$ = toObservable(this.data.currentClub).pipe(filter(Boolean));

  vm$ = this.club$.pipe(
    switchMap(club => {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) {
        this.loading.set(false);
        return of({});
      }
      return forkJoin({
        allPlayers: this.playerRepo.findByClub(club.id),
        teams: this.data.getTeams(),
        playerTeams: this.supabase.client
          .from('player_teams')
          .select('*, teams(*)')
          .eq('player_id', id),
        evaluations: this.supabase.client
          .from('evaluations')
          .select('*')
          .eq('player_id', id)
          .order('created_at', { ascending: false }),
      }).pipe(
        tap(({ allPlayers, teams, playerTeams, evaluations }) => {
          const foundPlayer = allPlayers.find(p => p.id === id);
          if (!foundPlayer) {
            this.loading.set(false);
            return;
          }
          this.player.set(foundPlayer);
          this.allClubTeams.set(teams);
          if (playerTeams.data) {
            this.teams.set(playerTeams.data as PlayerTeamWithTeam[]);
          }
          if (evaluations.data) {
            this.evaluations.set(evaluations.data as Evaluation[]);
          }
          this.loading.set(false);
        }),
        map(() => ({})),
      );
    }),
    startWith({}),
  );

  async removeTeam(teamId: string) {
    const id = this.player()?.id;
    if (!id) return;
    await this.supabase.client.from('player_teams').delete().eq('player_id', id).eq('team_id', teamId);
    this.teams.set(this.teams().filter(t => t.team_id !== teamId));
  }

  async addTeam() {
    const playerId = this.player()?.id;
    const teamId = this.selectedTeamId();
    if (!playerId || !teamId) return;
    if (this.teams().some(t => t.team_id === teamId)) return;

    const { data } = await this.supabase.client
      .from('player_teams')
      .insert({ player_id: playerId, team_id: teamId })
      .select('*, teams(*)')
      .single();
    if (data) {
      this.teams.set([...this.teams(), data as PlayerTeamWithTeam]);
    }
    this.selectedTeamId.set('');
  }

  goBack() {
    this.router.navigate(['/players']);
  }
}
