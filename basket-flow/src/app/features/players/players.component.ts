import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import type { Player, Team } from '../../core/models/models';

@Component({
  selector: 'app-players',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h2 class="page-title">Jugadores</h2>
          <p class="page-sub">Gestión centralizada del roster y perfiles individuales.</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <span class="material-symbols-outlined fill">add</span>
          Nuevo Jugador
        </button>
      </header>

      <div class="filters">
        <div class="search-wrap">
          <span class="material-symbols-outlined search-icon">search</span>
          <input class="search-input" placeholder="Buscar jugador por nombre o dorsal..." type="text" [(ngModel)]="search"/>
        </div>
        <div class="filter-row">
          <div class="select-wrap">
            <span class="material-symbols-outlined select-icon">groups</span>
            <select class="select-input" [(ngModel)]="teamFilter">
              <option value="">Todos los equipos</option>
              <option *ngFor="let t of teams" [value]="t.id">{{ t.name }}</option>
            </select>
          </div>
          <div class="select-wrap">
            <span class="material-symbols-outlined select-icon">sports_basketball</span>
            <select class="select-input" [(ngModel)]="positionFilter">
              <option value="">Todas las posiciones</option>
              <option value="Base">Base</option>
              <option value="Escolta">Escolta</option>
              <option value="Alero">Alero</option>
              <option value="Ala-Pívot">Ala-Pívot</option>
              <option value="Pívot">Pívot</option>
            </select>
          </div>
        </div>
      </div>

      <div class="player-grid" *ngIf="!loading; else loadingTpl">
        <div class="player-card" *ngFor="let player of filtered">
          <div class="player-avatar" [style.background]="playerColors[player.position!] || '#454652'">
            <span class="player-initials">{{ (player.first_name[0] + player.last_name[0]).toUpperCase() }}</span>
          </div>
          <div class="player-info">
            <h3 class="player-name">{{ player.first_name }} {{ player.last_name }}</h3>
            <p class="player-meta">{{ player.position || '—' }} {{ player.jersey_number ? '• #' + player.jersey_number : '' }} • {{ teamNames[player.team_id] || '—' }}</p>
          </div>
          <div class="player-stats">
            <div class="stat-item">
              <span class="stat-val">{{ _stats[player.id]?.ppg || '—' }}</span>
              <span class="stat-lbl">PPP</span>
            </div>
            <div class="stat-item">
              <span class="stat-val">{{ _stats[player.id]?.mpg || '—' }}</span>
              <span class="stat-lbl">MPP</span>
            </div>
          </div>
          <button class="player-more" (click)="$event.stopPropagation(); deletePlayer(player)">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
        <div class="empty-state" *ngIf="filtered.length === 0">
          <span class="material-symbols-outlined empty-icon">face</span>
          <p>No hay jugadores que coincidan.</p>
        </div>
      </div>

      <ng-template #loadingTpl>
        <div class="loading-state"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando jugadores...</p></div>
      </ng-template>

      <div class="modal-overlay" *ngIf="showForm" (click)="showForm = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Nuevo Jugador</h3>
          <div class="modal-body">
            <div class="field-row">
              <label class="field flex-1"><span>Nombre</span><input class="field-input" [(ngModel)]="formFirstName" placeholder="Alex"/></label>
              <label class="field flex-1"><span>Apellido</span><input class="field-input" [(ngModel)]="formLastName" placeholder="Morgan"/></label>
            </div>
            <label class="field"><span>Equipo</span>
              <select class="field-input" [(ngModel)]="formTeamId">
                <option *ngFor="let t of teams" [value]="t.id">{{ t.name }}</option>
              </select>
            </label>
            <label class="field"><span>Posición</span>
              <select class="field-input" [(ngModel)]="formPosition">
                <option value="Base">Base</option>
                <option value="Escolta">Escolta</option>
                <option value="Alero">Alero</option>
                <option value="Ala-Pívot">Ala-Pívot</option>
                <option value="Pívot">Pívot</option>
              </select>
            </label>
            <label class="field"><span>Dorsal</span><input class="field-input" type="number" [(ngModel)]="formNumber" placeholder="3"/></label>
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
    .filter-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .select-wrap { position: relative; display: flex; align-items: center; }
    .select-icon { position: absolute; left: 12px; color: #c6c5d4; font-size: 18px; pointer-events: none; }
    .select-input {
      background: #111644; border: 1px solid rgba(69,70,82,0.3);
      color: #dfe0ff; border-radius: 12px; padding: 10px 16px 10px 40px;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px;
      outline: none; cursor: pointer; min-width: 200px;
    }
    .select-input:focus { border-color: #bdc2ff; }
    .player-grid { display: flex; flex-direction: column; gap: 8px; }
    .player-card {
      display: flex; align-items: center; gap: 16px;
      background: #161b48; border-radius: 12px; padding: 12px 16px;
      border: 1px solid rgba(69,70,82,0.2);
      transition: all 0.2s; cursor: pointer;
    }
    .player-card:hover { background: #212653; border-color: rgba(69,70,82,0.4); }
    .player-avatar {
      width: 48px; height: 48px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .player-initials { font-weight: 700; font-size: 14px; color: white; }
    .player-info { flex: 1; min-width: 0; }
    .player-name { font-size: 16px; font-weight: 700; color: #dfe0ff; margin: 0; }
    .player-meta { font-size: 12px; color: #c6c5d4; margin: 2px 0 0; }
    .player-stats { display: flex; gap: 24px; }
    .stat-item { text-align: center; }
    .stat-val { font-size: 18px; font-weight: 700; color: #bdc2ff; display: block; }
    .stat-lbl { font-size: 10px; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    .player-more {
      background: none; border: none; color: #c6c5d4; cursor: pointer;
      padding: 4px; opacity: 0; transition: opacity 0.2s;
    }
    .player-card:hover .player-more { opacity: 1; }
    .player-more .material-symbols-outlined { font-size: 18px; }
    .empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; }
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
      width: 100%; max-width: 480px; border: 1px solid rgba(69,70,82,0.3);
    }
    .modal-title { font-size: 24px; font-weight: 700; color: #dfe0ff; margin: 0 0 24px; }
    .modal-body { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
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
export class PlayersComponent implements OnInit {
  private data = inject(DataService);
  private cdr = inject(ChangeDetectorRef);

  players: Player[] = [];
  teams: Team[] = [];
  teamNames: Record<string, string> = {};
  _stats: Record<string, { ppg: string; mpg: string }> = {};
  loading = true;
  search = '';
  teamFilter = '';
  positionFilter = '';
  showForm = false;
  formFirstName = '';
  formLastName = '';
  formTeamId = '';
  formPosition = 'Base';
  formNumber: number | null = null;

  playerColors: Record<string, string> = {
    'Base': '#2979FF', 'Escolta': '#00C853', 'Alero': '#FF9100',
    'Ala-Pívot': '#00BCD4', 'Pívot': '#FF6D00'
  };

  get filtered() {
    let list = this.players;
    if (this.search) {
      const q = this.search.toLowerCase();
      list = list.filter(p => `${p.first_name} ${p.last_name} ${p.jersey_number || ''}`.toLowerCase().includes(q));
    }
    if (this.teamFilter) list = list.filter(p => p.team_id === this.teamFilter);
    if (this.positionFilter) list = list.filter(p => p.position === this.positionFilter);
    return list;
  }

  async ngOnInit() {
    while (!this.data.currentClub()) {
      await new Promise(r => setTimeout(r, 50));
    }
    await this.load();
  }

  async load() {
    this.loading = true;
    this.teams = await this.data.getTeams();
    this.teams.forEach(t => this.teamNames[t.id] = t.name);
    this.players = await this.data.getPlayers();
    this.loading = false;
    this.cdr.detectChanges();
  }

  openCreate() {
    if (this.teams.length === 0) return;
    this.formTeamId = this.teams[0].id;
    this.showForm = true;
  }

  async save() {
    if (!this.formFirstName.trim() || !this.formLastName.trim()) return;
    await this.data.createPlayer({
      team_id: this.formTeamId,
      first_name: this.formFirstName.trim(),
      last_name: this.formLastName.trim(),
      position: this.formPosition,
      jersey_number: this.formNumber,
      birth_date: null,
      height: null,
      weight: null,
      photo_url: null,
    });
    this.showForm = false;
    this.formFirstName = '';
    this.formLastName = '';
    this.formNumber = null;
    await this.load();
  }

  async deletePlayer(player: Player) {
    if (!confirm(`¿Eliminar a ${player.first_name} ${player.last_name}?`)) return;
    await this.data.deletePlayer(player.id);
    await this.load();
  }
}
