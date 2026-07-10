import { Component, inject } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ExerciseRepository } from '../../core/repositories/exercise.repository';
import { NotificationService } from '../../core/services/notification.service';
import type { Exercise, ExerciseVariant } from '../../core/models/models';
import { from, of, forkJoin } from 'rxjs';
import { switchMap, map, tap, catchError, startWith, filter } from 'rxjs/operators';

@Component({
  selector: 'app-exercise-variants',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, RouterLink],
  template: `
    <div class="page" *ngIf="vm$ | async as vm">
      <header class="page-header">
        <div>
          <a [routerLink]="['/exercises']" class="back-link">
            <span class="material-symbols-outlined">arrow_back</span>
            Volver a ejercicios
          </a>
          <h2 class="page-title">Variantes: {{ exercise?.name }}</h2>
        </div>
      </header>

      <div class="card">
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
        <button class="btn-primary" (click)="generateVariant()">
          <span class="material-symbols-outlined">call_split</span>
          Generar Variante
        </button>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 40px; max-width: 720px; margin: 0 auto; }
    .page-header { margin-bottom: 32px; }
    .back-link { display: inline-flex; align-items: center; gap: 4px; color: #bdc2ff; text-decoration: none; font-size: 14px; margin-bottom: 16px; }
    .back-link:hover { color: #dfe0ff; }
    .page-title { font-size: 48px; line-height: 56px; font-weight: 800; letter-spacing: -0.02em; color: #dfe0ff; margin: 0; }
    .card { background: #161b48; border: 1px solid rgba(69,70,82,0.2); border-radius: 16px; padding: 32px; }
    .variants-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .variant-card {
      background: #111644; border: 1px solid rgba(69,70,82,0.2);
      border-radius: 8px; padding: 12px; position: relative;
    }
    .variant-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .variant-header strong { color: #dfe0ff; font-size: 14px; }
    .variant-desc { font-size: 12px; color: #c6c5d4; margin: 0 0 6px; }
    .variant-meta { font-size: 11px; color: #908f9d; display: flex; gap: 12px; margin-bottom: 6px; }
    .variant-tags { display: flex; gap: 4px; flex-wrap: wrap; }
    .ex-tag {
      font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 3px 10px; border-radius: 9999px;
      background: rgba(189,194,255,0.1); color: #bdc2ff;
    }
    .btn-icon {
      background: rgba(255,138,128,0.15); border: none; color: #ff8a80;
      cursor: pointer; padding: 4px; border-radius: 6px;
      display: flex; align-items: center;
    }
    .btn-icon .material-symbols-outlined { font-size: 16px; }
    .variant-delete { position: absolute; top: 8px; right: 8px; }
    .empty-variants { text-align: center; color: #908f9d; padding: 20px; }
    .btn-primary {
      display: flex; align-items: center; gap: 8px;
      background: #0068ed; color: #f2f3ff;
      padding: 12px 20px; border-radius: 12px;
      border: none; font-weight: 700; font-size: 16px;
      cursor: pointer; transition: all 0.2s;
      width: 100%; justify-content: center;
      font-family: 'Hanken Grotesk', sans-serif;
    }
    .btn-primary:hover { opacity: 0.9; }
    .loading { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 80px; color: #3a3f6a; }
    .loading-icon { font-size: 48px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading p { margin: 0; color: #908f9d; }
    @media (max-width: 768px) {
      .page { padding: 20px; }
      .page-title { font-size: 28px; line-height: 36px; }
      .card { padding: 20px; }
    }
  `]
})
export class ExerciseVariantsComponent {
  private exerciseRepo = inject(ExerciseRepository);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notification = inject(NotificationService);

  exercise: Exercise | null = null;
  variants: ExerciseVariant[] = [];

  vm$ = from(this.route.paramMap).pipe(
    map(params => params.get('id')),
    filter((id): id is string => !!id),
    switchMap(id => forkJoin({
      exercise: from(this.exerciseRepo.findById(id)).pipe(
        filter((ex): ex is Exercise => !!ex)
      ),
      variants: from(this.exerciseRepo.getVariants(id)),
    })),
    tap(({ exercise, variants }) => {
      this.exercise = exercise;
      this.variants = variants;
    }),
    map(() => true),
    catchError(err => {
      this.notification.show(err instanceof Error ? err.message : String(err));
      this.router.navigate(['/exercises']);
      return of(true);
    }),
    startWith(true),
  );

  async generateVariant() {
    const ex = this.exercise;
    if (!ex) return;
    const count = this.variants.length + 1;
    await this.exerciseRepo.createVariant({
      exercise_id: ex.id,
      name: `${ex.name} - Variante ${count}`,
      description: ex.description,
      difficulty: null,
      duration_minutes: ex.duration_minutes ? ex.duration_minutes + 5 : null,
      players_min: ex.players_min,
      players_max: ex.players_max,
      tags: [...(ex.tags || []).map(t => t.name)],
      diagrams: [...(ex.diagrams || [])],
      notes: null,
    });
    this.variants = await this.exerciseRepo.getVariants(ex.id);
  }

  async deleteVariant(v: ExerciseVariant) {
    if (!confirm(`¿Eliminar variante "${v.name}"?`)) return;
    await this.exerciseRepo.deleteVariant(v.id);
    this.variants = this.variants.filter(x => x.id !== v.id);
  }
}
