import { Component, inject } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { forkJoin, Subject, of } from 'rxjs';
import { map, startWith, switchMap, tap } from 'rxjs/operators';
import { DataService } from '../../core/services/data.service';
import { SessionRepository } from '../../core/repositories/session.repository';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { AuthService } from '../../core/auth/auth.service';
import type { TrainingSession, Team } from '../../core/models/models';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, FormsModule],
  template: `
    <div class="page" *ngIf="vm$ | async">
      <header class="page-header">
        <div>
          <h2 class="page-title">Calendario</h2>
          <p class="page-sub">Visualiza y planifica tus sesiones de entrenamiento.</p>
        </div>
        <div class="header-actions">
          <button class="btn-nav" (click)="prevMonth()"><span class="material-symbols-outlined">chevron_left</span></button>
          <span class="current-month">{{ monthNames[month] }} {{ year }}</span>
          <button class="btn-nav" (click)="nextMonth()"><span class="material-symbols-outlined">chevron_right</span></button>
        </div>
      </header>

      <div class="calendar-wrap">
        <div class="calendar-header">
          <span *ngFor="let d of dayHeaders" class="cal-day-header">{{ d }}</span>
        </div>
        <div class="calendar-grid">
          <div class="cal-day" *ngFor="let day of days" 
               [class.other-month]="day.otherMonth"
               [class.today]="day.isToday"
               (click)="selectDay(day)">
            <span class="day-number">{{ day.date.getDate() }}</span>
            <div class="day-sessions">
              <div class="day-session" *ngFor="let s of day.sessions" 
                   [class.completed]="s.status === 'completed'"
                   [class.draft]="s.status === 'draft'"
                   [class.cancelled]="s.status === 'cancelled'"
                   (click)="$event.stopPropagation(); openSessionDetail(s)">
                <span class="session-dot"></span>
                <span class="session-title">{{ s.title }}</span>
              </div>
            </div>
            <button class="add-session-btn" (click)="$event.stopPropagation(); openCreateOnDay(day)" *ngIf="!day.otherMonth && !isFamilyUser">
              <span class="material-symbols-outlined">add</span>
            </button>
          </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showForm" (click)="showForm = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Nueva Sesión</h3>
          <div class="modal-body">
            <label class="field"><span>Título</span><input class="field-input" [(ngModel)]="formTitle" placeholder="Entrenamiento"/></label>
            <label class="field"><span>Equipo</span>
              <select class="field-input" [(ngModel)]="formTeam">
                <option *ngFor="let t of teams" [value]="t.id">{{ t.name }}</option>
              </select>
            </label>
            <label class="field"><span>Fecha</span><input class="field-input" type="date" [(ngModel)]="formDate"/></label>
            <div class="field-row">
              <label class="field flex-1"><span>Hora inicio</span><input class="field-input" type="time" [(ngModel)]="formStart"/></label>
              <label class="field flex-1"><span>Hora fin</span><input class="field-input" type="time" [(ngModel)]="formEnd"/></label>
            </div>
            <label class="field"><span>Ubicación</span><input class="field-input" [(ngModel)]="formLocation" placeholder="Gimnasio"/></label>
            <label class="field"><span>Objetivos</span><textarea class="field-input field-textarea" [(ngModel)]="formObjectives" rows="2"></textarea></label>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="showForm = false">Cancelar</button>
            <button class="btn-save" (click)="saveFromCalendar()">Crear</button>
          </div>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="selectedSession" (click)="selectedSession = null">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">{{ selectedSession.title }}</h3>
          <div class="detail-info">
            <p><span class="material-symbols-outlined">groups</span> {{ teamNames[selectedSession.team_id] || '—' }}</p>
            <p><span class="material-symbols-outlined">schedule</span> {{ selectedSession.date }} | {{ selectedSession.start_time.slice(0,5) }} - {{ selectedSession.end_time.slice(0,5) }}</p>
            <p *ngIf="selectedSession.location"><span class="material-symbols-outlined">location_on</span> {{ selectedSession.location }}</p>
            <p *ngIf="selectedSession.objectives"><span class="material-symbols-outlined">track_changes</span> {{ selectedSession.objectives }}</p>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="selectedSession = null">Cerrar</button>
            <button class="btn-save" (click)="goToSession(selectedSession!)">Ver sesión</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 40px; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 32px; }
    .page-title { font-size: 48px; line-height: 56px; font-weight: 800; letter-spacing: -0.02em; color: #dfe0ff; margin: 0; }
    .page-sub { font-size: 18px; line-height: 28px; color: #c6c5d4; margin: 4px 0 0; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .current-month { font-size: 20px; font-weight: 700; color: #dfe0ff; min-width: 180px; text-align: center; }
    .btn-nav {
      background: #161b48; border: 1px solid rgba(69,70,82,0.3); color: #c6c5d4;
      cursor: pointer; padding: 8px; border-radius: 8px; display: flex;
      transition: all 0.2s;
    }
    .btn-nav:hover { background: #212653; color: #dfe0ff; }
    .btn-nav .material-symbols-outlined { font-size: 20px; }

    .calendar-wrap { background: #161b48; border-radius: 16px; overflow: hidden; border: 1px solid rgba(69,70,82,0.2); }
    .calendar-header {
      display: grid; grid-template-columns: repeat(7, 1fr);
      background: #111644; border-bottom: 1px solid rgba(69,70,82,0.2);
    }
    .cal-day-header {
      padding: 12px; text-align: center; font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.05em; color: #908f9d;
    }
    .calendar-grid {
      display: grid; grid-template-columns: repeat(7, 1fr);
    }
    .cal-day {
      min-height: 120px; padding: 8px; border-right: 1px solid rgba(69,70,82,0.1);
      border-bottom: 1px solid rgba(69,70,82,0.1);
      position: relative; cursor: pointer; transition: background 0.2s;
    }
    .cal-day:nth-child(7n) { border-right: none; }
    .cal-day:hover { background: rgba(189,194,255,0.03); }
    .cal-day.other-month { opacity: 0.3; }
    .cal-day.today { background: rgba(0,104,237,0.08); }
    .cal-day.today .day-number {
      background: #0068ed; color: white; border-radius: 50%;
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
    }
    .day-number { font-size: 13px; font-weight: 700; color: #dfe0ff; margin-bottom: 6px; display: inline-block; }
    .day-sessions { display: flex; flex-direction: column; gap: 2px; }
    .day-session {
      font-size: 11px; padding: 2px 4px; border-radius: 4px;
      background: rgba(0,104,237,0.15); color: #bdc2ff;
      cursor: pointer; display: flex; align-items: center; gap: 4px;
      overflow: hidden; white-space: nowrap;
    }
    .day-session:hover { background: rgba(0,104,237,0.25); }
    .day-session.completed { background: rgba(0,200,83,0.15); color: #69f0ae; }
    .day-session.draft { background: rgba(255,255,255,0.05); color: #908f9d; }
    .day-session.cancelled { background: rgba(255,138,128,0.15); color: #ff8a80; }
    .session-dot { width: 4px; height: 4px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
    .session-title { overflow: hidden; text-overflow: ellipsis; }
    .add-session-btn {
      position: absolute; bottom: 4px; right: 4px;
      background: none; border: none; color: #908f9d; cursor: pointer;
      padding: 2px; opacity: 0; transition: opacity 0.2s;
    }
    .cal-day:hover .add-session-btn { opacity: 1; }
    .add-session-btn .material-symbols-outlined { font-size: 14px; }

    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 20px;
    }
    .modal-card {
      background: #161b48; border-radius: 16px; padding: 32px;
      width: 100%; max-width: 480px; border: 1px solid rgba(69,70,82,0.3);
      max-height: 90vh; overflow-y: auto;
    }
    .modal-title { font-size: 24px; font-weight: 700; color: #dfe0ff; margin: 0 0 24px; }
    .modal-body { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field span { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; }
    .field-row { display: flex; gap: 12px; }
    .flex-1 { flex: 1; }
    .field-input {
      background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff;
      border-radius: 8px; padding: 10px 12px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none;
    }
    .field-input:focus { border-color: #bdc2ff; }
    .field-textarea { resize: vertical; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-cancel, .btn-save {
      padding: 10px 20px; border-radius: 8px; border: none;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-cancel { background: #212653; color: #c6c5d4; }
    .btn-save { background: #0068ed; color: white; }
    .btn-save:hover { opacity: 0.9; }
    .detail-info { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
    .detail-info p { display: flex; align-items: center; gap: 8px; color: #c6c5d4; margin: 0; font-size: 14px; }
    .detail-info .material-symbols-outlined { font-size: 18px; color: #908f9d; }
    @media (max-width: 768px) {
      .page { padding: 20px !important; }
      .page-header { flex-direction: column !important; gap: 12px !important; align-items: stretch !important; }
      .page-title { font-size: 28px !important; line-height: 36px !important; }
      .page-sub { font-size: 14px !important; }
      .header-actions { justify-content: center !important; }
      .cal-day { min-height: 80px !important; padding: 4px !important; }
      .day-number { font-size: 11px !important; }
      .day-session { font-size: 9px !important; }
      .modal-card { margin: 10px !important; padding: 20px !important; }
      .field-row { flex-direction: column !important; }
    }
    @media (max-width: 480px) {
      .page { padding: 12px !important; }
      .page-title { font-size: 22px !important; }
      .cal-day-header { font-size: 9px !important; padding: 8px 2px !important; }
      .cal-day { min-height: 60px !important; }
      .add-session-btn { opacity: 1 !important; }
    }
  `]
})
export class CalendarComponent {
  private data = inject(DataService);
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private sessionRepo = inject(SessionRepository);
  private router = inject(Router);

