import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, from } from 'rxjs';
import { filter, map, switchMap } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { DataService } from '../../core/services/data.service';
import { PlayerRepository } from '../../core/repositories/player.repository';
import { TeamRepository } from '../../core/repositories/team.repository';
import { NotificationService } from '../../core/services/notification.service';
import type { Player, Team } from '../../core/models/models';

@Component({
  selector: 'app-team-links',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, RouterLink],
  template: `
    <div class="page" *ngIf="vm$ | async">
      <header class="page-header">
        <div>
          <h2 class="page-title">Jugadores vinculados</h2>
          <p class="page-sub">
            {{ team()?.name }}
            <span class="meta-badge">Equipo destino</span>
          </p>
          <p class="page-hint">
            Vincula jugadores de otros equipos del club (p. ej. un junior que también sube a entrenar
            con el senior). Aparecerán al pasar lista en los entrenamientos de este equipo.
          </p>
        </div>
        <div class="header-actions">
          <a [routerLink]="['/teams']" class="btn-secondary">
            <span class="material-symbols-outlined">arrow_back</span>
            Volver a equipos
          </a>
          <button class="btn-save" (click)="save()" [disabled]="saving() || !dirty()">
            {{ saving() ? 'Guardando...' : dirty() ? 'Guardar cambios' : 'Cambios guardados' }}
          </button>
        </div>
      </header>

      <div class="link-section" *ngIf="allTeams.length > 1">
        <div class="section-head">
          <h3>Vincula jugadores de otros equipos a {{ team()?.name }}</h3>
          <span class="section-count">{{ linkedCount() }} vinculados</span>
        </div>
        <div class="sheet">
          <div class="sheet-row" *ngFor="let p of candidates">
            <label class="row-label">
              <input type="checkbox" [checked]="isLinked(p.id)" (change)="toggle(p.id)"
                     [disabled]="p.team_id === team()?.id" />
              <span class="player-name">{{ p.first_name }} {{ p.last_name }}</span>
              <span class="player-team">{{ teamNames[p.team_id] || '—' }}</span>
              <span class="player-pos">{{ p.position || '—' }}</span>
            </label>
          </div>
          <div class="sheet-empty" *ngIf="candidates.length === 0">
            No hay otros equipos con jugadores para vincular.
          </div>
        </div>
      </div>
      <div class="empty-state" *ngIf="allTeams.length <= 1">
        <p>No hay otros equipos en el club para vincular jugadores.</p>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 40px; max-width: 960px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 32px; }
    .page-title { font-size: 40px; line-height: 48px; font-weight: 800; letter-spacing: -0.02em; color: #dfe0ff; margin: 0; }
    .page-sub { font-size: 16px; color: #c6c5d4; margin: 8px 0 0; display: flex; align-items: center; gap: 8px; }
    .meta-badge {
      font-size: 11px; font-weight: 700; color: #bdc2ff;
      background: rgba(189,194,255,0.1); padding: 3px 10px; border-radius: 9999px;
      letter-spacing: 0.4px;
    }
    .page-hint { font-size: 13px; color: #908f9d; margin: 12px 0 0; max-width: 620px; line-height: 1.5; }
    .header-actions { display: flex; gap: 10px; align-items: center; flex-shrink: 0; }
    .btn-secondary {
      display: flex; align-items: center; gap: 6px; padding: 11px 18px; border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05);
      color: var(--text-primary); font-size: 13px; font-weight: 700; text-decoration: none;
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.09); }
    .btn-secondary .material-symbols-outlined { font-size: 18px; }
    .btn-save {
      padding: 12px 22px; border-radius: 10px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff;
      font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; font-weight: 700;
    }
    .btn-save:disabled { opacity: 0.45; cursor: default; }
    .btn-save:not(:disabled):hover { opacity: 0.9; }

    .link-section { background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-subtle); padding: 20px; }
    .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .section-head h3 { font-size: 16px; font-weight: 700; color: #dfe0ff; margin: 0; }
    .section-count { font-size: 12px; font-weight: 700; color: #bdc2ff; background: rgba(99,102,241,0.12); padding: 4px 12px; border-radius: 9999px; }
    .sheet { display: flex; flex-direction: column; }
    .sheet-row { border-bottom: 1px solid var(--border-subtle); }
    .sheet-row:last-child { border-bottom: none; }
    .row-label {
      display: flex; align-items: center; gap: 14px; padding: 12px 8px;
      cursor: pointer; border-radius: 8px; transition: background 0.12s;
    }
    .row-label:hover { background: rgba(255,255,255,0.03); }
    .row-label input[type="checkbox"] {
      width: 18px; height: 18px; accent-color: #6366f1; cursor: pointer; flex-shrink: 0;
    }
    .row-label input[type="checkbox"]:disabled { opacity: 0.4; cursor: default; }
    .player-name { font-size: 15px; font-weight: 600; color: #dfe0ff; flex: 1; min-width: 0; }
    .player-team { font-size: 13px; color: #bdc2ff; background: rgba(189,194,255,0.08); padding: 2px 9px; border-radius: 9999px; }
    .player-pos { font-size: 13px; color: #908f9d; width: 70px; text-align: right; }
    .sheet-empty { padding: 40px 20px; text-align: center; color: #908f9d; font-size: 14px; }

    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 20px; color: #908f9d; text-align: center; }
    .empty-state p { margin: 0; font-size: 16px; }

    @media (max-width: 768px) {
      .page { padding: 24px 16px 60px; }
      .page-header { flex-direction: column; }
      .page-title { font-size: 30px; line-height: 36px; }
      .header-actions { width: 100%; }
      .header-actions .btn-secondary, .header-actions .btn-save { flex: 1; justify-content: center; }
      .player-pos { display: none; }
    }
  `]
})
export class TeamLinksComponent {
  private route = inject(ActivatedRoute);
  private data = inject(DataService);
  private playerRepo = inject(PlayerRepository);
  private teamRepo = inject(TeamRepository);
  private notification = inject(NotificationService);

