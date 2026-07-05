import { Component, inject } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { from, of, forkJoin } from 'rxjs';
import { switchMap, filter, map, tap, catchError, take, shareReplay } from 'rxjs/operators';
import { ExerciseRepository } from '../../core/repositories/exercise.repository';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import type { Club, Tag } from '../../core/models/models';

@Component({
  selector: 'app-exercise-form',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, FormsModule, RouterLink],
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

      <div class="card" *ngIf="vm$ | async; else loadingTpl">
        <div class="form-body">
          <label class="field"><span>Nombre</span><input class="field-input" [(ngModel)]="formName" placeholder="Triángulo Ofensivo"/></label>
          <label class="field"><span>Descripción</span><textarea class="field-input field-textarea" [(ngModel)]="formDescription" rows="2" placeholder="Descripción del ejercicio..."></textarea></label>
          <label class="field"><span>Objetivos</span><textarea class="field-input field-textarea" [(ngModel)]="formObjectives" rows="2" placeholder="Mejorar pases, crear espacios..."></textarea></label>
          <div class="field-row">
            <label class="field flex-1"><span>Duración (min)</span><input class="field-input" type="number" [(ngModel)]="formDuration"/></label>
            <label class="field flex-1"><span>Jugadores min</span><input class="field-input" type="number" [(ngModel)]="formPlayersMin"/></label>
            <label class="field flex-1"><span>Jugadores max</span><input class="field-input" type="number" [(ngModel)]="formPlayersMax"/></label>
          </div>
          <label class="field"><span>Tags</span>
            <div class="tag-selector">
              <button class="tag-chip" *ngFor="let t of availableTags"
                [class.active]="selectedTagIds.has(t.id)"
                (click)="toggleTag(t.id)"
                [style.--tag-color]="t.color">
                {{ t.name }}
              </button>
              <span class="no-tags" *ngIf="availableTags.length === 0">
                No hay tags. <a routerLink="/exercises/tags">Crear tags</a>
              </span>
            </div>
          </label>
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
    .tag-selector { display: flex; gap: 6px; flex-wrap: wrap; padding: 8px 0; }
    .tag-chip {
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 6px 14px; border-radius: 9999px; border: 1px solid rgba(69,70,82,0.3);
      background: transparent; color: #908f9d; cursor: pointer;
      font-family: 'Hanken Grotesk', sans-serif; transition: all 0.15s;
    }
    .tag-chip:hover { border-color: var(--tag-color, #bdc2ff); color: var(--tag-color, #bdc2ff); }
    .tag-chip.active { background: color-mix(in srgb, var(--tag-color, #4f6ef7) 20%, transparent); color: var(--tag-color, #bdc2ff); border-color: var(--tag-color, #4f6ef7); }
    .no-tags { font-size: 13px; color: #908f9d; }
    .no-tags a { color: #bdc2ff; }
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
    @media (max-width: 768px) {
      .page { padding: 20px !important; }
      .page-title { font-size: 28px !important; line-height: 36px !important; }
      .card { padding: 20px !important; }
      .field-row { flex-direction: column !important; gap: 16px !important; }
      .diagram-item { flex-direction: column !important; align-items: stretch !important; }
      .form-actions { flex-direction: column !important; }
      .form-actions .btn-cancel, .form-actions .btn-save { width: 100% !important; justify-content: center !important; }
    }
    @media (max-width: 480px) {
      .page { padding: 12px !important; }
      .page-title { font-size: 22px !important; }
    }
  `]
})
export class ExerciseFormComponent {
  private exerciseRepo = inject(ExerciseRepository);
  private data = inject(DataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notification = inject(NotificationService);

  editing = false;
  saving = false;
  exerciseId: string | null = null;

  formName = '';
  formDescription = '';
  formObjectives = '';
  formDuration: number | null = null;
  formPlayersMin: number | null = null;
  formPlayersMax: number | null = null;
  formDiagrams: { url: string; caption?: string }[] = [];

  availableTags: Tag[] = [];
  selectedTagIds = new Set<string>();

  private club$ = toObservable(this.data.currentClub).pipe(
    filter((c): c is Club => c !== null)
  );

  vm$ = this.club$.pipe(
    take(1),
    switchMap(club => {
      const id = this.route.snapshot.paramMap.get('id');
      this.editing = !!id;
      this.exerciseId = id;

      const tags$ = from(this.exerciseRepo.getTags(club.id));
      const exercise$ = id ? from(this.exerciseRepo.findById(id)) : of(null);
      return forkJoin([tags$, exercise$]);
    }),
    tap(([tags, exercise]) => {
      this.availableTags = tags;
      if (exercise) {
        this.formName = exercise.name;
        this.formDescription = exercise.description || '';
        this.formObjectives = exercise.objectives || '';
        this.formDuration = exercise.duration_minutes;
        this.formPlayersMin = exercise.players_min;
        this.formPlayersMax = exercise.players_max;
        this.selectedTagIds = new Set((exercise.tags || []).map((t: any) => t.id));
        this.formDiagrams = (exercise.diagrams || []).length > 0 ? [...exercise.diagrams] : [];
      }
      const importedDiagrams = sessionStorage.getItem('tactics-diagram-export');
      if (importedDiagrams) {
        sessionStorage.removeItem('tactics-diagram-export');
        try {
          const diagrams = JSON.parse(importedDiagrams) as { url: string; caption?: string }[];
          if (diagrams.length > 0) {
            this.formDiagrams = diagrams;
          }
        } catch {}
      }
    }),
    map(() => true),
    catchError(err => {
      this.notification.show(err instanceof Error ? err.message : String(err));
      return of(true);
    }),
    shareReplay(1)
  );

  toggleTag(tagId: string) {
    if (this.selectedTagIds.has(tagId)) {
      this.selectedTagIds.delete(tagId);
    } else {
      this.selectedTagIds.add(tagId);
    }
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
      tags: [] as any[],
    };
    try {
      if (this.editing && this.exerciseId) {
        await this.exerciseRepo.update(this.exerciseId, payload);
        await this.exerciseRepo.updateExerciseTags(this.exerciseId, Array.from(this.selectedTagIds));
      } else {
        const created = await this.exerciseRepo.create(payload);
        if (this.selectedTagIds.size > 0) {
          await this.exerciseRepo.updateExerciseTags(created.id, Array.from(this.selectedTagIds));
        }
      }
      this.router.navigate(['/exercises']);
    } catch (e) {
      this.notification.show(e instanceof Error ? e.message : String(e));
      this.saving = false;
    }
  }
}
