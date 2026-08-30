import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AsyncPipe, NgIf } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { PlayerRepository } from '../../core/repositories/player.repository';
import { SessionRepository } from '../../core/repositories/session.repository';
import { RichTextEditorComponent } from '../../shared/components/rich-text-editor.component';
import { forkJoin, from, of } from 'rxjs';
import { switchMap, filter, map, catchError } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import type { TrainingSession, Player, Attendance, SessionPlayerReview } from '../../core/models/models';

type Tab = 'attendance' | 'evaluation';

@Component({
  selector: 'app-session-analysis',
  standalone: true,
  imports: [FormsModule, RouterLink, RichTextEditorComponent, AsyncPipe, NgIf],
  template: `
    <ng-container *ngIf="vm$ | async as vm; else loadingTpl">
      <div class="page">
        <header class="page-header">
          <div>
            <h2 class="page-title">Análisis de sesión</h2>
            <p class="page-sub">{{ session()?.title }} — {{ session()?.date }}</p>
          </div>
          <div class="header-actions">
            <a [routerLink]="['/sessions', sessionId]" class="btn-secondary">
              <span class="material-symbols-outlined">arrow_back</span>
              Volver a sesión
            </a>
          </div>
        </header>

        <div class="tab-bar">
          <button class="tab-btn" [class.active]="activeTab() === 'attendance'" (click)="activeTab.set('attendance')">
            📋 Asistencia
          </button>
          <button class="tab-btn" [class.active]="activeTab() === 'evaluation'" (click)="activeTab.set('evaluation')">
            📝 Evaluación
          </button>
          <button class="tab-btn tab-save" (click)="saveAll()" [disabled]="saving()">
            {{ saving() ? 'Guardando...' : 'Guardar' }}
          </button>
        </div>

        @if (activeTab() === 'attendance') {
          <section class="tab-content">
            @if (players().length > 0) {
                 <div class="att-summary">
                <div class="att-stat"><span class="att-num present">{{ attendanceSummary().present }}</span> Presentes</div>
                <div class="att-stat"><span class="att-num late">{{ attendanceSummary().late }}</span> Retraso</div>
                <div class="att-stat"><span class="att-num excused">{{ attendanceSummary().excused }}</span> Avisando</div>
                <div class="att-stat"><span class="att-num injured">{{ attendanceSummary().injured }}</span> Lesionadas</div>
                <div class="att-stat"><span class="att-num absent">{{ attendanceSummary().absent }}</span> Ausentes</div>
              </div>
              <div class="att-grid">
                <div class="att-row att-head">
                  <span class="att-name">Jugadora</span>
                  <span class="att-status">Estado</span>
                  <span class="att-late">Min</span>
                  <span class="att-notes">Notas</span>
                </div>
                @for (p of players(); track p.id) {
                  <div class="att-row">
                    <span class="att-name">
                      <span class="att-num-badge">{{ p.jersey_number }}</span>
                      {{ p.first_name }} {{ p.last_name }}
                    </span>
                     <div class="attendance-buttons">
                         <button type="button" class="att-btn" [class.active]="attendanceStatus(p.id) === 'present'" (click)="setAttStatus(p.id, 'present')">Presente</button>
                         <button type="button" class="att-btn" [class.active]="attendanceStatus(p.id) === 'absent'" (click)="setAttStatus(p.id, 'absent')">Ausente</button>
                         <button type="button" class="att-btn" [class.active]="attendanceStatus(p.id) === 'late'" (click)="setAttStatus(p.id, 'late')">Retraso</button>
                         <button type="button" class="att-btn" [class.active]="attendanceStatus(p.id) === 'excused'" (click)="setAttStatus(p.id, 'excused')">Avisa</button>
                         <button type="button" class="att-btn" [class.active]="attendanceStatus(p.id) === 'injured'" (click)="setAttStatus(p.id, 'injured')">Lesionada</button>
                     </div>
                    <input type="number" class="att-min-input" min="0" max="120"
                           [value]="attendanceLate(p.id)"
                           (input)="setAttLate(p.id, $any($event.target).value)"
                           placeholder="—">
                    <input type="text" class="att-notes-input" [value]="attendanceNote(p.id)"
                           (input)="setAttNote(p.id, $any($event.target).value)"
                           placeholder="Nota opcional">
                  </div>
                }
              </div>
            } @else {
              <p class="empty-state">Cargando jugadoras...</p>
            }
          </section>
        }

        @if (activeTab() === 'evaluation') {
          <section class="tab-content">
            <div class="eval-collective">
              <h3 class="eval-section-title">Evaluación colectiva</h3>
              <div class="eval-field">
                <span class="eval-label">Intensidad</span>
                <textarea class="rv-comments" [value]="formIntensityText()"
                          (input)="formIntensityText.set($any($event.target).value)"
                          placeholder="Describe la intensidad de la sesión..." rows="2"></textarea>
              </div>
              <div class="eval-field">
                <span class="eval-label">Concentración</span>
                <textarea class="rv-comments" [value]="formFocusText()"
                          (input)="formFocusText.set($any($event.target).value)"
                          placeholder="Describe la concentración del equipo..." rows="2"></textarea>
              </div>
              <div class="eval-field">
                <span class="eval-label">Notas de la sesión</span>
                <app-rich-text-editor [(value)]="formCollectiveNotes"/>
              </div>
            </div>

            <div class="eval-individual">
              <div class="eval-section-header">
                <h3 class="eval-section-title">Evaluación individual</h3>
                <button class="btn-add-review" (click)="openPlayerPicker()">+ Añadir jugadora</button>
              </div>
              @if (reviews().length === 0) {
                <p class="empty-state">Añade evaluaciones individuales para las jugadoras que quieras valorar.</p>
              }
              <div class="review-list">
                @for (r of reviews(); track r.playerId; let i = $index) {
                  <div class="review-card">
                    <div class="review-header">
                      <span class="review-name">
                        <span class="rv-num-badge">{{ r.jersey_number }}</span>
                        {{ r.player_name }}
                      </span>
                      <button class="btn-remove-review" (click)="removeReview(i)">✕</button>
                    </div>
                    <div class="review-body">
                      <div class="rv-field">
                        <span class="rv-label">Valoración</span>
                        <textarea class="rv-comments" [value]="r.text || ''"
                                  (input)="r.text = $any($event.target).value"
                                  placeholder="Valoración de la jugadora..." rows="3"></textarea>
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </section>
        }
      </div>

      @if (showPlayerPicker()) {
        <div class="modal-overlay" (click)="showPlayerPicker.set(false)">
          <div class="modal-panel" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Seleccionar jugadora</h3>
              <button class="modal-close" (click)="showPlayerPicker.set(false)">✕</button>
            </div>
            <div class="modal-grid">
              @for (p of availableForReview(); track p.id) {
                <button class="modal-player-btn" (click)="addReview(p)">
                  <span class="mp-num">{{ p.jersey_number }}</span>
                  <span class="mp-name">{{ p.first_name }} {{ p.last_name }}</span>
                </button>
              }
              @if (availableForReview().length === 0) {
                <p class="empty-state">Todas las jugadoras ya tienen evaluación.</p>
              }
            </div>
          </div>
        </div>
      }
    </ng-container>

    <ng-template #loadingTpl>
      <div class="page"><div class="loading-state"><span class="material-symbols-outlined loading-icon">sync</span><p>Cargando datos de la sesión...</p></div></div>
    </ng-template>
  `,
  styles: [`
    .page { max-width: 800px; margin: 0 auto; padding: 20px 16px 60px; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 16px; }
    .page-title { font-size: 22px; font-weight: 800; margin: 0; }
    .page-sub { font-size: 13px; color: var(--text-secondary); margin: 2px 0 0; }
    .header-actions { display: flex; gap: 8px; }
    .btn-secondary {
      display: flex; align-items: center; gap: 4px; padding: 8px 14px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.04);
      color: var(--text-primary); font-size: 13px; text-decoration: none;
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.08); }
    .btn-secondary .material-symbols-outlined { font-size: 16px; }

    .tab-bar { display: flex; gap: 4px; margin-bottom: 16px; background: var(--bg-card); border-radius: 10px; padding: 4px; border: 1px solid var(--border-subtle); }
    .tab-btn { flex: 1; padding: 10px 16px; border: none; border-radius: 8px; background: transparent; color: var(--text-secondary); font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.12s; }
    .tab-btn.active { background: rgba(189,194,255,0.12); color: #bdc2ff; }
    .tab-btn:hover:not(.active):not(.tab-save) { background: rgba(255,255,255,0.04); }
    .tab-save { flex: 0; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; padding: 10px 20px; }
    .tab-save:disabled { opacity: 0.4; }

    .tab-content { background: var(--bg-card); border-radius: 10px; border: 1px solid var(--border-subtle); padding: 16px; }

    .loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; }
    .loading-icon { font-size: 48px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Attendance */
    .att-summary { display: flex; gap: 12px; margin-bottom: 16px; }
    .att-stat { font-size: 13px; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
    .att-num { font-size: 20px; font-weight: 800; }
    .att-num.present { color: #4ade80; }
    .att-num.late { color: #fbbf24; }
    .att-num.absent { color: #f87171; }
    .att-num.excused { color: #fb923c; }
    .att-num.injured { color: #a78bfa; }
    .att-grid { display: flex; flex-direction: column; gap: 4px; }
    .att-row { display: grid; grid-template-columns: 1fr auto 50px 1fr; gap: 8px; align-items: center; padding: 6px 8px; border-radius: 6px; }
    .att-row:hover { background: rgba(255,255,255,0.02); }
    .att-head { font-size: 10px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .att-head:hover { background: transparent; }
    .att-name { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; }
    .att-num-badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 50%;
      background: rgba(255,255,255,0.06); font-size: 11px; font-weight: 800; flex-shrink: 0;
    }
    .attendance-buttons { display: flex; gap: 4px; }
    .att-btn { padding: 4px 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); color: #b0b3e0; cursor: pointer; font-size: 0.8rem; transition: all 0.15s; white-space: nowrap; }
    .att-btn.active { background: var(--accent, #4f6ef7); color: #fff; border-color: var(--accent, #4f6ef7); }
    .att-btn:hover:not(.active) { background: rgba(255,255,255,0.1); }
    .att-min-input { width: 40px; padding: 6px 4px; border-radius: 6px; border: 1.5px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: var(--text-primary); font-size: 13px; text-align: center; }
    .att-notes-input { padding: 6px 8px; border-radius: 6px; border: 1.5px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); color: var(--text-primary); font-size: 13px; width: 100%; }

    /* Evaluation */
    .eval-section-title { font-size: 16px; font-weight: 700; margin: 0 0 12px; }
    .eval-collective { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid var(--border-subtle); }
    .eval-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .eval-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); min-width: 110px; }
    .eval-field { margin-top: 16px; }
    .eval-field .eval-label { display: block; margin-bottom: 6px; }
    .eval-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .btn-add-review { padding: 6px 14px; border-radius: 6px; border: 1.5px dashed rgba(255,255,255,0.12); background: transparent; color: var(--text-secondary); font-size: 13px; cursor: pointer; }
    .btn-add-review:hover { border-color: rgba(255,255,255,0.2); color: var(--text-primary); }

    .review-list { display: flex; flex-direction: column; gap: 8px; }
    .review-card { border: 1.5px solid rgba(255,255,255,0.06); border-radius: 10px; background: rgba(255,255,255,0.02); overflow: hidden; }
    .review-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.03); }
    .review-name { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; }
    .rv-num-badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 26px; height: 26px; border-radius: 50%;
      background: rgba(255,255,255,0.08); font-size: 11px; font-weight: 800; flex-shrink: 0;
    }
    .btn-remove-review { background: none; border: none; color: rgba(255,255,255,0.2); font-size: 16px; cursor: pointer; padding: 4px; }
    .btn-remove-review:hover { color: #f87171; }
    .review-body { padding: 10px 12px; display: flex; flex-direction: column; gap: 8px; }
    .rv-field { display: flex; flex-direction: column; gap: 4px; }
    .rv-label { font-size: 12px; font-weight: 600; color: var(--text-secondary); }
    .rv-comments { width: 100%; padding: 8px 10px; border-radius: 6px; border: 1.5px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02); color: var(--text-primary); font-size: 13px; resize: vertical; }

    .empty-state { text-align: center; padding: 24px 16px; color: var(--text-secondary); font-size: 13px; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-panel { background: var(--bg-primary); border-radius: 12px; border: 1px solid var(--border-subtle); width: 100%; max-width: 400px; max-height: 70vh; display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 8px; }
    .modal-header h3 { margin: 0; font-size: 16px; font-weight: 700; }
    .modal-close { background: none; border: none; color: var(--text-secondary); font-size: 18px; cursor: pointer; }
    .modal-grid { flex: 1; overflow-y: auto; padding: 8px 16px; display: flex; flex-direction: column; gap: 4px; }
    .modal-player-btn {
      display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 8px;
      border: 1.5px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.02);
      color: var(--text-primary); text-align: left; font-size: 14px; cursor: pointer; min-height: 44px;
    }
    .modal-player-btn:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); }
    .mp-num {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; border-radius: 50%;
      background: rgba(255,255,255,0.06); font-size: 12px; font-weight: 800; flex-shrink: 0;
    }
    .mp-name { font-weight: 500; flex: 1; }
  `]
})
export class SessionAnalysisComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dataService = inject(DataService);
  private playerRepo = inject(PlayerRepository);
  private sessionRepo = inject(SessionRepository);

  sessionId = '';
  activeTab = signal<Tab>('attendance');
  saving = signal(false);
  showPlayerPicker = signal(false);

  session = signal<TrainingSession | null>(null);
  players = signal<Player[]>([]);
  attendanceRecords = signal<Attendance[]>([]);
  existingReviews = signal<SessionPlayerReview[]>([]);

  formIntensityText = signal<string>('');
  formFocusText = signal<string>('');
  formCollectiveNotes = signal<string>('');

  reviewForm: ReviewFormEntry[] = [];

  readonly vm$ = toObservable(this.dataService.currentClub).pipe(
    filter(Boolean),
    switchMap(club => {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) return of(null);
      return forkJoin({
        sessions: from(this.sessionRepo.findAll(club.id)),
        players: from(this.playerRepo.findByClub(club.id)),
        attendance: from(this.dataService.getAttendance(id)),
        reviews: from(this.dataService.getSessionReviews(id)),
      }).pipe(
        map(data => {
          const session = data.sessions.find(s => s.id === id) ?? null;
          return { ...data, session, id };
        }),
        catchError(() => of(null))
      );
    }),
    map(vmData => {
      if (!vmData) return null;
      this.sessionId = vmData.id;
      this.session.set(vmData.session);
      this.players.set(vmData.players);
      this.attendanceRecords.set(vmData.attendance);
      this.existingReviews.set(vmData.reviews);

      if (vmData.session) {
        this.formIntensityText.set(typeof vmData.session.intensity === 'string' ? vmData.session.intensity : '');
        this.formFocusText.set(typeof vmData.session.focus === 'string' ? vmData.session.focus : '');
        this.formCollectiveNotes.set(vmData.session.collective_notes ?? '');
      }

      this.reviewForm = vmData.reviews.map(r => {
        const p = vmData.players.find(pl => pl.id === r.player_id);
        return {
          playerId: r.player_id,
          player_name: p ? `${p.first_name} ${p.last_name}` : '?',
          jersey_number: p?.jersey_number ?? 0,
          text: r.comments ?? '',
          saved: true,
        };
      });

      return vmData;
    })
  );

  reviews = computed(() => this.reviewForm);

  availableForReview = computed(() => {
    const existingIds = new Set(this.reviewForm.map(r => r.playerId));
    return this.players().filter(p => !existingIds.has(p.id));
  });

  /* Attendance helpers */
  attendanceStatus(playerId: string): string {
    return this.attendanceRecords().find(a => a.player_id === playerId)?.status ?? 'present';
  }
  attendanceLate(playerId: string): number | null {
    return this.attendanceRecords().find(a => a.player_id === playerId)?.late_minutes ?? null;
  }
  attendanceNote(playerId: string): string {
    return this.attendanceRecords().find(a => a.player_id === playerId)?.notes ?? '';
  }

  setAttStatus(playerId: string, status: string) {
    const arr = [...this.attendanceRecords()];
    const idx = arr.findIndex(a => a.player_id === playerId);
    const rec: Attendance = { id: '', session_id: this.sessionId, player_id: playerId, status: status as Attendance['status'], notes: null, late_minutes: null, created_at: '' };
    if (idx >= 0) { arr[idx] = { ...arr[idx], status: status as Attendance['status'] }; }
    else { arr.push(rec); }
    this.attendanceRecords.set(arr);
  }
  setAttLate(playerId: string, val: string) {
    const arr = [...this.attendanceRecords()];
    const idx = arr.findIndex(a => a.player_id === playerId);
    const mins = val === '' ? null : parseInt(val, 10);
    if (idx >= 0) { arr[idx] = { ...arr[idx], late_minutes: mins }; }
    else { arr.push({ id: '', session_id: this.sessionId, player_id: playerId, status: 'present', notes: null, late_minutes: mins, created_at: '' }); }
    this.attendanceRecords.set(arr);
  }
  setAttNote(playerId: string, val: string) {
    const arr = [...this.attendanceRecords()];
    const idx = arr.findIndex(a => a.player_id === playerId);
    if (idx >= 0) { arr[idx] = { ...arr[idx], notes: val || null }; }
    else { arr.push({ id: '', session_id: this.sessionId, player_id: playerId, status: 'present', notes: val || null, late_minutes: null, created_at: '' }); }
    this.attendanceRecords.set(arr);
  }

  attendanceSummary = computed(() => {
    let present = 0, late = 0, excused = 0, injured = 0, absent = 0;
    for (const p of this.players()) {
      const s = this.attendanceStatus(p.id);
      if (s === 'present') present++;
      else if (s === 'late') late++;
      else if (s === 'excused') excused++;
      else if (s === 'injured') injured++;
      else absent++;
    }
    return { present, late, excused, injured, absent };
  });

  /* Review helpers */
  openPlayerPicker() {
    this.showPlayerPicker.set(true);
  }

  addReview(player: Player) {
    this.reviewForm = [...this.reviewForm, {
      playerId: player.id,
      player_name: `${player.first_name} ${player.last_name}`,
      jersey_number: player.jersey_number ?? 0,
      text: '',
      saved: false,
    }];
    this.showPlayerPicker.set(false);
  }

  removeReview(index: number) {
    this.reviewForm = this.reviewForm.filter((_, i) => i !== index);
  }

  /* Save */
  async saveAll() {
    this.saving.set(true);
    try {
      await this.sessionRepo.update(this.sessionId, {
        intensity: this.formIntensityText() || null,
        focus: this.formFocusText() || null,
        collective_notes: this.formCollectiveNotes() || null,
      } as any);

      for (const a of this.attendanceRecords()) {
        await this.dataService.setAttendance(this.sessionId, a.player_id, a.status, a.notes || undefined, a.late_minutes ?? undefined);
      }

      const existingIds = new Set(this.existingReviews().map(r => r.player_id));
      for (const r of this.reviewForm) {
        await this.dataService.upsertSessionReview(this.sessionId, r.playerId, {
          comments: r.text || '',
        });
      }
      for (const r of this.existingReviews()) {
        if (!this.reviewForm.find(f => f.playerId === r.player_id)) {
          await this.dataService.deleteSessionReview(this.sessionId, r.player_id);
        }
      }
    } catch (e) {
      console.error('Save failed', e);
    } finally {
      this.saving.set(false);
    }
  }
}

interface ReviewFormEntry {
  playerId: string;
  player_name: string;
  jersey_number: number;
  text: string;
  saved: boolean;
}
