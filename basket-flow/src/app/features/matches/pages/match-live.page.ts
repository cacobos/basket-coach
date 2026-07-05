import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatchService } from '../services/match.service';
import { ConfigurationService } from '../services/configuration.service';
import { ConfigurationRepository } from '../repositories/configuration.repository';
import { MatchStore } from '../store/match.store';
import { DataService } from '../../../core/services/data.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { Player, CatalogTag, CatalogResult, CatalogInitType, CatalogAttackType, CatalogSystem } from '../../../core/models/models';
import type { PossessionFormData } from '../models/match.models';

@Component({
  selector: 'app-match-live',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="live-page">
      @if (loading()) {
        <div class="loading">Cargando partido...</div>
      } @else if (store.match(); as match) {
        <header class="live-topbar">
          <a [routerLink]="['/matches', match.id]" class="btn-back" aria-label="Volver">
            <span class="material-symbols-outlined">arrow_back</span>
          </a>

          <div class="scoreboard">
            <div class="score-team">
              <span class="score-label">{{ 'Local' }}</span>
              <span class="score-value score-own">{{ store.score().own }}</span>
            </div>
            <span class="score-divider">–</span>
            <div class="score-team">
              <span class="score-label">{{ match.rival }}</span>
              <span class="score-value score-rival">{{ store.score().rival }}</span>
            </div>
          </div>

          <div class="topbar-actions">
            @if (match.status === 'in_progress') {
              <button class="btn-icon" (click)="openLineupModal()" aria-label="Quinteto">
                <span class="material-symbols-outlined">groups</span>
              </button>
              <button class="btn-icon btn-icon-danger" (click)="finishMatch()" aria-label="Finalizar">
                <span class="material-symbols-outlined">flag</span>
              </button>
            }
          </div>
        </header>

        <div class="live-layout">
          <div class="col-main">
            <div class="botonera">

              <!-- Period selector -->
              <div class="field-row">
                <label>Cuarto</label>
                <div class="period-buttons">
                  @for (p of [1,2,3,4]; track p) {
                    <button type="button" class="period-btn" [class.active]="period() === p"
                            (click)="setPeriod(p)">{{ p }}º</button>
                  }
                </div>
              </div>

              <!-- Side -->
              <div class="field-row">
                <label>Lado</label>
                <div class="side-buttons">
                  <button type="button" class="side-btn" [class.active]="formData().side === 'own'"
                          (click)="formData.update(f => ({...f, side: 'own'}))">Nuestro</button>
                  <button type="button" class="side-btn" [class.active]="formData().side === 'rival'"
                          (click)="formData.update(f => ({...f, side: 'rival'}))">Rival</button>
                </div>
              </div>

              <!-- Init Type -->
              <div class="field-row">
                <label>Inicio de posesión</label>
                <div class="option-grid">
                  @for (opt of configService.initTypes(); track opt.id) {
                    <button type="button" class="opt-btn"
                            [class.active]="formData().initTypeId === opt.id"
                            (click)="formData.update(f => ({...f, initTypeId: opt.id}))">{{ opt.name }}</button>
                  }
                </div>
              </div>

              <!-- Attack Type -->
              <div class="field-row">
                <label>Tipo de ataque</label>
                <div class="option-grid">
                  @for (opt of configService.attackTypes(); track opt.id) {
                    <button type="button" class="opt-btn"
                            [class.active]="formData().attackTypeId === opt.id"
                            (click)="formData.update(f => ({...f, attackTypeId: opt.id}))">{{ opt.name }}</button>
                  }
                </div>
              </div>

              <!-- System (only for own side) -->
              @if (formData().side === 'own') {
                <div class="field-row">
                  <label>Sistema</label>
                  <div class="option-grid">
                    @for (opt of configService.systems(); track opt.id) {
                      <button type="button" class="opt-btn"
                              [class.active]="formData().systemId === opt.id"
                              (click)="toggleSystem(opt.id)">{{ opt.name }}</button>
                    }
                  </div>
                </div>
              }

              <!-- Result -->
              <div class="field-row">
                <label>Resultado</label>
                <div class="option-grid">
                  @for (opt of configService.results(); track opt.id) {
                    <button type="button" class="opt-btn"
                            [class.active]="formData().resultId === opt.id"
                            [style.--rc]="opt.color"
                            (click)="selectResult(opt.id)">{{ opt.name }}</button>
                  }
                </div>
              </div>

              <!-- Points (manual, 0-4) -->
              <div class="field-row">
                <label>Puntos</label>
                <div class="points-buttons">
                  @for (p of [0,1,2,3,4]; track p) {
                    <button type="button" class="pts-btn"
                            [class.active]="formData().points === p"
                            (click)="formData.update(f => ({...f, points: p}))">{{ p }}</button>
                  }
                </div>
              </div>

              <!-- Creator -->
              @if (formData().side === 'own') {
                <div class="field-row">
                  <label>Creadora</label>
                  <div class="player-select">
                    <button type="button" class="player-btn"
                            [class.active]="formData().creatorId === ''"
                            (click)="formData.update(f => ({...f, creatorId: ''}))">—</button>
                    @for (p of squadPlayers(); track p.id) {
                      <button type="button" class="player-btn"
                              [class.active]="formData().creatorId === p.id"
                              (click)="formData.update(f => ({...f, creatorId: p.id}))">
                        {{ p.first_name }} {{ p.last_name }}@if (p.jersey_number) { <span class="player-num">#{{ p.jersey_number }}</span> }
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- Finisher -->
              @if (formData().side === 'own') {
                <div class="field-row">
                  <label>Finalizadora</label>
                  <div class="player-select">
                    <button type="button" class="player-btn"
                            [class.active]="formData().finisherId === ''"
                            (click)="formData.update(f => ({...f, finisherId: ''}))">—</button>
                    @for (p of squadPlayers(); track p.id) {
                      <button type="button" class="player-btn"
                              [class.active]="formData().finisherId === p.id"
                              (click)="formData.update(f => ({...f, finisherId: p.id}))">
                        {{ p.first_name }} {{ p.last_name }}@if (p.jersey_number) { <span class="player-num">#{{ p.jersey_number }}</span> }
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- Notes -->
              <div class="field-row">
                <label>Notas</label>
                <textarea class="field-input" [value]="formData().notes"
                          (input)="formData.update(f => ({...f, notes: $any($event.target).value}))"
                          rows="2" placeholder="Notas adicionales..."></textarea>
              </div>

              <!-- Tags -->
              <div class="field-row">
                <label>Tag</label>
                <select class="field-input" [value]="formData().tag"
                        (change)="formData.update(f => ({...f, tag: $any($event.target).value}))">
                  <option value="">Sin tag</option>
                  @for (t of tags(); track t.id) {
                    <option [value]="t.id">{{ t.name }}</option>
                  }
                </select>
              </div>

              @if (error()) {
                <div class="alert-error">{{ error() }}</div>
              }
            </div>

            <!-- Action buttons -->
            <div class="action-row">
              <button type="button" class="btn-primary"
                      [disabled]="!canSave() || saving()"
                      (click)="savePossession()">
                @if (saving()) {
                  Guardando...
                } @else {
                  Guardar posesión
                }
              </button>
              <button type="button" class="btn-secondary"
                      [disabled]="store.possessions().length === 0 || saving()"
                      (click)="undoLastPossession()">Deshacer última</button>
              <button type="button" class="btn-danger"
                      (click)="finishMatch()">Finalizar partido</button>
            </div>

            <!-- Recent possessions -->
            @if (store.possessions().length > 0) {
              <div class="possessions-list">
                <div class="tl-header">
                  <h3>Últimas posesiones</h3>
                  <span class="tl-count">{{ store.possessions().length }}</span>
                </div>
                <div class="poss-list">
                  @for (p of store.possessions().slice().reverse(); track p.id) {
                    <div class="poss-item" [class.poss-own]="p.side === 'own'" [class.poss-rival]="p.side === 'rival'">
                      <div class="poss-indicator"></div>
                      <div class="poss-body">
                        <div class="poss-head">
                          <span class="poss-period">P{{ p.period }}.{{ p.number }}</span>
                          @if (p.side === 'own') {
                            <span class="poss-result-name">{{ getResultName(p.result_id) }}</span>
                          }
                        </div>
                        @if (p.finisher_id) {
                          <div class="poss-player">{{ getPlayerName(p) }}</div>
                        }
                      </div>
                      @if (p.points > 0) {
                        <span class="poss-points">+{{ p.points }}</span>
                      }
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <aside class="col-stats">
            <div class="kpi-row">
              <div class="kpi">
                <span class="kpi-value">{{ store.ppp() }}</span>
                <span class="kpi-label">PPP</span>
              </div>
              <div class="kpi">
                <span class="kpi-value">{{ (store.ppp() * 100).toFixed(0) }}</span>
                <span class="kpi-label">ORtg</span>
              </div>
              <div class="kpi">
                <span class="kpi-value">{{ calcDRtg() }}</span>
                <span class="kpi-label">DRtg</span>
              </div>
            </div>

            @if (systemStats().length > 0) {
              <div class="stats-card">
                <h3>Sistemas</h3>
                <div class="stats-list">
                  @for (s of systemStats(); track s.name) {
                    <div class="stats-row">
                      <span class="stats-name">{{ s.name }}</span>
                      <span class="stats-count">{{ s.count }}</span>
                      <span class="stats-ppp">{{ s.ppp }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            @if (playerStats().length > 0) {
              <div class="stats-card">
                <h3>Jugadoras</h3>
                <div class="stats-list">
                  @for (pl of playerStats(); track pl.name) {
                    <div class="stats-row">
                      <span class="stats-num">{{ pl.number }}</span>
                      <span class="stats-name">{{ pl.name }}</span>
                      <span class="stats-pts">{{ pl.points }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </aside>
        </div>
      }
    </div>

    @if (showLineupModal()) {
      <div class="modal-overlay" (click)="closeLineupModal()">
        <div class="modal-panel" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Jugadoras convocadas</h3>
            <span class="modal-counter">{{ lineupSelectedIds().size }}/5</span>
          </div>
          <div class="modal-grid">
            @for (p of squadPlayers(); track p.id) {
              <button class="modal-player"
                      [class.modal-checked]="lineupSelectedIds().has(p.id)"
                      (click)="toggleLineupPlayer(p.id)">
                <span class="modal-check">
                  @if (lineupSelectedIds().has(p.id)) {
                    <span class="material-symbols-outlined">check_circle</span>
                  } @else {
                    <span class="material-symbols-outlined">radio_button_unchecked</span>
                  }
                </span>
                <span class="modal-pnum">{{ p.jersey_number }}</span>
                <span class="modal-pname">{{ p.first_name }} {{ p.last_name }}</span>
                @if (p.position) {
                  <span class="modal-pos">{{ p.position }}</span>
                }
              </button>
            }
            @if (squadPlayers().length === 0) {
              <div class="modal-empty">No hay jugadoras convocadas para este partido</div>
            }
          </div>
          @if (lineupError()) {
            <div class="modal-error">{{ lineupError() }}</div>
          }
          <div class="modal-actions">
            <button class="btn-modal-cancel" (click)="closeLineupModal()">Cancelar</button>
            <button class="btn-modal-confirm"
                    [disabled]="lineupSelectedIds().size !== 5 || saving()"
                    (click)="confirmLineup()">
              @if (saving()) { Guardando... } @else { Confirmar quinteto }
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host {
      --surface: #0d141d;
      --surface-card: #151c25;
      --surface-elevated: #1a2332;
      --border-light: rgba(255,255,255,0.06);
      --border-mid: rgba(255,255,255,0.10);
      --text-primary: #e2e8f0;
      --text-secondary: #94a3b8;
      --text-tertiary: #64748b;
      --accent: #4f6ef7;
      display: block;
      height: 100%;
      font-family: 'Inter', sans-serif;
    }

    .live-page {
      height: calc(100vh - 60px);
      display: flex;
      flex-direction: column;
      background: var(--surface);
    }

    .loading { text-align: center; padding: 60px; color: var(--text-secondary); font-size: 14px; }

    .live-topbar {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px;
      background: linear-gradient(180deg, #1a2332 0%, #0f172a 100%);
      border-bottom: 1px solid var(--border-light);
      flex-shrink: 0;
    }
    .btn-back { color: var(--text-secondary); text-decoration: none; display: flex; align-items: center; padding: 4px; }
    .btn-back:hover { color: var(--text-primary); }
    .btn-back .material-symbols-outlined { font-size: 20px; }

    .scoreboard {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 20px;
      padding: 6px 12px;
    }
    .score-team { text-align: center; }
    .score-label { display: block; font-size: 0.7rem; color: var(--text-tertiary); margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
    .score-value { font-size: 1.8rem; font-weight: 800; line-height: 1; }
    .score-own { color: #60a5fa; }
    .score-rival { color: #f87171; }
    .score-divider { font-size: 1.5rem; color: var(--text-tertiary); font-weight: 300; }

    @media (min-width: 640px) {
      .score-value { font-size: 2.2rem; }
      .scoreboard { padding: 8px 20px; gap: 28px; }
    }

    .topbar-actions { display: flex; gap: 4px; align-items: center; }
    .btn-icon {
      display: flex; align-items: center; justify-content: center;
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,0.04); border: 1px solid var(--border-light);
      color: var(--text-secondary); cursor: pointer; transition: all 0.15s ease;
    }
    .btn-icon:hover { background: rgba(255,255,255,0.08); border-color: var(--border-mid); color: var(--text-primary); }
    .btn-icon-danger:hover { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.3); color: #fca5a5; }
    .btn-icon .material-symbols-outlined { font-size: 18px; }

    .live-layout {
      flex: 1; display: grid;
      grid-template-columns: 1fr;
      gap: 0;
      max-width: 1400px; margin: 0 auto; width: 100%;
      overflow-y: auto;
    }
    .col-main { min-width: 0; display: flex; flex-direction: column; gap: 0; padding: 0 0 80px; }
    .col-stats { display: none; }

    @media (min-width: 768px) {
      .live-layout { grid-template-columns: 1fr 240px; padding: 10px 16px; }
      .col-stats { display: flex; flex-direction: column; gap: 8px; }
      .col-main { padding: 0; }
    }

    .botonera { display: flex; flex-direction: column; gap: 8px; padding: 8px; }

    .field-row { margin-bottom: 8px; }
    .field-row label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-tertiary);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }

    .period-buttons, .side-buttons, .points-buttons {
      display: flex;
      gap: 6px;
    }
    .period-btn, .side-btn, .pts-btn {
      padding: 8px 18px;
      border-radius: 8px;
      border: 1.5px solid var(--border-light);
      background: rgba(255,255,255,0.04);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      transition: all 0.15s;
      min-height: 40px;
    }
    .period-btn:hover, .side-btn:hover, .pts-btn:hover {
      border-color: var(--border-mid);
      color: var(--text-primary);
    }
    .period-btn.active, .side-btn.active, .pts-btn.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }

    .option-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .opt-btn {
      padding: 6px 14px;
      border-radius: 8px;
      border: 1.5px solid var(--border-light);
      background: rgba(255,255,255,0.04);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      transition: all 0.15s;
      min-height: 34px;
    }
    .opt-btn:hover { border-color: var(--border-mid); color: var(--text-primary); }
    .opt-btn.active {
      background: color-mix(in srgb, var(--accent) 15%, transparent);
      color: #fff;
      border-color: var(--accent);
    }

    .player-select {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
    }
    .player-btn {
      padding: 6px 14px;
      border-radius: 8px;
      border: 1.5px solid var(--border-light);
      background: rgba(255,255,255,0.04);
      color: var(--text-secondary);
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: 500;
      transition: all 0.15s;
      min-height: 34px;
    }
    .player-btn:hover { border-color: var(--border-mid); color: var(--text-primary); }
    .player-btn.active {
      background: rgba(96,165,250,0.12);
      color: #93c5fd;
      border-color: rgba(96,165,250,0.3);
    }
    .player-num { color: var(--text-tertiary); font-weight: 600; margin-left: 4px; }

    .field-input {
      width: 100%;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1.5px solid var(--border-light);
      background: rgba(255,255,255,0.04);
      color: var(--text-primary);
      font-family: inherit;
      font-size: 0.85rem;
      resize: vertical;
      box-sizing: border-box;
    }
    .field-input:focus { outline: none; border-color: var(--accent); }
    select.field-input option { background: #0d141d; color: var(--text-primary); }

    .alert-error {
      background: rgba(239,68,68,0.08); color: #fca5a5; padding: 8px 12px;
      border-radius: 8px; font-size: 12px; border: 1px solid rgba(239,68,68,0.12);
    }

    .action-row {
      display: flex;
      gap: 8px;
      padding: 8px;
    }
    .btn-primary {
      flex: 1;
      padding: 12px 24px;
      border-radius: 10px;
      border: none;
      background: #2563eb;
      color: #fff;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
      min-height: 48px;
    }
    .btn-primary:hover:not(:disabled) { background: #3b82f6; }
    .btn-primary:disabled { opacity: 0.35; cursor: default; }

    .btn-secondary {
      padding: 12px 20px;
      border-radius: 10px;
      border: 1.5px solid var(--border-light);
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      min-height: 48px;
      white-space: nowrap;
    }
    .btn-secondary:hover:not(:disabled) { border-color: var(--border-mid); color: var(--text-primary); }
    .btn-secondary:disabled { opacity: 0.25; cursor: default; }

    .btn-danger {
      padding: 12px 20px;
      border-radius: 10px;
      border: 1.5px solid rgba(239,68,68,0.3);
      background: transparent;
      color: #f87171;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      min-height: 48px;
      white-space: nowrap;
    }
    .btn-danger:hover { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.5); }

    .possessions-list {
      padding: 0 8px 8px;
    }
    .tl-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 0;
    }
    .tl-header h3 {
      font-size: 0.75rem; font-weight: 600; margin: 0;
      text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-tertiary);
    }
    .tl-count {
      font-size: 0.7rem; color: var(--text-tertiary);
      background: rgba(255,255,255,0.04); padding: 2px 10px; border-radius: 10px; font-weight: 600;
    }
    .poss-list { display: flex; flex-direction: column; gap: 3px; }
    .poss-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; border-radius: 8px;
      background: var(--surface-card);
      border: 1px solid var(--border-light);
    }
    .poss-own { border-left: 3px solid #60a5fa; }
    .poss-rival { border-left: 3px solid #f87171; }
    .poss-body { flex: 1; min-width: 0; }
    .poss-head { display: flex; align-items: center; gap: 8px; }
    .poss-period { font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); }
    .poss-result-name { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); }
    .poss-player { font-size: 0.75rem; color: var(--text-tertiary); margin-top: 2px; }
    .poss-points { font-size: 0.85rem; font-weight: 700; color: #34d399; flex-shrink: 0; }

    .kpi-row {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 0;
    }
    .kpi-row > * {
      text-align: center; padding: 8px 4px; border-radius: 8px;
      background: rgba(255,255,255,0.02);
    }
    .kpi-value { display: block; font-size: 18px; font-weight: 800; color: #93c5fd; line-height: 1.1; }
    .kpi-label { display: block; font-size: 8px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.7px; margin-top: 3px; }

    .stats-card {
      background: var(--surface-card);
      border-radius: 10px; padding: 10px 12px; border: 1px solid var(--border-light);
    }
    .stats-card h3 {
      font-size: 9px; font-weight: 600; margin: 0 0 6px;
      color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.7px;
    }
    .stats-list { display: flex; flex-direction: column; gap: 2px; }
    .stats-row { display: flex; align-items: center; gap: 4px; padding: 3px 6px; border-radius: 6px; font-size: 11px; }
    .stats-row:hover { background: rgba(255,255,255,0.02); }
    .stats-name { flex: 1; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .stats-count { font-weight: 700; color: var(--text-primary); font-size: 11px; }
    .stats-ppp { color: var(--text-tertiary); font-size: 10px; }
    .stats-num {
      display: inline-flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; border-radius: 50%;
      background: rgba(255,255,255,0.04); font-size: 10px; font-weight: 800; flex-shrink: 0;
    }
    .stats-pts { font-weight: 700; font-size: 11px; }

    .modal-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;
      padding: 16px; backdrop-filter: blur(4px);
    }
    .modal-panel {
      background: var(--surface-elevated); border-radius: 14px; border: 1px solid var(--border-mid);
      width: 100%; max-width: 480px; max-height: 80vh; display: flex; flex-direction: column;
      box-shadow: 0 24px 80px rgba(0,0,0,0.5);
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 18px 10px;
    }
    .modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; }
    .modal-counter {
      font-size: 13px; font-weight: 700; color: #93c5fd;
      background: rgba(96,165,250,0.08); padding: 2px 14px; border-radius: 20px;
    }
    .modal-grid {
      flex: 1; overflow-y: auto; padding: 8px 18px; display: flex; flex-direction: column; gap: 4px;
    }
    .modal-empty {
      padding: 24px 12px; text-align: center; color: var(--text-tertiary); font-size: 13px;
    }
    .modal-player {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; border-radius: 10px; border: 1.5px solid var(--border-light);
      background: transparent; color: var(--text-primary); text-align: left;
      font-size: 14px; transition: all 0.12s ease; min-height: 48px; cursor: pointer;
    }
    .modal-player:hover { background: rgba(255,255,255,0.04); border-color: var(--border-mid); }
    .modal-player.modal-checked {
      background: rgba(96,165,250,0.06); border-color: rgba(96,165,250,0.3);
    }
    .modal-check { display: flex; align-items: center; flex-shrink: 0; }
    .modal-check .material-symbols-outlined { font-size: 22px; }
    .modal-checked .modal-check { color: #60a5fa; }
    .modal-player:not(.modal-checked) .modal-check { color: rgba(255,255,255,0.15); }
    .modal-pnum {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 50%;
      background: rgba(255,255,255,0.04); font-size: 13px; font-weight: 800; flex-shrink: 0;
    }
    .modal-checked .modal-pnum { background: rgba(96,165,250,0.15); color: #93c5fd; }
    .modal-pname { flex: 1; font-weight: 500; }
    .modal-pos { font-size: 10px; color: var(--text-tertiary); background: rgba(255,255,255,0.03); padding: 2px 10px; border-radius: 10px; }
    .modal-error {
      margin: 0 18px 8px; padding: 8px 12px; border-radius: 6px;
      background: rgba(239,68,68,0.08); color: #fca5a5; font-size: 12px;
    }
    .modal-actions {
      display: flex; gap: 10px; padding: 8px 18px 16px;
    }
    .btn-modal-cancel {
      flex: 1; padding: 12px; border-radius: 10px; border: 1px solid var(--border-light);
      background: transparent; color: var(--text-secondary); font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-modal-cancel:hover { background: rgba(255,255,255,0.04); }
    .btn-modal-confirm {
      flex: 2; padding: 12px; border-radius: 10px; border: none;
      background: #2563eb; color: #fff;
      font-size: 14px; font-weight: 700; cursor: pointer;
      transition: opacity 0.15s ease;
    }
    .btn-modal-confirm:disabled { opacity: 0.35; cursor: default; }
    .btn-modal-confirm:hover:not(:disabled) { opacity: 0.9; }
  `]
})
export class MatchLivePage {
  private route = inject(ActivatedRoute);
  private matchService = inject(MatchService);
  private dataService = inject(DataService);
  private supabase = inject(SupabaseService);
  private configRepo = inject(ConfigurationRepository);
  configService = inject(ConfigurationService);
  store = inject(MatchStore);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  private matchId: string | null = null;

  readonly period = signal(1);

  readonly squadPlayers = signal<Player[]>([]);
  readonly tags = signal<CatalogTag[]>([]);

  showLineupModal = signal(false);
  lineupSelectedIds = signal<Set<string>>(new Set());
  lineupError = signal<string | null>(null);

  readonly formData = signal({
    side: 'own' as 'own' | 'rival',
    initTypeId: '',
    attackTypeId: '',
    systemId: '',
    resultId: '',
    points: 0,
    finisherId: '',
    creatorId: '',
    notes: '',
    tag: '',
  });

  readonly canSave = computed(() =>
    !!this.formData().initTypeId && !!this.formData().resultId
  );

  readonly systemStats = computed(() => {
    const possessions = this.store.ownPossessions().filter(p => p.system_id);
    const systemMap = new Map(this.configService.systems().map(s => [s.id, s]));
    const acc = new Map<string, { name: string; count: number; points: number }>();
    for (const p of possessions) {
      const sys = systemMap.get(p.system_id!);
      const key = p.system_id!;
      const e = acc.get(key) ?? { name: sys?.name || '?', count: 0, points: 0 };
      e.count++; e.points += p.points;
      acc.set(key, e);
    }
    return [...acc.values()]
      .map(s => ({ ...s, ppp: s.count > 0 ? +(s.points / s.count).toFixed(2) : 0 }))
      .sort((a, b) => b.count - a.count);
  });

  readonly playerStats = computed(() => {
    const possessions = this.store.ownPossessions().filter(p => p.finisher_id);
    const playerMap = new Map(this.squadPlayers().map(p => [p.id, p]));
    const acc = new Map<string, { name: string; number: number; points: number }>();
    for (const p of possessions) {
      const pl = playerMap.get(p.finisher_id!);
      if (!pl) continue;
      const e = acc.get(p.finisher_id!) ?? { name: `${pl.first_name} ${pl.last_name}`, number: pl.jersey_number ?? 0, points: 0 };
      e.points += p.points;
      acc.set(p.finisher_id!, e);
    }
    return [...acc.values()].sort((a, b) => b.points - a.points);
  });

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.loadMatch(id);
    });
  }

  private async loadMatch(id: string) {
    this.matchId = id;
    await this.matchService.loadMatch(id);
    const match = this.store.match();
    if (match) {
      this.period.set(match.current_period);
      await Promise.all([
        this.loadSquad(),
        this.loadTags(),
      ]);
    }
    this.loading.set(false);
  }

  private async loadSquad(): Promise<void> {
    if (!this.matchId) return;
    const { data } = await this.supabase.client
      .from('match_squads')
      .select('*, players(*)')
      .eq('match_id', this.matchId);
    const players: Player[] = (data || [])
      .map((s: Record<string, unknown>) => (s as { players: Player }).players)
      .filter(Boolean);
    this.squadPlayers.set(players);
  }

  private async loadTags(): Promise<void> {
    const match = this.store.match();
    if (!match) return;
    const tags = await this.configRepo.findTags(match.club_id);
    this.tags.set(tags);
  }

  setPeriod(p: number): void {
    this.period.set(p);
  }

  toggleSystem(id: string): void {
    this.formData.update(f => ({ ...f, systemId: f.systemId === id ? '' : id }));
  }

  selectResult(resultId: string): void {
    this.formData.update(f => ({ ...f, resultId }));
  }

  async savePossession(): Promise<void> {
    const f = this.formData();
    if (!this.matchId) return;
    if (!f.initTypeId) { this.error.set('Selecciona inicio de posesión'); return; }
    if (!f.resultId) { this.error.set('Selecciona resultado'); return; }

    this.saving.set(true);
    this.error.set(null);

    const periodPossessions = this.store.possessions().filter(p => p.period === this.period());
    const number = periodPossessions.length + 1;

    const data: PossessionFormData = {
      matchId: this.matchId,
      period: this.period(),
      number,
      side: f.side,
      initTypeId: f.initTypeId,
      attackTypeId: f.attackTypeId,
      systemId: f.systemId || undefined,
      resultId: f.resultId,
      finisherId: f.finisherId || undefined,
      creatorId: f.creatorId || undefined,
      timeBucket: '0-8',
      points: f.points,
      notes: f.notes || undefined,
    };

    const result = await this.matchService.savePossession(data);

    if (result.success) {
      await this.matchService.updateMatchScore(
        this.matchId,
        this.store.score().own,
        this.store.score().rival,
      );
      this.formData.update(f => ({
        ...f,
        resultId: '',
        points: 0,
        notes: '',
        tag: '',
      }));
    } else {
      this.error.set(result.error || 'Error al guardar');
    }

    this.saving.set(false);
  }

  async undoLastPossession(): Promise<void> {
    if (!this.matchId) return;
    await this.matchService.undoLastPossession(this.matchId);
  }

  async finishMatch(): Promise<void> {
    if (!this.matchId || !confirm('¿Finalizar el partido?')) return;
    await this.matchService.finishMatch(this.matchId);
  }

  openLineupModal() {
    const currentIds = new Set(this.store.lineup().map(p => p.player_id));
    this.lineupSelectedIds.set(currentIds);
    this.lineupError.set(null);
    this.showLineupModal.set(true);
  }

  closeLineupModal() {
    this.showLineupModal.set(false);
    this.lineupError.set(null);
  }

  toggleLineupPlayer(playerId: string) {
    const current = new Set(this.lineupSelectedIds());
    if (current.has(playerId)) {
      current.delete(playerId);
    } else {
      if (current.size >= 5) {
        this.lineupError.set('Máximo 5 jugadoras en pista');
        return;
      }
      current.add(playerId);
    }
    this.lineupError.set(null);
    this.lineupSelectedIds.set(current);
  }

  async confirmLineup() {
    if (!this.matchId || this.lineupSelectedIds().size !== 5) {
      this.lineupError.set('Selecciona exactamente 5 jugadoras');
      return;
    }
    this.saving.set(true);
    this.lineupError.set(null);

    const newIds = this.lineupSelectedIds();
    const oldIds = new Set(this.store.lineup().map(p => p.player_id));
    const added = [...newIds].filter(id => !oldIds.has(id));
    const removed = [...oldIds].filter(id => !newIds.has(id));

    if (added.length === 0 && removed.length === 0) {
      this.showLineupModal.set(false);
      this.saving.set(false);
      return;
    }

    try {
      for (let i = 0; i < Math.min(removed.length, added.length); i++) {
        await this.matchService.saveSubstitution({
          matchId: this.matchId,
          playerOut: removed[i],
          playerIn: added[i],
          period: this.period(),
        });
      }
      this.showLineupModal.set(false);
    } catch {
      this.lineupError.set('Error al guardar los cambios');
    } finally {
      this.saving.set(false);
    }
  }

  getResultName(resultId: string): string {
    return this.configService.getResultName(resultId) || resultId.slice(0, 8);
  }

  getPlayerName(possession: { finisher_id: string | null; side: string }): string {
    if (possession.finisher_id) {
      const found = this.squadPlayers().find(p => p.id === possession.finisher_id);
      if (found) return `${found.first_name} ${found.last_name}`;
    }
    return possession.side === 'own' ? '' : 'Rival';
  }

  calcDRtg(): string {
    const c = this.store.possessionCount().rival;
    const points = this.store.score().rival;
    return c > 0 ? (points * 100 / c).toFixed(0) : '0';
  }
}
