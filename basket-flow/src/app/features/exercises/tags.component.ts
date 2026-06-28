import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { NotificationService } from '../../core/services/notification.service';
import type { Exercise } from '../../core/models/models';

@Component({
  selector: 'app-tags',
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
          <h2 class="page-title">Gestionar Tags</h2>
          <p class="page-sub">Administra los tags usados en todos tus ejercicios.</p>
        </div>
      </header>

      <div class="card">
        <div class="add-row">
          <input class="field-input" [(ngModel)]="newTagName" placeholder="Nuevo tag..."
            (keydown.enter)="addTag()"/>
          <button class="btn-primary" (click)="addTag()" [disabled]="!newTagName.trim()">
            <span class="material-symbols-outlined">add</span>
            Añadir
          </button>
        </div>

        <div class="tag-list" *ngIf="!loading; else loadingTpl">
          <div class="tag-item" *ngFor="let t of tags">
            <div class="tag-info">
              <span class="tag-chip">{{ t }}</span>
              <span class="tag-count">{{ countByTag[t] }} ejercicio{{ countByTag[t] === 1 ? '' : 's' }}</span>
            </div>
            <button class="btn-icon btn-icon-danger" (click)="deleteTag(t)" title="Eliminar tag">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
          <div class="empty" *ngIf="tags.length === 0">
            <span class="material-symbols-outlined empty-icon">sell</span>
            <span>No hay tags aún. Añade uno arriba.</span>
          </div>
        </div>
        <ng-template #loadingTpl>
          <div class="loading"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando tags...</p></div>
        </ng-template>
      </div>
    </div>

    <div class="modal-overlay" *ngIf="showConfirm" (click)="showConfirm = false">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <h3 class="modal-title">{{ confirmTitle }}</h3>
        <p class="modal-msg">{{ confirmMessage }}</p>
        <div class="modal-actions">
          <button class="btn-cancel" (click)="showConfirm = false">Cancelar</button>
          <button class="btn-danger" (click)="executeConfirm()">Eliminar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 40px; max-width: 800px; margin: 0 auto; }
    .page-header { margin-bottom: 32px; }
    .back-link { display: inline-flex; align-items: center; gap: 4px; color: #bdc2ff; text-decoration: none; font-size: 14px; margin-bottom: 16px; }
    .back-link:hover { color: #dfe0ff; }
    .page-title { font-size: 48px; line-height: 56px; font-weight: 800; letter-spacing: -0.02em; color: #dfe0ff; margin: 0; }
    .page-sub { font-size: 18px; line-height: 28px; color: #c6c5d4; margin: 4px 0 0; }
    .card { background: #161b48; border: 1px solid rgba(69,70,82,0.2); border-radius: 16px; padding: 24px; }
    .add-row { display: flex; gap: 8px; margin-bottom: 24px; }
    .add-row .field-input {
      flex: 1; background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff;
      border-radius: 8px; padding: 10px 12px; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none;
    }
    .add-row .field-input:focus { border-color: #bdc2ff; }
    .btn-primary {
      display: flex; align-items: center; gap: 4px;
      background: #0068ed; color: white; border: none; border-radius: 8px;
      padding: 10px 16px; font-family: 'Hanken Grotesk', sans-serif;
      font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap;
    }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-primary:not(:disabled):hover { opacity: 0.9; }
    .btn-primary .material-symbols-outlined { font-size: 16px; }
    .tag-list { display: flex; flex-direction: column; gap: 6px; }
    .tag-item {
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(0,0,0,0.15); border-radius: 8px; padding: 10px 12px;
    }
    .tag-info { display: flex; align-items: center; gap: 10px; }
    .tag-chip {
      font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;
      padding: 4px 12px; border-radius: 9999px;
      background: rgba(189,194,255,0.1); color: #bdc2ff;
    }
    .tag-count { font-size: 12px; color: #908f9d; }
    .btn-icon {
      background: rgba(255,138,128,0.15); border: none; color: #ff8a80;
      cursor: pointer; padding: 4px; border-radius: 6px;
      display: flex; align-items: center;
    }
    .btn-icon .material-symbols-outlined { font-size: 16px; }
    .btn-icon-danger:hover { color: #ff5252; background: rgba(255,82,82,0.15); }
    .empty, .loading { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 40px; color: #3a3f6a; text-align: center; }
    .empty-icon, .loading-icon { font-size: 32px; }
    .loading-icon { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading p { margin: 0; color: #908f9d; }

    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 20px;
    }
    .modal-card {
      background: #161b48; border-radius: 16px; padding: 32px;
      width: 100%; max-width: 420px; border: 1px solid rgba(69,70,82,0.3);
    }
    .modal-title { font-size: 24px; font-weight: 700; color: #dfe0ff; margin: 0 0 16px; }
    .modal-msg { color: #c6c5d4; margin: 0 0 24px; line-height: 1.5; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-cancel, .btn-danger {
      padding: 10px 20px; border-radius: 8px; border: none;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-cancel { background: #212653; color: #c6c5d4; }
    .btn-danger { background: #d32f2f; color: white; }
    .btn-danger:hover { opacity: 0.9; }
    @media (max-width: 768px) {
      .page { padding: 20px !important; }
      .page-title { font-size: 28px !important; line-height: 36px !important; }
      .page-sub { font-size: 14px !important; }
      .card { padding: 16px !important; }
      .add-row { flex-direction: column !important; }
      .add-row .btn-primary { width: 100% !important; justify-content: center !important; }
      .modal-card { margin: 10px !important; padding: 20px !important; }
    }
    @media (max-width: 480px) {
      .page { padding: 12px !important; }
      .page-title { font-size: 22px !important; }
    }
  `]
})
export class TagsComponent implements OnInit {
  private data = inject(DataService);
  private notification = inject(NotificationService);

  exercises: Exercise[] = [];
  tags: string[] = [];
  countByTag: Record<string, number> = {};
  loading = true;
  newTagName = '';

  showConfirm = false;
  confirmTitle = '';
  confirmMessage = '';
  private confirmAction: (() => Promise<void>) | null = null;

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
      this.rebuildTags();
    } catch (e) {
      this.notification.show(e instanceof Error ? e.message : String(e));
    }
    this.loading = false;
  }

  private rebuildTags() {
    const set = new Set<string>();
    const counts: Record<string, number> = {};
    for (const ex of this.exercises) {
      for (const tag of ex.tags || []) {
        set.add(tag);
        counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    this.tags = Array.from(set).sort();
    this.countByTag = counts;
  }

  addTag() {
    const t = this.newTagName.trim();
    if (!t || this.tags.includes(t)) return;
    this.tags.push(t);
    this.tags.sort();
    this.countByTag[t] = 0;
    this.newTagName = '';
  }

  deleteTag(tag: string) {
    this.confirmTitle = 'Eliminar tag';
    this.confirmMessage = `¿Eliminar "${tag}" de todos los ejercicios?`;
    this.confirmAction = async () => {
      await this.data.removeTagFromExercises(tag);
      this.tags = this.tags.filter(t => t !== tag);
      delete this.countByTag[tag];
      this.exercises = await this.data.getExercises();
    };
    this.showConfirm = true;
  }

  executeConfirm() {
    if (!this.confirmAction) return;
    this.showConfirm = false;
    const action = this.confirmAction;
    this.confirmAction = null;
    action();
  }
}
