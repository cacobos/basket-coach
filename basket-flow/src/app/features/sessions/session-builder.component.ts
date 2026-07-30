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
import type { TrainingSession, Exercise, ExerciseVariant } from '../../core/models/models';

@Component({
  selector: 'app-session-builder',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, AsyncPipe],
  template: `
    <div class="builder-page" *ngIf="vm$ | async as vm; else loadingTpl">
      <header class="builder-header">
        <div>
          <h1 class="page-title">Crear Sesión</h1>
          <p class="page-sub">Diseña la sesión con ejercicios organizados por secciones.</p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" (click)="cancel()">Cancelar</button>
          <button class="btn-primary" (click)="save()" [disabled]="!formTitle.trim() || !formDate">
            <span class="material-symbols-outlined fill">save</span>
            Guardar Sesión
          </button>
        </div>
      </header>

      <div class="builder-body">
        <aside class="metadata-panel">
          <div class="meta-card">
            <h3 class="meta-title">Información General</h3>
            <div class="field">
              <label class="field-label">Título</label>
              <input class="field-input" [(ngModel)]="formTitle" (input)="onTitleEdited()" placeholder="Ej: Fundamentos de Tiro"/>
            </div>
            <div class="field">
              <label class="field-label">Equipo</label>
              <select class="field-input" [(ngModel)]="formTeam" (ngModelChange)="onTeamOrDateChange()">
                <option value="" disabled>Seleccionar equipo...</option>
                <option *ngFor="let t of vm.teams" [value]="t.id">{{ t.name }}</option>
              </select>
            </div>
            <div class="field-row">
              <div class="field flex-1">
                <label class="field-label">Fecha</label>
                <input class="field-input" type="date" [(ngModel)]="formDate" (ngModelChange)="onTeamOrDateChange()"/>
              </div>
            </div>
            <div class="field-row">
              <div class="field flex-1">
                <label class="field-label">Inicio</label>
                <input class="field-input" type="time" [(ngModel)]="formStart"/>
              </div>
              <div class="field flex-1">
                <label class="field-label">Fin</label>
                <input class="field-input" type="time" [(ngModel)]="formEnd"/>
              </div>
            </div>
            <div class="field">
              <label class="field-label">Ubicación</label>
              <input class="field-input" [(ngModel)]="formLocation" placeholder="Gimnasio"/>
            </div>
            <div class="field">
              <label class="field-label">Objetivos</label>
              <textarea class="field-input field-textarea" [(ngModel)]="formObjectives" rows="3" placeholder="Ej: Mejorar el porcentaje de tiro..."></textarea>
            </div>
          </div>

          <div class="meta-card summary-card">
            <h3 class="meta-title">Resumen</h3>
            <div class="summary-row">
              <span class="summary-label">Secciones</span>
              <span class="summary-value">{{ sections.length }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Ejercicios</span>
              <span class="summary-value">{{ totalExercises }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Duración total</span>
              <span class="summary-value">{{ totalDuration }} min</span>
            </div>
          </div>
        </aside>

        <main class="builder-main">
          <div class="sections-list">
            <div class="section-card" *ngFor="let sec of sections; let si = index"
                 [style.border-left-color]="sectionColors[si % sectionColors.length]">
              <div class="section-header">
                <div class="section-handle">
                  <span class="material-symbols-outlined">drag_indicator</span>
                </div>
                <div class="section-title-group">
                  <span class="section-badge" [style.background]="sectionColors[si % sectionColors.length]">{{ sec.name }}</span>
                  <input class="section-name-input" [(ngModel)]="sec.name" (blur)="updateSectionName(sec)" placeholder="Nombre de la sección"/>
                </div>
                <div class="section-duration">
                  <span class="duration-pill">{{ getSectionDuration(sec.id) }} min</span>
                </div>
                <div class="section-actions">
                  <button class="btn-icon" (click)="moveSection(sec, -1)" *ngIf="si > 0" title="Mover arriba">
                    <span class="material-symbols-outlined">keyboard_arrow_up</span>
                  </button>
                  <button class="btn-icon" (click)="moveSection(sec, 1)" *ngIf="si < sections.length - 1" title="Mover abajo">
                    <span class="material-symbols-outlined">keyboard_arrow_down</span>
                  </button>
                  <button class="btn-icon btn-icon-danger" (click)="removeSection(sec)" *ngIf="sections.length > 1" title="Eliminar sección">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>

              <div class="section-exercises">
                  <div class="ex-item" *ngFor="let se of getSectionExercises(sec.id); let ei = index">
                    <div class="ex-order">{{ ei + 1 }}</div>
                    <div class="ex-info">
                      <span class="ex-name">{{ getExerciseDisplayName(se) }}</span>
                      <span class="ex-duration">{{ se.duration_minutes }} min</span>
                    </div>
                    <div class="ex-notes-group" *ngIf="!editingNotes.has(se.id)">
                      <span class="ex-notes-text" (click)="editNotes(se)" [class.has-notes]="se.notes">
                        {{ se.notes || 'Añadir nota...' }}
                      </span>
                      <button class="btn-icon btn-icon-small" (click)="editNotes(se)" title="Editar nota">
                        <span class="material-symbols-outlined">edit</span>
                      </button>
                    </div>
                    <div class="ex-notes-edit" *ngIf="editingNotes.has(se.id)">
                      <input class="field-input ex-notes-input" [(ngModel)]="se.notes" (keyup.enter)="saveNotes(se)" placeholder="Observaciones..."/>
                      <button class="btn-icon btn-icon-small btn-icon-save" (click)="saveNotes(se)" title="Guardar nota">
                        <span class="material-symbols-outlined">check</span>
                      </button>
                    </div>
                    <button class="btn-icon btn-icon-small" (click)="moveExercise(sec, se, -1)" *ngIf="ei > 0" title="Mover arriba">
                      <span class="material-symbols-outlined">arrow_upward</span>
                    </button>
                    <button class="btn-icon btn-icon-small" (click)="moveExercise(sec, se, 1)" *ngIf="ei < getSectionExercises(sec.id).length - 1" title="Mover abajo">
                      <span class="material-symbols-outlined">arrow_downward</span>
                    </button>
                    <button class="btn-icon btn-icon-danger" (click)="removeExFromSection(se)">
                      <span class="material-symbols-outlined">remove_circle</span>
                    </button>
                  </div>
                  <div class="ex-empty" *ngIf="getSectionExercises(sec.id).length === 0">
                    <span class="material-symbols-outlined">drag_indicator</span>
                    <span>Arrastra o añade ejercicios desde abajo</span>
                  </div>
              </div>

                <div class="section-add-ex" *ngIf="sectionAddForms[sec.id]?.show; else addExToggle">
                  <select class="field-input add-ex-select" [(ngModel)]="sectionAddForms[sec.id].exerciseId" (ngModelChange)="onExerciseChange(sec)">
                    <option value="">Seleccionar ejercicio...</option>
                    <option *ngFor="let e of vm.exercises" [value]="e.id">{{ e.name }}</option>
                  </select>
                  <select class="field-input add-ex-variant" *ngIf="sectionAddForms[sec.id].variants.length > 0" [(ngModel)]="sectionAddForms[sec.id].variantId">
                    <option *ngFor="let v of sectionAddForms[sec.id].variants" [value]="v.id">{{ v.name }}</option>
                  </select>
                  <input class="field-input add-ex-dur" type="number" [(ngModel)]="sectionAddForms[sec.id].duration" min="1" max="120" placeholder="min"/>
                  <button class="btn-add-ex" (click)="addExerciseToSection(sec)" [disabled]="!sectionAddForms[sec.id].exerciseId">
                    <span class="material-symbols-outlined">add</span>
                    Añadir
                  </button>
                  <button class="btn-cancel-ex" (click)="closeAddForm(sec)">Cancelar</button>
                </div>
                <ng-template #addExToggle>
                  <div class="section-add-toggle">
                    <button class="btn-add-ex-toggle" (click)="openAddForm(sec)">
                      <span class="material-symbols-outlined">add</span>
                      Añadir ejercicio
                    </button>
                  </div>
                </ng-template>
            </div>

            <button class="add-section-btn" (click)="addSection()">
              <span class="material-symbols-outlined">add</span>
              Añadir Sección
            </button>
          </div>
        </main>
      </div>
    </div>

    <ng-template #loadingTpl>
      <div class="builder-page"><div class="loading-state"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando...</p></div></div>
    </ng-template>
  `,
  styles: [`
    .builder-page {
      padding: 40px;
      max-width: 1440px;
      margin: 0 auto;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .builder-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      margin-bottom: 32px;
      flex-shrink: 0;
    }
    .page-title {
      font-size: 48px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #dfe0ff;
      margin: 0;
    }
    .page-sub {
      font-size: 18px;
      color: #c6c5d4;
      margin: 4px 0 0;
    }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .btn-primary, .btn-secondary {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 24px; border-radius: 12px;
      border: none; font-weight: 700; font-size: 15px;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-primary {
      background: #0068ed; color: #f2f3ff;
      box-shadow: 0 8px 24px rgba(0,104,237,0.2);
    }
    .btn-primary:hover:not(:disabled) { transform: scale(1.03); opacity: 0.95; }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-primary .fill { font-variation-settings: 'FILL' 1; }
    .btn-secondary { background: #212653; color: #c6c5d4; }
    .btn-secondary:hover { background: #2a3160; }
    .builder-body { display: flex; gap: 32px; flex: 1; min-height: 0; }

    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; }
    .loading-icon { font-size: 48px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Metadata panel */
    .metadata-panel { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }
    .meta-card {
      background: #161b48;
      border-radius: 16px;
      padding: 24px;
      border: 1px solid rgba(69,70,82,0.2);
    }
    .meta-title {
      font-size: 16px;
      font-weight: 700;
      color: #dfe0ff;
      margin: 0 0 20px;
    }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .field:last-child { margin-bottom: 0; }
    .field-label {
      font-size: 11px; font-weight: 700;
      color: #908f9d; text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .field-row { display: flex; gap: 12px; }
    .flex-1 { flex: 1; }
    .field-input {
      background: #111644; border: 1px solid rgba(69,70,82,0.3);
      color: #dfe0ff; border-radius: 8px; padding: 10px 12px;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 14px; outline: none; width: 100%; box-sizing: border-box;
    }
    .field-input:focus { border-color: #bdc2ff; }
    .field-textarea { resize: vertical; min-height: 60px; }

    .summary-card { }
    .summary-row {
      display: flex; justify-content: space-between;
      padding: 8px 0; border-bottom: 1px solid rgba(69,70,82,0.15);
    }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { font-size: 13px; color: #908f9d; }
    .summary-value { font-size: 14px; font-weight: 700; color: #bdc2ff; }

    /* Main builder area */
    .builder-main { flex: 1; min-width: 0; }
    .sections-list { display: flex; flex-direction: column; gap: 16px; }

    .section-card {
      background: #161b48;
      border-radius: 16px;
      border-left: 4px solid #0068ed;
      padding: 20px;
      border: 1px solid rgba(69,70,82,0.2);
      border-left-width: 4px;
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .section-handle { color: #3a3f6a; cursor: grab; display: flex; }
    .section-handle .material-symbols-outlined { font-size: 20px; }
    .section-title-group { flex: 1; display: flex; align-items: center; gap: 8px; }
    .section-badge {
      font-size: 10px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 4px 10px; border-radius: 9999px;
      color: white;
    }
    .section-name-input {
      background: transparent; border: 1px solid transparent;
      color: #dfe0ff; font-size: 16px; font-weight: 700;
      font-family: 'Hanken Grotesk', sans-serif;
      padding: 4px 8px; border-radius: 6px; outline: none; flex: 1;
    }
    .section-name-input:focus { border-color: rgba(189,194,255,0.3); background: rgba(0,0,0,0.2); }
    .section-duration { }
    .duration-pill {
      font-size: 11px; font-weight: 700;
      padding: 4px 10px; border-radius: 9999px;
      background: rgba(0,104,237,0.15); color: #bdc2ff;
    }
    .section-actions { display: flex; gap: 4px; }
    .btn-icon {
      background: none; border: none; color: #908f9d;
      cursor: pointer; padding: 4px; display: flex; border-radius: 4px;
      transition: all 0.15s;
    }
    .btn-icon:hover { color: #dfe0ff; background: rgba(255,255,255,0.05); }
    .btn-icon-danger:hover { color: #ff8a80; background: rgba(255,138,128,0.1); }
    .btn-icon .material-symbols-outlined { font-size: 18px; }

    /* Exercises inside section */
    .section-exercises { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .ex-item {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(0,0,0,0.2);
      border-radius: 10px;
      padding: 10px 14px;
    }
    .ex-order {
      width: 26px; height: 26px; border-radius: 50%;
      background: rgba(189,194,255,0.1);
      color: #bdc2ff;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; flex-shrink: 0;
    }
    .ex-info { flex: 1; display: flex; align-items: center; gap: 10px; }
    .ex-name { color: #dfe0ff; font-size: 14px; font-weight: 600; }
    .ex-duration { font-size: 12px; color: #908f9d; white-space: nowrap; }
    .ex-notes-input {
      min-width: 120px; max-width: 200px;
      padding: 6px 10px !important; font-size: 12px !important;
    }
    .ex-notes-group {
      display: flex; align-items: center; gap: 4px;
      flex: 1; min-width: 0;
    }
    .ex-notes-text {
      font-size: 12px; color: #3a3f6a; cursor: pointer;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      flex: 1; min-width: 0;
    }
    .ex-notes-text.has-notes { color: #908f9d; }
    .ex-notes-edit {
      display: flex; align-items: center; gap: 4px; flex: 1;
    }
    .btn-icon-small { padding: 2px !important; }
    .btn-icon-small .material-symbols-outlined { font-size: 14px !important; }
    .btn-icon-save { color: #4caf50 !important; }
    .btn-icon-save:hover { background: rgba(76,175,80,0.1) !important; }
    .ex-empty {
      text-align: center; color: #3a3f6a; font-size: 13px;
      padding: 24px; display: flex; align-items: center;
      justify-content: center; gap: 8px;
    }
    .ex-empty .material-symbols-outlined { font-size: 18px; }

    /* Add exercise row */
    .section-add-ex {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .add-ex-variant { min-width: 140px; }
    .add-ex-select { flex: 1; min-width: 160px; }
    .add-ex-dur { width: 70px !important; }
    .add-ex-notes { flex: 1; min-width: 120px; }
    .btn-add-ex {
      display: flex; align-items: center; gap: 4px;
      background: #0068ed; color: white;
      border: none; border-radius: 8px;
      padding: 8px 14px;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-add-ex:hover:not(:disabled) { opacity: 0.9; }
    .btn-add-ex:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-add-ex .material-symbols-outlined { font-size: 16px; }
    .btn-cancel-ex {
      background: none; border: 1px solid rgba(69,70,82,0.3);
      color: #908f9d; border-radius: 8px; padding: 8px 14px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: all 0.2s; white-space: nowrap;
    }
    .btn-cancel-ex:hover { border-color: #bdc2ff; color: #bdc2ff; }
    .section-add-toggle { margin-top: 8px; }
    .btn-add-ex-toggle {
      display: flex; align-items: center; gap: 4px;
      background: none; border: 1px dashed rgba(69,70,82,0.3);
      color: #3a3f6a; cursor: pointer; padding: 8px 14px; border-radius: 8px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 13px; font-weight: 600;
      transition: all 0.2s;
    }
    .btn-add-ex-toggle:hover { border-color: #bdc2ff; color: #bdc2ff; }
    .btn-add-ex-toggle .material-symbols-outlined { font-size: 16px; }

    /* Add section button */
    .add-section-btn {
      width: 100%;
      background: none;
      border: 2px dashed rgba(69,70,82,0.3);
      color: #908f9d;
      cursor: pointer;
      padding: 16px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: center;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 15px;
      font-weight: 600;
      transition: all 0.2s;
    }
    .add-section-btn:hover {
      border-color: #bdc2ff;
      color: #bdc2ff;
      background: rgba(189,194,255,0.03);
    }
    .add-section-btn .material-symbols-outlined { font-size: 20px; }
    @media (max-width: 768px) {
      .builder-page { padding: 16px !important; }
      .builder-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
      .page-title { font-size: 28px !important; line-height: 36px !important; }
      .page-sub { font-size: 14px !important; }
      .header-actions { flex-direction: column !important; }
      .header-actions .btn-primary, .header-actions .btn-secondary { width: 100% !important; justify-content: center !important; }
      .builder-body { flex-direction: column !important; gap: 16px !important; }
      .metadata-panel { width: 100% !important; }
      .section-header { flex-wrap: wrap !important; gap: 8px !important; }
      .section-title-group { min-width: 0 !important; flex-wrap: wrap !important; }
      .section-name-input { width: 100% !important; }
      .section-actions { width: 100% !important; justify-content: flex-end !important; }
      .section-add-ex { flex-direction: column !important; align-items: stretch !important; }
      .add-ex-select { width: 100% !important; }
      .add-ex-dur { width: 100% !important; }
      .add-ex-notes { width: 100% !important; }
      .btn-add-ex { width: 100% !important; justify-content: center !important; }
      .field-row { flex-direction: column !important; }
    }
    @media (max-width: 480px) {
      .builder-page { padding: 12px !important; }
      .page-title { font-size: 22px !important; }
      .ex-item { flex-wrap: wrap !important; }
      .ex-notes { max-width: 100% !important; }
    }
  `]
})
export class SessionBuilderComponent {
  private data = inject(DataService);
  private exerciseRepo = inject(ExerciseRepository);
  private sessionRepo = inject(SessionRepository);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private reload = new Subject<void>();
  editingSession: TrainingSession | null = null;

