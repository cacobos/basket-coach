import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import type { Exercise, ExerciseVariant } from '../../core/models/models';

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule, RouterLink],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h2 class="page-title">Biblioteca de Ejercicios</h2>
          <p class="page-sub">Diseña, organiza y reutiliza ejercicios para tus sesiones.</p>
        </div>
        <div class="header-buttons">
          <a class="btn-secondary" routerLink="/exercises/tags">
            <span class="material-symbols-outlined">sell</span>
            Tags
          </a>
          <a class="btn-primary" routerLink="/exercises/new">
            <span class="material-symbols-outlined fill">add</span>
            Nuevo Ejercicio
          </a>
        </div>
      </header>

      <div class="filters">
        <div class="search-wrap">
          <span class="material-symbols-outlined search-icon">search</span>
          <input class="search-input" placeholder="Buscar ejercicios..." type="text" [(ngModel)]="search"/>
        </div>
        <div class="filter-tags" *ngIf="allTags.length > 0">
          <button class="tag-chip" [class.active]="selectedTags.length === 0" (click)="selectedTags = []">Todos</button>
          <button class="tag-chip" *ngFor="let t of allTags" [class.active]="selectedTags.includes(t)" (click)="toggleTag(t)">{{ t }}</button>
        </div>
      </div>

      <div class="exercise-grid" *ngIf="!loading; else loadingTpl">
        <div class="ex-card" *ngFor="let ex of filtered">
          <div class="ex-body">
            <div class="ex-tags">
              <span class="ex-tag" *ngFor="let tag of (ex.tags || [])">{{ tag }}</span>
            </div>
            <h3 class="ex-title">{{ ex.name }}</h3>
            <p class="ex-desc">{{ ex.description }}</p>
            <p class="ex-objectives" *ngIf="ex.objectives"><span class="obj-label">Objetivos:</span> {{ ex.objectives }}</p>
            <div class="ex-meta">
              <span class="ex-meta-item">
                <span class="material-symbols-outlined">schedule</span>
                {{ ex.duration_minutes ? ex.duration_minutes + ' min' : '—' }}
              </span>
              <span class="ex-meta-item">
                <span class="material-symbols-outlined">people</span>
                {{ ex.players_min || '?' }}-{{ ex.players_max || '?' }}
              </span>
            </div>
          </div>
          <div class="ex-actions">
            <button class="ex-btn" (click)="$event.stopPropagation(); openVariants(ex)" title="Variantes">
              <span class="material-symbols-outlined">call_split</span>
            </button>
            <a class="ex-btn" [routerLink]="['/exercises', ex.id, 'edit']" title="Editar">
              <span class="material-symbols-outlined">edit</span>
            </a>
            <button class="ex-btn ex-delete" (click)="$event.stopPropagation(); deleteExercise(ex)" title="Eliminar">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
        <div class="empty-state" *ngIf="filtered.length === 0">
          <span class="material-symbols-outlined empty-icon">fitness_center</span>
          <p>No hay ejercicios aún.</p>
        </div>
      </div>

      <ng-template #loadingTpl>
        <div class="loading-state"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando ejercicios...</p></div>
      </ng-template>

      <div class="modal-overlay" *ngIf="showVariants" (click)="closeVariants()">
        <div class="modal-card modal-lg" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Variantes: {{ selectedEx?.name }}</h3>
          <div class="variants-list" *ngIf="variants.length > 0">
            <div class="variant-card" *ngFor="let v of variants; let i = index">
              <div class="variant-header">
                <strong>{{ v.name }}</strong>
              </div>
              <p class="variant-desc" *ngIf="v.description">{{ v.description }}</p>
              <div class="variant-meta">
                <span *ngIf="v.duration_minutes">{{ v.duration_minutes }} min</span>
                <span *ngIf="v.players_min">{{ v.players_min }}-{{ v.players_max }} jug.</span>
              </div>
              <div class="variant-tags">
                <span class="ex-tag" *ngFor="let t of (v.tags || [])">{{ t }}</span>
              </div>
              <button class="btn-icon variant-delete" (click)="deleteVariant(v)"><span class="material-symbols-outlined">delete</span></button>
            </div>
          </div>
          <p class="empty-variants" *ngIf="variants.length === 0">Sin variantes aún.</p>
          <button class="btn-primary btn-full" (click)="generateVariant()">
            <span class="material-symbols-outlined">call_split</span>
            Generar Variante
          </button>
          <div class="modal-actions" style="margin-top: 16px;">
            <button class="btn-cancel" (click)="closeVariants()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
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
    .btn-full { width: 100%; justify-content: center; margin-top: 12px; }
    .filters { display: flex; flex-direction: column; gap: 16px; margin-bottom: 40px; }
    .search-wrap { position: relative; width: 100%; max-width: 384px; }
    .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #c6c5d4; font-size: 20px; }
    .search-input {
      width: 100%; background: #111644; border: 1px solid rgba(69,70,82,0.3);
      color: #dfe0ff; border-radius: 12px; padding: 12px 16px 12px 48px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none;
    }
    .search-input:focus { border-color: #bdc2ff; box-shadow: 0 0 0 1px #bdc2ff; }
    .filter-tags { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag-chip {
      font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 6px 14px; border-radius: 9999px; border: 1px solid rgba(69,70,82,0.3);
      background: transparent; color: #908f9d; cursor: pointer;
      font-family: 'Hanken Grotesk', sans-serif; transition: all 0.15s;
    }
    .tag-chip:hover { border-color: rgba(189,194,255,0.2); color: #c6c5d4; }
    .tag-chip.active { background: rgba(0,104,237,0.15); color: #bdc2ff; border-color: rgba(0,104,237,0.3); }
    .exercise-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 24px; position: relative; }
    .ex-card {
      background: #161b48; border-radius: 12px; overflow: hidden;
      border: 1px solid rgba(69,70,82,0.2);
      transition: all 0.2s; cursor: pointer; position: relative;
    }
    .ex-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -8px rgba(0,0,0,0.5); }
    .ex-actions {
      position: absolute; top: 8px; right: 8px;
      display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s;
    }
    .ex-card:hover .ex-actions { opacity: 1; }
    .ex-btn {
      background: rgba(0,0,0,0.4); border: none; color: #c6c5d4;
      cursor: pointer; padding: 4px; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
    }
    .ex-btn .material-symbols-outlined { font-size: 18px; }
    .ex-btn:hover { color: #dfe0ff; background: rgba(0,0,0,0.6); }
    .ex-delete:hover { color: #ff8a80; }
    .ex-body { padding: 20px; }
    .ex-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; }
    .ex-tag {
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 3px 10px; border-radius: 9999px;
      background: rgba(189,194,255,0.1); color: #bdc2ff;
    }
    .ex-title { font-size: 18px; font-weight: 700; color: #dfe0ff; margin: 0 0 6px; }
    .ex-desc { font-size: 13px; color: #c6c5d4; margin: 0 0 4px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .ex-objectives { font-size: 12px; color: #bdc2ff; margin: 0 0 12px; }
    .obj-label { font-weight: 600; color: #908f9d; }
    .ex-meta { display: flex; gap: 16px; }
    .ex-meta-item { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #c6c5d4; }
    .ex-meta-item .material-symbols-outlined { font-size: 14px; }
    .empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; grid-column: 1 / -1; }
    .empty-icon, .loading-icon { font-size: 48px; }
    .loading-icon { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state p, .loading-state p { margin: 0; font-size: 16px; }
    .header-buttons { display: flex; gap: 8px; align-items: center; }
    .btn-secondary {
      display: flex; align-items: center; gap: 6px;
      background: rgba(0,104,237,0.1); color: #bdc2ff;
      padding: 12px 18px; border-radius: 10px;
      text-decoration: none; font-weight: 600; font-size: 14px;
      border: 1px solid rgba(0,104,237,0.2); cursor: pointer;
      font-family: 'Hanken Grotesk', sans-serif; white-space: nowrap;
    }
    .btn-secondary:hover { background: rgba(0,104,237,0.18); color: #dfe0ff; }
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 20px;
    }
    .modal-card {
      background: #161b48; border-radius: 16px; padding: 32px;
      width: 100%; max-width: 520px; border: 1px solid rgba(69,70,82,0.3);
      max-height: 90vh; overflow-y: auto;
    }
    .modal-lg { max-width: 640px; }
    .modal-title { font-size: 24px; font-weight: 700; color: #dfe0ff; margin: 0 0 24px; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-cancel {
      padding: 10px 20px; border-radius: 8px; border: none;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer;
      background: #212653; color: #c6c5d4;
    }
    .btn-icon {
      background: rgba(255,138,128,0.15); border: none; color: #ff8a80;
      cursor: pointer; padding: 4px; border-radius: 6px;
      display: flex; align-items: center;
    }
    .btn-icon .material-symbols-outlined { font-size: 16px; }
    .variants-list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; }
    .variant-card {
      background: #111644; border: 1px solid rgba(69,70,82,0.2);
      border-radius: 8px; padding: 12px; position: relative;
    }
    .variant-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .variant-header strong { color: #dfe0ff; font-size: 14px; }
    .variant-desc { font-size: 12px; color: #c6c5d4; margin: 0 0 6px; }
    .variant-meta { font-size: 11px; color: #908f9d; display: flex; gap: 12px; margin-bottom: 6px; }
    .variant-tags { display: flex; gap: 4px; flex-wrap: wrap; }
    .variant-delete { position: absolute; top: 8px; right: 8px; }
    .empty-variants { text-align: center; color: #908f9d; padding: 20px; }
    @media (max-width: 768px) {
      .page { padding: 20px; }
      .page-header { flex-direction: column; align-items: stretch; gap: 16px; }
      .page-title { font-size: 28px; line-height: 36px; }
      .page-sub { font-size: 14px; }
      .search-wrap { max-width: 100%; }
      .exercise-grid { grid-template-columns: 1fr; }
      .header-buttons { flex-direction: column; align-items: stretch; }
      .btn-secondary, .btn-primary { width: 100%; justify-content: center; }
      .modal-card { margin: 10px; padding: 20px; }
      .field-row { flex-direction: column; }
    }
    @media (max-width: 480px) {
      .page { padding: 12px; }
      .page-title { font-size: 22px; }
      .ex-actions { opacity: 1; }
    }
  `]
})
export class ExercisesComponent implements OnInit {
  private data = inject(DataService);
  private cdr = inject(ChangeDetectorRef);
  private notification = inject(NotificationService);

  exercises: Exercise[] = [];
  loading = true;
  search = '';
  selectedTags: string[] = [];
  allTags: string[] = [];

  showVariants = false;
  selectedEx: Exercise | null = null;
  variants: ExerciseVariant[] = [];

  get filtered() {
    let list = this.exercises;
    if (this.search) {
      const q = this.search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q) || (e.tags || []).some(t => t.toLowerCase().includes(q)));
    }
    if (this.selectedTags.length > 0) {
      list = list.filter(e => (e.tags || []).some(t => this.selectedTags.includes(t)));
    }
    return list;
  }

  toggleTag(t: string) {
    const idx = this.selectedTags.indexOf(t);
    if (idx >= 0) this.selectedTags.splice(idx, 1);
    else this.selectedTags.push(t);
  }

  private collectAllTags() {
    const set = new Set<string>();
    for (const ex of this.exercises) {
      for (const tag of ex.tags || []) set.add(tag);
    }
    this.allTags = Array.from(set).sort();
  }

  async ngOnInit() {
    while (!this.data.currentClub()) {
      await new Promise(r => setTimeout(r, 50));
    }
    await this.load();
  }

  async load() {
    this.loading = true;
    try {
      this.exercises = await this.data.getExercises();
      this.collectAllTags();
    } catch (e) {
      this.notification.show(e instanceof Error ? e.message : String(e));
    }
    this.loading = false;
    this.cdr.detectChanges();
  }

  async deleteExercise(ex: Exercise) {
    if (!confirm(`¿Eliminar "${ex.name}"?`)) return;
    await this.data.deleteExercise(ex.id);
    await this.load();
  }

  async openVariants(ex: Exercise) {
    this.selectedEx = ex;
    this.variants = await this.data.getVariants(ex.id);
    this.showVariants = true;
  }

  closeVariants() {
    this.showVariants = false;
    this.selectedEx = null;
    this.variants = [];
  }

  async generateVariant() {
    const ex = this.selectedEx;
    if (!ex) return;
    const count = this.variants.length + 1;
    await this.data.createVariant({
      exercise_id: ex.id,
      name: `${ex.name} - Variante ${count}`,
      description: ex.description,
      difficulty: null,
      duration_minutes: ex.duration_minutes ? ex.duration_minutes + 5 : null,
      players_min: ex.players_min,
      players_max: ex.players_max,
      tags: [...(ex.tags || [])],
      diagrams: [...(ex.diagrams || [])],
      notes: null,
    });
    this.variants = await this.data.getVariants(ex.id);
  }

  async deleteVariant(v: ExerciseVariant) {
    if (!confirm(`¿Eliminar variante "${v.name}"?`)) return;
    await this.data.deleteVariant(v.id);
    this.variants = this.variants.filter(x => x.id !== v.id);
  }
}
