import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import type { Exercise } from '../../core/models/models';

@Component({
  selector: 'app-exercise-form',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <a routerLink="/exercises" class="back-link">
            <span class="material-symbols-outlined">arrow_back</span>
            Volver a ejercicios
          </a>
          <h2 class="page-title">{{ editing ? 'Editar Ejercicio' : 'Nuevo Ejercicio' }}</h2>
        </div>
      </header>

      <div class="card" *ngIf="!loading; else loadingTpl">
        <div class="form-body">
          <label class="field"><span>Nombre</span><input class="field-input" [(ngModel)]="formName" placeholder="Triángulo Ofensivo"/></label>
          <label class="field"><span>Descripción</span><textarea class="field-input field-textarea" [(ngModel)]="formDescription" rows="2" placeholder="Descripción del ejercicio..."></textarea></label>
          <label class="field"><span>Objetivos</span><textarea class="field-input field-textarea" [(ngModel)]="formObjectives" rows="2" placeholder="Mejorar pases, crear espacios..."></textarea></label>
          <div class="field-row">
            <label class="field flex-1"><span>Duración (min)</span><input class="field-input" type="number" [(ngModel)]="formDuration"/></label>
            <label class="field flex-1"><span>Jugadores min</span><input class="field-input" type="number" [(ngModel)]="formPlayersMin"/></label>
            <label class="field flex-1"><span>Jugadores max</span><input class="field-input" type="number" [(ngModel)]="formPlayersMax"/></label>
          </div>
          <label class="field"><span>Tags (coma separados)</span><input class="field-input" [(ngModel)]="formTags" placeholder="Pases, Intermedio"/></label>
          <fieldset class="diagrams-section">
            <legend>Diagramas</legend>
            <div class="diagram-item" *ngFor="let d of formDiagrams; let i = index">
              <input class="field-input flex-1" [(ngModel)]="formDiagrams[i].url" placeholder="URL de la imagen"/>
              <input class="field-input flex-1" [(ngModel)]="formDiagrams[i].caption" placeholder="Leyenda (opcional)"/>
              <button class="btn-icon" (click)="removeDiagram(i)"><span class="material-symbols-outlined">close</span></button>
            </div>
            <button class="btn-add-diagram" (click)="addDiagram()"><span class="material-symbols-outlined">add</span> Añadir diagrama</button>
          </fieldset>
        </div>
        <div class="form-actions">
          <button class="btn-cancel" routerLink="/exercises">Cancelar</button>
          <button class="btn-save" (click)="save()" [disabled]="saving">{{ saving ? 'Guardando...' : (editing ? 'Guardar Cambios' : 'Crear Ejercicio') }}</button>
        </div>
      </div>

      <ng-template #loadingTpl>
        <div class="loading"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando...</p></div>
      </ng-template>
    </div>
  `,
  styles: [`
    .page { padding: 40px; max-width: 720px; margin: 0 auto; }
    .page-header { margin-bottom: 32px; }
    .back-link { display: inline-flex; align-items: center; gap: 4px; color: #bdc2ff; text-decoration: none; font-size: 14px; margin-bottom: 16px; }
    .back-link:hover { color: #dfe0ff; }
    .page-title { font-size: 48px; line-height: 56px; font-weight: 800; letter-spacing: -0.02em; color: #dfe0ff; margin: 0; }
    .card { background: #161b48; border: 1px solid rgba(69,70,82,0.2); border-radius: 16px; padding: 32px; }
    .form-body { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
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
    .diagrams-section { border: 1px solid rgba(69,70,82,0.3); border-radius: 8px; padding: 12px; }
    .diagrams-section legend { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; padding: 0 6px; }
    .diagram-item { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
    .diagram-item .field-input { font-size: 12px; }
    .btn-icon {
      background: rgba(255,138,128,0.15); border: none; color: #ff8a80;
      cursor: pointer; padding: 4px; border-radius: 6px;
      display: flex; align-items: center;
    }
    .btn-icon .material-symbols-outlined { font-size: 16px; }
    .btn-add-diagram {
      background: none; border: 1px dashed rgba(69,70,82,0.3);
      color: #908f9d; cursor: pointer; padding: 8px; border-radius: 8px;
      width: 100%; display: flex; align-items: center; gap: 6px; justify-content: center;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 13px;
    }
    .btn-add-diagram:hover { border-color: #bdc2ff; color: #bdc2ff; }
    .form-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-cancel, .btn-save {
      padding: 12px 24px; border-radius: 8px; border: none;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-cancel { background: #212653; color: #c6c5d4; text-decoration: none; }
    .btn-save {
      background: #0068ed; color: white; display: flex; align-items: center; gap: 6px;
    }
    .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-save:not(:disabled):hover { opacity: 0.9; }
    .loading { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 80px; color: #3a3f6a; }
    .loading-icon { font-size: 48px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading p { margin: 0; color: #908f9d; }
  `]
})
export class ExerciseFormComponent implements OnInit {
  private data = inject(DataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = true;
  editing = false;
  saving = false;
  exerciseId: string | null = null;

  formName = '';
  formDescription = '';
  formObjectives = '';
  formDuration: number | null = null;
  formPlayersMin: number | null = null;
  formPlayersMax: number | null = null;
  formTags = '';
  formDiagrams: { url: string; caption?: string }[] = [];

  async ngOnInit() {
    while (!this.data.currentClub()) {
      await new Promise(r => setTimeout(r, 50));
    }
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editing = true;
      this.exerciseId = id;
    }
    await this.load();
  }

  async load() {
    this.loading = true;
    try {
      if (this.editing && this.exerciseId) {
        const exercises = await this.data.getExercises();
        const ex = exercises.find(e => e.id === this.exerciseId);
        if (ex) {
          this.formName = ex.name;
          this.formDescription = ex.description || '';
          this.formObjectives = ex.objectives || '';
          this.formDuration = ex.duration_minutes;
          this.formPlayersMin = ex.players_min;
          this.formPlayersMax = ex.players_max;
          this.formTags = (ex.tags || []).join(', ');
          this.formDiagrams = (ex.diagrams || []).length > 0 ? [...ex.diagrams] : [];
        }
      }
    } catch (e) {
      console.error('Error loading form:', e);
    }
    this.loading = false;
  }

  addDiagram() {
    this.formDiagrams.push({ url: '', caption: '' });
  }

  removeDiagram(i: number) {
    this.formDiagrams.splice(i, 1);
  }

  async save() {
    if (!this.formName.trim() || this.saving) return;
    this.saving = true;
    const payload = {
      club_id: this.data.currentClub()?.id || '',
      category_id: null,
      name: this.formName.trim(),
      description: this.formDescription.trim() || null,
      objectives: this.formObjectives.trim() || null,
      difficulty: 'intermediate' as const,
      duration_minutes: this.formDuration,
      players_min: this.formPlayersMin,
      players_max: this.formPlayersMax,
      diagram_url: this.formDiagrams[0]?.url || null,
      diagrams: this.formDiagrams,
      video_url: null,
      tags: this.formTags.split(',').map(t => t.trim()).filter(Boolean),
    };
    try {
      if (this.editing && this.exerciseId) {
        await this.data.updateExercise(this.exerciseId, payload);
      } else {
        await this.data.createExercise(payload);
      }
      this.router.navigate(['/exercises']);
    } catch (e) {
      console.error('Error saving exercise:', e);
      this.saving = false;
    }
  }
}
