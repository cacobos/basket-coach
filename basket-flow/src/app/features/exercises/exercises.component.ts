import { Component, inject, signal, HostListener } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ExerciseRepository } from '../../core/repositories/exercise.repository';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import { TagsComponent } from './tags.component';
import type { Exercise, ExerciseCategory } from '../../core/models/models';
import { BehaviorSubject, from, forkJoin, of } from 'rxjs';
import { map, switchMap, filter, catchError, startWith } from 'rxjs/operators';

@Component({
  selector: 'app-exercises',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, FormsModule, RouterLink, TagsComponent],
  template: `
    <div class="page" *ngIf="vm$ | async as vm">
      <header class="page-header">
        <div>
          <h2 class="page-title">Biblioteca de Ejercicios</h2>
          <p class="page-sub">Dise&ntilde;a, organiza y reutiliza ejercicios para tus sesiones.</p>
        </div>
        <div class="header-buttons">
          <div class="tab-toggle" role="tablist" aria-label="Sección">
            <button type="button" role="tab" [class.active]="activeTab() === 'exercises'" [attr.aria-selected]="activeTab() === 'exercises'" (click)="setTab('exercises')">Ejercicios</button>
            <button type="button" role="tab" [class.active]="activeTab() === 'tags'" [attr.aria-selected]="activeTab() === 'tags'" (click)="setTab('tags')">Tags</button>
          </div>
          @if (activeTab() === 'exercises') {
            <a class="btn-primary" routerLink="/exercises/new">
              <span class="material-symbols-outlined fill">add</span>
              Nuevo Ejercicio
            </a>
          }
        </div>
      </header>

      @if (activeTab() === 'tags') {
        <app-tags [embedded]="true" />
      } @else {
      <div class="filters">
        <div class="search-wrap">
          <span class="material-symbols-outlined search-icon">search</span>
          <input class="search-input" placeholder="Buscar ejercicios..." type="text" [(ngModel)]="search"/>
        </div>
        <div class="cat-row">
          <button class="cat-chip" [class.active]="selectedCategoryId() === null" (click)="selectCategory(null)">Todas</button>
          @for (c of categories(); track c.id) {
            <button class="cat-chip" [class.active]="selectedCategoryId() === c.id" (click)="selectCategory(c.id)">
              <span class="cat-dot" [style.background]="c.color"></span>{{ c.name }}
            </button>
          }
          <button class="cat-manage" (click)="openCatDialog()">
            <span class="material-symbols-outlined">tune</span>
            Categorías
          </button>
        </div>
        <div class="filter-tags" *ngIf="allTags.length > 0">
          <button class="tag-chip" [class.active]="selectedTags.length === 0" (click)="selectedTags = []">Todas</button>
          <button class="tag-chip" *ngFor="let t of allTags" [class.active]="selectedTags.includes(t)" (click)="toggleTag(t)">{{ t }}</button>
        </div>
      </div>

      <div class="exercise-grid" *ngIf="!vm.loading; else loadingTpl">
        <div class="ex-card" *ngFor="let ex of filtered" (click)="openExercise(ex)" (keydown.enter)="openExercise(ex)" tabindex="0" role="link" [attr.aria-label]="'Abrir ' + ex.name">
          <div class="ex-body">
            <div class="ex-tags">
              @if (categoryOf(ex); as c) {
                <span class="ex-tag ex-cat" [style.background]="c.color + '22'" [style.color]="c.color">
                  {{ c.name }}
                </span>
              }
              <span class="ex-tag" *ngFor="let tag of (ex.tags || [])">{{ tag.name }}</span>
            </div>
            <h3 class="ex-title">{{ ex.name }}</h3>
            <p class="ex-desc">{{ ex.description }}</p>
            <p class="ex-objectives" *ngIf="ex.objectives"><span class="obj-label">Objetivos:</span> {{ ex.objectives }}</p>
            <span class="ex-open-hint"><span class="material-symbols-outlined">open_in_new</span> Ver detalle</span>
          </div>
          <div class="ex-actions">
            <a class="ex-btn" [routerLink]="['/exercises', ex.id, 'edit']" title="Editar" (click)="$event.stopPropagation()">
              <span class="material-symbols-outlined">edit</span>
            </a>
            <button class="ex-btn ex-delete" (click)="$event.stopPropagation(); deleteExercise(ex)" title="Eliminar">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>
        <div class="empty-state" *ngIf="filtered.length === 0">
          <span class="material-symbols-outlined empty-icon">fitness_center</span>
          <p>No hay ejercicios a&uacute;n.</p>
        </div>
      </div>

      <ng-template #loadingTpl>
        <div class="loading-state"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando ejercicios...</p></div>
      </ng-template>
      }

      @if (catDialogOpen()) {
        <div class="dialog-overlay" (click)="catDialogOpen.set(false)">
          <div class="modal-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Gestionar categorías">
            <h3 class="modal-title">Categorías</h3>
            <div class="cat-list">
              @for (c of categories(); track c.id) {
                <div class="cat-item">
                  @if (editingCatId() === c.id) {
                    <input type="color" [ngModel]="editColor" [ngModelOptions]="{standalone: true}" (ngModelChange)="editColor = $event" aria-label="Color"/>
                    <input class="cat-input" [ngModel]="editName" [ngModelOptions]="{standalone: true}" (ngModelChange)="editName = $event" (keyup.enter)="saveEdit(c.id)"/>
                    <button class="mini-btn save" (click)="saveEdit(c.id)">Guardar</button>
                    <button class="mini-btn" (click)="editingCatId.set(null)">Cancelar</button>
                  } @else {
                    <span class="cat-dot" [style.background]="c.color"></span>
                    <span class="cat-name">{{ c.name }}</span>
                    <button class="icon-mini" (click)="startEdit(c)" aria-label="Renombrar">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="icon-mini danger" (click)="deleteCategory(c)" aria-label="Eliminar">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  }
                </div>
              }
              @if (categories().length === 0) {
                <p class="cat-empty">Sin categorías todavía. Crea la primera abajo.</p>
              }
            </div>
            <div class="cat-new">
              <input type="color" [(ngModel)]="newCatColor" aria-label="Color de la nueva categoría"/>
              <input class="cat-input" placeholder="Nueva categoría..." [(ngModel)]="newCatName" (keyup.enter)="addCategory()"/>
              <button class="btn-primary-sm" (click)="addCategory()" [disabled]="!newCatName.trim()">Añadir</button>
            </div>
          </div>
        </div>
      }

      @if (confirmOpen()) {
        <div class="dialog-overlay" (click)="closeConfirm()">
          <div class="modal-card confirm-card" (click)="$event.stopPropagation()" role="dialog" aria-modal="true" aria-label="Confirmar eliminación">
            <span class="confirm-icon"><span class="material-symbols-outlined">warning</span></span>
            <h3 class="modal-title">{{ confirmTitle() }}</h3>
            <p class="confirm-msg">{{ confirmMessage() }}</p>
            <div class="confirm-actions">
              <button class="mini-btn" (click)="closeConfirm()">Cancelar</button>
              <button class="btn-danger" (click)="runConfirm()" [disabled]="confirming()">
                {{ confirming() ? 'Eliminando...' : 'Eliminar' }}
              </button>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .page { padding: 40px; max-width: 1440px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 48px; }
    .tab-toggle {
      display: inline-flex; gap: 2px; padding: 4px; align-self: center;
      background: #111644; border: 1px solid rgba(69,70,82,0.3); border-radius: 10px;
    }
    .tab-toggle button {
      background: transparent; border: none; cursor: pointer;
      color: #908f9d; font-family: 'Hanken Grotesk', sans-serif;
      font-size: 14px; font-weight: 600; padding: 8px 18px; border-radius: 8px;
      transition: all 0.15s;
    }
    .tab-toggle button:hover { color: #c6c5d4; }
    .tab-toggle button.active { background: #0068ed; color: white; }
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
    .filter-tags { display: flex; gap: 6px; flex-wrap: wrap; max-height: 80px; overflow-y: auto; }
    .cat-row { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
    .cat-chip {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 700;
      padding: 6px 14px; border-radius: 9999px; border: 1px solid rgba(69,70,82,0.3);
      background: transparent; color: #908f9d; cursor: pointer;
      font-family: 'Hanken Grotesk', sans-serif; transition: all 0.15s;
    }
    .cat-chip:hover { border-color: rgba(189,194,255,0.3); color: #c6c5d4; }
    .cat-chip.active { background: rgba(0,104,237,0.15); color: #bdc2ff; border-color: rgba(0,104,237,0.4); }
    .cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; display: inline-block; }
    .cat-manage {
      display: inline-flex; align-items: center; gap: 4px;
      background: transparent; border: 1px dashed rgba(69,70,82,0.5); color: #908f9d;
      font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 9999px;
      cursor: pointer; font-family: 'Hanken Grotesk', sans-serif; transition: all 0.15s;
    }
    .cat-manage:hover { color: #bdc2ff; border-color: rgba(189,194,255,0.4); }
    .cat-manage .material-symbols-outlined { font-size: 14px; }
    .ex-cat { border: 1px solid transparent; }
    .filter-tags::-webkit-scrollbar { width: 4px; }
    .filter-tags::-webkit-scrollbar-thumb { background: rgba(189,194,255,0.2); border-radius: 2px; }
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
    .ex-card:focus-visible { outline: 2px solid #bdc2ff; outline-offset: 2px; }
    .ex-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -8px rgba(0,0,0,0.5); }
    .ex-card:hover .ex-open-hint { opacity: 1; }
    .ex-actions {
      position: absolute; top: 8px; right: 8px;
      display: flex; gap: 4px;
    }
    .ex-open-hint {
      display: inline-flex; align-items: center; gap: 4px;
      margin-top: 12px; font-size: 12px; font-weight: 600;
      color: #bdc2ff; opacity: 0; transition: opacity 0.2s;
    }
    .ex-open-hint .material-symbols-outlined { font-size: 14px; }
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
    .btn-icon {
      background: rgba(255,138,128,0.15); border: none; color: #ff8a80;
      cursor: pointer; padding: 4px; border-radius: 6px;
      display: flex; align-items: center;
    }
    .btn-icon .material-symbols-outlined { font-size: 16px; }
    .dialog-overlay {
      position: fixed; inset: 0; z-index: 300;
      background: rgba(3,7,55,0.7); backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center;
    }
    .modal-card {
      background: #161b48; border: 1px solid rgba(69,70,82,0.4);
      border-radius: 16px; padding: 24px; width: min(420px, calc(100vw - 32px));
      box-shadow: 0 24px 48px rgba(0,0,0,0.5);
    }
    .modal-title { margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #dfe0ff; }
    .cat-list { display: flex; flex-direction: column; gap: 4px; max-height: 260px; overflow-y: auto; margin-bottom: 16px; }
    .cat-item { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 8px; }
    .cat-item:hover { background: rgba(255,255,255,0.04); }
    .cat-name { flex: 1; font-size: 14px; color: #dfe0ff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cat-empty { color: #908f9d; font-size: 13px; margin: 8px 0; }
    .cat-input {
      flex: 1; background: #111644; border: 1px solid rgba(69,70,82,0.4);
      color: #dfe0ff; border-radius: 8px; padding: 8px 12px; font-size: 14px;
      outline: none; font-family: 'Hanken Grotesk', sans-serif; min-width: 0;
    }
    .cat-input:focus { border-color: #bdc2ff; }
    input[type="color"] {
      width: 36px; height: 36px; padding: 2px; border: 1px solid rgba(69,70,82,0.4);
      border-radius: 8px; background: #111644; cursor: pointer;
    }
    .icon-mini {
      background: transparent; border: none; color: #908f9d; cursor: pointer;
      padding: 4px; border-radius: 6px; display: flex;
    }
    .icon-mini:hover { color: #dfe0ff; background: rgba(255,255,255,0.06); }
    .icon-mini.danger:hover { color: #ff8a80; }
    .mini-btn {
      background: transparent; border: 1px solid rgba(69,70,82,0.4); color: #c6c5d4;
      font-size: 12px; font-weight: 600; padding: 6px 10px; border-radius: 8px;
      cursor: pointer; white-space: nowrap; font-family: 'Hanken Grotesk', sans-serif;
    }
    .mini-btn.save { background: rgba(189,194,255,0.15); border-color: rgba(189,194,255,0.4); color: #bdc2ff; }
    .mini-btn:hover { border-color: rgba(189,194,255,0.4); }
    .cat-new { display: flex; align-items: center; gap: 8px; border-top: 1px solid rgba(69,70,82,0.3); padding-top: 16px; }
    .btn-primary-sm {
      background: #0068ed; color: #f2f3ff; border: none; border-radius: 8px;
      padding: 8px 14px; font-weight: 700; font-size: 13px; cursor: pointer;
      font-family: 'Hanken Grotesk', sans-serif; transition: opacity 0.15s;
    }
    .btn-primary-sm:disabled { opacity: 0.4; cursor: default; }
    .confirm-card { max-width: 400px !important; text-align: center; }
    .confirm-icon {
      width: 52px; height: 52px; border-radius: 50%;
      background: rgba(255,138,128,0.12);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 14px;
    }
    .confirm-icon .material-symbols-outlined { font-size: 26px; color: #ff8a80; }
    .confirm-msg { color: #c6c5d4; margin: 0 0 24px; line-height: 1.5; }
    .confirm-actions { display: flex; gap: 12px; justify-content: center; }
    .confirm-actions .btn-danger {
      background: #d32f2f; color: white; border: none;
      padding: 8px 18px; border-radius: 8px; cursor: pointer;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 13px; font-weight: 700;
    }
    .confirm-actions .btn-danger:hover { opacity: 0.9; }
    .confirm-actions .btn-danger:disabled { opacity: 0.5; cursor: default; }
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
      .ex-open-hint { opacity: 1; }
    }
  `]
})
export class ExercisesComponent {
  private exerciseRepo = inject(ExerciseRepository);
  private data = inject(DataService);
  private notification = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  activeTab = signal<'exercises' | 'tags'>('exercises');
  private reload$ = new BehaviorSubject<void>(undefined);

