import { Component, inject } from '@angular/core';
import { NgFor, NgIf, AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, forkJoin, from, of } from 'rxjs';
import { startWith, switchMap, filter, map, tap, catchError } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { DataService } from '../../core/services/data.service';
import { ExerciseRepository } from '../../core/repositories/exercise.repository';
import { SessionRepository } from '../../core/repositories/session.repository';
import { NotificationService } from '../../core/services/notification.service';
import type { TrainingSession, SessionSection, SessionExercise, Exercise, ExerciseVariant, Team } from '../../core/models/models';

@Component({
  selector: 'app-session-detail',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, AsyncPipe],
  template: `
    <ng-container *ngIf="vm$ | async as vm; else loadingTpl">
      <div class="detail-page" *ngIf="vm.session; else notFoundTpl">
        <header class="detail-header">
          <button class="btn-back" (click)="goBack()">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="detail-header-info">
            <h1 class="page-title">{{ vm.session.title }}</h1>
            <div class="detail-meta">
              <span class="meta-chip">{{ vm.session.date }}</span>
              <span class="meta-chip">{{ vm.session.start_time.slice(0,5) }} - {{ vm.session.end_time.slice(0,5) }}</span>
              <span class="meta-chip" *ngIf="vm.teamName">{{ vm.teamName }}</span>
              <span class="meta-chip" *ngIf="vm.session.location">{{ vm.session.location }}</span>
              <span class="session-status" [class]="vm.session.status">{{ statusLabel(vm.session.status) }}</span>
            </div>
            <p class="detail-objectives" *ngIf="vm.session.objectives">{{ vm.session.objectives }}</p>
          </div>
          <div class="detail-header-actions">
            <button class="btn-secondary" (click)="goBuilder()">
              <span class="material-symbols-outlined">edit_note</span>
              Editar en Builder
            </button>
            <button class="btn-secondary" (click)="showPdfFormatPicker = true">
              <span class="material-symbols-outlined">picture_as_pdf</span>
              Exportar PDF
            </button>
            <button class="btn-secondary" (click)="editSession()">
              <span class="material-symbols-outlined">edit</span>
              Editar
            </button>
            <button class="btn-secondary" *ngIf="vm.session.status === 'completed'" (click)="goAnalysis()">
              <span class="material-symbols-outlined">insights</span>
              Análisis
            </button>
          </div>
        </header>

        <div class="detail-body">
          <aside class="sections-nav">
            <h3 class="nav-title">Secciones</h3>
            <div class="nav-list">
              <button class="nav-item" *ngFor="let sec of vm.sections; let si = index"
                (click)="scrollToSection(si)">
                <span class="nav-badge" [style.background]="sectionColors[si % sectionColors.length]">{{ sec.name }}</span>
                <span class="nav-duration">{{ getSectionDuration(sec.id) }} min</span>
              </button>
            </div>
            <div class="nav-summary">
              <div class="nav-summary-row">
                <span>Ejercicios</span>
                <strong>{{ vm.totalExercises }}</strong>
              </div>
              <div class="nav-summary-row">
                <span>Duración</span>
                <strong>{{ vm.totalDuration }} min</strong>
              </div>
            </div>
          </aside>

          <main class="detail-main">
            <div class="sections-list">
              <div class="section-card" *ngFor="let sec of vm.sections; let si = index"
                 [id]="'section-' + si"
                 [style.border-left-color]="sectionColors[si % sectionColors.length]">
                <div class="section-header">
                  <span class="section-badge" [style.background]="sectionColors[si % sectionColors.length]">{{ sec.name }}</span>
                  <span class="duration-pill">{{ getSectionDuration(sec.id) }} min</span>
                  <span class="ex-count">{{ getSectionExercises(sec.id).length }} ejercicios</span>
                </div>

                <div class="section-exercises">
                  <div class="ex-item" *ngFor="let se of getSectionExercises(sec.id); let ei = index">
                    <div class="ex-order">{{ ei + 1 }}</div>
                    <div class="ex-info">
                      <div class="ex-name-row">
                        <span class="ex-name">{{ getExerciseDisplayName(se) }}</span>
                        <span class="ex-duration">{{ se.duration_minutes }} min</span>
                      </div>
                      <div class="ex-tags-row" *ngIf="getExerciseTags(se.exercise_id).length">
                        <span class="mini-tag" *ngFor="let t of getExerciseTags(se.exercise_id)">{{ t }}</span>
                      </div>
                      <span class="ex-notes-text" *ngIf="se.notes">{{ se.notes }}</span>
                    </div>
                  </div>
                  <div class="ex-empty" *ngIf="getSectionExercises(sec.id).length === 0">
                    <span class="material-symbols-outlined">fitness_center</span>
                    <span>Sin ejercicios</span>
                  </div>
                </div>
            </div>
            </div>
          </main>
        </div>
      </div>

      <!-- Edit modal -->
      <div class="modal-overlay" *ngIf="showEditForm" (click)="showEditForm = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Editar Sesión</h3>
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
            <button class="btn-cancel" (click)="showEditForm = false">Cancelar</button>
            <button class="btn-save" (click)="saveEdit()">Guardar Cambios</button>
          </div>
        </div>
      </div>
      <!-- PDF format picker -->
      <div class="modal-overlay" *ngIf="showPdfFormatPicker" (click)="showPdfFormatPicker = false">
        <div class="modal-card pdf-format-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Formato del PDF</h3>
          <div class="pdf-format-options">
            <label class="pdf-format-option" [class.selected]="pdfFormat === 'a4'">
              <input type="radio" name="pdfFormat" value="a4" [(ngModel)]="pdfFormat" class="pdf-format-radio"/>
              <div class="pdf-format-content">
                <span class="pdf-format-name">A4</span>
                <span class="pdf-format-desc">210 × 297 mm — tamaño carta estándar</span>
              </div>
              <span class="material-symbols-outlined pdf-format-check">check_circle</span>
            </label>
            <label class="pdf-format-option" [class.selected]="pdfFormat === 'a5'">
              <input type="radio" name="pdfFormat" value="a5" [(ngModel)]="pdfFormat" class="pdf-format-radio"/>
              <div class="pdf-format-content">
                <span class="pdf-format-name">A5</span>
                <span class="pdf-format-desc">148 × 210 mm — mitad de tamaño, TODO reducido proporcionalmente</span>
              </div>
              <span class="material-symbols-outlined pdf-format-check">check_circle</span>
            </label>
          </div>
          <div class="pdf-format-actions">
            <button class="btn-cancel" (click)="showPdfFormatPicker = false">Cancelar</button>
            <button class="btn-save" (click)="confirmPdfFormat()">Exportar</button>
          </div>
        </div>
      </div>
    </ng-container>

    <ng-template #loadingTpl>
      <div class="page"><div class="loading-state"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando sesión...</p></div></div>
    </ng-template>

    <ng-template #notFoundTpl>
      <div class="page"><p class="empty-state">Sesión no encontrada.</p></div>
    </ng-template>
  `,
  styles: [`
    .page { padding: 40px; max-width: 1440px; margin: 0 auto; }
    .detail-page { padding: 40px; max-width: 1440px; margin: 0 auto; min-height: 100vh; }
    .empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; }
    .loading-icon { font-size: 48px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state p, .loading-state p { margin: 0; font-size: 16px; }

    .btn-back {
      background: #212653; border: none; color: #c6c5d4;
      width: 40px; height: 40px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0; transition: all 0.15s;
    }
    .btn-back:hover { background: #2a3160; color: #dfe0ff; }

    .detail-header {
      display: flex; gap: 20px; align-items: flex-start;
      margin-bottom: 32px;
    }
    .detail-header-info { flex: 1; min-width: 0; }
    .page-title {
      font-size: 48px; font-weight: 800; letter-spacing: -0.02em;
      color: #dfe0ff; margin: 0 0 12px;
    }
    .detail-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .meta-chip {
      font-size: 12px; color: #c6c5d4;
      background: rgba(189,194,255,0.08);
      padding: 4px 12px; border-radius: 9999px;
    }
    .detail-objectives { font-size: 15px; color: #908f9d; margin: 8px 0 0; }
    .detail-header-actions { display: flex; gap: 8px; flex-shrink: 0; }
    .btn-secondary {
      display: flex; align-items: center; gap: 6px;
      background: #212653; color: #c6c5d4;
      padding: 10px 18px; border-radius: 10px;
      border: none; font-weight: 600; font-size: 14px;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-secondary:hover { background: #2a3160; color: #dfe0ff; }
    .btn-secondary .material-symbols-outlined { font-size: 18px; }

    .session-status {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 12px; border-radius: 9999px;
    }
    .session-status.completed { background: rgba(0,200,83,0.15); color: #69f0ae; }
    .session-status.draft { background: rgba(255,255,255,0.05); color: #908f9d; }
    .session-status.cancelled { background: rgba(255,138,128,0.15); color: #ff8a80; }
    .session-status.planned { background: rgba(0,104,237,0.15); color: #bdc2ff; }

    .detail-body { display: flex; gap: 32px; }
    .sections-nav { width: 220px; flex-shrink: 0; }
    .nav-title {
      font-size: 12px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.05em; color: #908f9d; margin: 0 0 12px;
    }
    .nav-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
    .nav-item {
      display: flex; align-items: center; gap: 8px;
      background: none; border: none; color: #c6c5d4;
      padding: 8px 12px; border-radius: 8px;
      cursor: pointer; font-family: 'Hanken Grotesk', sans-serif;
      font-size: 13px; text-align: left; transition: all 0.15s;
    }
    .nav-item:hover { background: rgba(255,255,255,0.03); color: #dfe0ff; }
    .nav-badge {
      font-size: 10px; font-weight: 800; text-transform: uppercase;
      padding: 3px 8px; border-radius: 9999px; color: white;
    }
    .nav-duration { margin-left: auto; font-size: 11px; color: #908f9d; }
    .nav-summary {
      background: #161b48; border-radius: 12px;
      padding: 12px 16px; border: 1px solid rgba(69,70,82,0.2);
    }
    .nav-summary-row {
      display: flex; justify-content: space-between;
      font-size: 13px; color: #908f9d; padding: 6px 0;
    }
    .nav-summary-row strong { color: #bdc2ff; }

    .detail-main { flex: 1; min-width: 0; }
    .sections-list { display: flex; flex-direction: column; gap: 16px; }

    .section-card {
      background: #161b48;
      border-radius: 16px;
      border-left: 4px solid #0068ed;
      padding: 20px;
      border: 1px solid rgba(69,70,82,0.2);
      border-left-width: 4px;
      transition: border-color 0.15s;
    }
    .section-card:hover { border-color: rgba(69,70,82,0.4); }
    .section-header {
      display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
    }
    .section-badge {
      font-size: 10px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 10px; border-radius: 9999px; color: white; flex-shrink: 0;
    }
    .duration-pill {
      font-size: 11px; font-weight: 700;
      padding: 4px 10px; border-radius: 9999px;
      background: rgba(0,104,237,0.15); color: #bdc2ff;
    }
    .ex-count {
      font-size: 12px; color: #908f9d; margin-left: auto;
    }
    .btn-icon {
      background: none; border: none; color: #908f9d;
      cursor: pointer; padding: 4px; display: flex; border-radius: 4px;
      transition: all 0.15s;
    }
    .btn-icon:hover { color: #dfe0ff; background: rgba(255,255,255,0.05); }
    .btn-icon-danger:hover { color: #ff8a80; background: rgba(255,138,128,0.1); }
    .btn-icon .material-symbols-outlined { font-size: 18px; }

    .section-exercises {
      display: flex; flex-direction: column; gap: 6px;
      min-height: 40px; border-radius: 8px;
    }
    .ex-item {
      display: flex; align-items: center; gap: 8px;
      background: rgba(0,0,0,0.2);
      border-radius: 10px; padding: 8px 10px;
    }
    .ex-order {
      width: 24px; height: 24px; border-radius: 50%;
      background: rgba(189,194,255,0.1);
      color: #bdc2ff;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }
    .ex-info { flex: 1; min-width: 0; }
    .ex-name-row { display: flex; align-items: center; gap: 10px; }
    .ex-name { color: #dfe0ff; font-size: 14px; font-weight: 600; }
    .ex-duration { font-size: 12px; color: #908f9d; flex-shrink: 0; }
    .ex-notes-text {
      display: block; font-size: 12px; color: #908f9d;
      margin-top: 4px; font-style: italic;
    }
    .ex-empty {
      text-align: center; color: #3a3f6a; font-size: 13px;
      padding: 24px; display: flex; align-items: center;
      justify-content: center; gap: 8px;
    }
    .ex-empty .material-symbols-outlined { font-size: 18px; }
    .mini-tag {
      font-size: 10px; padding: 2px 8px; border-radius: 9999px;
      background: rgba(189,194,255,0.08); color: #bdc2ff;
    }
    .ex-tags-row { display: flex; gap: 4px; flex-wrap: wrap; margin: 4px 0 0; }

    .field-input {
      background: #111644; border: 1px solid rgba(69,70,82,0.3);
      color: #dfe0ff; border-radius: 8px; padding: 10px 12px;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 14px; outline: none; box-sizing: border-box;
    }
    .field-input:focus { border-color: #bdc2ff; }

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
    .confirm-card { max-width: 400px; text-align: center; padding: 40px 32px; }
    .confirm-icon {
      width: 56px; height: 56px; border-radius: 50%;
      background: rgba(255,138,128,0.12);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
    }
    .confirm-icon .material-symbols-outlined { font-size: 28px; color: #ff8a80; }
    .confirm-title {
      font-size: 20px; font-weight: 700; color: #dfe0ff;
      margin: 0 0 8px;
    }
    .confirm-message {
      font-size: 14px; color: #908f9d;
      margin: 0 0 28px; line-height: 1.5;
    }
    .confirm-actions { display: flex; gap: 12px; justify-content: center; }
    .btn-danger {
      padding: 10px 24px; border-radius: 8px; border: none;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 14px; font-weight: 600; cursor: pointer;
      background: #d32f2f; color: white;
      transition: opacity 0.15s;
    }
    .btn-danger:hover { opacity: 0.85; }

    .modal-title { font-size: 24px; font-weight: 700; color: #dfe0ff; margin: 0 0 20px; }
    .modal-body { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field span { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; }
    .field-row { display: flex; gap: 12px; }
    .flex-1 { flex: 1; }
    .field-textarea { resize: vertical; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-cancel, .btn-save {
      padding: 10px 20px; border-radius: 8px; border: none;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-cancel { background: #212653; color: #c6c5d4; }
    .btn-save { background: #0068ed; color: white; }
    .btn-save:hover { opacity: 0.9; }

    .ex-tags-row { display: flex; gap: 4px; flex-wrap: wrap; margin: 4px 0 6px; }
    .mini-tag {
      font-size: 10px; font-weight: 700; color: #bdc2ff;
      background: rgba(0,104,237,0.12);
      padding: 2px 8px; border-radius: 9999px;
    }

    .pdf-format-card { max-width: 400px; }
    .pdf-format-options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
    .pdf-format-option {
      display: flex; align-items: center; gap: 12px;
      background: rgba(0,0,0,0.15); border: 2px solid transparent;
      border-radius: 12px; padding: 16px; cursor: pointer;
      transition: all 0.15s;
    }
    .pdf-format-option:hover { border-color: rgba(189,194,255,0.2); }
    .pdf-format-option.selected { border-color: #0068ed; background: rgba(0,104,237,0.08); }
    .pdf-format-radio { display: none; }
    .pdf-format-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .pdf-format-name { font-size: 16px; font-weight: 700; color: #dfe0ff; }
    .pdf-format-desc { font-size: 12px; color: #908f9d; line-height: 1.3; }
    .pdf-format-check { font-size: 20px; color: transparent; transition: color 0.15s; }
    .pdf-format-option.selected .pdf-format-check { color: #0068ed; }
    .pdf-format-actions { display: flex; gap: 12px; justify-content: flex-end; }

    @media (max-width: 768px) {
      .detail-page { padding: 16px !important; }
      .detail-header { flex-direction: column !important; gap: 16px !important; }
      .page-title { font-size: 28px !important; line-height: 36px !important; }
      .detail-header-actions { width: 100% !important; }
      .detail-header-actions .btn-secondary { flex: 1 !important; justify-content: center !important; }
      .detail-body { flex-direction: column !important; gap: 16px !important; }
      .sections-nav { width: 100% !important; }
      .nav-list { flex-direction: row !important; flex-wrap: wrap !important; }
      .nav-item { flex: 1 !important; min-width: 120px !important; }
      .modal-card { margin: 10px !important; padding: 20px !important; }
      .field-row { flex-direction: column !important; }
    }
    @media (max-width: 480px) {
      .detail-page { padding: 12px !important; }
      .page-title { font-size: 22px !important; }
      .ex-item { flex-wrap: wrap !important; }
      .ex-duration { margin-left: auto !important; }
      .ex-notes { max-width: 100% !important; }
    }
  `]
})
export class SessionDetailComponent {
  private data = inject(DataService);
  private exerciseRepo = inject(ExerciseRepository);
  private sessionRepo = inject(SessionRepository);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notification = inject(NotificationService);
  private reload = new Subject<void>();