  teams: Team[] = [];
  exercises: Exercise[] = [];
  sections: SectionVM[] = [];
  sectionExercisesMap: Record<string, ExerciseVM[]> = {};
  exerciseNames: Record<string, string> = {};
  variantNames: Record<string, string> = {};

  formTitle = '';
  formTeam = '';
  formDate = '';
  formStart = '16:00';
  formEnd = '17:30';
  formLocation = '';
  formObjectives = '';

  sectionAddForms: Record<string, SectionAddForm> = {};
  editingNotes: Set<string> = new Set();
  autoTitle = true;

  sectionColors = ['#0068ed', '#00c853', '#ff9100', '#e040fb', '#00bcd4', '#ff6d00'];

  readonly vm$ = toObservable(this.data.currentClub).pipe(
    filter(Boolean),
    switchMap(club => this.reload.pipe(
      startWith(undefined),
      switchMap(() => forkJoin({
        teams: from(this.data.getTeams()),
        exercises: from(this.exerciseRepo.findAll(club.id)),
      }).pipe(
        catchError(err => {
          console.error(err);
          return of({ teams: [] as Team[], exercises: [] as Exercise[] });
        })
      )),
      tap(({ teams, exercises }) => {
        this.teams = teams;
        this.exercises = exercises;
        exercises.forEach(e => this.exerciseNames[e.id] = e.name);
      }),
      switchMap(({ teams, exercises }) => {
        if (teams.length > 0 && !this.formTeam) this.formTeam = teams[0].id;
        if (!this.formDate) this.formDate = new Date().toISOString().slice(0, 10);
        if (this.sections.length === 0) this.initSections();

        const sessionId = this.route.snapshot.paramMap.get('id');
        if (sessionId && !this.editingSession) {
          this.loadEditingSession(sessionId);
        }

        if (!this.editingSession && !this.formTitle) {
          this.updateDefaultTitle();
        }

        const exerciseNames: Record<string, string> = {};
        exercises.forEach(e => exerciseNames[e.id] = e.name);
        return from(this.exerciseRepo.getVariantsByExerciseIds(exercises.map(e => e.id))).pipe(
          map(allVariants => {
            const variantNames: Record<string, string> = {};
            allVariants.forEach(v => { variantNames[v.id] = v.name; });
            this.variantNames = variantNames;
            return { teams, exercises, exerciseNames, variantNames };
          })
        );
      })
    ))
  );

