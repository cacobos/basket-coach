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
import type { Club, Tag, ExerciseVariant } from '../../core/models/models';

const FORM_STORAGE_KEY = 'exercise-form-state';
const DIAGRAM_STORAGE_KEY = 'tactics-diagram-export';

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
          <label class="field"><span>Descripción</span><textarea class="field-input field-textarea" [(ngModel)]="formDescription" rows="4" placeholder="Descripción del ejercicio..."></textarea></label>
          <label class="field"><span>Objetivos</span><textarea class="field-input field-textarea" [(ngModel)]="formObjectives" rows="4" placeholder="Mejorar pases, crear espacios..."></textarea></label>
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
              <div class="diagram-preview">
                <img [src]="d.url" alt="Diagrama" class="diagram-img" />
                <input class="field-input" [(ngModel)]="formDiagrams[i].caption" placeholder="Leyenda (opcional)"/>
              </div>
              <button class="btn-icon" (click)="removeDiagram(i)"><span class="material-symbols-outlined">close</span></button>
            </div>
            <div class="diagram-actions">
              <button class="btn-create-diagram" (click)="openTacticsCanvas()">
                <span class="material-symbols-outlined">sports_basketball</span>
                {{ editing ? 'Editar con pizarra táctica' : 'Crear diagrama con pizarra' }}
              </button>
              <button class="btn-add-diagram" (click)="addDiagram()"><span class="material-symbols-outlined">add</span> Añadir URL manual</button>
            </div>
          </fieldset>

          <!-- Inline variant management -->
          <fieldset class="variants-section" *ngIf="editing">
            <legend>Variantes <span class="variant-count" *ngIf="variants.length">({{ variants.length }})</span></legend>
            <div class="variant-item" *ngFor="let v of variants; let i = index">
              <div class="variant-summary" *ngIf="editingVariantId !== v.id" (click)="startEditVariant(v)">
                <strong>{{ v.name }}</strong>
                <span class="variant-summary-desc" *ngIf="v.description">{{ v.description }}</span>
                <button class="btn-icon-small" (click)="$event.stopPropagation(); deleteVariant(v)"><span class="material-symbols-outlined">delete</span></button>
              </div>
              <div class="variant-edit-form" *ngIf="editingVariantId === v.id">
                <input class="field-input" [(ngModel)]="variantEditName" placeholder="Nombre corto (ej: 3x2)"/>
                <textarea class="field-input field-textarea" [(ngModel)]="variantEditDesc" rows="2" placeholder="Descripción adicional..."></textarea>
                <div class="variant-edit-actions">
                  <button class="btn-cancel-small" (click)="cancelEditVariant()">Cancelar</button>
                  <button class="btn-save-small" (click)="saveVariant(v)">Guardar</button>
                </div>
              </div>
            </div>
            <div class="variant-new" *ngIf="!addingVariant">
              <button class="btn-add-variant" (click)="startAddVariant()">
                <span class="material-symbols-outlined">add</span> Añadir variante
              </button>
            </div>
            <div class="variant-edit-form" *ngIf="addingVariant">
              <input class="field-input" [(ngModel)]="variantEditName" placeholder="Nombre corto (ej: 3x2)"/>
              <textarea class="field-input field-textarea" [(ngModel)]="variantEditDesc" rows="2" placeholder="Descripción adicional..."></textarea>
              <div class="variant-edit-actions">
                <button class="btn-cancel-small" (click)="cancelAddVariant()">Cancelar</button>
                <button class="btn-save-small" (click)="createVariant()">Crear</button>
              </div>
            </div>
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
    .page { padding: 40px; max-width: 960px; margin: 0 auto; }
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
    .tag-selector { display: flex; gap: 6px; flex-wrap: wrap; padding: 8px 0; max-height: 116px; overflow-y: auto; }
    .tag-chip {
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 6px 14px; border-radius: 9999px; border: 1px solid rgba(69,70,82,0.3);
      background: transparent; color: #908f9d; cursor: pointer;
      font-family: 'Hanken Grotesk', sans-serif; transition: all 0.15s;
    }
    .tag-chip:hover { border-color: var(--tag-color, #bdc2ff); color: var(--tag-color, #bdc2ff); }
    .tag-chip.active { background: color-mix(in srgb, var(--tag-color, #4f6ef7) 20%, transparent); color: var(--tag-color, #bdc2ff); border-color: var(--tag-color, #4f6ef7); }
    .tag-selector::-webkit-scrollbar { width: 4px; }
    .tag-selector::-webkit-scrollbar-thumb { background: rgba(189,194,255,0.2); border-radius: 2px; }
    .no-tags { font-size: 13px; color: #908f9d; }
    .no-tags a { color: #bdc2ff; }
    .variants-section { border: 1px solid rgba(69,70,82,0.3); border-radius: 8px; padding: 12px; margin-top: 8px; min-width: 0; overflow: visible; }
    .variants-section legend { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; padding: 0 6px; }
    .variant-count { font-weight: 400; color: #908f9d; text-transform: none; letter-spacing: 0; }
    .variant-item { margin-bottom: 6px; max-width: 100%; }
    .variant-summary {
      display: flex; align-items: center; gap: 8px;
      background: #111644; border: 1px solid rgba(69,70,82,0.2);
      border-radius: 8px; padding: 10px 12px; cursor: pointer;
      transition: border-color 0.15s; max-width: 100%; box-sizing: border-box;
    }
    .variant-summary:hover { border-color: #4f6ef7; }
    .variant-summary strong { color: #dfe0ff; font-size: 14px; flex-shrink: 0; }
    .variant-summary-desc { color: #908f9d; font-size: 12px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .btn-icon-small {
      background: rgba(255,138,128,0.15); border: none; color: #ff8a80;
      cursor: pointer; padding: 3px; border-radius: 6px;
      display: flex; align-items: center; flex-shrink: 0;
    }
    .btn-icon-small .material-symbols-outlined { font-size: 16px; }
    .variant-edit-form {
      display: flex; flex-direction: column; gap: 8px;
      background: #111644; border: 1px solid #4f6ef7;
      border-radius: 8px; padding: 12px; margin-bottom: 6px;
      max-width: 100%; box-sizing: border-box;
    }
    .variant-edit-actions { display: flex; gap: 8px; justify-content: flex-end; }
    .btn-cancel-small {
      background: #212653; color: #c6c5d4; border: none;
      padding: 6px 14px; border-radius: 6px; cursor: pointer;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 13px; font-weight: 600;
    }
    .btn-save-small {
      background: #0068ed; color: white; border: none;
      padding: 6px 14px; border-radius: 6px; cursor: pointer;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 13px; font-weight: 600;
    }
    .btn-add-variant {
      display: flex; align-items: center; gap: 6px;
      background: none; border: 1px dashed rgba(69,70,82,0.3);
      color: #908f9d; cursor: pointer; padding: 10px 16px; border-radius: 8px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 13px;
      width: 100%; justify-content: center; box-sizing: border-box;
    }
    .btn-add-variant:hover { border-color: #bdc2ff; color: #bdc2ff; }
    .btn-add-variant .material-symbols-outlined { font-size: 16px; }
    .diagrams-section { border: 1px solid rgba(69,70,82,0.3); border-radius: 8px; padding: 12px; }
    .diagrams-section legend { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; padding: 0 6px; }
    .diagram-item { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; padding: 8px; background: rgba(0,0,0,0.15); border-radius: 8px; }
    .diagram-preview { display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .diagram-img { max-width: 200px; max-height: 120px; border-radius: 6px; object-fit: contain; background: #0a0f3a; border: 1px solid rgba(69,70,82,0.3); }
    .diagram-preview .field-input { font-size: 12px; }
    .btn-icon {
      background: rgba(255,138,128,0.15); border: none; color: #ff8a80;
      cursor: pointer; padding: 4px; border-radius: 6px; margin-top: 4px;
      display: flex; align-items: center;
    }
    .btn-icon .material-symbols-outlined { font-size: 16px; }
    .diagram-actions { display: flex; gap: 8px; }
    .btn-create-diagram {
      display: flex; align-items: center; gap: 6px; flex: 1;
      background: #0068ed; color: white; border: none;
      padding: 10px 16px; border-radius: 8px; cursor: pointer;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 13px; font-weight: 600;
      justify-content: center;
    }
    .btn-create-diagram:hover { opacity: 0.9; }
    .btn-create-diagram .material-symbols-outlined { font-size: 18px; }
    .btn-add-diagram {
      background: none; border: 1px dashed rgba(69,70,82,0.3);
      color: #908f9d; cursor: pointer; padding: 10px 16px; border-radius: 8px;
      display: flex; align-items: center; gap: 6px; justify-content: center;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 13px; white-space: nowrap;
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

  editing = !!this.route.snapshot.paramMap.get('id');
  saving = false;
  exerciseId = this.route.snapshot.paramMap.get('id');

  formName = '';
  formDescription = '';
  formObjectives = '';
  formDiagrams: { url: string; caption?: string }[] = [];

  availableTags: Tag[] = [];
  selectedTagIds = new Set<string>();

  variants: ExerciseVariant[] = [];
  addingVariant = false;
  editingVariantId: string | null = null;
  variantEditName = '';
  variantEditDesc = '';

  private club$ = toObservable(this.data.currentClub).pipe(
    filter((c): c is Club => c !== null)
  );

  vm$ = this.club$.pipe(
    take(1),
    switchMap(club => {
      const tags$ = from(this.exerciseRepo.getTags(club.id));
      const exercise$ = this.exerciseId ? from(this.exerciseRepo.findById(this.exerciseId)) : of(null);
      const variants$ = this.exerciseId ? from(this.exerciseRepo.getVariants(this.exerciseId)) : of([]);
      return forkJoin([tags$, exercise$, variants$]);
    }),
    tap(([tags, exercise, variants]) => {
      this.availableTags = tags;
      this.variants = variants || [];

      this.restoreFormState(exercise);

      const importedDiagrams = sessionStorage.getItem(DIAGRAM_STORAGE_KEY);
      if (importedDiagrams) {
        sessionStorage.removeItem(DIAGRAM_STORAGE_KEY);
        try {
          const diagrams = JSON.parse(importedDiagrams) as { url: string; caption?: string }[];
          if (diagrams.length > 0) {
            this.formDiagrams = this.formDiagrams.concat(diagrams);
          }
        } catch {}
      }

      sessionStorage.removeItem(FORM_STORAGE_KEY);
    }),
    map(() => true),
    catchError(err => {
      this.notification.show(err instanceof Error ? err.message : String(err));
      return of(true);
    }),
    shareReplay(1)
  );

  private restoreFormState(exercise: any) {
    const saved = sessionStorage.getItem(FORM_STORAGE_KEY);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.formName = state.name || '';
        this.formDescription = state.description || '';
        this.formObjectives = state.objectives || '';
        this.selectedTagIds = new Set<string>(state.tagIds || []);
        this.formDiagrams = (state.diagrams || []).length > 0 ? [...state.diagrams] : [];
        return;
      } catch {}
    }

    if (exercise) {
      this.formName = exercise.name;
      this.formDescription = exercise.description || '';
      this.formObjectives = exercise.objectives || '';
      this.selectedTagIds = new Set((exercise.tags || []).map((t: any) => t.id));
      this.formDiagrams = (exercise.diagrams || []).length > 0 ? [...exercise.diagrams] : [];
    }
  }

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

  openTacticsCanvas() {
    const returnUrl = this.exerciseId
      ? `/exercises/${this.exerciseId}/edit`
      : '/exercises/new';
    sessionStorage.setItem(FORM_STORAGE_KEY, JSON.stringify({
      name: this.formName,
      description: this.formDescription,
      objectives: this.formObjectives,
      tagIds: Array.from(this.selectedTagIds),
      diagrams: this.formDiagrams,
      returnUrl,
    }));
    this.router.navigate(['/tactics'], {
      queryParams: { mode: 'exercise-diagram', returnUrl }
    });
  }

  // ── Variant Management ──

  startAddVariant() {
    this.addingVariant = true;
    this.editingVariantId = null;
    this.variantEditName = '';
    this.variantEditDesc = this.formDescription || '';
  }

  cancelAddVariant() {
    this.addingVariant = false;
  }

  startEditVariant(v: ExerciseVariant) {
    this.addingVariant = false;
    this.editingVariantId = v.id;
    this.variantEditName = v.name;
    this.variantEditDesc = v.description || '';
  }

  cancelEditVariant() {
    this.editingVariantId = null;
  }

  async createVariant() {
    if (!this.variantEditName.trim() || !this.exerciseId) return;
    const created = await this.exerciseRepo.createVariant({
      exercise_id: this.exerciseId,
      name: this.variantEditName.trim(),
      description: this.variantEditDesc.trim() || null,
      difficulty: null,
      duration_minutes: null,
      players_min: null,
      players_max: null,
      tags: [],
      diagrams: [],
      notes: null,
    });
    this.variants.push(created);
    this.addingVariant = false;
  }

  async saveVariant(v: ExerciseVariant) {
    if (!this.variantEditName.trim()) return;
    await this.exerciseRepo.updateVariant(v.id, {
      name: this.variantEditName.trim(),
      description: this.variantEditDesc.trim() || null,
    });
    Object.assign(v, {
      name: this.variantEditName.trim(),
      description: this.variantEditDesc.trim() || null,
    });
    this.editingVariantId = null;
  }

  async deleteVariant(v: ExerciseVariant) {
    if (!confirm(`¿Eliminar la variante "${v.name}"?`)) return;
    await this.exerciseRepo.deleteVariant(v.id);
    this.variants = this.variants.filter(x => x.id !== v.id);
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
      duration_minutes: null,
      players_min: null,
      players_max: null,
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
      setTimeout(() => this.saving = false);
    }
  }
}
