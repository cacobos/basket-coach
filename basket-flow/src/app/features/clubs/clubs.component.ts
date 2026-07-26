import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ClubRepository } from '../../core/repositories/club.repository';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-clubs',
  standalone: true,
  imports: [FormsModule],
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
        @for (club of data.clubs(); track club.id) {
          <div class="club-card" (click)="data.setCurrentClub(club)">
            <div class="club-avatar">
              @if (club.logo_url) {
                <img [src]="club.logo_url" alt="" class="logo-img" />
              } @else {
                <span class="logo-initial">{{ club.name.charAt(0) }}</span>
              }
            </div>
            <div class="club-info">
              <h3 class="club-name">{{ club.name }}</h3>
              <p class="club-slug">{{ club.slug }}</p>
            </div>
            <span class="material-symbols-outlined club-check" [style.opacity]="(data.currentClub()?.id === club.id) ? 1 : 0">check_circle</span>
            <button class="manage-btn" (click)="$event.stopPropagation(); router.navigate(['/clubs', club.id, 'settings'])">Configurar</button>
          </div>
        } @empty {
          <div class="empty-state">
            <span class="material-symbols-outlined empty-icon">business</span>
            <p>No hay clubs todavía. Crea el primero.</p>
          </div>
        }
      </div>

      @if (showForm) {
        <div class="modal-overlay" (click)="showForm = false">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <h3 class="modal-title">Nuevo Club</h3>
            <div class="modal-body">
              <label class="field"><span>Nombre del club</span><input class="field-input" [(ngModel)]="formName" placeholder="Mi Club"/></label>
              <label class="field"><span>Descripción</span><textarea class="field-input field-textarea" rows="3" [(ngModel)]="formDescription" placeholder="Descripción opcional..."></textarea></label>
              <label class="field field-logo"><span>Escudo (opcional)</span>
                <div class="logo-upload-area" (click)="createLogoInput.click()">
                  @if (createLogoPreview) {
                    <img [src]="createLogoPreview" alt="" class="logo-preview" />
                  } @else {
                    <span class="material-symbols-outlined">add_photo_alternate</span>
                    <span>Seleccionar imagen</span>
                  }
                </div>
                <input #createLogoInput type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" (change)="onCreateLogoPick($event)" hidden />
              </label>
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="showForm = false">Cancelar</button>
              <button class="btn-save" (click)="save()" [disabled]="uploadingCreate">Crear</button>
            </div>
          </div>
        </div>
      }
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
    .club-avatar { position: relative; width: 48px; height: 48px; border-radius: 12px; background: rgba(189,194,255,0.1); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px; color: #bdc2ff; flex-shrink: 0; overflow: hidden; cursor: pointer; }
    .logo-img { width: 100%; height: 100%; object-fit: contain; }
    .logo-initial { }
    .avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s; border-radius: 12px; }
    .club-avatar:hover .avatar-overlay { opacity: 1; }
    .avatar-overlay .material-symbols-outlined { font-size: 20px; color: white; }
    .club-info { flex: 1; }
    .club-name { font-size: 18px; font-weight: 700; color: #dfe0ff; margin: 0; }
    .club-slug { font-size: 12px; color: #908f9d; margin: 2px 0 0; }
    .club-check { color: #69f0ae; font-size: 20px; }
    .manage-btn { background: none; border: 1px solid rgba(69,70,82,0.3); color: #bdc2ff; border-radius: 6px; padding: 4px 12px; font-size: 11px; font-weight: 700; cursor: pointer; font-family: 'Hanken Grotesk', sans-serif; white-space: nowrap; }
    .manage-btn:hover { border-color: #bdc2ff; }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; }
    .empty-icon { font-size: 48px; }
    .empty-state p { margin: 0; font-size: 16px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-card { background: #161b48; border-radius: 16px; padding: 32px; width: 100%; max-width: 440px; border: 1px solid rgba(69,70,82,0.3); }
    .modal-title { font-size: 24px; font-weight: 700; color: #dfe0ff; margin: 0 0 24px; }
    .modal-body { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field span { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; }
    .field-input { background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff; border-radius: 8px; padding: 10px 12px; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none; }
    .field-input:focus { border-color: #bdc2ff; }
    .field-textarea { resize: vertical; }
    .field-logo span { margin-bottom: 4px; }
    .logo-upload-area { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 20px; border: 2px dashed rgba(69,70,82,0.3); border-radius: 12px; cursor: pointer; color: #908f9d; font-size: 13px; transition: all 0.15s; }
    .logo-upload-area:hover { border-color: #bdc2ff; color: #bdc2ff; background: rgba(189,194,255,0.04); }
    .logo-upload-area .material-symbols-outlined { font-size: 32px; }
    .logo-preview { max-width: 100%; max-height: 120px; object-fit: contain; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-cancel, .btn-save { padding: 10px 20px; border-radius: 8px; border: none; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-cancel { background: #212653; color: #c6c5d4; }
    .btn-save { background: #0068ed; color: white; }
    .btn-save:hover { opacity: 0.9; }
    .btn-save:disabled { opacity: 0.4; cursor: not-allowed; }
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
  private supabase = inject(SupabaseService);
  private notification = inject(NotificationService);
  protected router = inject(Router);
  showForm = false;
  formName = '';
  formDescription = '';
  createLogoFile: File | null = null;
  createLogoPreview = '';
  uploadingCreate = false;

  openCreate() {
    this.showForm = true;
    this.createLogoFile = null;
    this.createLogoPreview = '';
  }

  onCreateLogoPick(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.createLogoFile = file;
    const reader = new FileReader();
    reader.onload = e => this.createLogoPreview = (e.target!.result as string);
    reader.readAsDataURL(file);
  }

  async save() {
    if (!this.formName.trim()) return;
    this.uploadingCreate = true;
    try {
      const club = await this.clubRepo.create({ name: this.formName.trim(), description: this.formDescription.trim() || undefined });

      if (this.createLogoFile) {
        const ext = this.createLogoFile.name.split('.').pop() || 'png';
        const filePath = `${club.id}/logo.${ext}`;
        await this.supabase.client.storage.from('logos').upload(filePath, this.createLogoFile, { upsert: true });
        const { data: { publicUrl } } = this.supabase.client.storage.from('logos').getPublicUrl(filePath);
        await this.clubRepo.update(club.id, { logo_url: publicUrl });
      }

      await this.data.loadClubs();
      this.showForm = false;
      this.formName = '';
      this.formDescription = '';
      this.createLogoFile = null;
      this.createLogoPreview = '';
    } catch {
      this.notification.show('Error al crear club', 'error');
    } finally {
      this.uploadingCreate = false;
    }
  }

}