  initSections() {
    this.sections = [];
    this.sectionExercisesMap = {};
    this.addDefaultSections();
  }

  addDefaultSections() {
    const defaults = ['Calentamiento', 'Parte Principal', 'Vuelta a la Calma'];
    for (const name of defaults) {
      const id = 'new-' + crypto.randomUUID();
      this.sections.push({ id, name, sort_order: this.sections.length + 1 });
      this.sectionExercisesMap[id] = [];
    }
  }

  private async loadEditingSession(sessionId: string) {
    const clubId = this.data.currentClub()?.id;
    if (!clubId) return;
    const sessions = await this.sessionRepo.findAll(clubId);
    this.editingSession = sessions.find(s => s.id === sessionId) || null;
    if (this.editingSession) {
      this.formTitle = this.editingSession.title;
      this.formTeam = this.editingSession.team_id;
      this.formDate = this.editingSession.date;
      this.formStart = this.editingSession.start_time;
      this.formEnd = this.editingSession.end_time;
      this.formLocation = this.editingSession.location || '';
      this.formObjectives = this.editingSession.objectives || '';

      const dbSections = await this.data.getSections(sessionId);
      const allEx = await this.data.getSessionExercises(sessionId);
      this.sections = [];
      this.sectionExercisesMap = {};
      for (const sec of dbSections) {
        this.sections.push({ id: sec.id, name: sec.name, sort_order: sec.sort_order });
        this.sectionExercisesMap[sec.id] = allEx
          .filter(e => e.section_id === sec.id)
          .map(e => ({ id: e.id, exercise_id: e.exercise_id, variant_id: e.variant_id || null, section_id: e.section_id!, duration_minutes: e.duration_minutes, notes: e.notes, order: e.order }));
      }
      if (this.sections.length === 0) this.addDefaultSections();
    }
  }