  team = signal<Team | null>(null);
  allTeams: Team[] = [];
  teamNames: Record<string, string> = {};
  candidates: Player[] = [];
  private draft = signal<string[]>([]);
  originals = new Set<string>();
  saving = signal(false);

  private club$ = toObservable(this.data.currentClub).pipe(filter(Boolean));

  vm$ = this.club$.pipe(
    switchMap(() => {
      const id = this.route.snapshot.paramMap.get('id');
      if (!id) return forkJoin([from(Promise.resolve(null)), from(Promise.resolve([] as Team[])), from(Promise.resolve([] as Player[])), from(Promise.resolve([] as string[]))]);
      return forkJoin([
        from(this.teamRepo.findById(id)),
        from(this.data.getTeams()),
        from(this.playerRepo.findByClub(this.data.currentClub()!.id)),
        from(this.playerRepo.getLinkedPlayerIds(id)),
      ]);
    }),
    map(([team, teams, players, linkedIds]) => {
      this.team.set(team);
      this.allTeams = teams;
      this.teamNames = {};
      teams.forEach(t => this.teamNames[t.id] = t.name);
      this.candidates = players;
      this.originals = new Set(linkedIds);
      this.draft.set([...linkedIds]);
      return {};
    })
  );

  linkedCount() {
    return this.draft().length;
  }

  dirty() {
    const draft = this.draft();
    if (draft.length !== this.originals.size) return true;
    for (const id of this.originals) if (!draft.includes(id)) return true;
    return false;
  }

  isLinked(playerId: string): boolean {
    return this.draft().includes(playerId);
  }

  toggle(playerId: string) {
    const current = this.draft();
    if (current.includes(playerId)) this.draft.set(current.filter(id => id !== playerId));
    else this.draft.set([...current, playerId]);
  }

  async save() {
    const teamId = this.team()?.id;
    if (!teamId) return;
    this.saving.set(true);
    try {
      const draft = this.draft();
      const toLink = draft.filter(id => !this.originals.has(id));
      const toUnlink = [...this.originals].filter(id => !draft.includes(id));
      if (toUnlink.length > 0) await this.playerRepo.unlinkPlayers(teamId, toUnlink);
      if (toLink.length > 0) await this.playerRepo.linkPlayers(teamId, toLink);
      this.originals = new Set(draft);
      this.notification.show('Vinculación guardada', 'success');
    } catch (e) {
      console.error('Save links failed', e);
      this.notification.show('No se pudo guardar la vinculación', 'error');
    } finally {
      this.saving.set(false);
    }
  }
}