  constructor() {
    if (this.route.snapshot.queryParamMap.get('tab') === 'tags') {
      this.activeTab.set('tags');
    }
  }

  setTab(tab: 'exercises' | 'tags') {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tab === 'tags' ? 'tags' : null },
      queryParamsHandling: 'merge',
    });
    if (tab === 'exercises') this.reload$.next();
  }

  exercises: Exercise[] = [];
  categories = signal<ExerciseCategory[]>([]);
  selectedCategoryId = signal<string | null>(null);
  catDialogOpen = signal(false);
  editingCatId = signal<string | null>(null);
  editName = '';
  editColor = '#818cf8';
  newCatName = '';
  newCatColor = '#818cf8';
  search = '';
  selectedTags: string[] = [];
  allTags: string[] = [];

  confirmOpen = signal(false);
  confirming = signal(false);
  confirmTitle = signal('');
  confirmMessage = signal('');
  private confirmAction: (() => Promise<void>) | null = null;

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.confirmOpen()) this.closeConfirm();
    else if (this.catDialogOpen()) this.catDialogOpen.set(false);
  }

  closeConfirm() {
    if (this.confirming()) return;
    this.confirmOpen.set(false);
    this.confirmAction = null;
  }

  async runConfirm() {
    if (!this.confirmAction) return;
    this.confirming.set(true);
    try {
      await this.confirmAction();
      this.confirmOpen.set(false);
      this.confirmAction = null;
    } catch (err) {
      this.notification.show(err instanceof Error ? err.message : 'No se pudo completar la operación', 'error');
    } finally {
      this.confirming.set(false);
    }
  }

  private club$ = toObservable(this.data.currentClub).pipe(filter(Boolean));

  vm$ = this.reload$.pipe(
    switchMap(() => this.club$.pipe(
      switchMap(club => forkJoin({
        exercises: from(this.exerciseRepo.findAll(club.id)),
        categories: from(this.exerciseRepo.getCategories(club.id)).pipe(catchError(() => of([] as ExerciseCategory[]))),
      })),
      map(({ exercises, categories }) => {
        this.exercises = exercises;
        this.categories.set(categories);
        this.collectAllTags();
        return { loading: false };
      }),
      catchError(err => {
        this.notification.show(err instanceof Error ? err.message : String(err));
        return of({ loading: false });
      }),
      startWith({ loading: true }),
    )),
  );

  get filtered() {
    let list = this.exercises;
    const catId = this.selectedCategoryId();
    if (catId) {
      list = list.filter(e => e.category_id === catId);
    }
    if (this.search) {
      const q = this.search.toLowerCase();
      list = list.filter(e => e.name.toLowerCase().includes(q) || (e.tags || []).some(t => t.name.toLowerCase().includes(q)));
    }
    if (this.selectedTags.length > 0) {
      list = list.filter(e => (e.tags || []).some(t => this.selectedTags.includes(t.name)));
    }
    return list;
  }

  selectCategory(id: string | null) {
    this.selectedCategoryId.set(id);
  }

  categoryOf(ex: Exercise): ExerciseCategory | undefined {
    if (!ex.category_id) return undefined;
    return this.categories().find(c => c.id === ex.category_id);
  }

  openCatDialog() {
    this.editingCatId.set(null);
    this.catDialogOpen.set(true);
  }

  async addCategory() {
    const name = this.newCatName.trim();
    if (!name) return;
    try {
      const clubId = this.data.currentClub()!.id;
      const created = await this.exerciseRepo.createCategory(name, this.newCatColor, clubId);
      this.categories.update(list => [...list, created].sort((a, b) => a.name.localeCompare(b.name)));
      this.newCatName = '';
    } catch (err) {
      this.notification.show(err instanceof Error ? err.message : String(err));
    }
  }

  startEdit(c: ExerciseCategory) {
    this.editingCatId.set(c.id);
    this.editName = c.name;
    this.editColor = c.color;
  }

  async saveEdit(id: string) {
    const name = this.editName.trim();
    if (!name) return;
    try {
      const updated = await this.exerciseRepo.updateCategory(id, { name, color: this.editColor });
      this.categories.update(list => list.map(c => (c.id === id ? updated : c)));
      this.editingCatId.set(null);
    } catch (err) {
      this.notification.show(err instanceof Error ? err.message : String(err));
    }
  }

  async deleteCategory(c: ExerciseCategory) {
    this.confirmTitle.set(`¿Eliminar la categoría "${c.name}"?`);
    this.confirmMessage.set('Los ejercicios quedarán sin categoría.');
    this.confirmAction = async () => {
      await this.exerciseRepo.removeCategory(c.id);
      this.categories.update(list => list.filter(x => x.id !== c.id));
      if (this.selectedCategoryId() === c.id) this.selectedCategoryId.set(null);
    };
    this.confirmOpen.set(true);
  }

  toggleTag(t: string) {
    const idx = this.selectedTags.indexOf(t);
    if (idx >= 0) this.selectedTags.splice(idx, 1);
    else this.selectedTags.push(t);
  }

  private collectAllTags() {
    const set = new Set<string>();
    for (const ex of this.exercises) {
      for (const tag of ex.tags || []) set.add(tag.name);
    }
    this.allTags = Array.from(set).sort();
  }

  deleteExercise(ex: Exercise) {
    this.confirmTitle.set(`¿Eliminar "${ex.name}"?`);
    this.confirmMessage.set('Esta acción no se puede deshacer.');
    this.confirmAction = async () => {
      await this.exerciseRepo.remove(ex.id);
      this.notification.show('Ejercicio eliminado', 'success');
      await this.load();
    };
    this.confirmOpen.set(true);
  }

  openExercise(ex: Exercise) {
    void this.router.navigate(['/exercises', ex.id, 'edit']);
  }

  private async load() {
    const clubId = this.data.currentClub()!.id;
    this.exercises = await this.exerciseRepo.findAll(clubId);
    try {
      this.categories.set(await this.exerciseRepo.getCategories(clubId));
    } catch {
      this.categories.set([]);
    }
    this.collectAllTags();
  }
}