  getExerciseDisplayName(se: ExerciseVM): string {
    const exName = this.exerciseNames[se.exercise_id] || 'Ejercicio';
    if (se.variant_id && this.variantNames[se.variant_id]) {
      return `${exName} - ${this.variantNames[se.variant_id]}`;
    }
    return exName;
  }

  getSectionExercises(sectionId: string): ExerciseVM[] {
    return this.sectionExercisesMap[sectionId] || [];
  }

  getSectionDuration(sectionId: string): number {
    return (this.sectionExercisesMap[sectionId] || []).reduce((a, b) => a + b.duration_minutes, 0);
  }

  get totalExercises(): number {
    return Object.values(this.sectionExercisesMap).reduce((a, b) => a + b.length, 0);
  }

  get totalDuration(): number {
    return this.sections.reduce((a, sec) => a + this.getSectionDuration(sec.id), 0);
  }

  addSection() {
    const id = 'new-' + crypto.randomUUID();
    this.sections.push({ id, name: 'Nueva Sección', sort_order: this.sections.length + 1 });
    this.sectionExercisesMap[id] = [];
  }

  removeSection(sec: SectionVM) {
    if (this.sections.length <= 1) return;
    this.sections = this.sections.filter(s => s.id !== sec.id);
    delete this.sectionExercisesMap[sec.id];
  }