  month = new Date().getMonth();
  year = new Date().getFullYear();
  today = new Date();
  days: CalendarDay[] = [];
  dayHeaders = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  sessions: TrainingSession[] = [];
  teams: Team[] = [];
  teamNames: Record<string, string> = {};
  isFamilyUser = false;

  showForm = false;
  formTitle = '';
  formTeam = '';
  formDate = '';
  formStart = '16:00';
  formEnd = '17:30';
  formLocation = '';
  formObjectives = '';

  selectedSession: TrainingSession | null = null;

  private club$ = toObservable(this.data.currentClub);
  private refresh$ = new Subject<void>();
  private familyLoad$ = new Subject<void>();
  private initDone = false;

  vm$ = this.club$.pipe(
    switchMap(club => {
      if (club) return this.refresh$.pipe(startWith(undefined), map(() => club));
      return this.familyLoad$.pipe(startWith(undefined), map(() => null));
    }),
    switchMap(club => {
      if (!club && !this.initDone) {
        if (this.auth.user()) this.checkFamilyUser();
        return of({ _family: true });
      }
      if (!club) return of({ _family: true });
      return forkJoin({
        teams: this.data.getTeams(),
        sessions: this.fetchSessions(),
      }).pipe(
        tap(({ teams, sessions }) => {
          this.teams = teams;
          this.sessions = sessions;
          this.teamNames = {};
          teams.forEach(t => this.teamNames[t.id] = t.name);
          this.buildDays();
        }),
        map(() => ({})),
      );
    }),
    startWith({}),
  );

