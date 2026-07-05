import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { switchMap, filter, tap, map, take, shareReplay } from 'rxjs/operators';
import { PlanningStore } from '../store/planning.store';
import { DataService } from '../../../core/services/data.service';
import type { Club, Team } from '../../../core/models/models';

@Component({
  selector: 'app-macrocycle-form',
  standalone: true,
  imports: [AsyncPipe, FormsModule, NgFor, NgIf, RouterLink],
  template: `
    <div class="page" *ngIf="vm$ | async">
      <a routerLink="/planning" class="back-link">← Volver</a>
      <h1 class="page-title">Nuevo macrociclo</h1>
      <form (ngSubmit)="save()" class="form">
        <div class="field">
          <label class="field-label">Nombre</label>
          <input class="field-input" [(ngModel)]="name" name="name" required placeholder="Temporada 2026-27" />
        </div>
        <div class="field-row">
          <div class="field">
            <label class="field-label">Fecha inicio</label>
            <input class="field-input" type="date" [(ngModel)]="startDate" name="startDate" required />
          </div>
          <div class="field">
            <label class="field-label">Fecha fin</label>
            <input class="field-input" type="date" [(ngModel)]="endDate" name="endDate" required />
          </div>
        </div>
        <div class="field">
          <label class="field-label">Equipo</label>
          <select class="field-input" [(ngModel)]="teamId" name="teamId" required>
            <option *ngFor="let t of teams" [value]="t.id">{{ t.name }}</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label">Descripción (opcional)</label>
          <textarea class="field-input field-textarea" [(ngModel)]="description" name="description" rows="3"></textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Crear macrociclo</button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .page { padding: 40px; max-width: 640px; margin: 0 auto; }
    .back-link { color: #bdc2ff; text-decoration: none; font-size: 14px; display: inline-block; margin-bottom: 20px; }
    .page-title { font-size: 28px; font-weight: 800; color: #dfe0ff; margin: 0 0 32px; }
    .form { display: flex; flex-direction: column; gap: 20px; }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .field-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #908f9d; }
    .field-input { background: #111644; border: 1px solid rgba(69,70,82,0.3); color: #dfe0ff; border-radius: 8px; padding: 10px 12px; font-family: 'Hanken Grotesk', sans-serif; font-size: 14px; outline: none; }
    .field-input:focus { border-color: #0068ed; }
    .field-textarea { resize: vertical; }
    .form-actions { display: flex; gap: 12px; padding-top: 8px; }
    .btn-primary { display: inline-flex; align-items: center; padding: 12px 24px; border-radius: 12px; background: #0068ed; color: #fff; border: none; font-weight: 700; font-size: 14px; cursor: pointer; }
  `]
})
export class MacrocycleFormComponent {
  private store = inject(PlanningStore);
  private router = inject(Router);
  private data = inject(DataService);

  name = '';
  description = '';
  startDate = '';
  endDate = '';
  teamId = '';
  teams: Team[] = [];

  private club$ = toObservable(this.data.currentClub).pipe(
    filter((c): c is Club => c !== null)
  );

  vm$ = this.club$.pipe(
    take(1),
    switchMap(club => from(this.data.getTeams(club.id))),
    tap(teams => {
      this.teams = teams;
      if (teams.length > 0 && !this.teamId) {
        this.teamId = teams[0].id;
      }
    }),
    map(() => true),
    shareReplay(1)
  );

  async save() {
    const clubId = this.data.currentClub()?.id;
    if (!clubId || !this.teamId || !this.name || !this.startDate || !this.endDate) return;
    const macro = await this.store.createMacrocycle({
      club_id: clubId,
      team_id: this.teamId,
      name: this.name,
      description: this.description || undefined,
      start_date: this.startDate,
      end_date: this.endDate,
    });
    this.router.navigate(['/planning', macro.id]);
  }
}