  moveSection(sec: SectionVM, dir: number) {
    const idx = this.sections.indexOf(sec);
    const target = idx + dir;
    if (target < 0 || target >= this.sections.length) return;
    this.sections[idx] = this.sections[target];
    this.sections[target] = sec;
    this.sections.forEach((s, i) => s.sort_order = i + 1);
  }

  updateDefaultTitle() {
    if (!this.autoTitle) return;
    const team = this.teams.find(t => t.id === this.formTeam);
    const teamName = team?.name || '';
    const d = this.formDate ? new Date(this.formDate + 'T12:00:00') : null;
    const dateStr = d ? d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
    const parts = [teamName, dateStr].filter(Boolean);
    this.formTitle = parts.join(' - ');
  }

  onTitleEdited() { this.autoTitle = false; }

  onTeamOrDateChange() { this.updateDefaultTitle(); }

  updateSectionName(sec: SectionVM) {}

  editNotes(se: ExerciseVM) { this.editingNotes.add(se.id); }

  saveNotes(se: ExerciseVM) { this.editingNotes.delete(se.id); }

  openAddForm(sec: SectionVM) {
    this.sectionAddForms[sec.id] = {
      show: true, exerciseId: '', variantId: '', variants: [], duration: 10, notes: '',
    };
  }

