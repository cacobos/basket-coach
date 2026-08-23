import { Component, inject, computed } from '@angular/core';
import { NgIf, NgFor, AsyncPipe } from '@angular/common';
import { AuthService } from '../../core/auth/auth.service';
import { DataService } from '../../core/services/data.service';
import { PlayerRepository } from '../../core/repositories/player.repository';
import { ExerciseRepository } from '../../core/repositories/exercise.repository';
import { SessionRepository } from '../../core/repositories/session.repository';
import { RouterLink } from '@angular/router';
import { forkJoin, from, of } from 'rxjs';
import { switchMap, filter, map, catchError } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgIf, NgFor, RouterLink, AsyncPipe],
  template: `
    <div class="dashboard">
      <header class="topbar">
        <div class="breadcrumb">
          <span class="crumb crumb-home">Home</span>
          <span class="material-symbols-outlined sep">chevron_right</span>
          <span class="crumb crumb-current">Dashboard</span>
        </div>
        <div class="topbar-actions">
          <div class="avatar-ring">
            <div class="avatar-placeholder">{{ greetInitial() }}</div>
          </div>
        </div>
      </header>

      <section class="content">
        <div class="content-inner" *ngIf="vm$ | async as vm; else loadingTpl">
          <div class="greeting">
            <h1 class="greeting-title">Coach Insights</h1>
            <p class="greeting-sub" *ngIf="auth.profile() as profile">@if (greetName()) {Bienvenido de nuevo, {{ greetName() }}. }@else {Bienvenido de nuevo. }Aquí está el resumen de hoy.</p>
          </div>

          <div class="grid-3">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Mis Equipos</h3>
                <a class="card-link" routerLink="/teams">Ver todos <span class="material-symbols-outlined">open_in_new</span></a>
              </div>
              <div class="card-body">
                <div class="team-item" *ngFor="let t of vm.teamSummaries">
                  <div class="team-info">
                    <h4 class="team-name">{{ t.name }}</h4>
                    <p class="team-meta">{{ t.count }} Jugadores</p>
                  </div>
                  <span class="material-symbols-outlined team-arrow">chevron_right</span>
                </div>
                <div class="empty-state-sml" *ngIf="vm.teamSummaries.length === 0">
                  <p>No hay equipos todavía.</p>
                  <a class="empty-cta" routerLink="/teams">Crear equipo</a>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Próximos Entrenamientos</h3>
                <span class="material-symbols-outlined card-header-icon">calendar_today</span>
              </div>
              <div class="card-body">
                <div class="timeline">
                  <div class="timeline-item" *ngFor="let s of vm.upcomingSessions">
                    <div class="timeline-dot" [class.muted-dot]="isTomorrow(s.date)"></div>
                    <div class="timeline-content">
                      <span class="timeline-time">{{ formatDate(s.date) }}, {{ s.start_time.slice(0,5) }}</span>
                      <h4 class="timeline-title">{{ s.title }}</h4>
                      <p class="timeline-meta">{{ vm.teamNames[s.team_id] || '—' }}{{ s.location ? ' • ' + s.location : '' }}</p>
                    </div>
                  </div>
                  <div class="empty-state-sml" *ngIf="vm.upcomingSessions.length === 0">
                    <p>No hay sesiones próximas.</p>
                    <a class="empty-cta" routerLink="/sessions">Planificar sesión</a>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Resumen</h3>
              </div>
              <div class="card-body">
                <div class="stats-grid">
                  <div class="stat-card">
                    <div class="stat-icon"><span class="material-symbols-outlined">groups</span></div>
                    <div>
                      <p class="stat-label">Equipos</p>
                      <p class="stat-value">{{ vm.teamSummaries.length }}</p>
                    </div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-icon"><span class="material-symbols-outlined">face</span></div>
                    <div>
                      <p class="stat-label">Jugadores</p>
                      <p class="stat-value">{{ vm.totalPlayers }}</p>
                    </div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-icon"><span class="material-symbols-outlined">fitness_center</span></div>
                    <div>
                      <p class="stat-label">Ejercicios</p>
                      <p class="stat-value">{{ vm.totalExercises }}</p>
                    </div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-icon"><span class="material-symbols-outlined">calendar_month</span></div>
                    <div>
                      <p class="stat-label">Sesiones</p>
                      <p class="stat-value">{{ vm.totalSessions }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="chart-card">
            <div class="chart-header">
              <h3 class="card-title">Actividad Reciente</h3>
              <p class="chart-sub">{{ vm.recentSessions.length }} sesiones en los últimos 30 días.</p>
            </div>
            <div class="chart-bars">
              <div class="bar" *ngFor="let b of vm.chartBars" [style.height]="b + '%'"></div>
            </div>
            <div class="chart-axis"></div>
          </div>
        </div>
      </section>
    </div>

    <ng-template #loadingTpl>
      <div class="content" style="padding: 40px;">
        <div class="content-inner">
          <div class="loading-state" style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d;">
            <span class="material-symbols-outlined" style="font-size: 48px; animation: spin 1s linear infinite;">sync</span>
            <p style="margin: 0; font-size: 16px;">Cargando dashboard...</p>
          </div>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .dashboard { display: flex; flex-direction: column; min-height: 100%; background: #080d3c; }
    .topbar {
      display: flex; justify-content: space-between; align-items: center; height: 64px;
      padding: 0 40px; position: sticky; top: 0; z-index: 40;
      background: rgba(8,13,60,0.8); backdrop-filter: blur(12px); border-bottom: 1px solid #454652;
    }
    .breadcrumb { display: flex; align-items: center; gap: 8px; }
    .crumb { font-family: 'Hanken Grotesk', sans-serif; font-size: 16px; line-height: 24px; }
    .crumb-home { color: #c6c5d4; opacity: 0.6; }
    .crumb-current { color: #bdc2ff; font-weight: 700; }
    .sep { font-size: 12px; color: #c6c5d4; }
    .topbar-actions { display: flex; align-items: center; gap: 16px; }
    .avatar-ring {
      width: 32px; height: 32px; border-radius: 50%; border: 2px solid #bdc2ff;
      overflow: hidden; display: flex; align-items: center; justify-content: center;
    }
    .avatar-placeholder {
      width: 100%; height: 100%; background: rgba(189,194,255,0.15);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 12px; color: #bdc2ff; text-transform: uppercase;
    }
    .content { flex: 1; overflow-y: auto; padding: 40px; }
    .content-inner { max-width: 1440px; margin: 0 auto; }
    .greeting { margin-bottom: 40px; }
    .greeting-title { font-family: 'Hanken Grotesk', sans-serif; font-size: 48px; line-height: 56px; font-weight: 800; letter-spacing: -0.02em; color: #dfe0ff; }
    .greeting-sub { font-family: 'Hanken Grotesk', sans-serif; font-size: 18px; line-height: 28px; color: #c6c5d4; margin-top: 4px; }
    .grid-3 { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; }
    .card { background: #161b48; border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.3); border: 1px solid rgba(69,70,82,0.3); }
    .card-header { display: flex; justify-content: space-between; align-items: center; }
    .card-title { font-family: 'Hanken Grotesk', sans-serif; font-size: 24px; line-height: 32px; font-weight: 700; color: #dfe0ff; margin: 0; }
    .card-link { background: none; border: none; color: #bdc2ff; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; line-height: 20px; font-weight: 600; letter-spacing: 0.05em; display: flex; align-items: center; gap: 4px; cursor: pointer; text-decoration: none; }
    .card-link:hover { text-decoration: underline; }
    .card-link .material-symbols-outlined { font-size: 14px; }
    .card-header-icon { color: #bdc2ff; font-size: 20px; }
    .card-body { display: flex; flex-direction: column; gap: 16px; flex: 1; }
    .team-item { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 4px solid #0068ed; cursor: pointer; transition: all 0.2s; }
    .team-item:hover { background: rgba(255,255,255,0.08); }
    .team-info h4 { font-weight: 700; color: #dfe0ff; margin: 0; }
    .team-meta { font-size: 12px; color: #c6c5d4; margin: 0; }
    .team-arrow { color: #c6c5d4; opacity: 0.4; font-size: 20px; }
    .timeline { position: relative; padding-left: 32px; }
    .timeline::before { content: ''; position: absolute; left: 11px; top: 8px; bottom: 8px; width: 2px; background: #454652; }
    .timeline-item { position: relative; margin-bottom: 24px; }
    .timeline-item:last-child { margin-bottom: 0; }
    .timeline-dot { position: absolute; left: -27px; top: 6px; width: 12px; height: 12px; border-radius: 50%; background: #bdc2ff; box-shadow: 0 0 0 4px #161b48; }
    .muted-dot { background: #454652; }
    .timeline-content { display: flex; flex-direction: column; gap: 4px; }
    .timeline-time { font-size: 12px; font-weight: 700; color: #bdc2ff; text-transform: uppercase; letter-spacing: -0.02em; }
    .timeline-title { font-weight: 700; color: #dfe0ff; margin: 0; }
    .timeline-meta { font-size: 12px; color: #c6c5d4; margin: 0; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; }
    .stat-card { background: #212653; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px; border: 1px solid rgba(255,255,255,0.05); transition: border-color 0.2s; }
    .stat-card:hover { border-color: rgba(189,194,255,0.5); }
    .stat-icon { width: 32px; height: 32px; border-radius: 50%; background: rgba(189,194,255,0.1); display: flex; align-items: center; justify-content: center; }
    .stat-icon .material-symbols-outlined { font-size: 14px; color: #bdc2ff; }
    .stat-label { font-size: 12px; color: #c6c5d4; font-weight: 500; margin: 0; }
    .stat-value { font-size: 28px; font-weight: 700; color: #dfe0ff; margin: 0; }
    .chart-card { margin-top: 24px; background: #161b48; border-radius: 12px; padding: 24px; height: 256px; position: relative; overflow: hidden; border: 1px solid rgba(69,70,82,0.3); }
    .chart-header { position: relative; z-index: 10; display: flex; flex-direction: column; gap: 8px; }
    .chart-sub { color: #c6c5d4; font-size: 14px; margin: 0; }
    .chart-bars { position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: space-around; padding: 0 40px 32px; opacity: 0.4; }
    .bar { width: 48px; background: #bdc2ff; border-radius: 8px 8px 0 0; transition: height 0.7s; }
    .chart-axis { position: absolute; bottom: 0; left: 0; width: 100%; height: 2px; background: #454652; }
    .empty-state-sml { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    .empty-state-sml p { color: #908f9d; font-size: 13px; text-align: center; margin: 0; }
    .empty-cta {
      color: #bdc2ff; font-size: 13px; font-weight: 600;
      text-decoration: underline; text-underline-offset: 3px;
    }
    .empty-cta:hover { color: #dfe0ff; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 768px) {
      .content { padding: 20px !important; }
      .greeting-title { font-size: 32px !important; line-height: 40px !important; }
      .greeting-sub { font-size: 15px !important; }
      .grid-3 { grid-template-columns: 1fr !important; }
      .page-title { font-size: 32px !important; }
      .topbar { padding: 0 20px !important; }
      .stats-grid { grid-template-columns: 1fr 1fr !important; }
    }
    @media (max-width: 480px) {
      .content { padding: 16px !important; }
      .greeting-title { font-size: 26px !important; }
      .topbar { padding: 0 16px !important; height: 56px !important; }
      .stats-grid { grid-template-columns: 1fr !important; }
      .chart-card { height: 180px !important; }
      .bar { width: 24px !important; }
    }
  `]
})
export class DashboardComponent {
  auth = inject(AuthService);
  private data = inject(DataService);
  private playerRepo = inject(PlayerRepository);
  private exerciseRepo = inject(ExerciseRepository);
  private sessionRepo = inject(SessionRepository);

