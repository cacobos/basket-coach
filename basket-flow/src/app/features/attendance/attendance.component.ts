import { Component, inject } from '@angular/core';
import { NgFor, NgIf, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { PlayerRepository } from '../../core/repositories/player.repository';
import { SessionRepository } from '../../core/repositories/session.repository';
import { Subject, forkJoin, from, of } from 'rxjs';
import { startWith, switchMap, filter, map, tap, catchError } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import type { TrainingSession, Player, Team } from '../../core/models/models';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, AsyncPipe],
  template: `
    <div class="page" *ngIf="vm$ | async as vm; else loadingTpl">
      <header class="page-header">
        <div>
          <h2 class="page-title">Control de Asistencia</h2>
          <p class="page-sub">Registro de presencia y puntualidad en entrenamientos.</p>
        </div>
        <div class="header-actions">
          <select class="select-input" [(ngModel)]="selectedTeam" (change)="onTeamChange()">
            <option value="">Todos los equipos</option>
            <option *ngFor="let t of vm.teams" [value]="t.id">{{ t.name }}</option>
          </select>
          <select class="select-input" [(ngModel)]="selectedSession" (change)="onSessionChange()">
            <option value="">Seleccionar sesión...</option>
            <option *ngFor="let s of filteredSessions" [value]="s.id">{{ s.title }} ({{ s.date }})</option>
          </select>
          <button class="btn-primary" (click)="toggleTaking()" [disabled]="!selectedSession">
            <span class="material-symbols-outlined fill">checklist</span>
            {{ takingAttendance ? 'Guardar Asistencia' : 'Pasar Lista' }}
          </button>
        </div>
      </header>

      <div class="summary" *ngIf="stats">
        <div class="summary-card">
          <span class="material-symbols-outlined summary-icon" style="color:#69f0ae">check_circle</span>
          <div>
            <p class="summary-val">{{ stats.presentPct }}%</p>
            <p class="summary-label">Asistencia General</p>
          </div>
        </div>
        <div class="summary-card">
          <span class="material-symbols-outlined summary-icon" style="color:#ffd740">watch_later</span>
          <div>
            <p class="summary-val">{{ stats.late }}</p>
            <p class="summary-label">Retrasos</p>
          </div>
        </div>
        <div class="summary-card">
          <span class="material-symbols-outlined summary-icon" style="color:#ff8a80">cancel</span>
          <div>
            <p class="summary-val">{{ stats.absent }}</p>
            <p class="summary-label">Ausencias</p>
          </div>
        </div>
      </div>

      <div class="table-section" *ngIf="teamPlayers.length > 0">
        <table class="att-table">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Equipo</th>
              <ng-container *ngIf="!takingAttendance"><th *ngFor="let d of days" class="day-header">{{ d }}</th></ng-container>
              <th *ngIf="!takingAttendance">%</th>
              <th *ngIf="takingAttendance">Estado</th>
              <th *ngIf="takingAttendance"></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of displayRows">
              <td class="td-name">{{ p.player.first_name }} {{ p.player.last_name }}</td>
              <td class="td-team">{{ p.teamName }}</td>
              <ng-container *ngIf="!takingAttendance">
                <td *ngFor="let d of p.recentDays" class="td-status">
                  <span class="status-dot" [class.present]="d === 'present'" [class.late]="d === 'late'" [class.absent]="d === 'absent' || d === 'excused'"></span>
                </td>
                <td class="td-pct">{{ p.percent || '—' }}</td>
              </ng-container>
              <ng-container *ngIf="takingAttendance">
                <td>
                  <select class="att-select" [value]="attendanceMap[p.player.id] || 'present'"
                    (change)="attendanceMap[p.player.id] = $any($event.target).value">
                    <option value="present">Presente</option>
                    <option value="late">Retraso</option>
                    <option value="absent">Ausente</option>
                    <option value="excused">Justificado</option>
                    <option value="injured">Lesionado</option>
                  </select>
                </td>
                <td><button class="btn-save-sml" (click)="saveOne(p.player)">✓</button></td>
              </ng-container>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="empty-state" *ngIf="selectedSession && teamPlayers.length === 0 && !loading">
        <span class="material-symbols-outlined empty-icon">fact_check</span>
        <p>No hay jugadores en el equipo de esta sesión.</p>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div class="page"><div class="loading-state"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando...</p></div></div>
    </ng-template>
  `,
  styles: [`
    .page { padding: 40px; max-width: 1440px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 48px; }
    .page-title { font-size: 48px; line-height: 56px; font-weight: 800; letter-spacing: -0.02em; color: #dfe0ff; margin: 0; }
    .page-sub { font-size: 18px; line-height: 28px; color: #c6c5d4; margin: 4px 0 0; }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .select-input {
      background: #111644; border: 1px solid rgba(69,70,82,0.3);
      color: #dfe0ff; border-radius: 12px; padding: 12px 16px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px;
      outline: none; cursor: pointer; min-width: 200px;
    }
    .select-input:focus { border-color: #bdc2ff; }
    .btn-primary {
      display: flex; align-items: center; gap: 8px;
      background: #0068ed; color: #f2f3ff;
      padding: 12px 20px; border-radius: 12px;
      border: none; font-weight: 700; font-size: 14px;
      cursor: pointer; transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-primary:hover { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.4; cursor: default; }
    .btn-primary .fill { font-variation-settings: 'FILL' 1; }
    .summary { display: flex; gap: 16px; margin-bottom: 32px; }
    .summary-card {
      display: flex; align-items: center; gap: 12px;
      background: #161b48; border-radius: 12px; padding: 16px 20px;
      flex: 1; border: 1px solid rgba(69,70,82,0.2);
    }
    .summary-icon { font-size: 28px; }
    .summary-val { font-size: 28px; font-weight: 800; color: #dfe0ff; margin: 0; }
    .summary-label { font-size: 12px; color: #c6c5d4; margin: 2px 0 0; }
    .table-section { background: #161b48; border-radius: 12px; padding: 20px; border: 1px solid rgba(69,70,82,0.2); overflow-x: auto; }
    .att-table { width: 100%; border-collapse: collapse; min-width: 500px; }
    .att-table th {
      padding: 10px 8px; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em; color: #908f9d;
      border-bottom: 1px solid rgba(69,70,82,0.3); text-align: left;
    }
    .day-header { text-align: center; width: 28px; }
    .att-table td { padding: 10px 8px; font-size: 13px; color: #dfe0ff; border-bottom: 1px solid rgba(69,70,82,0.1); }
    .td-name { font-weight: 600; }
    .td-team { color: #c6c5d4; font-size: 12px; }
    .td-status { text-align: center; }
    .td-pct { font-weight: 700; color: #bdc2ff; }
    .status-dot {
      display: inline-block; width: 10px; height: 10px; border-radius: 50%;
      background: rgba(69,70,82,0.3);
    }
    .status-dot.present { background: #69f0ae; box-shadow: 0 0 6px rgba(105,240,174,0.4); }
    .status-dot.late { background: #ffd740; box-shadow: 0 0 6px rgba(255,215,64,0.4); }
    .status-dot.absent { background: #ff8a80; box-shadow: 0 0 6px rgba(255,138,128,0.4); }
    .att-select {
      background: #111644; border: 1px solid rgba(69,70,82,0.3);
      color: #dfe0ff; border-radius: 6px; padding: 6px 8px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 12px; outline: none;
    }
    .btn-save-sml {
      background: #0068ed; color: white; border: none; border-radius: 6px;
      padding: 6px 12px; font-size: 12px; cursor: pointer;
    }
    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; }
    .loading-icon { font-size: 48px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; }
    .empty-icon { font-size: 48px; }
    .empty-state p { margin: 0; font-size: 16px; }
    @media (max-width: 768px) {
      .page { padding: 20px !important; }
      .page-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
      .page-title { font-size: 28px !important; line-height: 36px !important; }
      .page-sub { font-size: 14px !important; }
      .header-actions { flex-direction: column !important; }
      .select-input { min-width: 100% !important; }
      .btn-primary { width: 100% !important; justify-content: center !important; }
      .summary { flex-direction: column !important; }
      .table-section { overflow-x: auto !important; }
      .att-table { min-width: 400px !important; }
    }
    @media (max-width: 480px) {
      .page { padding: 12px !important; }
      .page-title { font-size: 22px !important; }
    }
  `]
})
export class AttendanceComponent {
  private data = inject(DataService);
  private playerRepo = inject(PlayerRepository);
  private sessionRepo = inject(SessionRepository);
  private reload = new Subject<void>();

