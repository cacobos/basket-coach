import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AnnouncementService } from '../services/announcement.service';
import { DataService } from '../../../core/services/data.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';

@Component({
  selector: 'app-announcement-form',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
    <div class="page">
      <div class="header">
        <a routerLink="/announcements" class="btn-back">&#8592; Volver</a>
        <h1>Nuevo Aviso</h1>
      </div>

      <div class="form-card">
        <div class="field">
          <label for="title">Título</label>
          <input id="title" type="text" [(ngModel)]="title" placeholder="Título del aviso" class="input" />
        </div>

        <div class="field">
          <label for="scope">Ámbito</label>
          <select id="scope" [(ngModel)]="scope" class="input">
            <option value="club">Todo el club</option>
            <option value="team">Solo un equipo</option>
          </select>
          @if (scope === 'team') {
            <select [(ngModel)]="teamId" class="input" style="margin-top: 8px;">
              @for (team of teams(); track team.id) {
                <option [value]="team.id">{{ team.name }}</option>
              }
            </select>
          }
        </div>

        <div class="field">
          <label for="body">Mensaje</label>
          <textarea id="body" [(ngModel)]="body" rows="6" placeholder="Escribe el contenido del aviso..." class="input"></textarea>
        </div>

        <div class="actions">
          <button class="btn-primary" (click)="submit()" [disabled]="!title || !body || submitting()">
            {{ submitting() ? 'Enviando...' : 'Publicar Aviso' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 700px; margin: 0 auto; }
    .header { margin-bottom: 24px; }
    .header h1 { margin: 12px 0 0; font-size: 22px; font-weight: 700; color: var(--text-primary); }
    .btn-back { color: var(--text-secondary); text-decoration: none; font-size: 14px; display: inline-flex; align-items: center; gap: 6px; transition: color 0.15s; }
    .btn-back:hover { color: var(--text-primary); }
    .form-card { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; gap: 18px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 13px; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; }
    .input { background: var(--bg-secondary); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 10px 14px; color: var(--text-primary); font-size: 14px; font-family: inherit; outline: none; transition: border-color 0.15s; }
    .input:focus { border-color: #818cf8; }
    textarea.input { resize: vertical; min-height: 120px; }
    .actions { display: flex; gap: 12px; margin-top: 4px; }
    .btn-primary { background: #bdc2ff; color: #030737; padding: 10px 24px; border: none; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: opacity 0.2s; }
    .btn-primary:hover:not(:disabled) { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
  `]
})
export class AnnouncementFormComponent {
  private service = inject(AnnouncementService);
  private dataService = inject(DataService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  title = '';
  body = '';
  scope: 'club' | 'team' = 'club';
  teamId = '';
  teams = signal<any[]>([]);
  submitting = signal(false);

  constructor() {
    const club = this.dataService.currentClub();
    if (club) {
      this.loadTeams(club.id);
    }
  }

  private async loadTeams(clubId: string) {
    const { data } = await this.supabase.client
      .from('teams').select('id, name').eq('club_id', clubId);
    if (data) this.teams.set(data);
  }

  async submit() {
    if (!this.title || !this.body || this.submitting()) return;
    this.submitting.set(true);
    try {
      const club = this.dataService.currentClub();
      if (!club) return;
      await this.service.create({
        club_id: club.id,
        team_id: this.scope === 'team' ? this.teamId || null : null,
        title: this.title,
        body: this.body,
      });
      this.router.navigate(['/announcements']);
    } finally {
      this.submitting.set(false);
    }
  }
}
