import { Component, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ClubRepository } from '../../core/repositories/club.repository';

@Component({
  selector: 'app-clubs',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h2 class="page-title">Clubs</h2>
          <p class="page-sub">Gestiona tus organizaciones deportivas.</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <span class="material-symbols-outlined fill">add</span>
          Nuevo Club
        </button>
      </header>

      <div class="club-grid">
        <div class="club-card" *ngFor="let club of data.clubs()" (click)="data.setCurrentClub(club)">
          <div class="club-avatar">{{ club.name.charAt(0) }}</div>
          <div class="club-info">
            <h3 class="club-name">{{ club.name }}</h3>
            <p class="club-slug">{{ club.slug }}</p>
          </div>
          <span class="material-symbols-outlined club-check" [style.opacity]="(data.currentClub()?.id === club.id) ? 1 : 0">check_circle</span>
          <button class="manage-btn" (click)="$event.stopPropagation(); router.navigate(['/clubs', club.id, 'members'])">Gestionar miembros</button>
        </div>
        <div class="empty-state" *ngIf="data.clubs().length === 0">
          <span class="material-symbols-outlined empty-icon">business</span>
          <p>No hay clubs todavía. Crea el primero.</p>
        </div>
      </div>

      <div class="modal-overlay" *ngIf="showForm" (click)="showForm = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Nuevo Club</h3>
          <div class="modal-body">
            <label class="field"><span>Nombre del club</span><input class="field-input" [(ngModel)]="formName" placeholder="Mi Club"/></label>
            <label class="field"><span>Descripción</span><textarea class="field-input field-textarea" rows="3" [(ngModel)]="formDescription" placeholder="Descripción opcional..."></textarea></label>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="showForm = false">Cancelar</button>
            <button class="btn-save" (click)="save()">Crear</button>
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
    .btn-primary { display: flex; align-items: center; gap: 8px; background: #0068ed; color: #f2f3ff; padding: 16px 24px; border-radius: 12px; border: none; font-weight: 700; font-size: 18px; cursor: pointer; transition: all 0.2s; box-shadow: 0 8px 24px rgba(0,104,237,0.2); white-space: nowrap; }
    .btn-primary:hover { transform: scale(1.05); }
    .btn-primary .fill { font-variation-settings: 'FILL' 1; }
    .club-grid { display: flex; flex-direction: column; gap: 8px; }
    .club-card { display: flex; align-items: center; gap: 16px; background: #161b48; border-radius: 12px; padding: 16px 20px; border: 1px solid rgba(69,70,82,0.2); cursor: pointer; transition: all 0.2s; }
    .club-card:hover { background: #212653; border-color: rgba(69,70,82,0.4); }
    .club-avatar { width: 48px; height: 48px; border-radius: 12px; background: rgba(189,194,255,0.1); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; color: #bdc2ff; flex-shrink: 0; }
    .club-info { flex: 1; }
    .club-name { font-size: 18px; font-weight: 700; color: #dfe0ff; margin: 0; }
    .club-slug { font-size: 12px; color: #908f9d; margin: 2px 0 0; }
    .club-check { color: #69f0ae; font-size: 20px; }
    .manage-btn { background: none; border: 1px solid rgba(69,70,82,0.3); color: #bdc2ff; border-radius: 6px; padding: 4px 12px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: 'Hanken Grotesk', sans-serif; white-space: nowrap; }
    .manage-btn:hover { border-color: #bdc2ff; }
    .empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; }
    .empty-icon, .loading-icon { font-size: 48px; }
    .loading-icon { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state p, .loading-state p { margin: 0; font-size: 16px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-card { background: #161b48; border-radius: 16px; padding: 32px; width: 100%; max-width: 440px; border: 1px solid rgba(69,70,82,0.3); }
    .modal-title { font-size: 24px; font-weight: 700; color: #dfe0ff; margin: 0 0 24px; }
    .modal-body { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field span { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; }
    .field-input { background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff; border-radius: 8px; padding: 10px 12px; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none; }
    .field-input:focus { border-color: #bdc2ff; }
    .field-textarea { resize: vertical; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-cancel, .btn-save { padding: 10px 20px; border-radius: 8px; border: none; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-cancel { background: #212653; color: #c6c5d4; }
    .btn-save { background: #0068ed; color: white; }
    .btn-save:hover { opacity: 0.9; }
    @media (max-width: 768px) {
      .page { padding: 20px !important; }
      .page-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
      .page-title { font-size: 28px !important; line-height: 36px !important; }
      .page-sub { font-size: 14px !important; }
      .modal-card { margin: 10px !important; padding: 20px !important; }
    }
    @media (max-width: 480px) {
      .page { padding: 12px !important; }
      .page-title { font-size: 22px !important; }
    }
  `]
})
export class ClubsComponent {
  data = inject(DataService);
  private clubRepo = inject(ClubRepository);
  protected router = inject(Router);
  showForm = false;
  formName = '';
  formDescription = '';

  openCreate() {
    this.showForm = true;
  }

  async save() {
    if (!this.formName.trim()) return;
    await this.clubRepo.create({ name: this.formName.trim(), description: this.formDescription.trim() || undefined });
    await this.data.loadClubs();
    this.showForm = false;
    this.formName = '';
    this.formDescription = '';
  }
}
