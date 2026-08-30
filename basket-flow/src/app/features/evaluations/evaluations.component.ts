import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, SlicePipe } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { SessionRepository } from '../../core/repositories/session.repository';
import type { TrainingSession, Team, Attendance } from '../../core/models/models';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import { from, forkJoin, of, combineLatest } from 'rxjs';
import { map, switchMap, filter, catchError, startWith } from 'rxjs/operators';

interface SessionEval {
  session: TrainingSession;
  team: string;
  attendance: { present: number; late: number; absent: number; excused: number; injured: number; total: number };
  reviewCount: number;
}

@Component({
  selector: 'app-evaluations',
  standalone: true,
  imports: [AsyncPipe, SlicePipe, EmptyStateComponent],
  template: `
    @if (vm$ | async; as vm) {
      <div class="page">
      <header class="page-header">
        <div>
          <h2 class="page-title">Evaluar Sesiones</h2>
          <p class="page-sub">Sesiones completadas pendientes de an&aacute;lisis y valoraci&oacute;n.</p>
        </div>
        <select class="select-input" [value]="selectedTeam()" (change)="selectedTeam.set($any($event.target).value)">
          <option value="">Todos los equipos</option>
          @for (t of vm.teams; track t.id) {
            <option [value]="t.id">{{ t.name }}</option>
          }
        </select>
      </header>

      @if (vm.loading) {
        <div class="loading-state"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando sesiones...</p></div>
      } @else if (vm.filtered.length === 0) {
        <app-empty-state
          icon="fact_check"
          title="No hay sesiones completadas para evaluar"
          hint="Completa un entrenamiento para que aparezca aqu&iacute;."
        />
      } @else {
        <div class="session-list">
          @for (item of vm.filtered; track item.session.id) {
            <div class="session-card">
              <div class="session-date">
                <span class="session-day">{{ item.session.date | slice:8:10 }}</span>
                <span class="session-month">{{ monthNames[+item.session.date.slice(5,7) - 1] }}</span>
              </div>
              <div class="session-info">
                <h3 class="session-name">{{ item.session.title }}</h3>
                <div class="session-meta">
                  <span><span class="material-symbols-outlined">schedule</span>{{ item.session.start_time.slice(0,5) }} - {{ item.session.end_time.slice(0,5) }}</span>
                  <span><span class="material-symbols-outlined">groups</span>{{ item.team }}</span>
                  @if (item.session.objectives) {
                    <span class="meta-objectives">{{ item.session.objectives }}</span>
                  }
                </div>
                <div class="session-badges">
                  <span class="badge badge-attendance">
                    <span class="material-symbols-outlined">check_circle</span>
                    {{ item.attendance.present + item.attendance.late }}/{{ item.attendance.total }} asistentes
                  </span>
                  @if (item.attendance.late > 0) {
                    <span class="badge badge-late">
                      <span class="material-symbols-outlined">watch_later</span>
                      {{ item.attendance.late }} retraso{{ item.attendance.late !== 1 ? 's' : '' }}
                    </span>
                  }
                  @if (item.session.intensity || item.session.focus) {
                    <span class="badge badge-eval">
                      <span class="material-symbols-outlined">star</span>
                      {{ item.session.intensity ?? '&mdash;' }}/{{ item.session.focus ?? '&mdash;' }}
                    </span>
                  }
                  @if (item.reviewCount > 0) {
                    <span class="badge badge-review">
                      <span class="material-symbols-outlined">assignment</span>
                      {{ item.reviewCount }} valorac{{ item.reviewCount !== 1 ? 'iones' : 'i&oacute;n' }}
                    </span>
                  }
                </div>
              </div>
              <button class="btn-eval" (click)="go(item.session.id)">
                <span class="material-symbols-outlined">play_arrow</span>
                Evaluar
              </button>
            </div>
          }
        </div>
      }
      </div>
    }
  `,
  styles: [`
    .page { padding: 40px; max-width: 1440px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 48px; }
    .page-title { font-size: 48px; line-height: 56px; font-weight: 800; letter-spacing: -0.02em; color: #dfe0ff; margin: 0; }
    .page-sub { font-size: 18px; line-height: 28px; color: #c6c5d4; margin: 4px 0 0; }
    .select-input {
      background: #111644; border: 1px solid rgba(69,70,82,0.3);
      color: #dfe0ff; border-radius: 12px; padding: 12px 16px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px;
      outline: none; cursor: pointer; min-width: 200px;
    }
    .select-input:focus { border-color: #bdc2ff; }
    .loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; }
    .loading-icon, .empty-icon { font-size: 48px; }
    .loading-icon { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state p { margin: 0; font-size: 16px; }
    .empty-hint { font-size: 13px; color: #6b6a78; }
    .session-list { display: flex; flex-direction: column; gap: 8px; }
    .session-card {
      display: flex; align-items: center; gap: 20px;
      background: #161b48; border-radius: 12px; padding: 16px 20px;
      border: 1px solid rgba(69,70,82,0.2); transition: all 0.2s;
    }
    .session-card:hover { background: #212653; border-color: rgba(69,70,82,0.4); }
    .session-date {
      display: flex; flex-direction: column; align-items: center;
      min-width: 56px; padding: 8px 12px;
      background: rgba(189,194,255,0.1); border-radius: 10px;
    }
    .session-day { font-size: 24px; font-weight: 800; color: #bdc2ff; line-height: 1; }
    .session-month { font-size: 10px; color: #c6c5d4; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
    .session-info { flex: 1; min-width: 0; }
    .session-name { font-size: 18px; font-weight: 700; color: #dfe0ff; margin: 0 0 8px; }
    .session-meta { display: flex; gap: 16px; font-size: 12px; color: #c6c5d4; flex-wrap: wrap; margin-bottom: 8px; }
    .session-meta span { display: flex; align-items: center; gap: 4px; }
    .session-meta .material-symbols-outlined { font-size: 14px; }
    .meta-objectives { color: #908f9d; font-style: italic; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .session-badges { display: flex; gap: 8px; flex-wrap: wrap; }
    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 600; padding: 4px 10px;
      border-radius: 9999px; white-space: nowrap;
    }
    .badge .material-symbols-outlined { font-size: 14px; }
    .badge-attendance { background: rgba(0,200,83,0.12); color: #69f0ae; }
    .badge-late { background: rgba(255,215,64,0.12); color: #ffd740; }
    .badge-eval { background: rgba(189,194,255,0.12); color: #bdc2ff; }
    .badge-review { background: rgba(0,104,237,0.12); color: #78b4ff; }
    .btn-eval {
      display: flex; align-items: center; gap: 6px;
      background: #0068ed; color: #f2f3ff;
      padding: 10px 18px; border-radius: 10px;
      border: none; font-weight: 700; font-size: 14px;
      cursor: pointer; transition: all 0.2s;
      white-space: nowrap; flex-shrink: 0;
    }
    .btn-eval:hover { opacity: 0.9; transform: scale(1.03); }
    .btn-eval .material-symbols-outlined { font-size: 18px; }
    @media (max-width: 768px) {
      .page { padding: 20px !important; }
      .page-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
      .page-title { font-size: 28px !important; line-height: 36px !important; }
      .page-sub { font-size: 14px !important; }
      .select-input { min-width: 100% !important; }
      .session-card { flex-wrap: wrap !important; gap: 12px !important; }
      .session-meta { flex-direction: column !important; gap: 4px !important; }
      .btn-eval { width: 100% !important; justify-content: center !important; }
    }
    @media (max-width: 480px) {
      .page { padding: 12px !important; }
      .page-title { font-size: 22px !important; }
    }
  `]
})
export class EvaluationsComponent {
  private data = inject(DataService);
  private sessionRepo = inject(SessionRepository);
  private router = inject(Router);

