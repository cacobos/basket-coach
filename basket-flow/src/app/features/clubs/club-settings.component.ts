import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { ClubRepository } from '../../core/repositories/club.repository';
import { SupabaseService } from '../../core/supabase/supabase.service';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import type { Club } from '../../core/models/models';

@Component({
  selector: 'app-club-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <button class="btn-back" (click)="goBack()">← Volver</button>
          <h2 class="page-title">Configuración del Club</h2>
        </div>
        <button class="btn-primary" (click)="save()" [disabled]="saving || !name().trim()">
          <span class="material-symbols-outlined fill">save</span>
          Guardar
        </button>
      </header>

      @if (club(); as c) {
        <div class="settings-grid">
          <section class="card">
            <h3>Información general</h3>
            <label class="field">
              <span>Nombre del club</span>
              <input class="field-input" [(ngModel)]="name" placeholder="Nombre del club" />
            </label>
            <label class="field">
              <span>Descripción</span>
              <textarea class="field-input field-textarea" rows="3" [(ngModel)]="description" placeholder="Descripción opcional..."></textarea>
            </label>
            <div class="field-row">
              <span class="field-label">Slug</span>
              <code class="slug-value">{{ c.slug }}</code>
            </div>
          </section>

          <section class="card">
            <h3>Escudo</h3>
            <p class="field-hint">PNG, JPEG, WebP o SVG. Máximo 2 MB.</p>
            <div class="logo-area">
              <div class="logo-preview" (click)="logoInput.click()">
                @if (logoPreview(); as src) {
                  <img [src]="src" alt="" class="logo-img" />
                } @else {
                  <span class="logo-placeholder">
                    <span class="material-symbols-outlined">add_photo_alternate</span>
                  </span>
                }
                <div class="logo-overlay">
                  <span class="material-symbols-outlined">photo_camera</span>
                </div>
              </div>
              @if (c.logo_url) {
                <button class="btn-remove-logo" (click)="removeLogo(c)">Quitar escudo</button>
              }
              <input #logoInput type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" (change)="onLogoPick($event)" hidden />
            </div>
          </section>

          @if (isSuperadmin()) {
            <section class="card">
              <h3>Opciones de superadmin</h3>
              <div class="toggle-row">
                <label class="toggle-label">
                  <input type="checkbox" [checked]="familyUpload()" (change)="toggleFamilyUpload(c.id, $event)" />
                  <span class="toggle-slider"></span>
                  Familias pueden subir documentos
                </label>
              </div>
            </section>
          }
        </div>
      } @else {
        <p class="loading-text">Cargando club…</p>
      }
    </div>
  `,
  styles: [`
    .page { padding: 40px; max-width: 800px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 32px; }
    .page-header div { display: flex; flex-direction: column; gap: 8px; }
    .page-title { font-size: 32px; font-weight: 800; color: #dfe0ff; margin: 0; }
    .btn-back { background: none; border: none; color: #bdc2ff; cursor: pointer; font-size: 14px; padding: 0; text-align: left; }
    .btn-primary { display: flex; align-items: center; gap: 8px; background: #0068ed; color: #f2f3ff; padding: 14px 24px; border-radius: 12px; border: none; font-weight: 700; font-size: 16px; cursor: pointer; transition: all 0.2s; box-shadow: 0 8px 24px rgba(0,104,237,0.2); white-space: nowrap; }
    .btn-primary:hover { transform: scale(1.05); }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .btn-primary .fill { font-variation-settings: 'FILL' 1; }
    .settings-grid { display: flex; flex-direction: column; gap: 20px; }
    .card { background: #161b48; border-radius: 16px; padding: 24px; border: 1px solid rgba(69,70,82,0.2); }
    .card h3 { font-size: 16px; font-weight: 700; color: #dfe0ff; margin: 0 0 16px; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
    .field span { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; }
    .field-input { background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff; border-radius: 8px; padding: 10px 12px; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none; width: 100%; box-sizing: border-box; }
    .field-input:focus { border-color: #bdc2ff; }
    .field-textarea { resize: vertical; }
    .field-row { display: flex; align-items: center; gap: 12px; }
    .field-label { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; }
    .slug-value { font-size: 13px; color: #908f9d; background: rgba(255,255,255,0.04); padding: 4px 10px; border-radius: 6px; }
    .field-hint { font-size: 12px; color: #908f9d; margin: -8px 0 12px; }
    .logo-area { display: flex; align-items: center; gap: 12px; }
    .logo-preview {
      width: 96px; height: 96px; border-radius: 14px; overflow: hidden;
      background: rgba(189,194,255,0.08); display: flex; align-items: center;
      justify-content: center; cursor: pointer; position: relative; border: 1px solid rgba(69,70,82,0.2);
    }
    .logo-img { width: 100%; height: 100%; object-fit: contain; }
    .logo-placeholder .material-symbols-outlined { font-size: 32px; color: #908f9d; }
    .logo-overlay {
      position: absolute; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.15s; border-radius: 14px;
    }
    .logo-preview:hover .logo-overlay { opacity: 1; }
    .logo-overlay .material-symbols-outlined { font-size: 28px; color: white; }
    .btn-remove-logo { background: rgba(244,67,54,0.12); border: none; color: #f44336; padding: 6px 14px; border-radius: 8px; font-size: 13px; cursor: pointer; font-family: 'Hanken Grotesk', sans-serif; font-weight: 600; }
    .btn-remove-logo:hover { background: rgba(244,67,54,0.2); }
    .toggle-row { margin-top: 4px; }
    .toggle-label { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #c6c5d4; cursor: pointer; }
    .toggle-label input { display: none; }
    .toggle-slider {
      width: 36px; height: 20px; background: rgba(255,255,255,0.15); border-radius: 10px;
      position: relative; transition: background 0.2s; flex-shrink: 0;
    }
    .toggle-slider::after {
      content: ''; position: absolute; top: 2px; left: 2px;
      width: 16px; height: 16px; background: #dfe0ff; border-radius: 50%;
      transition: transform 0.2s;
    }
    .toggle-label input:checked + .toggle-slider { background: #0068ed; }
    .toggle-label input:checked + .toggle-slider::after { transform: translateX(16px); }
    .loading-text { color: #908f9d; font-size: 16px; }
    @media (max-width: 768px) {
      .page { padding: 20px; }
      .page-header { flex-direction: column; }
      .page-title { font-size: 24px; }
    }
  `]
})
export class ClubSettingsComponent {
  private route = inject(ActivatedRoute);
  protected router = inject(Router);
  private clubRepo = inject(ClubRepository);
  private supabase = inject(SupabaseService);
  private data = inject(DataService);
  private auth = inject(AuthService);
  private notification = inject(NotificationService);

  private clubData = signal<Club | null>(null);
  club = this.clubData.asReadonly();

  name = signal('');
  description = signal('');
  logoPreview = signal<string | null>(null);
  private logoFile: File | null = null;
  saving = signal(false);

  isSuperadmin = computed(() => this.auth.profile()?.is_superadmin ?? false);
  familyUpload = signal(false);

  constructor() {
    this.loadClub();
  }

  private async loadClub() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    const club = await this.clubRepo.findById(id);
    if (club) {
      this.clubData.set(club);
      this.name.set(club.name);
      this.description.set(club.description ?? '');
      this.logoPreview.set(club.logo_url);
      this.familyUpload.set(club.family_can_upload_documents ?? false);
    }
  }

  onLogoPick(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.logoFile = file;
    const reader = new FileReader();
    reader.onload = e => this.logoPreview.set((e.target!.result as string));
    reader.readAsDataURL(file);
  }

  async removeLogo(club: Club) {
    await this.clubRepo.update(club.id, { logo_url: null });
    this.logoPreview.set(null);
    this.logoFile = null;
    this.clubData.set({ ...club, logo_url: null });
    this.notification.show('Escudo eliminado', 'success');
  }

  async toggleFamilyUpload(clubId: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.familyUpload.set(checked);
    await this.supabase.client.from('clubs').update({ family_can_upload_documents: checked }).eq('id', clubId);
    this.notification.show(checked ? 'Familias pueden subir documentos' : 'Subida de documentos desactivada', 'success');
  }

  async save() {
    const club = this.clubData();
    if (!club || !this.name().trim()) return;
    this.saving.set(true);
    try {
      await this.clubRepo.update(club.id, {
        name: this.name().trim(),
        description: this.description().trim() || null,
      });

      if (this.logoFile) {
        const ext = this.logoFile.name.split('.').pop() || 'png';
        const filePath = `${club.id}/logo.${ext}`;
        await this.supabase.client.storage.from('logos').upload(filePath, this.logoFile, { upsert: true });
        const { data: { publicUrl } } = this.supabase.client.storage.from('logos').getPublicUrl(filePath);
        await this.clubRepo.update(club.id, { logo_url: publicUrl });
        this.logoFile = null;
      }

      await this.data.loadClubs();
      this.notification.show('Club actualizado', 'success');
      this.router.navigate(['/clubs']);
    } catch {
      this.notification.show('Error al guardar', 'error');
    } finally {
      this.saving.set(false);
    }
  }

  goBack() {
    this.router.navigate(['/clubs']);
  }
}