  closeAddForm(sec: SectionVM) {
    delete this.sectionAddForms[sec.id];
  }

  addExerciseToSection(sec: SectionVM) {
    const form = this.sectionAddForms[sec.id];
    if (!form || !form.exerciseId) return;
    const id = 'new-' + crypto.randomUUID();
    const vm: ExerciseVM = {
      id,
      exercise_id: form.exerciseId,
      variant_id: form.variantId || null,
      section_id: sec.id,
      duration_minutes: form.duration,
      notes: form.notes || null,
      order: (this.sectionExercisesMap[sec.id]?.length || 0) + 1,
    };
    this.sectionExercisesMap[sec.id] = [...(this.sectionExercisesMap[sec.id] || []), vm];
    delete this.sectionAddForms[sec.id];
  }

  removeExFromSection(se: ExerciseVM) {
    const list = this.sectionExercisesMap[se.section_id] || [];
    this.sectionExercisesMap[se.section_id] = list.filter(x => x.id !== se.id);
  }

  moveExercise(sec: SectionVM, se: ExerciseVM, dir: number) {
    const list = this.sectionExercisesMap[sec.id] || [];
    const idx = list.indexOf(se);
    const target = idx + dir;
    if (target < 0 || target >= list.length) return;
    list[idx] = list[target];
    list[target] = se;
    list.forEach((e, i) => e.order = i + 1);
    this.sectionExercisesMap[sec.id] = [...list];
  }

