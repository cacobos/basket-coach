import { Component, inject, computed, signal } from '@angular/core';
import { NgFor, NgIf, SlicePipe, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, forkJoin, from, of } from 'rxjs';
import { startWith, switchMap, filter, map, catchError } from 'rxjs/operators';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DataService } from '../../core/services/data.service';
import { SessionRepository } from '../../core/repositories/session.repository';
import { NotificationService } from '../../core/services/notification.service';
import { CalendarComponent } from '../calendar/calendar.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import type { TrainingSession, Team } from '../../core/models/models';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [NgFor, NgIf, SlicePipe, FormsModule, AsyncPipe, CalendarComponent, EmptyStateComponent],
  template: `
    <div class="page" *ngIf="vm$ | async as vm; else loadingTpl">
      <header class="page-header">
        <div>
          <h2 class="page-title">Planificador de Sesiones</h2>
          <p class="page-sub">Diseña la próxima práctica. Organiza ejercicios por secciones.</p>
        </div>
        <button class="btn-primary" (click)="openCreate(vm)">
          <span class="material-symbols-outlined fill">add</span>
          Nueva Sesión
        </button>
      </header>

      <div class="view-toggle" role="tablist" aria-label="Vista de sesiones">
        <button type="button" role="tab" [class.active]="view() === 'list'" [attr.aria-selected]="view() === 'list'" (click)="setView('list')">Lista</button>
        <button type="button" role="tab" [class.active]="view() === 'calendar'" [attr.aria-selected]="view() === 'calendar'" (click)="setView('calendar')">Calendario</button>
      </div>

      @if (view() === 'calendar') {
        <app-calendar [embedded]="true" />
      } @else {
        <div class="session-list">
          <div class="session-card" *ngFor="let session of vm.sessions"
               (click)="router.navigate(['/sessions', session.id])">
            <div class="session-date">
              <span class="session-day">{{ session.date | slice:8:10 }}</span>
              <span class="session-month">{{ monthNames[+session.date.slice(5,7) - 1] }}</span>
            </div>
            <div class="session-info">
              <h3 class="session-name">{{ session.title }}</h3>
              <div class="session-meta">
                <span><span class="material-symbols-outlined">schedule</span>{{ session.start_time.slice(0,5) }} - {{ session.end_time.slice(0,5) }}</span>
                <span><span class="material-symbols-outlined">groups</span>{{ vm.teamNames[session.team_id] || '—' }}</span>
                <span *ngIf="session.objectives"><span class="material-symbols-outlined">track_changes</span>{{ session.objectives }}</span>
              </div>
            </div>
            <div class="session-status" [class.completed]="session.status === 'completed'" [class.draft]="session.status === 'draft'" [class.cancelled]="session.status === 'cancelled'">
              {{ statusLabel(session.status) }}
            </div>
            <button class="session-delete" (click)="$event.stopPropagation(); deleteSession(session)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
          <app-empty-state
            *ngIf="vm.sessions.length === 0"
            icon="calendar_month"
            title="No hay sesiones planificadas"
            hint="Crea tu primera sesión o pulsa un día del calendario para empezar."
            ctaLabel="Nueva sesión"
            (ctaAction)="openCreate(vm)"
          />
        </div>
      }

      <div class="modal-overlay" *ngIf="showForm" (click)="showForm = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Nueva Sesión</h3>
          <div class="modal-body">
            <label class="field"><span>Título</span><input class="field-input" [(ngModel)]="formTitle" placeholder="Shooting Drills"/></label>
            <label class="field"><span>Equipo</span>
              <select class="field-input" [(ngModel)]="formTeam">
                <option *ngFor="let t of vm.teams" [value]="t.id">{{ t.name }}</option>
              </select>
            </label>
            <label class="field"><span>Fecha</span><input class="field-input" type="date" [(ngModel)]="formDate"/></label>
            <div class="field-row">
              <label class="field flex-1"><span>Hora inicio</span><input class="field-input" type="time" [(ngModel)]="formStart"/></label>
              <label class="field flex-1"><span>Hora fin</span><input class="field-input" type="time" [(ngModel)]="formEnd"/></label>
            </div>
            <label class="field"><span>Ubicación</span><input class="field-input" [(ngModel)]="formLocation" placeholder="Gimnasio Principal"/></label>
            <label class="field"><span>Objetivos</span><textarea class="field-input field-textarea" [(ngModel)]="formObjectives" rows="2" placeholder="Mejorar transición ofensiva..."></textarea></label>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="closeForm()">Cancelar</button>
            <button class="btn-save" (click)="save()">Crear</button>
          </div>
        </div>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div class="loading-state"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando sesiones...</p></div>
    </ng-template>
  `,
  styles: [`
    .page { padding: 40px; max-width: 1440px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 48px; }
    .page-title { font-size: 48px; line-height: 56px; font-weight: 800; letter-spacing: -0.02em; color: #dfe0ff; margin: 0; }
    .page-sub { font-size: 18px; line-height: 28px; color: #c6c5d4; margin: 4px 0 0; }
    .btn-primary {
      display: flex; align-items: center; gap: 8px;
      background: #0068ed; color: #f2f3ff;
      padding: 16px 24px; border-radius: 12px;
      border: none; font-weight: 700; font-size: 18px;
      cursor: pointer; transition: all 0.2s;
      box-shadow: 0 8px 24px rgba(0,104,237,0.2);
      white-space: nowrap;
    }
    .btn-primary:hover { transform: scale(1.05); }
    .btn-primary .fill { font-variation-settings: 'FILL' 1; }
    .empty-cta { margin-top: 8px; padding: 12px 20px !important; font-size: 15px !important; }
    .view-toggle {
      display: inline-flex;
      gap: 4px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(69,70,82,0.3);
      border-radius: 10px;
      padding: 4px;
      margin-bottom: 24px;
      width: fit-content;
    }
    .view-toggle button {
      background: none; border: none; border-radius: 7px;
      color: #908f9d; font-family: 'Hanken Grotesk', sans-serif;
      font-size: 13px; font-weight: 700; cursor: pointer;
      padding: 8px 18px; transition: all 0.15s;
    }
    .view-toggle button:hover { color: #dfe0ff; }
    .view-toggle button.active { background: rgba(189,194,255,0.14); color: #bdc2ff; }
    .session-list { display: flex; flex-direction: column; gap: 8px; }
    .session-card {
      display: flex; align-items: center; gap: 20px;
      background: #161b48; border-radius: 12px; padding: 16px 20px;
      border: 1px solid rgba(69,70,82,0.2);
      transition: all 0.2s; cursor: pointer;
    }
    .session-card:hover { background: #212653; border-color: rgba(69,70,82,0.4); }
    .session-delete {
      background: none; border: none; color: #c6c5d4; cursor: pointer;
      padding: 4px; opacity: 0; transition: opacity 0.2s;
    }
    .session-card:hover .session-delete { opacity: 1; }
    .session-delete .material-symbols-outlined { font-size: 18px; }
    .session-date {
      display: flex; flex-direction: column; align-items: center;
      min-width: 56px; padding: 8px 12px;
      background: rgba(189,194,255,0.1); border-radius: 10px;
    }
    .session-day { font-size: 24px; font-weight: 800; color: #bdc2ff; line-height: 1; }
    .session-month { font-size: 10px; color: #c6c5d4; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
    .session-info { flex: 1; min-width: 0; }
    .session-name { font-size: 18px; font-weight: 700; color: #dfe0ff; margin: 0 0 8px; }
    .session-meta { display: flex; gap: 16px; font-size: 12px; color: #c6c5d4; flex-wrap: wrap; }
    .session-meta span { display: flex; align-items: center; gap: 4px; }
    .session-meta .material-symbols-outlined { font-size: 14px; }
    .session-status {
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 6px 12px; border-radius: 9999px; white-space: nowrap;
      background: rgba(189,194,255,0.1); color: #bdc2ff;
    }
    .session-status.completed { background: rgba(0,200,83,0.15); color: #69f0ae; }
    .session-status.draft { background: rgba(255,255,255,0.05); color: #908f9d; }
    .session-status.cancelled { background: rgba(255,138,128,0.15); color: #ff8a80; }
    .empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; }
    .empty-icon, .loading-icon { font-size: 48px; }
    .loading-icon { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state p, .loading-state p { margin: 0; font-size: 16px; }
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
    .modal-title { font-size: 24px; font-weight: 700; color: #dfe0ff; margin: 0; }
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
    @media (max-width: 768px) {
      .page { padding: 20px !important; }
      .page-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
      .page-title { font-size: 28px !important; line-height: 36px !important; }
      .page-sub { font-size: 14px !important; }
      .btn-primary { width: 100% !important; justify-content: center !important; }
      .session-card { flex-wrap: wrap !important; gap: 12px !important; }
      .session-meta { flex-direction: column !important; gap: 4px !important; }
      .session-delete { opacity: 1 !important; }
      .modal-card { margin: 10px !important; padding: 20px !important; }
      .field-row { flex-direction: column !important; }
    }
    @media (max-width: 480px) {
      .page { padding: 12px !important; }
      .page-title { font-size: 22px !important; }
    }
  `]
})
export class SessionsComponent {
  private data = inject(DataService);
  private sessionRepo = inject(SessionRepository);
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);
  private reload = new Subject<void>();

  private queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  readonly view = computed<'list' | 'calendar'>(() =>
    this.queryParams().get('view') === 'calendar' ? 'calendar' : 'list'
  );

  setView(v: 'list' | 'calendar'): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: v === 'calendar' ? 'calendar' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  showForm = false;
  formTitle = '';
  formTeam = '';
  formDate = '';
  formStart = '16:00';
  formEnd = '17:30';
  formLocation = '';
  formObjectives = '';

  monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  readonly vm$ = toObservable(this.data.currentClub).pipe(
    filter(Boolean),
    switchMap(club => this.reload.pipe(
      startWith(undefined),
      switchMap(() => {
        const teams$ = from(this.data.getTeams().catch(e1 => {
          console.error('[Sessions] getTeams error:', e1);
          return [] as Team[];
        }));
        const sessions$ = from(this.sessionRepo.findAll(club.id).catch(e2 => {
          console.error('[Sessions] findAll error:', e2);
          return [] as TrainingSession[];
        }));
        return forkJoin({ teams: teams$, sessions: sessions$ });
      }),
      map(({ teams, sessions }) => ({
        teams,
        sessions,
        teamNames: Object.fromEntries(teams.map(t => [t.id, t.name])),
      }))
    ))
  );

  statusLabel(s: string): string {
    switch (s) {
      case 'completed': return 'Completado';
      case 'draft': return 'Borrador';
      case 'cancelled': return 'Cancelado';
      default: return 'Programado';
    }
  }

  openCreate(vm: { teams: Team[] }) {
    if (vm.teams.length === 0) return;
    this.formTeam = vm.teams[0].id;
    this.formDate = new Date().toISOString().slice(0, 10);
    this.formObjectives = '';
    this.showForm = true;
  }

  async save() {
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
      status: 'planned',
      notes: null,
      objectives: this.formObjectives.trim() || null,
    });
    if (session) {
      await this.data.createSection({ session_id: session.id, name: 'Calentamiento', sort_order: 1 });
      await this.data.createSection({ session_id: session.id, name: 'Parte Principal', sort_order: 2 });
      await this.data.createSection({ session_id: session.id, name: 'Vuelta a la Calma', sort_order: 3 });
      this.router.navigate(['/sessions', session.id, 'builder']);
    } else {
      this.showForm = false;
      this.reload.next();
    }
  }

  async deleteSession(session: TrainingSession) {
    if (!confirm(`¿Eliminar la sesión "${session.title}"?`)) return;
    await this.sessionRepo.remove(session.id);
    this.reload.next();
  }

  closeForm() {
    this.showForm = false;
  }
}
