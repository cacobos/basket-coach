import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import type { Evaluation, Player } from '../../core/models/models';

@Component({
  selector: 'app-evaluations',
  standalone: true,
  imports: [NgFor, NgIf, FormsModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h2 class="page-title">Evaluaciones</h2>
          <p class="page-sub">Valoración del rendimiento individual de cada jugador.</p>
        </div>
        <button class="btn-primary" (click)="openCreate()">
          <span class="material-symbols-outlined">assignment</span>
          Nueva Evaluación
        </button>
      </header>

      <div class="eval-grid" *ngIf="!loading; else loadingTpl">
        <div class="eval-card" *ngFor="let ev of displayList">
          <div class="eval-header">
            <div class="eval-avatar" [style.background]="playerColors[playerMap[ev.player_id]?.position || ''] || '#454652'">
              <span>{{ initials(ev.player_id) }}</span>
            </div>
            <div>
              <h3 class="eval-name">{{ playerNames[ev.player_id] || '—' }}</h3>
              <p class="eval-team">{{ teamForPlayer(ev.player_id) }} • {{ posForPlayer(ev.player_id) }}</p>
            </div>
          </div>
          <div class="eval-rating">
            <span class="eval-score" [style.color]="overallScore(ev) >= 85 ? '#69f0ae' : overallScore(ev) >= 70 ? '#ffd740' : '#ff8a80'">{{ overallScore(ev) }}</span>
            <span class="eval-label">Overall</span>
          </div>
          <div class="eval-stats">
            <div class="eval-stat" *ngFor="let s of statBars(ev)">
              <span class="es-label">{{ s.label }}</span>
              <div class="es-bar"><div class="es-fill" [style.width]="s.val + '%'" [style.background]="s.val >= 80 ? '#69f0ae' : s.val >= 60 ? '#ffd740' : '#ff8a80'"></div></div>
            </div>
          </div>
          <div class="eval-notes" *ngIf="ev.notes">
            <span class="material-symbols-outlined">note</span>
            <span>{{ ev.notes }}</span>
          </div>
        </div>
        <div class="empty-state" *ngIf="displayList.length === 0">
          <span class="material-symbols-outlined empty-icon">star</span>
          <p>No hay evaluaciones todavía.</p>
        </div>
      </div>

      <ng-template #loadingTpl>
        <div class="loading-state"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando evaluaciones...</p></div>
      </ng-template>

      <div class="modal-overlay" *ngIf="showForm" (click)="showForm = false">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3 class="modal-title">Nueva Evaluación</h3>
          <div class="modal-body">
            <label class="field"><span>Jugador</span>
              <select class="field-input" [(ngModel)]="formPlayer">
                <option *ngFor="let p of allPlayers" [value]="p.id">{{ p.first_name }} {{ p.last_name }}</option>
              </select>
            </label>
            <label class="field"><span>Fecha</span><input class="field-input" type="date" [(ngModel)]="formDate"/></label>
            <label class="field"><span>Tipo</span>
              <select class="field-input" [(ngModel)]="formType">
                <option value="internal">Interna</option>
                <option value="external">Externa</option>
              </select>
            </label>
            <div class="field-row">
              <label class="field flex-1"><span>Tiro</span><input class="field-input" type="number" min="1" max="10" [(ngModel)]="formShooting"/></label>
              <label class="field flex-1"><span>Bote</span><input class="field-input" type="number" min="1" max="10" [(ngModel)]="formDribbling"/></label>
              <label class="field flex-1"><span>Pase</span><input class="field-input" type="number" min="1" max="10" [(ngModel)]="formPassing"/></label>
            </div>
            <div class="field-row">
              <label class="field flex-1"><span>Defensa</span><input class="field-input" type="number" min="1" max="10" [(ngModel)]="formDefense"/></label>
              <label class="field flex-1"><span>Rebote</span><input class="field-input" type="number" min="1" max="10" [(ngModel)]="formRebounding"/></label>
              <label class="field flex-1"><span>IQ</span><input class="field-input" type="number" min="1" max="10" [(ngModel)]="formIQ"/></label>
            </div>
            <label class="field"><span>Notas</span><textarea class="field-input field-textarea" rows="2" [(ngModel)]="formNotes"></textarea></label>
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
      padding: 12px 20px; border-radius: 12px;
      border: none; font-weight: 700; font-size: 14px;
      cursor: pointer; transition: all 0.2s;
      white-space: nowrap;
    }
    .btn-primary:hover { opacity: 0.9; }
    .eval-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 20px; }
    .eval-card { background: #161b48; border-radius: 12px; padding: 20px; border: 1px solid rgba(69,70,82,0.2); }
    .eval-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .eval-avatar { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; color: white; flex-shrink: 0; }
    .eval-name { font-size: 16px; font-weight: 700; color: #dfe0ff; margin: 0; }
    .eval-team { font-size: 12px; color: #c6c5d4; margin: 2px 0 0; }
    .eval-rating { display: flex; align-items: baseline; gap: 6px; margin-bottom: 16px; }
    .eval-score { font-size: 36px; font-weight: 800; }
    .eval-label { font-size: 11px; color: #908f9d; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    .eval-stats { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
    .es-label { font-size: 11px; color: #908f9d; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; display: block; margin-bottom: 4px; }
    .es-bar { height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
    .es-fill { height: 100%; border-radius: 2px; }
    .eval-notes { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #c6c5d4; padding-top: 12px; border-top: 1px solid rgba(69,70,82,0.2); }
    .eval-notes .material-symbols-outlined { font-size: 16px; }
    .empty-state, .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; }
    .empty-icon, .loading-icon { font-size: 48px; }
    .loading-icon { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state p, .loading-state p { margin: 0; font-size: 16px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
    .modal-card { background: #161b48; border-radius: 16px; padding: 32px; width: 100%; max-width: 520px; border: 1px solid rgba(69,70,82,0.3); }
    .modal-title { font-size: 24px; font-weight: 700; color: #dfe0ff; margin: 0 0 24px; }
    .modal-body { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field span { font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: uppercase; letter-spacing: 0.05em; }
    .field-row { display: flex; gap: 12px; }
    .flex-1 { flex: 1; }
    .field-input { background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff; border-radius: 8px; padding: 10px 12px; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none; }
    .field-input:focus { border-color: #bdc2ff; }
    .field-textarea { resize: vertical; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
    .btn-cancel, .btn-save { padding: 10px 20px; border-radius: 8px; border: none; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
    .btn-cancel { background: #212653; color: #c6c5d4; }
    .btn-save { background: #0068ed; color: white; }
    .btn-save:hover { opacity: 0.9; }
  `]
})
export class EvaluationsComponent implements OnInit {
  private data = inject(DataService);
  private cdr = inject(ChangeDetectorRef);

  evaluations: Evaluation[] = [];
  allPlayers: Player[] = [];
  playerMap: Record<string, Player> = {};
  playerNames: Record<string, string> = {};
  playerTeams: Record<string, string> = {};
  teamNames: Record<string, string> = {};
  loading = true;
  showForm = false;

  formPlayer = '';
  formDate = '';
  formType: 'internal' | 'external' = 'internal';
  formShooting: number | null = null;
  formDribbling: number | null = null;
  formPassing: number | null = null;
  formDefense: number | null = null;
  formRebounding: number | null = null;
  formIQ: number | null = null;
  formNotes = '';

  playerColors: Record<string, string> = {
    'Base': '#2979FF', 'Escolta': '#00C853', 'Alero': '#FF9100',
    'Ala-Pívot': '#00BCD4', 'Pívot': '#FF6D00'
  };

  get displayList() {
    return this.evaluations;
  }

  async ngOnInit() {
    while (!this.data.currentClub()) {
      await new Promise(r => setTimeout(r, 50));
    }
    await this.load();
  }

  async load() {
    this.loading = true;
    this.evaluations = await this.data.getEvaluations();
    this.allPlayers = await this.data.getPlayers();
    this.allPlayers.forEach(p => {
      this.playerMap[p.id] = p;
      this.playerNames[p.id] = `${p.first_name} ${p.last_name}`;
    });
    const teams = await this.data.getTeams();
    teams.forEach(t => this.teamNames[t.id] = t.name);
    this.allPlayers.forEach(p => {
      this.playerTeams[p.id] = this.teamNames[p.team_id] || '—';
    });
    this.loading = false;
    this.cdr.detectChanges();
  }

  initials(playerId: string): string {
    const p = this.playerMap[playerId];
    if (!p) return '?';
    return (p.first_name[0] + p.last_name[0]).toUpperCase();
  }

  teamForPlayer(playerId: string): string {
    return this.playerTeams[playerId] || '—';
  }

  posForPlayer(playerId: string): string {
    return this.playerMap[playerId]?.position || '—';
  }

  overallScore(ev: Evaluation): number {
    const vals = [ev.shooting, ev.dribbling, ev.passing, ev.defense, ev.rebounding, ev.iq].filter(v => v !== null) as number[];
    if (vals.length === 0) return 0;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10);
  }

  statBars(ev: Evaluation): { label: string; val: number }[] {
    const items: { label: string; val: number }[] = [];
    if (ev.shooting !== null) items.push({ label: 'Tiro', val: ev.shooting * 10 });
    if (ev.dribbling !== null) items.push({ label: 'Bote', val: ev.dribbling * 10 });
    if (ev.passing !== null) items.push({ label: 'Pase', val: ev.passing * 10 });
    if (ev.defense !== null) items.push({ label: 'Defensa', val: ev.defense * 10 });
    if (ev.rebounding !== null) items.push({ label: 'Rebote', val: ev.rebounding * 10 });
    if (ev.iq !== null) items.push({ label: 'IQ', val: ev.iq * 10 });
    return items;
  }

  openCreate() {
    if (this.allPlayers.length === 0) return;
    this.formPlayer = this.allPlayers[0].id;
    this.formDate = new Date().toISOString().slice(0, 10);
    this.showForm = true;
  }

  async save() {
    if (!this.formPlayer) return;
    const clubId = this.data.currentClub()?.id;
    if (!clubId) return;
    await this.data.createEvaluation({
      club_id: clubId,
      player_id: this.formPlayer,
      date: this.formDate,
      type: this.formType,
      shooting: this.formShooting,
      dribbling: this.formDribbling,
      passing: this.formPassing,
      defense: this.formDefense,
      rebounding: this.formRebounding,
      iq: this.formIQ,
      athleticism: null,
      teamwork: null,
      attitude: null,
      notes: this.formNotes.trim() || null,
    });
    this.showForm = false;
    await this.load();
  }
}