  async save() {
    if (!this.formTitle.trim() || !this.formDate) return;
    const clubId = this.data.currentClub()?.id;
    if (!clubId) return;

    let sessionId = this.editingSession?.id;
    if (sessionId) {
      await this.sessionRepo.update(sessionId, {
        title: this.formTitle.trim(),
        team_id: this.formTeam,
        date: this.formDate,
        start_time: this.formStart,
        end_time: this.formEnd,
        location: this.formLocation.trim() || null,
        objectives: this.formObjectives.trim() || null,
      });
    } else {
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
      if (session) sessionId = session.id;
    }
    if (!sessionId) return;

    const existingSections = await this.data.getSections(sessionId);
    const existingExIds = new Set<string>();
    for (const sec of this.sections) {
      const existingSec = sec.id.startsWith('new-') ? null : existingSections.find(s => s.id === sec.id);
      let sectionId: string;
      if (existingSec) {
        await this.data.updateSection(sec.id, { name: sec.name, sort_order: sec.sort_order });
        sectionId = sec.id;
      } else {
        const created = await this.data.createSection({ session_id: sessionId, name: sec.name, sort_order: sec.sort_order });
        if (!created) continue;
        sectionId = created.id;
      }
      for (const ex of this.sectionExercisesMap[sec.id] || []) {
        if (ex.id.startsWith('new-')) {
          const created = await this.data.addSessionExercise({
            session_id: sessionId,
            section_id: sectionId,
            exercise_id: ex.exercise_id,
            variant_id: (ex as any).variant_id || null,
            order: ex.order,
            duration_minutes: ex.duration_minutes,
            notes: ex.notes,
          });
          if (created) existingExIds.add(created.id);
        } else {
          await this.data.updateSessionExercise(ex.id, {
            order: ex.order,
            duration_minutes: ex.duration_minutes,
            notes: ex.notes,
          });
          existingExIds.add(ex.id);
        }
      }
    }
    for (const sec of existingSections) {
      const keeps = this.sections.some(s => s.id === sec.id);
      if (!keeps) await this.data.deleteSection(sec.id);
    }
    const allExistingExs = await this.data.getSessionExercises(sessionId);
    for (const ex of allExistingExs) {
      if (!existingExIds.has(ex.id)) await this.data.removeSessionExercise(ex.id);
    }

    this.router.navigate(['/sessions', sessionId]);
  }

  cancel() {
    if (this.editingSession) {
      this.router.navigate(['/sessions', this.editingSession.id]);
    } else {
      this.router.navigate(['/sessions']);
    }
  }

  onExerciseChange(sec: SectionVM) {
    const form = this.sectionAddForms[sec.id];
    if (!form) return;
    form.variants = [];
    form.variantId = '';
    if (!form.exerciseId) return;
    this.exerciseRepo.getVariants(form.exerciseId).then(variants => {
      form.variants = variants;
      if (variants.length > 0) {
        form.variantId = variants[0].id;
      }
    });
  }
}

interface SectionVM {
  id: string;
  name: string;
  sort_order: number;
}

interface ExerciseVM {
  id: string;
  exercise_id: string;
  variant_id: string | null;
  section_id: string;
  duration_minutes: number;
  notes: string | null;
  order: number;
}

interface SectionAddForm {
  show: boolean;
  exerciseId: string;
  variantId: string;
  variants: ExerciseVariant[];
  duration: number;
  notes: string;
}

interface Team { id: string; name: string; }