  selectedTeam = signal('');
  monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  private club$ = toObservable(this.data.currentClub).pipe(filter(Boolean));

  private data$ = this.club$.pipe(
    switchMap(club => forkJoin({
      teams: from(this.data.getTeams()),
      sessions: from(this.sessionRepo.findAll(club.id)),
    })),
    switchMap(({ teams, sessions }) => {
      const completed = sessions.filter(s => s.status === 'completed');
      if (completed.length === 0) {
        return of({ teams, allSessions: [] as SessionEval[] });
      }
      const sessionIds = completed.map(s => s.id);
      const teamMap: Record<string, string> = {};
      teams.forEach(t => teamMap[t.id] = t.name);
      return forkJoin({
        teams: of(teams),
        completed: of(completed),
        attendance: from(
          this.data.client
            .from('attendance')
            .select('session_id, status')
            .in('session_id', sessionIds)
            .then(r => (r.data || []) as Attendance[])
        ),
        reviews: from(
          this.data.client
            .from('session_player_reviews')
            .select('session_id')
            .in('session_id', sessionIds)
            .then(r => r.data || [])
        ),
      }).pipe(
        map(({ teams, completed: comp, attendance, reviews }) => {
          const attMap: Record<string, { present: number; late: number; absent: number; excused: number; injured: number; not_required: number; total: number }> = {};
          (attendance || []).forEach(a => {
            if (!attMap[a.session_id]) attMap[a.session_id] = { present: 0, late: 0, absent: 0, excused: 0, injured: 0, not_required: 0, total: 0 };
            if (a.status in attMap[a.session_id]) (attMap[a.session_id][a.status] as number)++;
            attMap[a.session_id].total++;
          });
          const revCount: Record<string, number> = {};
          (reviews || []).forEach((r: any) => {
            revCount[r.session_id] = (revCount[r.session_id] || 0) + 1;
          });
          return {
            teams,
            allSessions: comp.map(s => ({
              session: s,
              team: teamMap[s.team_id] || '—',
              attendance: attMap[s.id] || { present: 0, late: 0, absent: 0, excused: 0, injured: 0, total: 0 },
              reviewCount: revCount[s.id] || 0,
            })),
          };
        })
      );
    }),
    map(({ teams, allSessions }) => ({ loading: false, teams, allSessions })),
    catchError(err => {
      console.error(err);
      return of({ loading: false, teams: [] as Team[], allSessions: [] as SessionEval[] });
    }),
  );

  vm$ = combineLatest([this.data$, toObservable(this.selectedTeam)]).pipe(
    map(([data, teamId]) => ({
      loading: data.loading,
      teams: data.teams,
      filtered: teamId
        ? data.allSessions.filter(s => s.session.team_id === teamId)
        : data.allSessions,
    })),
    startWith({ loading: true, teams: [] as Team[], filtered: [] as SessionEval[] }),
  );

  go(sessionId: string) {
    this.router.navigate(['/sessions', sessionId, 'analysis']);
  }
}