  sessions: TrainingSession[] = [];
  teams: Team[] = [];
  teamMap: Record<string, Team> = {};
  teamPlayers: Player[] = [];
  selectedSession = '';
  selectedTeam = '';
  takingAttendance = false;
  attendanceMap: Record<string, string> = {};
  days = ['L', 'M', 'X', 'J', 'V', 'S'];
  loading = false;

  stats: { presentPct: number; late: number; absent: number } | null = null;

  rows: DisplayRow[] = [];

  get filteredSessions(): TrainingSession[] {
    if (!this.selectedTeam) return this.sessions;
    return this.sessions.filter(s => s.team_id === this.selectedTeam);
  }

  get displayRows(): DisplayRow[] {
    return this.rows;
  }

  readonly vm$ = toObservable(this.data.currentClub).pipe(
    filter(Boolean),
    switchMap(club => this.reload.pipe(
      startWith(undefined),
      switchMap(() => forkJoin({
        sessions: from(this.data.getSessions()),
        teams: from(this.data.getTeams()),
      }).pipe(
        catchError(err => {
          console.error(err);
          return of({ sessions: [] as TrainingSession[], teams: [] as Team[] });
        })
      )),
      tap(({ sessions, teams }) => {
        this.sessions = sessions;
        this.teams = teams;
        const teamMap: Record<string, Team> = {};
        teams.forEach(t => teamMap[t.id] = t);
        this.teamMap = teamMap;
      }),
      map(({ sessions, teams }) => ({ sessions, teams }))
    ))
  );

