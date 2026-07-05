import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MatchService } from '../services/match.service';
import { MatchStore } from '../store/match.store';
import { ConfigurationService } from '../services/configuration.service';
import type { Possession } from '../../../core/models/models';

@Component({
  selector: 'app-match-detail',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page">
      @if (loading()) {
        <div class="loading">Cargando partido...</div>
      } @else if (store.match(); as match) {
        <div class="header">
          <a routerLink="/matches" class="btn-back">
            <span class="material-symbols-outlined">arrow_back</span>
            Partidos
          </a>
          <div class="header-actions">
            @if (match.status === 'created') {
              <button class="btn-primary" (click)="startMatch()">Iniciar Partido</button>
              <button class="btn-danger" (click)="deleteMatch()">Eliminar</button>
            }
            @if (match.status === 'in_progress') {
              <a [routerLink]="['/matches', match.id, 'live']" class="btn-primary">Ir a Directo</a>
            }
            @if (match.status === 'finished' || match.status === 'closed') {
              <a [routerLink]="['/matches', match.id, 'live']" class="btn-primary">Ver Posesiones</a>
            }
          </div>
        </div>

        <div class="match-hero">
          <div class="match-hero__info">
            <span class="match-status" [class]="'status-' + match.status">{{ statusLabel(match.status) }}</span>
            <h1>{{ match.rival }}</h1>
            <p class="match-meta">
              {{ match.date | date:'fullDate' }} ·
              {{ match.competition || 'Sin competición' }}
              {{ match.round ? '· Jornada ' + match.round : '' }}
            </p>
          </div>

          <div class="match-hero__score">
            <div class="score-display">
              <span class="score-value score-own">{{ store.score().own }}</span>
              <span class="score-sep">-</span>
              <span class="score-value score-rival">{{ store.score().rival }}</span>
            </div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-value">{{ store.possessionCount().own }}</span>
            <span class="kpi-label">Posesiones propias</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-value">{{ store.possessionCount().rival }}</span>
            <span class="kpi-label">Posesiones rival</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-value">{{ store.ppp() }}</span>
            <span class="kpi-label">PPP</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-value">{{ store.score().own - store.score().rival > 0 ? '+' + (store.score().own - store.score().rival) : store.score().own - store.score().rival }}</span>
            <span class="kpi-label">Diferencia</span>
          </div>
        </div>

        <div class="detail-grid">
          <div class="card">
            <h3>Eficiencia por sistema</h3>
            @for (s of systemStats(); track s.name) {
              <div class="stat-bar-row">
                <span class="stat-bar-label">{{ s.name }}</span>
                <div class="stat-bar-track">
                  <div class="stat-bar-fill" [style.width.%]="s.pct" [style.background]="s.color"></div>
                </div>
                <span class="stat-bar-value">{{ s.ppp }} PPP</span>
                <span class="stat-bar-count">{{ s.count }} pos</span>
              </div>
            }
            @if (systemStats().length === 0) {
              <div class="card-empty">Sin datos de sistemas</div>
            }
          </div>

          <div class="card">
            <h3>Eficiencia por ataque</h3>
            @for (a of attackStats(); track a.name) {
              <div class="stat-bar-row">
                <span class="stat-bar-label">{{ a.name }}</span>
                <div class="stat-bar-track">
                  <div class="stat-bar-fill" [style.width.%]="a.pct" [style.background]="a.color"></div>
                </div>
                <span class="stat-bar-value">{{ a.ppp }} PPP</span>
                <span class="stat-bar-count">{{ a.count }} pos</span>
              </div>
            }
            @if (attackStats().length === 0) {
              <div class="card-empty">Sin datos de ataque</div>
            }
          </div>

          <div class="card card-full">
            <h3>Todas las posesiones</h3>
            @if (store.possessions().length === 0) {
              <div class="card-empty">
                @if (match.status === 'in_progress') {
                  <a [routerLink]="['/matches', match.id, 'live']" class="btn-primary">Registrar primera posesión</a>
                } @else {
                  <p>No hay posesiones registradas.</p>
                }
              </div>
            } @else {
              <div class="possession-list">
                @for (p of store.possessions().slice().reverse(); track p.id) {
                  <div class="pl-item" [class.pl-own]="p.side === 'own'" [class.pl-rival]="p.side === 'rival'">
                    <span class="pl-indicator"></span>
                    <span class="pl-num">#{{ p.number }}</span>
                    <span class="pl-side">{{ p.side === 'own' ? 'PRO' : 'RIV' }}</span>
                    <span class="pl-init">{{ getInitName(p.init_type_id) }}</span>
                    <span class="pl-result">{{ getResultName(p.result_id) }}</span>
                    @if (p.points > 0) {
                      <span class="pl-pts">+{{ p.points }}</span>
                    }
                    <span class="pl-time">{{ p.time_bucket }}s</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .loading { text-align: center; padding: 60px; color: var(--text-secondary); }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .btn-back { color: var(--text-secondary); text-decoration: none; font-size: 14px; display: flex; align-items: center; gap: 4px; }
    .btn-back:hover { color: var(--text-primary); }
    .btn-back .material-symbols-outlined { font-size: 18px; }
    .header-actions { display: flex; gap: 8px; }
    .btn-primary { background: #bdc2ff; color: #030737; padding: 8px 16px; border-radius: 8px; border: none; font-weight: 600; font-size: 13px; cursor: pointer; text-decoration: none; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-danger { background: rgba(239,68,68,0.15); color: #fca5a5; padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(239,68,68,0.25); font-weight: 600; font-size: 13px; cursor: pointer; }
    .btn-danger:hover { background: rgba(239,68,68,0.25); }

    .match-hero { display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border-radius: 16px; padding: 28px 32px; margin-bottom: 20px; border: 1px solid var(--border-subtle); }
    .match-hero h1 { font-size: 26px; margin: 6px 0; font-weight: 700; }
    .match-meta { color: var(--text-secondary); font-size: 13px; margin: 0; }
    .match-status { font-size: 10px; font-weight: 600; padding: 2px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; }
    .status-created { background: rgba(100,100,100,0.15); color: var(--text-secondary); }
    .status-in_progress { background: rgba(59,130,246,0.15); color: var(--color-own); }
    .status-finished { background: rgba(16,185,129,0.15); color: var(--color-pts-2); }
    .score-display { display: flex; align-items: center; gap: 16px; }
    .score-value { font-size: 52px; font-weight: 800; line-height: 1; }
    .score-own { color: var(--color-own); }
    .score-rival { color: var(--color-rival); }
    .score-sep { font-size: 32px; color: var(--text-secondary); font-weight: 300; }

    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .kpi-card { background: var(--bg-card); border-radius: 12px; padding: 18px; text-align: center; border: 1px solid var(--border-subtle); }
    .kpi-value { font-size: 26px; font-weight: 700; margin-bottom: 4px; }
    .kpi-label { font-size: 11px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card { background: var(--bg-card); border-radius: 12px; padding: 18px; border: 1px solid var(--border-subtle); }
    .card-full { grid-column: 1 / -1; }
    .card h3 { font-size: 14px; font-weight: 600; margin: 0 0 12px; }
    .card-empty { padding: 24px; text-align: center; color: var(--text-secondary); font-size: 13px; }

    .stat-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .stat-bar-label { width: 80px; font-size: 12px; font-weight: 500; flex-shrink: 0; }
    .stat-bar-track { flex: 1; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; }
    .stat-bar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
    .stat-bar-value { width: 48px; text-align: right; font-size: 11px; font-weight: 600; color: #bdc2ff; }
    .stat-bar-count { width: 36px; text-align: right; font-size: 10px; color: var(--text-secondary); }

    .possession-list { display: flex; flex-direction: column; gap: 3px; max-height: 400px; overflow-y: auto; }
    .pl-item { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 6px; font-size: 12px; }
    .pl-own { background: rgba(59,130,246,0.04); }
    .pl-rival { background: rgba(239,68,68,0.04); }
    .pl-indicator { width: 3px; height: 20px; border-radius: 2px; flex-shrink: 0; }
    .pl-own .pl-indicator { background: var(--color-own); }
    .pl-rival .pl-indicator { background: var(--color-rival); }
    .pl-num { font-weight: 700; color: var(--text-secondary); min-width: 24px; }
    .pl-side { font-weight: 600; font-size: 10px; text-transform: uppercase; min-width: 28px; }
    .pl-own .pl-side { color: var(--color-own); }
    .pl-rival .pl-side { color: var(--color-rival); }
    .pl-init { color: var(--text-secondary); }
    .pl-result { flex: 1; }
    .pl-pts { font-weight: 700; color: var(--color-pts-2); }
    .pl-time { color: var(--text-secondary); font-size: 10px; }

    @media (max-width: 700px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .detail-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class MatchDetailPage {
  private route = inject(ActivatedRoute);
  private matchService = inject(MatchService);
  configService = inject(ConfigurationService);
  store = inject(MatchStore);

  loading = signal(true);

  systemStats = computed(() => {
    const possessions = this.store.ownPossessions();
    const groups = new Map<string, { count: number; points: number }>();
    for (const p of possessions) {
      if (!p.system_id) continue;
      const g = groups.get(p.system_id) || { count: 0, points: 0 };
      g.count++;
      g.points += p.points;
      groups.set(p.system_id, g);
    }
    const maxPpp = Math.max(...Array.from(groups.values()).map(g => g.points / g.count), 0.01);
    return Array.from(groups.entries()).map(([id, g]) => {
      const sys = this.configService.systems().find(s => s.id === id);
      const ppp = +(g.points / g.count).toFixed(2);
      return { name: sys?.name || id.slice(0, 6), ppp, count: g.count, pct: Math.round((ppp / maxPpp) * 100), color: sys?.color || '#6366f1' };
    }).sort((a, b) => b.ppp - a.ppp);
  });

  attackStats = computed(() => {
    const possessions = this.store.ownPossessions();
    const groups = new Map<string, { count: number; points: number }>();
    for (const p of possessions) {
      const g = groups.get(p.attack_type_id) || { count: 0, points: 0 };
      g.count++;
      g.points += p.points;
      groups.set(p.attack_type_id, g);
    }
    const maxPpp = Math.max(...Array.from(groups.values()).map(g => g.points / g.count), 0.01);
    return Array.from(groups.entries()).map(([id, g]) => {
      const at = this.configService.attackTypes().find(a => a.id === id);
      const ppp = +(g.points / g.count).toFixed(2);
      return { name: at?.name || id.slice(0, 6), ppp, count: g.count, pct: Math.round((ppp / maxPpp) * 100), color: at?.color || '#6366f1' };
    }).sort((a, b) => b.ppp - a.ppp);
  });

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.loadMatch(id);
    });
  }

  private async loadMatch(id: string) {
    this.loading.set(true);
    await this.matchService.loadMatch(id);
    this.loading.set(false);
  }

  async startMatch() {
    const match = this.store.match();
    if (!match) return;
    await this.matchService.startMatch(match.id);
  }

  async deleteMatch() {
    const match = this.store.match();
    if (!match || !confirm('¿Eliminar este partido y todas sus posesiones?')) return;
    await this.matchService.deleteMatch(match.id);
  }

  statusLabel(status: string): string {
    return ({ created: 'Creado', in_progress: 'En vivo', finished: 'Finalizado', closed: 'Cerrado' })[status] || status;
  }

  getResultName(resultId: string): string {
    return this.configService.getResultName(resultId) || resultId.slice(0, 8);
  }

  getInitName(initId: string): string {
    return this.configService.initTypes().find(i => i.id === initId)?.name || initId.slice(0, 4);
  }
}
