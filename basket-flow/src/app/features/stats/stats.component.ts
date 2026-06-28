import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h2 class="page-title">Estadísticas</h2>
          <p class="page-sub">Analítica avanzada de rendimiento por equipo y jugador.</p>
        </div>
      </header>

      <div class="filter-row" style="margin-bottom:24px">
        <div class="select-wrap">
          <select class="select-input" [(ngModel)]="selectedTeam" (change)="loadGames()">
            <option value="">Todos los equipos</option>
            <option *ngFor="let t of teams" [value]="t.id">{{ t.name }}</option>
          </select>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <h3 class="sc-title">Partidos</h3>
          <p class="sc-big">{{ games.length }}</p>
          <div class="sc-bar"><div class="sc-fill" [style.width]="'100%'"></div></div>
          <p class="sc-label">Total registrados</p>
        </div>
        <div class="stat-card">
          <h3 class="sc-title">Victorias</h3>
          <p class="sc-big">{{ wins }}</p>
          <div class="sc-bar"><div class="sc-fill" [style.width]="winPct + '%'"></div></div>
          <p class="sc-label">{{ winPct }}% de victorias</p>
        </div>
        <div class="stat-card">
          <h3 class="sc-title">Puntos Favor</h3>
          <p class="sc-big">{{ avgPointsFor }}</p>
          <div class="sc-bar"><div class="sc-fill" [style.width]="'70%'"></div></div>
          <p class="sc-label">Promedio por partido</p>
        </div>
        <div class="stat-card">
          <h3 class="sc-title">Puntos Contra</h3>
          <p class="sc-big">{{ avgPointsAgainst }}</p>
          <div class="sc-bar"><div class="sc-fill" [style.width]="'60%'"></div></div>
          <p class="sc-label">Promedio por partido</p>
        </div>
      </div>

      <div class="table-section" *ngIf="playerStats.length > 0">
        <h3 class="table-title">Líderes</h3>
        <table class="stats-table">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Equipo</th>
              <th>PPP</th>
              <th>RPP</th>
              <th>APP</th>
              <th>PJ</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of playerStats">
              <td class="td-name">{{ p.name }}</td>
              <td>{{ p.teamName }}</td>
              <td>{{ p.ppg }}</td>
              <td>{{ p.rpg }}</td>
              <td>{{ p.apg }}</td>
              <td>{{ p.games }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 40px; max-width: 1440px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 48px; }
    .page-title { font-size: 48px; line-height: 56px; font-weight: 800; letter-spacing: -0.02em; color: #dfe0ff; margin: 0; }
    .page-sub { font-size: 18px; line-height: 28px; color: #c6c5d4; margin: 4px 0 0; }
    .filter-row { display: flex; gap: 12px; }
    .select-wrap { position: relative; display: flex; align-items: center; }
    .select-input { background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff; border-radius: 12px; padding: 10px 16px; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none; cursor: pointer; min-width: 200px; }
    .select-input:focus { border-color: #bdc2ff; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; margin-bottom: 32px; }
    .stat-card { background: #161b48; border-radius: 12px; padding: 20px; border: 1px solid rgba(69,70,82,0.2); }
    .sc-title { font-size: 12px; color: #c6c5d4; font-weight: 600; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }
    .sc-big { font-size: 36px; font-weight: 800; color: #dfe0ff; margin: 0 0 12px; }
    .sc-bar { height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
    .sc-fill { height: 100%; background: #bdc2ff; border-radius: 2px; }
    .sc-label { font-size: 11px; color: #908f9d; margin: 0; }
    .table-section { background: #161b48; border-radius: 12px; padding: 24px; border: 1px solid rgba(69,70,82,0.2); }
    .table-title { font-size: 20px; font-weight: 700; color: #dfe0ff; margin: 0 0 16px; }
    .stats-table { width: 100%; border-collapse: collapse; }
    .stats-table th { text-align: left; padding: 12px 8px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #908f9d; border-bottom: 1px solid rgba(69,70,82,0.3); }
    .stats-table td { padding: 12px 8px; font-size: 14px; color: #dfe0ff; border-bottom: 1px solid rgba(69,70,82,0.1); }
    .stats-table tr:last-child td { border-bottom: none; }
    .td-name { font-weight: 600; }
    .stats-table tbody tr:hover td { color: #bdc2ff; }
    @media (max-width: 768px) {
      .page { padding: 20px !important; }
      .page-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
      .page-title { font-size: 28px !important; line-height: 36px !important; }
      .page-sub { font-size: 14px !important; }
      .filter-row { flex-direction: column !important; }
      .select-input { min-width: 100% !important; }
      .stats-grid { grid-template-columns: 1fr 1fr !important; }
      .table-section { overflow-x: auto !important; }
    }
    @media (max-width: 480px) {
      .page { padding: 12px !important; }
      .page-title { font-size: 22px !important; }
      .stats-grid { grid-template-columns: 1fr !important; }
    }
  `]
})
export class StatsComponent implements OnInit {
  private data = inject(DataService);
  private cdr = inject(ChangeDetectorRef);

  teams: any[] = [];
  games: any[] = [];
  selectedTeam = '';
  wins = 0;
  winPct = 0;
  avgPointsFor = '—';
  avgPointsAgainst = '—';
  playerStats: { name: string; teamName: string; ppg: string; rpg: string; apg: string; games: number }[] = [];

  async ngOnInit() {
    while (!this.data.currentClub()) {
      await new Promise(r => setTimeout(r, 50));
    }
    this.teams = await this.data.getTeams();
    await this.loadGames();
    this.cdr.detectChanges();
  }

  async loadGames() {
    if (this.selectedTeam) {
      this.games = await this.data.getGames(this.selectedTeam);
    } else {
      const all: any[] = [];
      for (const t of this.teams) {
        const g = await this.data.getGames(t.id);
        all.push(...g);
      }
      this.games = all;
    }

    const scored = this.games.filter(g => g.our_score !== null && g.opponent_score !== null);
    this.wins = scored.filter(g => g.our_score > g.opponent_score).length;
    this.winPct = scored.length ? Math.round((this.wins / scored.length) * 100) : 0;
    this.avgPointsFor = scored.length ? (scored.reduce((a: number, g: any) => a + g.our_score, 0) / scored.length).toFixed(1) : '—';
    this.avgPointsAgainst = scored.length ? (scored.reduce((a: number, g: any) => a + g.opponent_score, 0) / scored.length).toFixed(1) : '—';

    const allPlayers = await this.data.getPlayers();
    const teamNames: Record<string, string> = {};
    this.teams.forEach((t: any) => teamNames[t.id] = t.name);

    const agg: Record<string, { pts: number; reb: number; ast: number; games: Set<string>; player: any }> = {};
    for (const g of this.games) {
      const pgs = await this.data.getPlayerGameStats(g.id);
      for (const pg of pgs) {
        if (!agg[pg.player_id]) {
          agg[pg.player_id] = { pts: 0, reb: 0, ast: 0, games: new Set(), player: allPlayers.find(p => p.id === pg.player_id) };
        }
        agg[pg.player_id].pts += pg.points;
        agg[pg.player_id].reb += pg.rebounds;
        agg[pg.player_id].ast += pg.assists;
        agg[pg.player_id].games.add(g.id);
      }
    }

    this.playerStats = Object.entries(agg).map(([id, a]) => ({
      name: a.player ? `${a.player.first_name} ${a.player.last_name}` : '—',
      teamName: a.player ? (teamNames[a.player.team_id] || '—') : '—',
      ppg: (a.pts / (a.games.size || 1)).toFixed(1),
      rpg: (a.reb / (a.games.size || 1)).toFixed(1),
      apg: (a.ast / (a.games.size || 1)).toFixed(1),
      games: a.games.size,
    })).sort((a, b) => +b.ppg - +a.ppg).slice(0, 10);
  }
}