  private async checkFamilyUser() {
    this.initDone = true;
    const userId = this.auth.user()?.id;
    if (!userId) return;

    const { data: guardians } = await this.supabase.client
      .from('player_guardians')
      .select('player_id')
      .eq('user_id', userId);

    if (!guardians?.length) return;
    this.isFamilyUser = true;
    await this.loadFamilySessions();
  }

  private async loadFamilySessions() {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    const { data: guardians } = await this.supabase.client
      .from('player_guardians')
      .select('player_id')
      .eq('user_id', userId);

    if (!guardians?.length) return;
    const playerIds = guardians.map(g => g.player_id);
    const { data: players } = await this.supabase.client
      .from('players')
      .select('team_id, teams!inner(name)')
      .in('id', playerIds)
      .is('deleted_at', null);
    if (!players?.length) return;
    const teamIds = [...new Set(players.map((p: any) => p.team_id).filter(Boolean))];
    this.teams = [];
    players.forEach((p: any) => {
      const t = this.teams.find(x => x.id === p.team_id);
      if (!t && p.teams) {
        this.teams.push({ id: p.team_id, name: p.teams.name, club_id: '' } as Team);
      }
    });
    this.teams.forEach(t => this.teamNames[t.id] = t.name);

    const lastDay = new Date(this.year, this.month + 1, 0);
    const from = new Date(this.year, this.month, 1);
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
    const to = new Date(lastDay);
    to.setDate(to.getDate() + (7 - ((to.getDay() + 6) % 7) - 1));

    const { data: sessions } = await this.supabase.client
      .from('training_sessions')
      .select('*')
      .in('team_id', teamIds)
      .is('deleted_at', null)
      .gte('date', from.toISOString().slice(0, 10))
      .lte('date', to.toISOString().slice(0, 10));

    this.sessions = (sessions ?? []) as TrainingSession[];
    this.buildDays();
    this.familyLoad$.next();
  }

