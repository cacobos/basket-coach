import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatchRepository } from '../repositories/match.repository';
import { DataService } from '../../../core/services/data.service';
import type { Match } from '../../../core/models/models';

@Component({
  selector: 'app-match-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <h1>Partidos</h1>
        <a routerLink="/matches/new" class="btn-primary">+ Nuevo Partido</a>
      </div>

      @if (loading()) {
        <div class="loading">Cargando partidos...</div>
      } @else if (matches().length === 0) {
        <div class="empty">
          <h3>No hay partidos registrados</h3>
          <p>Crea tu primer partido para empezar a analizar posesiones.</p>
          <a routerLink="/matches/new" class="btn-primary">Crear Partido</a>
        </div>
      } @else {
        <div class="match-grid">
          @for (match of matches(); track match.id) {
            <a [routerLink]="['/matches', match.id]" class="match-card">
              <div class="match-card__header">
                <span class="match-status" [class]="'status-' + match.status">
                  {{ statusLabel(match.status) }}
                </span>
                <span class="match-date">
                  @if (match.scheduled_time) {
                    {{ match.date | date:'dd/MM/yyyy' }} · {{ match.scheduled_time.slice(0,5) }} h
                  } @else {
                    {{ match.date | date:'dd/MM/yyyy' }}
                  }
                </span>
              </div>
              <div class="match-card__teams">
                <span class="team-name">{{ match.rival }}</span>
              </div>
              @if (match.status !== 'created') {
              <div class="match-card__score">
                <span class="score-value score-own">{{ match.score_own }}</span>
                <span class="score-sep">-</span>
                <span class="score-value score-rival">{{ match.score_rival }}</span>
              </div>
              }
              <div class="match-card__meta">
                <span>{{ match.competition || 'Sin competición' }}</span>
                @if (match.round) { <span>· Jornada {{ match.round }}</span> }
              </div>

            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-header h1 { font-size: 24px; font-weight: 700; margin: 0; }
    .btn-primary { background: #bdc2ff; color: #030737; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; transition: opacity 0.2s; }
    .btn-primary:hover { opacity: 0.9; }
    .loading { text-align: center; padding: 60px; color: var(--text-secondary); }
    .empty { text-align: center; padding: 80px 24px; }
    .empty h3 { margin: 0 0 8px; font-size: 18px; }
    .empty p { color: var(--text-secondary); margin: 0 0 24px; }
    .match-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .match-card {
      background: var(--bg-card); border-radius: 12px; padding: 20px;
      text-decoration: none; border: 1px solid var(--border-subtle);
      transition: all 0.2s; display: flex; flex-direction: column; gap: 8px;
    }
    .match-card:hover { border-color: rgba(189,194,255,0.3); transform: translateY(-2px); }
    .match-card__header { display: flex; justify-content: space-between; align-items: center; }
    .match-status { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
    .status-created { background: rgba(100,100,100,0.2); color: var(--text-secondary); }
    .status-in_progress { background: rgba(59,130,246,0.2); color: var(--color-own); }
    .status-finished { background: rgba(16,185,129,0.2); color: var(--color-pts-2); }
    .status-closed { background: rgba(100,100,100,0.2); color: var(--text-secondary); }
    .match-date { font-size: 13px; color: var(--text-secondary); }
    .team-name { font-size: 18px; font-weight: 700; }
    .match-card__score { display: flex; align-items: center; gap: 12px; font-size: 32px; font-weight: 800; }
    .score-value { }
    .score-own { color: var(--color-own); }
    .score-rival { color: var(--color-rival); }
    .score-sep { color: var(--text-secondary); }
    .match-card__meta { font-size: 13px; color: var(--text-secondary); }
  `]
})
export class MatchListPage {
  private repository = inject(MatchRepository);
  private dataService = inject(DataService);
  matches = signal<Match[]>([]);
  loading = signal(true);

  constructor() {
    this.tryLoadMatches();
  }

  private tryLoadMatches() {
    if (this.dataService.currentClub()) {
      this.loadMatches();
    } else {
      setTimeout(() => this.tryLoadMatches(), 100);
    }
  }

  private async loadMatches() {
    const club = this.dataService.currentClub();
    if (!club) return this.tryLoadMatches();
    try {
      const teams = await this.dataService.getTeams(club.id);
      if (teams.length > 0) {
        const allMatchPromises = teams.map(t => this.repository.findByTeam(t.id));
        const results = await Promise.all(allMatchPromises);
        this.matches.set(results.flat());
      }
    } catch { /* ignore */ } finally {
      this.loading.set(false);
    }
  }

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      created: 'Creado', in_progress: 'En vivo', finished: 'Finalizado', closed: 'Cerrado',
    };
    return map[status] || status;
  }
}