  session: TrainingSession | null = null;
  sections: SessionSection[] = [];
  sectionExercises: Record<string, SessionExercise[]> = {};
  exercises: Exercise[] = [];
  teams: Team[] = [];
  exerciseNames: Record<string, string> = {};
  variantNames: Record<string, string> = {};

  showEditForm = false;
  formTitle = '';
  formTeam = '';
  formDate = '';
  formStart = '16:00';
  formEnd = '17:30';
  formLocation = '';
  formObjectives = '';

  showPdfFormatPicker = false;
  pdfFormat: 'a4' | 'a5' = 'a4';

  sectionColors = ['#0068ed', '#00c853', '#ff9100', '#e040fb', '#00bcd4', '#ff6d00'];

  readonly vm$ = toObservable(this.data.currentClub).pipe(
    filter(Boolean),
    switchMap(club => {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) return of(null);
      return this.reload.pipe(
        startWith(undefined),
        switchMap(() => forkJoin({
          teams: from(this.data.getTeams()),
          exercises: from(this.exerciseRepo.findAll(club.id)),
          sessions: from(this.sessionRepo.findAll(club.id)),
        }).pipe(
          switchMap(({ teams, exercises, sessions }) => {
            const session = sessions.find(s => s.id === id) || null;
            if (!session) {
              return of({
                teams, exercises, session: null as TrainingSession | null, sections: [] as SessionSection[],
                sectionExercises: {} as Record<string, SessionExercise[]>,
                exerciseNames: {} as Record<string, string>,
                variantNames: {} as Record<string, string>,
                teamName: '', totalExercises: 0, totalDuration: 0,
              });
            }
            return from(this.data.getSections(id)).pipe(
              switchMap(sections => from(this.data.getSessionExercises(id)).pipe(
                switchMap(allEx => {
                  const sectionExercises: Record<string, SessionExercise[]> = {};
                  for (const sec of sections) {
                    sectionExercises[sec.id] = allEx.filter(e => e.section_id === sec.id);
                  }
                  const exerciseNames: Record<string, string> = {};
                  exercises.forEach(e => exerciseNames[e.id] = e.name);
                  const variantIds = allEx.map(e => e.variant_id).filter(Boolean) as string[];
                  return from(this.exerciseRepo.getVariantsByExerciseIds(exercises.map(e => e.id))).pipe(
                    map(allVariants => {
                      const variantNames: Record<string, string> = {};
                      allVariants.forEach(v => { variantNames[v.id] = v.name; });
                      return {
                        teams,
                        exercises,
                        session,
                        sections,
                        sectionExercises,
                        exerciseNames,
                        variantNames,
                        teamName: teams.find(t => t.id === session.team_id)?.name || '',
                        totalExercises: Object.values(sectionExercises).reduce((a, b) => a + b.length, 0),
                        totalDuration: sections.reduce((a, sec) => a + (sectionExercises[sec.id] || []).reduce((s, e) => s + e.duration_minutes, 0), 0),
                      };
                    })
                  );
                })
              ))
            );
          }),
          tap(vmData => {
            if (vmData) {
              this.session = vmData.session;
              this.sections = vmData.sections;
              this.sectionExercises = vmData.sectionExercises;
              this.exercises = vmData.exercises;
              this.teams = vmData.teams;
              this.exerciseNames = vmData.exerciseNames;
              this.variantNames = vmData.variantNames;
            }
          }),
          catchError(err => {
            this.notification.show(err instanceof Error ? err.message : String(err));
            return of({
              teams: [] as Team[], exercises: [] as Exercise[], session: null as TrainingSession | null,
              sections: [] as SessionSection[], sectionExercises: {} as Record<string, SessionExercise[]>,
              exerciseNames: {} as Record<string, string>, variantNames: {} as Record<string, string>,
              teamName: '', totalExercises: 0, totalDuration: 0,
            });
          })
        ))
      );
    })
  );

  statusLabel(s: string): string {
    switch (s) {
      case 'completed': return 'Completado';
      case 'draft': return 'Borrador';
      case 'cancelled': return 'Cancelado';
      default: return 'Programado';
    }
  }

  protected getExercise(id: string): Exercise | undefined {
    return this.exercises.find(e => e.id === id);
  }

  protected getExerciseTags(id: string): string[] {
    return (this.getExercise(id)?.tags || []).map(t => t.name);
  }

  protected escHtml(s: string): string {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  private async urlToDataUrl(url: string): Promise<string> {
    try {
      const resp = await fetch(url, { credentials: 'include' });
      if (!resp.ok) return '';
      const blob = await resp.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    } catch {
      return '';
    }
  }

  async exportPDF(format: 'a4' | 'a5'): Promise<void> {
    if (!this.session) return;

    const html2canvas = (await import('html2canvas')).default;
    const { default: jsPDF } = await import('jspdf');

    const sectionColors = ['#0068ed', '#00c853', '#ff9100', '#e040fb', '#00bcd4', '#ff6d00'];

    const dateStr = this.formatDate(this.session.date);
    const timeStr = `${this.session.start_time.slice(0,5)} - ${this.session.end_time.slice(0,5)}`;
    const team = this.teams.find(t => t.id === this.session!.team_id)?.name || '';

    const club = this.data.currentClub();
    let clubLogoDataUrl = '';
    if (club?.logo_url) {
      try {
        const resp = await fetch(club.logo_url);
        const blob = await resp.blob();
        clubLogoDataUrl = await new Promise<string>(resolve => {
          const r = new FileReader();
          r.onload = () => resolve(r.result as string);
          r.readAsDataURL(blob);
        });
      } catch { /* ignore */ }
    }

    const diagramCache = new Map<string, string>();
    for (const ex of this.exercises) {
      const diagrams = ex.diagrams || [];
      const url = diagrams.length > 0 ? diagrams[0].url : (ex.diagram_url || '');
      if (url && !diagramCache.has(url)) {
        const dataUrl = await this.urlToDataUrl(url);
        diagramCache.set(url, dataUrl);
      }
    }

    const E = this.escHtml.bind(this);
    const img = (url: string) => {
      const dataUrl = diagramCache.get(url);
      return dataUrl
        ? `<img src="${dataUrl}" alt="" style="max-width:100%;max-height:130px;object-fit:contain;display:block;" />`
        : `<span style="font-size:11px;color:#999;">[Diagrama]</span>`;
    };

    const isA5 = format === 'a5';
    const doc = new jsPDF('p', 'mm', isA5 ? 'a5' : 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = isA5 ? 6 : 10;
    const usableW = pageW - margin * 2;
    const usableH = pageH - margin * 2;

    const renderBlock = async (blockHtml: string): Promise<{ dataUrl: string; heightMm: number } | null> => {
      if (!blockHtml.trim()) return null;
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;left:0;top:0;width:800px;background:#fff;font-family:system-ui,sans-serif;z-index:-1;';
      div.innerHTML = `<div style="padding:6px 10px;color:#1a1a2e;font-size:13px;line-height:1.3;">${blockHtml}</div>`;
      document.body.appendChild(div);
      await new Promise(r => setTimeout(r, 50));
      const canvas = await html2canvas(div, { scale: 1, logging: false });
      document.body.removeChild(div);
      if (canvas.width === 0 || canvas.height === 0) return null;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const ratio = canvas.width / usableW;
      return { dataUrl, heightMm: canvas.height / ratio };
    };

    try {
      // ── Header block ──
      let headerHtml = '';
      headerHtml += `<div style="border-bottom:2px solid #0068ed;padding-bottom:6px;margin-bottom:0;display:flex;justify-content:space-between;align-items:flex-start;">`;
      headerHtml += `<div style="flex:1;">`;
      headerHtml += `<h1 style="font-size:18px;font-weight:800;color:#111;margin:0 0 4px;letter-spacing:-0.02em;">${E(this.session.title)}</h1>`;
      headerHtml += `<div style="display:flex;gap:8px;flex-wrap:wrap;font-size:10px;color:#666;">`;
      headerHtml += `<span>${E(dateStr)}</span>`;
      headerHtml += `<span>${E(timeStr)}</span>`;
      if (team) headerHtml += `<span>${E(team)}</span>`;
      if (this.session.location) headerHtml += `<span>${E(this.session.location)}</span>`;
      headerHtml += `</div>`;
      if (this.session.objectives) {
        headerHtml += `<p style="font-size:11px;color:#444;margin:6px 0 0;line-height:1.3;"><strong>Objetivos:</strong> ${E(this.session.objectives)}</p>`;
      }
      headerHtml += `</div>`;
      if (clubLogoDataUrl) {
        headerHtml += `<img src="${clubLogoDataUrl}" alt="" style="width:36px;height:36px;object-fit:contain;flex-shrink:0;margin-left:8px;" />`;
      }
      headerHtml += `</div>`;

      const headerBlock = await renderBlock(headerHtml);
      let currentY = margin;
      if (headerBlock) {
        doc.addImage(headerBlock.dataUrl, 'JPEG', margin, currentY, usableW, headerBlock.heightMm);
        currentY += headerBlock.heightMm;
      }

      const addMinutes = (t: string, m: number): string => {
        const [h, mm] = t.split(':').map(Number);
        const total = h * 60 + mm + m;
        const hr = Math.floor(total / 60) % 24;
        const mn = total % 60;
        return `${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
      };

      // ── Section blocks ──
      let cumulativeMinutes = 0;
      for (let si = 0; si < this.sections.length; si++) {
        const sec = this.sections[si];
        const color = sectionColors[si % sectionColors.length];
        const dur = this.getSectionDuration(sec.id);
        const exs = this.sectionExercises[sec.id] || [];

        const buildExerciseHtml = (se: SessionExercise, startMin: number): string => {
          const ex = this.getExercise(se.exercise_id);
          const vName = se.variant_id && this.variantNames[se.variant_id] ? ` - ${this.variantNames[se.variant_id]}` : '';
          const exName = (ex?.name || 'Ejercicio') + vName;
          const exDesc = ex?.description || '';
          const exObjectives = ex?.objectives || '';
          const diagrams = ex?.diagrams || [];
          const diagramUrl = diagrams.length > 0 ? diagrams[0].url : (ex?.diagram_url || '');
          const notes = se.notes || '';
          const exDur = se.duration_minutes;
          const st = addMinutes(this.session!.start_time, startMin);
          const et = addMinutes(this.session!.start_time, startMin + exDur);

          let h = `<div style="border:1px solid #e8e8f0;border-radius:6px;margin-bottom:4px;overflow:hidden;background:#fafaff;">`;
          if (diagramUrl && diagramCache.get(diagramUrl)) {
            h += `<div style="display:flex;min-height:80px;">`;
            h += `<div style="width:33%;min-height:80px;background:#f0f0f8;display:flex;align-items:center;justify-content:center;padding:6px;box-sizing:border-box;border-right:1px solid #e8e8f0;">`;
            h += img(diagramUrl);
            h += `</div>`;
            h += `<div style="width:67%;padding:8px 10px;box-sizing:border-box;">`;
          } else {
            h += `<div style="padding:8px 10px;">`;
          }
          h += `<h3 style="margin:0 0 2px;font-size:13px;font-weight:700;color:#1a1a2e;">${E(exName)}</h3>`;
          h += `<div style="font-size:10px;color:#888;margin-bottom:2px;"><span>${exDur} min - ${st} a ${et}</span></div>`;
          if (exDesc) h += `<p style="margin:0 0 2px;font-size:11px;color:#444;line-height:1.3;">${E(exDesc)}</p>`;
          if (exObjectives) h += `<p style="margin:0 0 2px;font-size:10px;color:#666;line-height:1.2;"><strong>Objetivos:</strong> ${E(exObjectives)}</p>`;
          if (notes) h += `<p style="margin:0;font-size:10px;color:#888;line-height:1.2;font-style:italic;">Notas: ${E(notes)}</p>`;
          h += `</div>`;
          if (diagramUrl && diagramCache.get(diagramUrl)) h += `</div>`;
          h += `</div>`;
          return h;
        };

        const buildSectionHtml = (startMin: number, exercises: SessionExercise[]): string => {
          let h = `<div style="margin-bottom:2px;">`;
          h += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">`;
          h += `<span style="display:inline-block;background:${color};color:white;padding:2px 10px;border-radius:9999px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">${E(sec.name)}</span>`;
          h += `<span style="font-size:10px;color:#888;">${dur} min</span>`;
          h += `</div>`;
          if (exercises.length === 0) {
            h += `<div style="border:1px dashed #ddd;border-radius:6px;padding:10px;text-align:center;color:#aaa;font-size:11px;">Sin ejercicios</div>`;
          } else {
            let cum = startMin;
            for (const se of exercises) { h += buildExerciseHtml(se, cum); cum += se.duration_minutes; }
          }
          h += `</div>`;
          return h;
        };

        // Try rendering the full section (header + all exercises) as one block
        const sectionHtml = buildSectionHtml(cumulativeMinutes, exs);
        const sectionBlock = await renderBlock(sectionHtml);

        if (sectionBlock && sectionBlock.heightMm <= usableH) {
          currentY = this.addPdfBlock(doc, pageH, margin, usableW, currentY, sectionBlock);
        } else if (sectionBlock) {
          let firstBlockHtml = '';
          firstBlockHtml += `<div style="margin-bottom:2px;">`;
          firstBlockHtml += `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">`;
          firstBlockHtml += `<span style="display:inline-block;background:${color};color:white;padding:2px 10px;border-radius:9999px;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.05em;">${E(sec.name)}</span>`;
          firstBlockHtml += `<span style="font-size:10px;color:#888;">${dur} min</span>`;
          firstBlockHtml += `</div>`;
          if (exs.length > 0) firstBlockHtml += buildExerciseHtml(exs[0], cumulativeMinutes);
          firstBlockHtml += `</div>`;

          const firstBlock = await renderBlock(firstBlockHtml);
          if (firstBlock) {
            currentY = this.addPdfBlock(doc, pageH, margin, usableW, currentY, firstBlock);
          }

          let cum = cumulativeMinutes + (exs.length > 0 ? exs[0].duration_minutes : 0);
          for (let ei = 1; ei < exs.length; ei++) {
            const exHtml = buildExerciseHtml(exs[ei], cum);
            const exBlock = await renderBlock(exHtml);
            if (exBlock) {
              currentY = this.addPdfBlock(doc, pageH, margin, usableW, currentY, exBlock);
            }
            cum += exs[ei].duration_minutes;
          }
        } else {
          let cum = cumulativeMinutes;
          for (const se of exs) {
            const exHtml = buildExerciseHtml(se, cum);
            const exBlock = await renderBlock(exHtml);
            if (exBlock) {
              currentY = this.addPdfBlock(doc, pageH, margin, usableW, currentY, exBlock);
            }
            cum += se.duration_minutes;
          }
        }

        cumulativeMinutes += exs.reduce((s, e) => s + e.duration_minutes, 0);
      }

      // ── Footer block ──
      const footerDate = new Date().toLocaleDateString('es-ES', { day:'numeric', month:'long', year:'numeric' });
      const footerHtml = `<div style="border-top:1px solid #e8e8f0;padding-top:4px;font-size:9px;color:#aaa;text-align:center;">Generado por Basket Coach - ${footerDate}</div>`;
      const footerBlock = await renderBlock(footerHtml);
      if (footerBlock) {
        currentY = this.addPdfBlock(doc, pageH, margin, usableW, currentY, footerBlock);
      }

      const safeName = this.session.title.replace(/[/\\:*?"<>|]/g, '_');
      doc.save(`${safeName}.pdf`);
    } catch (err) {
      this.notification.show(err instanceof Error ? err.message : String(err));
    }
  }

  private addPdfBlock(doc: any, pageH: number, margin: number, usableW: number, currentY: number, block: { dataUrl: string; heightMm: number }): number {
    if (currentY + block.heightMm > pageH - margin) {
      doc.addPage();
      currentY = margin;
    }
    doc.addImage(block.dataUrl, 'JPEG', margin, currentY, usableW, block.heightMm);
    return currentY + block.heightMm;
  }

  protected formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  confirmPdfFormat() {
    this.showPdfFormatPicker = false;
    this.exportPDF(this.pdfFormat);
  }

  goBack() {
    this.router.navigate(['/sessions']);
  }

  scrollToSection(index: number) {
    const el = document.getElementById('section-' + index);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  editSession() {
    if (!this.session) return;
    this.formTitle = this.session.title;
    this.formTeam = this.session.team_id;
    this.formDate = this.session.date;
    this.formStart = this.session.start_time;
    this.formEnd = this.session.end_time;
    this.formLocation = this.session.location || '';
    this.formObjectives = this.session.objectives || '';
    this.showEditForm = true;
  }

  goAnalysis() {
    if (this.session) this.router.navigate(['/sessions', this.session.id, 'analysis']);
  }

  goBuilder() {
    if (this.session) this.router.navigate(['/sessions', this.session.id, 'builder']);
  }

  async saveEdit() {
    if (!this.session || !this.formTitle.trim() || !this.formDate) return;
    await this.sessionRepo.update(this.session.id, {
      title: this.formTitle.trim(),
      team_id: this.formTeam,
      date: this.formDate,
      start_time: this.formStart,
      end_time: this.formEnd,
      location: this.formLocation.trim() || null,
      objectives: this.formObjectives.trim() || null,
    });
    this.showEditForm = false;
    this.reload.next();
  }

  getExerciseDisplayName(se: SessionExercise): string {
    const exName = this.exerciseNames[se.exercise_id] || 'Ejercicio';
    if (se.variant_id && this.variantNames[se.variant_id]) {
      return `${exName} - ${this.variantNames[se.variant_id]}`;
    }
    return exName;
  }

  getSectionExercises(sectionId: string): SessionExercise[] {
    return this.sectionExercises[sectionId] || [];
  }

  getSectionDuration(sectionId: string): number {
    return (this.sectionExercises[sectionId] || []).reduce((a, b) => a + b.duration_minutes, 0);
  }
}
