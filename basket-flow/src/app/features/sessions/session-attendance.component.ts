import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AsyncPipe, NgIf } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { PlayerRepository } from '../../core/repositories/player.repository';
import { SessionRepository } from '../../core/repositories/session.repository';
import { NotificationService } from '../../core/services/notification.service';
import { forkJoin, from, of } from 'rxjs';
import { switchMap, filter, map, catchError } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import type { TrainingSession, Player, Attendance } from '../../core/models/models';

type Status = Attendance['status'];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_META: { value: Status; label: string; short: string; color: string }[] = [
  { value: 'present', label: 'Presente', short: 'P', color: '#4ade80' },
  { value: 'late', label: 'Retraso', short: 'R', color: '#fbbf24' },
  { value: 'excused', label: 'Falta avisando', short: 'A', color: '#fb923c' },
  { value: 'injured', label: 'Lesión', short: 'L', color: '#a78bfa' },
  { value: 'absent', label: 'Falta sin avisar', short: 'F', color: '#f87171' },
  { value: 'not_required', label: 'No requerido', short: 'N', color: '#94a3b8' },
];

@Component({
  selector: 'app-session-attendance',
  standalone: true,
  imports: [AsyncPipe, NgIf, RouterLink],
  template: `
    <ng-container *ngIf="vm$ | async as vm; else loadingTpl">
      <div class="page" *ngIf="vm.session; else notFoundTpl">
        <header class="page-header">
          <div>
            <h2 class="page-title">Pasar Lista</h2>
            <p class="page-sub">{{ vm.session.title }} — {{ vm.session.date }}
              <span class="meta-time">{{ vm.session.start_time.slice(0,5) }} - {{ vm.session.end_time.slice(0,5) }}</span>
              <span class="meta-team" *ngIf="vm.teamName">{{ vm.teamName }}</span>
            </p>
          </div>
          <div class="header-actions">
            <a [routerLink]="['/sessions', sessionId]" class="btn-secondary">
              <span class="material-symbols-outlined">arrow_back</span>
              Volver a sesión
            </a>
          </div>
        </header>

        @if (vm.session.status === 'completed') {
          <div class="editable-banner">Sesión completada — puedes registrar o corregir la asistencia.</div>
        }

        <div class="summary" *ngIf="players().length > 0">
          <div class="summary-card">
            <span class="summary-dot present"></span>
            <div>
              <p class="summary-val">{{ summary().present }}</p>
              <p class="summary-label">Presentes</p>
            </div>
          </div>
          <div class="summary-card">
            <span class="summary-dot late"></span>
            <div>
              <p class="summary-val">{{ summary().late }}</p>
              <p class="summary-label">Retrasos</p>
            </div>
          </div>
          <div class="summary-card">
            <span class="summary-dot excused"></span>
            <div>
              <p class="summary-val">{{ summary().excused }}</p>
              <p class="summary-label">Faltas avisando</p>
            </div>
          </div>
          <div class="summary-card">
            <span class="summary-dot injured"></span>
            <div>
              <p class="summary-val">{{ summary().injured }}</p>
              <p class="summary-label">Lesiones</p>
            </div>
          </div>
          <div class="summary-card">
            <span class="summary-dot absent"></span>
            <div>
              <p class="summary-val">{{ summary().absent }}</p>
              <p class="summary-label">Faltas sin avisar</p>
            </div>
          </div>
          <div class="summary-card">
            <span class="summary-dot notreq"></span>
            <div>
              <p class="summary-val">{{ summary().not_required }}</p>
              <p class="summary-label">No requeridos</p>
            </div>
          </div>
        </div>

        @if (players().length > 0) {
          <div class="table-section">
            <div class="att-head">
              <span class="att-player">Jugadora</span>
              <span class="att-inc">Presente</span>
              <span class="att-inc">Retraso</span>
              <span class="att-inc excused">Falta avisando</span>
              <span class="att-inc injured">Lesión</span>
              <span class="att-inc absent">Falta sin avisar</span>
              <span class="att-inc notreq">No requerido</span>
            </div>
            <div class="att-list">
              @for (p of players(); track p.id) {
                <div class="att-row" [class.changed]="isDirty(p.id)">
                  <span class="att-player">
                    <span class="att-num-badge">{{ p.jersey_number }}</span>
                    <span class="att-name">{{ p.first_name }} {{ p.last_name }}</span>
                    <button class="icon-btn" (click)="resetPlayer(p.id)" title="Restablecer a presente">
                      <span class="material-symbols-outlined">refresh</span>
                    </button>
                  </span>
                  <span class="status-row">
                    @for (s of STATUS_META; track s.value) {
                      <button type="button"
                        class="status-btn"
                        [class.active]="status(p.id) === s.value"
                        [class.excused]="s.value === 'excused'"
                        [class.injured]="s.value === 'injured'"
                        [class.absent]="s.value === 'absent'"
                        [title]="s.label"
                        (click)="setStatus(p.id, s.value)">
                        <span class="status-short">{{ s.short }}</span>
                        <span class="status-label">{{ s.label }}</span>
                      </button>
                    }
                  </span>
                </div>
              }
            </div>
            <div class="table-actions">
              <button class="btn-save" (click)="saveAll()" [disabled]="saving() || !dirty()">
                {{ saving() ? 'Guardando...' : dirty() ? 'Guardar asistencia' : 'Asistencia guardada' }}
              </button>
              <button class="btn-cancel" *ngIf="dirty()" (click)="discard()">Deshacer cambios</button>
            </div>
          </div>
        } @else {
          <div class="empty-state">
            <span class="material-symbols-outlined empty-icon">group_off</span>
            <p>No hay jugadoras en el equipo de esta sesión.</p>
          </div>
        }
      </div>
    </ng-container>

    <ng-template #loadingTpl>
      <div class="page"><div class="loading-state"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando...</p></div></div>
    </ng-template>

    <ng-template #notFoundTpl>
      <div class="page"><p class="empty-state">Sesión no encontrada.</p></div>
    </ng-template>
  `,
  styles: [`
    .page { max-width: 1000px; margin: 0 auto; padding: 40px 24px 80px; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
    .page-title { font-size: 40px; font-weight: 800; letter-spacing: -0.02em; color: #dfe0ff; margin: 0; }
    .page-sub { font-size: 15px; color: var(--text-secondary); margin: 8px 0 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .meta-time, .meta-team {
      font-size: 12px; color: #c6c5d4;
      background: rgba(189,194,255,0.08);
      padding: 3px 10px; border-radius: 9999px;
    }
    .header-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .btn-secondary {
      display: flex; align-items: center; gap: 4px; padding: 10px 16px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04);
      color: var(--text-primary); font-size: 13px; font-weight: 600; text-decoration: none;
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.08); }
    .btn-secondary .material-symbols-outlined { font-size: 16px; }

    .editable-banner {
      font-size: 13px; color: #fbbf24;
      background: rgba(251,191,36,0.1);
      border: 1px solid rgba(251,191,36,0.2);
      padding: 10px 14px; border-radius: 10px; margin-bottom: 20px;
    }

    .summary { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .summary-card {
      display: flex; align-items: center; gap: 10px;
      background: var(--bg-card); border-radius: 12px; padding: 14px 18px;
      flex: 1; min-width: 140px; border: 1px solid var(--border-subtle);
    }
    .summary-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
    .summary-dot.present { background: #4ade80; box-shadow: 0 0 8px rgba(74,222,128,0.5); }
    .summary-dot.late { background: #fbbf24; }
    .summary-dot.excused { background: #fb923c; }
    .summary-dot.injured { background: #a78bfa; }
    .summary-dot.absent { background: #f87171; }
    .summary-dot.notreq { background: #94a3b8; }
    .summary-val { font-size: 26px; font-weight: 800; color: #dfe0ff; margin: 0; line-height: 1.1; }
    .summary-label { font-size: 12px; color: var(--text-secondary); margin: 2px 0 0; }

    .table-section { background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-subtle); padding: 8px 4px; }
    .att-head, .att-row {
      display: grid; grid-template-columns: 1.7fr repeat(6, 1fr);
      gap: 8px; align-items: center; padding: 10px 12px;
    }
    .att-head { font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border-subtle); }
    .att-inc { text-align: center; }
    .att-inc.excused { color: #fb923c; }
    .att-inc.injured { color: #a78bfa; }
    .att-inc.absent { color: #f87171; }
    .att-inc.notreq { color: #94a3b8; }
    .att-list { display: flex; flex-direction: column; }
    .status-row { display: contents; }
    .att-row { border-bottom: 1px solid var(--border-subtle); transition: background 0.12s; }
    .att-row:last-child { border-bottom: none; }
    .att-row:hover { background: rgba(255,255,255,0.015); }
    .att-row.changed { background: rgba(99,102,241,0.07); }
    .att-player { display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 600; min-width: 0; }
    .att-num-badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 50%;
      background: rgba(255,255,255,0.07); font-size: 11px; font-weight: 800; flex-shrink: 0;
    }
    .att-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .icon-btn {
      background: none; border: none; color: var(--text-secondary);
      cursor: pointer; padding: 2px; display: inline-flex; opacity: 0.5; transition: opacity 0.12s;
    }
    .icon-btn:hover { opacity: 1; }
    .icon-btn .material-symbols-outlined { font-size: 15px; }

    .status-btn {
      display: flex; align-items: center; justify-content: center; gap: 4px;
      padding: 8px 4px; border-radius: 8px; text-align: center;
      border: 1.5px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03);
      color: #b0b3e0; cursor: pointer; font-size: 0.72rem; font-weight: 600; line-height: 1;
      transition: all 0.12s; white-space: nowrap; min-width: 0;
    }
    .status-short { display: none; }
    .status-btn:hover:not(.active) { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18); }
    .status-btn.active { background: #4ade80; color: #06251a; border-color: #4ade80; box-shadow: 0 0 12px rgba(74,222,128,0.25); }
    .status-btn.active.excused { background: #fb923c; color: #2a1205; border-color: #fb923c; box-shadow: 0 0 12px rgba(251,146,60,0.25); }
    .status-btn.active.injured { background: #a78bfa; color: #1e1230; border-color: #a78bfa; box-shadow: 0 0 12px rgba(167,139,250,0.25); }
    .status-btn.active.absent { background: #f87171; color: #2a0505; border-color: #f87171; box-shadow: 0 0 12px rgba(248,113,113,0.25); }

    .table-actions { display: flex; gap: 10px; align-items: center; padding: 16px 12px 8px; }
    .btn-save, .btn-cancel {
      padding: 11px 22px; border-radius: 10px; border: none;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.15s;
    }
    .btn-save { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
    .btn-save:disabled { opacity: 0.45; cursor: default; }
    .btn-save:not(:disabled):hover { opacity: 0.9; }
    .btn-save.saved { background: #22c55e; }
    .btn-cancel { background: rgba(255,255,255,0.06); color: var(--text-secondary); }
    .btn-cancel:hover { background: rgba(255,255,255,0.1); }

    .empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; text-align: center; }
    .loading-icon, .empty-icon { font-size: 48px; }
    .loading-icon { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state p { margin: 0; font-size: 16px; }

    @media (max-width: 768px) {
      .page { padding: 24px 16px 60px; }
      .page-header { flex-direction: column; }
      .page-title { font-size: 30px; }
      .header-actions { width: 100%; }
      .header-actions .btn-secondary { flex: 1; justify-content: center; }
      .att-head { display: none; }
      .att-row {
        grid-template-columns: 1fr; gap: 8px;
        padding: 10px 8px;
      }
      .att-player { margin-bottom: 0; gap: 7px; }
      .att-name { font-size: 13px; }
      .att-num-badge { width: 24px; height: 24px; font-size: 10px; }
      .status-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; }
      .status-btn { padding: 7px 2px; }
      .status-short { display: block; color: #b0b3e0; }
      .status-btn.active .status-short { color: inherit; }
      .status-label { display: none; }
      .summary { flex-direction: row; flex-wrap: wrap; }
      .summary-card { min-width: 0; flex: 1 1 30%; padding: 10px 12px; gap: 8px; }
      .summary-val { font-size: 20px; }
    }
  `]
})
export class SessionAttendanceComponent {
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);
  private playerRepo = inject(PlayerRepository);
  private sessionRepo = inject(SessionRepository);
  private notification = inject(NotificationService);

  sessionId = '';
  session = signal<TrainingSession | null>(null);
  players = signal<Player[]>([]);

  private baseStatus = signal<Record<string, Status>>({});
  private draftStatus = signal<Record<string, Status>>({});

  saving = signal(false);

  readonly STATUS_META = STATUS_META;

  readonly vm$ = toObservable(this.dataService.currentClub).pipe(
    filter(Boolean),
    switchMap(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id || !UUID_RE.test(id)) return of({ session: null, teamName: '', players: [] as Player[] });
      this.sessionId = id;
      return forkJoin({
        session: from(this.sessionRepo.findById(id)),
        attendance: from(this.dataService.getAttendance(id)),
      }).pipe(
        switchMap(({ session, attendance }) => {
          if (!session) return of({ session: null as TrainingSession | null, teamName: '', players: [] as Player[], attendance });
          return forkJoin({
            players: from(this.playerRepo.findByTeamIncludingLinked(session.team_id)),
            teams: from(this.dataService.getTeams()),
          }).pipe(map(({ players, teams }) => ({
            session,
            teamName: teams.find(t => t.id === session.team_id)?.name || '',
            players,
            attendance,
          })));
        }),
        map(vm => {
          if (!vm?.session) { this.session.set(null); return vm; }
          this.session.set(vm.session);
          this.players.set(vm.players);
          const base: Record<string, Status> = {};
          for (const p of vm.players) base[p.id] = 'present';
          for (const a of vm.attendance) if (a.player_id in base) base[a.player_id] = a.status;
          this.baseStatus.set(base);
          this.draftStatus.set({ ...base });
          return vm;
        }),
        catchError(() => of({ session: null as TrainingSession | null, teamName: '', players: [] as Player[], attendance: [] as Attendance[] }))
      );
    })
  );

  status(playerId: string): Status {
    return this.draftStatus()[playerId] ?? 'present';
  }

  setStatus(playerId: string, status: Status) {
    this.draftStatus.update(m => ({ ...m, [playerId]: status }));
  }

  resetPlayer(playerId: string) {
    this.setStatus(playerId, 'present');
  }

  isDirty(playerId: string): boolean {
    return (this.draftStatus()[playerId] ?? 'present') !== (this.baseStatus()[playerId] ?? 'present');
  }

  dirty = computed(() => {
    const draft = this.draftStatus();
    const base = this.baseStatus();
    if (Object.keys(draft).length !== Object.keys(base).length) return true;
    return Object.keys(base).some(id => draft[id] !== base[id]);
  });

  summary = computed(() => {
    let present = 0, late = 0, excused = 0, injured = 0, absent = 0, not_required = 0;
    for (const p of this.players()) {
      const s = this.status(p.id);
      if (s === 'present') present++;
      else if (s === 'late') late++;
      else if (s === 'excused') excused++;
      else if (s === 'injured') injured++;
      else if (s === 'not_required') not_required++;
      else absent++;
    }
    return { present, late, excused, injured, absent, not_required };
  });

  discard() {
    this.draftStatus.set({ ...this.baseStatus() });
  }

  async saveAll() {
    this.saving.set(true);
    try {
      const draft = this.draftStatus();
      for (const p of this.players()) {
        const status = draft[p.id] ?? 'present';
        if (this.isDirty(p.id) || status !== 'present') {
          await this.dataService.setAttendance(this.sessionId, p.id, status);
        }
      }
      this.baseStatus.set({ ...draft });
      this.draftStatus.set({ ...draft });
      this.notification.show('Asistencia guardada', 'success');
    } catch (e) {
      console.error('Save attendance failed', e);
      this.notification.show('No se pudo guardar la asistencia', 'error');
    } finally {
      this.saving.set(false);
    }
  }
}
