import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgFor, NgIf, SlicePipe, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { Subject, forkJoin, from } from 'rxjs';
import { startWith, switchMap, map, catchError } from 'rxjs/operators';
import { DataService } from '../../core/services/data.service';
import { SessionRepository } from '../../core/repositories/session.repository';
import { NotificationService } from '../../core/services/notification.service';
import { CalendarComponent } from '../calendar/calendar.component';
import { EmptyStateComponent } from '../../shared/components/empty-state.component';
import type { TrainingSession, Team } from '../../core/models/models';

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [NgFor, NgIf, SlicePipe, FormsModule, AsyncPipe, RouterLink, RouterLinkActive, CalendarComponent, EmptyStateComponent],
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

      <div *ngIf="view() === 'list' && vm.sessions.length === 0" class="empty-state">
        <span class="material-symbols-outlined empty-icon">event_note</span>
        <p>Aún no hay sesiones planificadas.</p>
        <button class="btn-primary empty-cta" (click)="openCreate(vm)">Crear la primera sesión</button>
      </div>

      <div *ngIf="view() === 'list' && vm.sessions.length > 0" class="session-list">
        <a class="session-card" *ngFor="let session of vm.sessions" [routerLink]="['/sessions', session.id]">
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
          <button class="session-delete" (click)="$event.preventDefault(); $event.stopPropagation(); openDeleteConfirm(session)" aria-label="Eliminar sesión">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </a>
      </div>

      <div *ngIf="view() === 'calendar'">
        <app-calendar></app-calendar>
      </div>

      <div class="modal-overlay" *ngIf="showForm" (click)="closeForm()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Nueva Sesión</h3>
          <div class="modal-body">
            <label class="field"><span>Título</span><input class="field-input" [(ngModel)]="formTitle" placeholder="Shooting Drills"/></label>
            <label class="field"><span>Equipo</span>
              <select class="field-input" [(ngModel)]="formTeam">
                <option *ngFor="let t of vm.teams" [ngValue]="t.id">{{ t.name }}</option>
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
            <button class="btn-save" (click)="save(vm)" [disabled]="saving()">{{ saving() ? 'Guardando...' : 'Crear' }}</button>
          </div>
          @if (formError()) {
            <p class="form-error" role="alert">{{ formError() }}</p>
          }
        </div>
      </div>

      @if (confirmOpen()) {
        <div class="modal-overlay" (click)="cancelConfirm()">
          <div class="modal-card confirm-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Confirmar eliminación">
            <span class="confirm-icon"><span class="material-symbols-outlined">warning</span></span>
            <h3 class="modal-title">{{ confirmTitle() }}</h3>
            <p class="confirm-msg">{{ confirmMessage() }}</p>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="cancelConfirm()">Cancelar</button>
              <button class="btn-save btn-danger" (click)="runConfirm()" [disabled]="confirming()">{{ confirming() ? 'Eliminando...' : 'Eliminar' }}</button>
            </div>
          </div>
        </div>
      }
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
      display: inline-flex; background: rgba(189,194,255,0.06);
      border-radius: 12px; padding: 4px; margin-bottom: 32px; gap: 4px;
    }
    .view-toggle button {
      background: transparent; border: none; color: #908f9d;
      padding: 10px 18px; border-radius: 9px; cursor: pointer;
      font-weight: 600; font-size: 15px; transition: all 0.2s;
    }
    .view-toggle button:hover { color: #dfe0ff; }
    .view-toggle button.active { background: rgba(189,194,255,0.14); color: #bdc2ff; }
    .session-list { display: flex; flex-direction: column; gap: 8px; }
    .session-card {
      display: flex; align-items: center; gap: 16px;
      background: #141a4a; border: 1px solid rgba(69,70,82,0.3);
      border-radius: 12px; padding: 16px 20px; text-decoration: none;
      transition: all 0.2s;
    }
    .session-card:hover { background: #212653; border-color: rgba(69,70,82,0.4); }
    .session-delete {
      background: transparent; border: none; color: #908f9d;
      cursor: pointer; padding: 8px; border-radius: 8px; opacity: 0.6;
      transition: all 0.2s;
    }
    .session-card:hover .session-delete { opacity: 1; }
    .session-delete:hover { color: #ff8a80; background: rgba(255,138,128,0.1); }
    .session-delete .material-symbols-outlined { font-size: 18px; }
    .session-date {
      display: flex; flex-direction: column; align-items: center;
      min-width: 56px; padding-right: 16px;
      border-right: 1px solid rgba(255,255,255,0.08);
    }
    .session-day { font-size: 24px; font-weight: 800; color: #bdc2ff; line-height: 1; }
    .session-month { font-size: 10px; color: #c6c5d4; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; }
    .session-info { flex: 1; min-width: 0; }
    .session-name { font-size: 18px; font-weight: 700; color: #dfe0ff; margin: 0 0 8px; }
    .session-meta { display: flex; gap: 16px; font-size: 12px; color: #c6c5d4; flex-wrap: wrap; }
    .session-meta span { display: flex; align-items: center; gap: 4px; }
    .session-meta .material-symbols-outlined { font-size: 14px; }
    .session-status {
      font-size: 12px; font-weight: 600; padding: 4px 10px;
      border-radius: 20px; background: rgba(0,104,237,0.15); color: #7cb3ff;
      white-space: nowrap;
    }
    .session-status.completed { background: rgba(0,200,83,0.15); color: #69f0ae; }
    .session-status.draft { background: rgba(255,255,255,0.05); color: #908f9d; }
    .session-status.cancelled { background: rgba(255,138,128,0.15); color: #ff8a80; }
    .empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; text-align: center; }
    .empty-icon, .loading-icon { font-size: 48px; }
    .loading-icon { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state p, .loading-state p { margin: 0; font-size: 16px; }
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(3,6,30,0.7);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; backdrop-filter: blur(4px);
    }
    .modal-card {
      background: #141a4a; border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px; padding: 32px; width: 100%; max-width: 520px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    }
    .modal-title { font-size: 24px; font-weight: 700; color: #dfe0ff; margin: 0; }
    .modal-body { display: flex; flex-direction: column; gap: 16px; margin-top: 24px; margin-bottom: 24px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field span { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; }
    .field-row { display: flex; gap: 12px; }
    .flex-1 { flex: 1; }
    .field-input {
      background: #212653; border: 1px solid rgba(69,70,82,0.4);
      color: #dfe0ff; padding: 10px 12px; border-radius: 8px;
      font-size: 15px; font-family: inherit; width: 100%; box-sizing: border-box;
    }
    .field-input:focus { outline: none; border-color: #bdc2ff; }
    .field-textarea { resize: vertical; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-cancel, .btn-save {
      padding: 10px 20px; border-radius: 8px; border: none;
      font-weight: 600; font-size: 15px; cursor: pointer;
    }
    .btn-cancel { background: #212653; color: #c6c5d4; }
    .btn-save { background: #0068ed; color: white; }
    .btn-save:hover { opacity: 0.9; }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-danger { background: #d32f2f; }
    .btn-danger:hover { background: #e57373; }
    .confirm-card { max-width: 400px; text-align: center; }
    .confirm-icon {
      width: 48px; height: 48px; border-radius: 50%;
      background: rgba(255,138,128,0.15); color: #ff8a80;
      display: inline-flex; align-items: center; justify-content: center;
      margin-bottom: 16px;
    }
    .confirm-msg { color: #c6c5d4; font-size: 15px; line-height: 24px; margin: 12px 0 24px; }
    .form-error {
      margin: 12px 0 0; font-size: 13px; font-weight: 600;
      color: #ff8a80; background: rgba(255,138,128,0.1);
      border: 1px solid rgba(255,138,128,0.3);
      padding: 8px 12px; border-radius: 8px; text-align: left;
    }
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
      .session-date { min-width: 48px !important; padding-right: 12px !important; }
    }
  `],
})
export class SessionsComponent {
  private data = inject(DataService);
  private sessionRepo = inject(SessionRepository);
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private notification = inject(NotificationService);

  private reload = new Subject<void>();

  private queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  view = signal<'list' | 'calendar'>(this.queryParams()?.get('view') === 'calendar' ? 'calendar' : 'list');

  monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];

  vm$ = this.reload.pipe(
    startWith(null),
    switchMap(() => {
      const club = this.data.currentClub();
      if (!club) return forkJoin({ teams: from(Promise.resolve<Team[]>([])), sessions: from(Promise.resolve<TrainingSession[]>([])) });
      const teams$ = from(this.data.getTeams().catch(() => [] as Team[]));
      const sessions$ = from(this.sessionRepo.findAll(club.id).catch(() => [] as TrainingSession[]));
      return forkJoin({ teams: teams$, sessions: sessions$ });
    }),
    map(({ teams, sessions }) => ({
      teams,
      sessions,
      teamNames: Object.fromEntries(teams.map((t) => [t.id, t.name])),
    })),
    catchError(() =>
      forkJoin({
        teams: from(Promise.resolve<Team[]>([])),
        sessions: from(Promise.resolve<TrainingSession[]>([])),
      }).pipe(map(() => ({ teams: [] as Team[], sessions: [] as TrainingSession[], teamNames: {} as Record<string, string> })))
    )
  );

  showForm = false;
  formTitle = '';
  formTeam = '';
  formDate = '';
  formStart = '18:00';
  formEnd = '20:00';
  formLocation = '';
  formObjectives = '';
  formError = signal('');
  saving = signal(false);

  confirmOpen = signal(false);
  confirmTitle = signal('');
  confirmMessage = signal('');
  confirming = signal(false);

  private pendingDelete: TrainingSession | null = null;

  setView(v: 'list' | 'calendar'): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: v === 'calendar' ? 'calendar' : null },
      queryParamsHandling: 'merge',
    });
    this.view.set(v);
  }

  statusLabel(s: string): string {
    switch (s) {
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      case 'draft': return 'Borrador';
      default: return 'Planificada';
    }
  }

  openCreate(vm: { teams: Team[] }): void {
    this.formTitle = '';
    this.formTeam = vm.teams.length ? vm.teams[0].id : '';
    this.formDate = '';
    this.formLocation = '';
    this.formObjectives = '';
    this.formError.set('');
    this.showForm = true;
  }

  async save(vm: { teams: Team[] }): Promise<void> {
    if (!this.formTitle.trim() || !this.formDate) {
      this.formError.set('El título y la fecha son obligatorios para crear la sesión.');
      return;
    }
    this.formError.set('');
    const club = this.data.currentClub();
    if (!club) return;
    const clubId = club.id;

    this.saving.set(true);
    try {
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
        this.notification.show('Sesión creada', 'success');
        this.showForm = false;
        this.router.navigate(['/sessions', session.id, 'builder']);
      } else {
        this.notification.show('No se pudo crear la sesión', 'error');
        this.showForm = false;
        this.reload.next();
      }
    } catch (err) {
      this.notification.show('Error al crear la sesión', 'error');
      this.formError.set('Ocurrió un error al guardar. Inténtalo de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }

  closeForm(): void {
    this.showForm = false;
  }

  openDeleteConfirm(session: TrainingSession): void {
    this.pendingDelete = session;
    this.confirmTitle.set(`¿Eliminar la sesión "${session.title}"?`);
    this.confirmMessage.set('Esta acción no se puede deshacer. Se eliminarán la sesión y sus secciones asociadas.');
    this.confirmOpen.set(true);
  }

  cancelConfirm(): void {
    this.confirmOpen.set(false);
    this.pendingDelete = null;
  }

  async runConfirm(): Promise<void> {
    if (!this.pendingDelete) {
      this.confirmOpen.set(false);
      return;
    }
    const session = this.pendingDelete;
    this.confirming.set(true);
    try {
      await this.sessionRepo.remove(session.id);
      this.notification.show('Sesión eliminada', 'success');
      this.confirmOpen.set(false);
      this.pendingDelete = null;
      this.reload.next();
    } catch (err) {
      this.notification.show('No se pudo eliminar la sesión', 'error');
      this.confirmOpen.set(false);
      this.pendingDelete = null;
    } finally {
      this.confirming.set(false);
    }
  }
}