  onTeamChange() {
    this.selectedSession = '';
    this.teamPlayers = [];
    this.rows = [];
    this.attendanceMap = {};
    this.takingAttendance = false;
    this.stats = null;
  }

  async onSessionChange() {
    if (!this.selectedSession) return;
    this.takingAttendance = false;
    this.attendanceMap = {};
    const session = this.sessions.find(s => s.id === this.selectedSession);
    if (!session) return;
    this.teamPlayers = await this.playerRepo.findAll(session.team_id);

    const existing = await this.data.getAttendance(this.selectedSession);
    existing.forEach(a => { this.attendanceMap[a.player_id] = a.status; });

    this.buildHistory();
  }

  buildHistory() {
    this.rows = this.teamPlayers.map(p => {
      const team = this.teamMap[p.team_id];
      return {
        player: p,
        teamName: team?.name || '—',
        recentDays: [] as string[],
        percent: null as string | null,
      } as DisplayRow;
    });
    this.updateStats();
  }

  updateStats() {
    const records = Object.values(this.attendanceMap);
    const total = this.teamPlayers.length || 1;
    const present = records.filter(r => r === 'present').length;
    const late = records.filter(r => r === 'late').length;
    const absent = records.filter(r => r === 'absent' || r === 'excused').length;
    this.stats = {
      presentPct: Math.round(((present + late) / total) * 100),
      late,
      absent,
    };
  }

  toggleTaking() {
    if (!this.takingAttendance) {
      this.takingAttendance = true;
    } else {
      this.takingAttendance = false;
    }
  }

  async saveOne(player: Player) {
    const status = (this.attendanceMap[player.id] || 'present') as 'present' | 'absent' | 'late';
    await this.data.setAttendance(this.selectedSession, player.id, status);
    this.updateStats();
  }
}

interface DisplayRow {
  player: Player;
  teamName: string;
  recentDays: string[];
  percent: string | null;
}