  readonly greetName = computed(() => {
    const name = (this.auth.profile()?.full_name || '').trim();
    return name && !name.includes('@') ? name : null;
  });

  greetInitial(): string {
    const name = this.greetName();
    if (name) return name.charAt(0).toUpperCase();
    const email = this.auth.profile()?.email || '';
    return email ? email.charAt(0).toUpperCase() : 'C';
  }

  readonly vm$ = toObservable(this.data.currentClub).pipe(
    filter(Boolean),
    switchMap(club => forkJoin({
      teams: from(this.data.getTeams()),
      sessions: from(this.sessionRepo.findAll(club.id)),
      exercises: from(this.exerciseRepo.findAll(club.id)),
    }).pipe(
      switchMap(({ teams, sessions, exercises }) => {
        if (teams.length === 0) {
          const today = new Date();
          return of({
            teamSummaries: [] as { name: string; count: number }[],
            teamNames: {} as Record<string, string>,
            upcomingSessions: [] as any[],
            recentSessions: [] as any[],
            totalPlayers: 0,
            totalExercises: exercises.length,
            totalSessions: sessions.length,
            chartBars: Array.from({ length: 7 }, () => Math.floor(Math.random() * 60) + 20),
          });
        }
        return forkJoin(teams.map(t => from(this.playerRepo.findAll(t.id)))).pipe(
          map(results => {
            const teamSummaries = teams.map((t, i) => ({ name: t.name, count: results[i].length }));
            const teamNames: Record<string, string> = Object.fromEntries(teams.map(t => [t.id, t.name]));
            const today = new Date();
            const upcomingSessions = sessions
              .filter(s => new Date(s.date) >= today)
              .slice(0, 5);
            const recentSessions = sessions
              .filter(s => {
                const d = new Date(s.date);
                return d >= new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
              });
            return {
              teamSummaries,
              teamNames,
              upcomingSessions,
              recentSessions,
              totalPlayers: teamSummaries.reduce((a, b) => a + b.count, 0),
              totalExercises: exercises.length,
              totalSessions: sessions.length,
              chartBars: Array.from({ length: 7 }, () => Math.floor(Math.random() * 60) + 20),
            };
          })
        );
      }),
      catchError(() => of({
        teamSummaries: [],
        teamNames: {} as Record<string, string>,
        upcomingSessions: [],
        recentSessions: [],
        totalPlayers: 0,
        totalExercises: 0,
        totalSessions: 0,
        chartBars: [],
      }))
    ))
  );

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Hoy';
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return 'Mañana';
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  isTomorrow(dateStr: string): boolean {
    const d = new Date(dateStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d.toDateString() === tomorrow.toDateString();
  }
}
