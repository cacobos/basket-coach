import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import type { Team } from '../../core/models/models';

@Component({
  selector: 'app-teams',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h2 class="page-title">Mis Equipos</h2>
          <p class="page-sub">Gestión de plantillas y rendimiento competitivo.</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <span class="material-symbols-outlined fill">add</span>
          Nuevo Equipo
        </button>
      </header>

      <div class="filters">
        <div class="search-wrap">
          <span class="material-symbols-outlined search-icon">search</span>
          <input class="search-input" placeholder="Buscar equipo por nombre..." type="text" [(ngModel)]="search"/>
        </div>
        <div class="filter-chips">
          <button class="chip" [class.chip-active]="!categoryFilter" (click)="categoryFilter = ''">Todos</button>
          <button class="chip" [class.chip-active]="categoryFilter === c" *ngFor="let c of categories" (click)="categoryFilter = c">{{ c }}</button>
        </div>
      </div>

      <div class="team-grid" *ngIf="!loading; else loadingTpl">
        <div class="team-card" *ngFor="let team of filtered" (click)="openPlayers(team)">
          <div class="card-accent" [style.background]="teamColors[team.category] || '#454652'"></div>
          <div class="card-body">
            <div class="card-top">
              <span class="card-badge">{{ team.category }}</span>
              <button class="more-btn" (click)="$event.stopPropagation(); deleteTeam(team)">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
            <h3 class="card-name">{{ team.name }}</h3>
            <div class="card-players">
              <span class="material-symbols-outlined">groups</span>
              <span>{{ team._playerCount ?? '—' }} Jugadores</span>
            </div>
            <div class="card-footer">
              <span class="card-action">ABRIR ROSTER</span>
              <span class="material-symbols-outlined card-arrow">arrow_forward</span>
            </div>
          </div>
        </div>
        <div class="empty-state" *ngIf="filtered.length === 0">
          <span class="material-symbols-outlined empty-icon">groups</span>
          <p>No hay equipos aún. Crea el primero.</p>
        </div>
      </div>

      <ng-template #loadingTpl>
        <div class="loading-state">
          <span class="material-symbols-outlined loading-icon">sync</span>
          <p>Cargando equipos...</p>
        </div>
      </ng-template>

      <div class="modal-overlay" *ngIf="showForm" (click)="showForm = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">{{ editing ? 'Editar Equipo' : 'Nuevo Equipo' }}</h3>
          <div class="modal-body">
            <label class="field">
              <span>Nombre del equipo</span>
              <input class="field-input" [(ngModel)]="formName" placeholder="Varsity Elite"/>
            </label>
            <label class="field">
              <span>Categoría</span>
              <select class="field-input" [(ngModel)]="formCategory">
                <option value="U10">U10</option>
                <option value="U12">U12</option>
                <option value="U14">U14</option>
                <option value="U16">U16</option>
                <option value="U18">U18</option>
                <option value="Varsity">Varsity</option>
              </select>
            </label>
            <label class="field">
              <span>Temporada</span>
              <input class="field-input" [(ngModel)]="formSeason" placeholder="2025-2026"/>
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" (click)="showForm = false">Cancelar</button>
            <button class="btn-save" (click)="save()">{{ editing ? 'Guardar' : 'Crear' }}</button>
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
    .filters { display: flex; flex-direction: column; gap: 16px; margin-bottom: 40px; }
    .search-wrap { position: relative; width: 100%; max-width: 384px; }
    .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #c6c5d4; font-size: 20px; }
    .search-input {
      width: 100%; background: #111644; border: 1px solid rgba(69,70,82,0.3);
      color: #dfe0ff; border-radius: 12px; padding: 12px 16px 12px 48px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none;
    }
    .search-input:focus { border-color: #bdc2ff; box-shadow: 0 0 0 1px #bdc2ff; }
    .filter-chips { display: flex; gap: 8px; overflow-x: auto; }
    .chip {
      padding: 10px 24px; border-radius: 9999px; border: none;
      background: #212653; color: #c6c5d4;
      font-family: 'Hanken Grotesk', sans-serif;
      font-size: 14px; font-weight: 600; letter-spacing: 0.05em;
      cursor: pointer; white-space: nowrap;
      transition: all 0.2s;
    }
    .chip:hover { color: #dfe0ff; }
    .chip-active { background: #1a237e; color: #8690ee; border: 1px solid rgba(189,194,255,0.2); }
    .team-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
    .team-card {
      background: #111644; border-radius: 12px; overflow: hidden;
      cursor: pointer; transition: all 0.2s;
      border: 1px solid rgba(69,70,82,0.2);
    }
    .team-card:hover { transform: translateY(-4px); box-shadow: 0 12px 24px -8px rgba(0,0,0,0.5); }
    .card-accent { height: 8px; width: 100%; }
    .card-body { padding: 24px; display: flex; flex-direction: column; }
    .card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .card-badge {
      padding: 4px 12px; background: rgba(189,194,255,0.1); color: #bdc2ff;
      border-radius: 9999px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
    }
    .more-btn { background: none; border: none; color: #c6c5d4; cursor: pointer; padding: 4px; opacity: 0; transition: opacity 0.2s; }
    .team-card:hover .more-btn { opacity: 1; }
    .more-btn .material-symbols-outlined { font-size: 18px; }
    .card-name { font-size: 24px; line-height: 32px; font-weight: 700; color: #dfe0ff; margin: 0 0 8px; }
    .card-players { display: flex; align-items: center; gap: 8px; color: #c6c5d4; font-size: 14px; margin-bottom: 32px; }
    .card-players .material-symbols-outlined { font-size: 16px; }
    .card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
    .card-action { color: #b0c6ff; font-weight: 700; font-size: 12px; letter-spacing: 0.02em; }
    .team-card:hover .card-action { text-decoration: underline; }
    .card-arrow { color: #b0c6ff; font-size: 20px; transition: transform 0.2s; }
    .team-card:hover .card-arrow { transform: translateX(4px); }
    .empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; grid-column: 1 / -1; }
    .empty-icon, .loading-icon { font-size: 48px; }
    .loading-icon { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state p, .loading-state p { margin: 0; font-size: 16px; }
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 20px;
    }
    .modal-card {
      background: #161b48; border-radius: 16px; padding: 32px;
      width: 100%; max-width: 440px; border: 1px solid rgba(69,70,82,0.3);
    }
    .modal-title { font-size: 24px; font-weight: 700; color: #dfe0ff; margin: 0 0 24px; }
    .modal-body { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field span { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; }
    .field-input {
      background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff;
      border-radius: 8px; padding: 10px 12px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none;
    }
    .field-input:focus { border-color: #bdc2ff; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-cancel, .btn-save {
      padding: 10px 20px; border-radius: 8px; border: none;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-cancel { background: #212653; color: #c6c5d4; }
    .btn-save { background: #0068ed; color: white; }
    .btn-save:hover { opacity: 0.9; }
  `]
})
export class TeamsComponent implements OnInit {
  private data = inject(DataService);
  private cdr = inject(ChangeDetectorRef);

  teams: (Team & { _playerCount?: number })[] = [];
  loading = true;
  search = '';
  categoryFilter = '';
  categories = ['U10', 'U12', 'U14', 'U16', 'U18', 'Varsity'];
  showForm = false;
  editing = false;
  formName = '';
  formCategory = '';
  formSeason = '';

  teamColors: Record<string, string> = {
    'U10': '#4CAF50', 'U12': '#2196F3', 'U14': '#FF9800',
    'U16': '#9C27B0', 'U18': '#F44336', 'Varsity': '#0068ed'
  };

  get filtered() {
    let list = this.teams;
    if (this.search) {
      const q = this.search.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q));
    }
    if (this.categoryFilter) {
      list = list.filter(t => t.category === this.categoryFilter);
    }
    return list;
  }

  async ngOnInit() {
    while (!this.data.currentClub()) {
      await new Promise(r => setTimeout(r, 50));
    }
    await this.loadTeams();
  }

  async loadTeams() {
    this.loading = true;
    const teams = await this.data.getTeams();
    const withCounts = await Promise.all(
      teams.map(async (t) => {
        const players = await this.data.getPlayers(t.id);
        return { ...t, _playerCount: players.length };
      })
    );
    this.teams = withCounts;
    this.loading = false;
    this.cdr.detectChanges();
  }

  openCreate() {
    this.editing = false;
    this.formName = '';
    this.formCategory = 'U16';
    this.formSeason = '2025-2026';
    this.showForm = true;
  }

  async save() {
    if (!this.formName.trim()) return;
    await this.data.createTeam(this.formName.trim(), this.formCategory, this.formSeason.trim());
    this.showForm = false;
    await this.loadTeams();
  }

  async deleteTeam(team: Team) {
    const players = await this.data.getPlayers(team.id);
    if (players.length > 0) {
      if (!confirm(`¿Eliminar "${team.name}"? También se eliminarán sus ${players.length} jugadores.`)) return;
    } else {
      if (!confirm(`¿Eliminar "${team.name}"?`)) return;
    }
    await this.data.deleteTeam(team.id);
    await this.loadTeams();
  }

  openPlayers(team: Team) {
    // TODO: navigate to players filtered by team
  }
}