  prevMonth() {
    if (this.month === 0) { this.month = 11; this.year--; }
    else this.month--;
    if (this.isFamilyUser) this.loadFamilySessions();
    else this.refresh$.next();
  }

  nextMonth() {
    if (this.month === 11) { this.month = 0; this.year++; }
    else this.month++;
    if (this.isFamilyUser) this.loadFamilySessions();
    else this.refresh$.next();
  }

  selectDay(day: CalendarDay) {
    if (day.otherMonth) return;
    if (day.sessions.length > 0) {
      this.selectedSession = day.sessions[0];
    } else if (!this.isFamilyUser) {
      this.openCreateOnDay(day);
    }
  }

  openCreateOnDay(day: CalendarDay) {
    this.formDate = day.date.toISOString().slice(0, 10);
    this.formTitle = '';
    this.formTeam = this.teams[0]?.id || '';
    this.formObjectives = '';
    this.showForm = true;
  }

  async saveFromCalendar() {
    if (!this.formTitle.trim() || !this.formDate) return;
    const clubId = this.data.currentClub()?.id;
    if (!clubId) return;
    const session = await this.sessionRepo.create({
      club_id: clubId,
      team_id: this.formTeam,
      title: this.formTitle.trim(),
      description: null,
      location: this.formLocation.trim() || null,
      date: this.formDate,
      start_time: this.formStart,
      end_time: this.formEnd,
      status: 'draft',
      notes: null,
      objectives: this.formObjectives.trim() || null,
    });
    this.showForm = false;
    if (session) {
      this.router.navigate(['/sessions', session.id, 'builder']);
    }
  }

  openSessionDetail(s: TrainingSession) {
    this.selectedSession = s;
  }

  goToSession(s: TrainingSession) {
    this.router.navigate(['/sessions', s.id]);
  }

  private fetchSessions(): Promise<TrainingSession[]> {
    const first = new Date(this.year, this.month, 1);
    const last = new Date(this.year, this.month + 1, 0);
    const from = new Date(first);
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
    const to = new Date(last);
    to.setDate(to.getDate() + (7 - ((to.getDay() + 6) % 7) - 1));
    return this.data.getSessionsByDateRange(
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10)
    );
  }

  private buildDays() {
    const first = new Date(this.year, this.month, 1);
    const last = new Date(this.year, this.month + 1, 0);
    const from = new Date(first);
    from.setDate(from.getDate() - ((from.getDay() + 6) % 7));
    const to = new Date(last);
    to.setDate(to.getDate() + (7 - ((to.getDay() + 6) % 7) - 1));
    this.days = [];
    const current = new Date(from);
    while (current <= to) {
      const dateStr = current.toISOString().slice(0, 10);
      const daySessions = this.sessions.filter(s => s.date === dateStr);
      this.days.push({
        date: new Date(current),
        otherMonth: current.getMonth() !== this.month,
        isToday: this.isSameDay(current, this.today),
        sessions: daySessions,
      });
      current.setDate(current.getDate() + 1);
    }
  }

  private isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
}

interface CalendarDay {
  date: Date;
  otherMonth: boolean;
  isToday: boolean;
  sessions: TrainingSession[];
}
