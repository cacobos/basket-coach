import { Component, inject, signal } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';
import { switchMap, filter, tap, map, take, shareReplay } from 'rxjs/operators';
import { PlanningStore } from '../store/planning.store';
import { DataService } from '../../../core/services/data.service';
import type { Club } from '../../../core/models/models';

@Component({
  selector: 'app-planning-overview',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, RouterLink],
  template: `
    <div class="page" *ngIf="vm$ | async">
      <header class="page-header">
        <div>
          <h1 class="page-title">Planificación</h1>
          <p class="page-sub">Macrociclos de temporada</p>
        </div>
        <a routerLink="/planning/new" class="btn-primary">Nuevo macrociclo</a>
      </header>

      <div class="macros-list" *ngIf="!store.loading()">
        <div class="macro-card" *ngFor="let m of store.macrocycles()" (click)="go(m.id)">
          <div class="macro-top">
            <h3 class="macro-name">{{ m.name }}</h3>
            <span class="macro-status" [class]="m.status">{{ m.status }}</span>
          </div>
          <p class="macro-dates">{{ m.start_date }} — {{ m.end_date }}</p>
          <p class="macro-desc" *ngIf="m.description">{{ m.description }}</p>
        </div>
        <p class="empty" *ngIf="store.macrocycles().length === 0">No hay macrociclos. ¡Crea el primero!</p>
      </div>
      <p *ngIf="store.loading()" class="loading">Cargando...</p>
    </div>
  `,
  styles: [`
    .page { padding: 40px; max-width: 960px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .page-title { font-size: 28px; font-weight: 800; color: #dfe0ff; margin: 0 0 4px; }
    .page-sub { font-size: 14px; color: #908f9d; margin: 0; }
    .btn-primary { display: inline-flex; align-items: center; padding: 12px 20px; border-radius: 12px; background: #0068ed; color: #fff; text-decoration: none; font-weight: 700; font-size: 14px; }
    .macros-list { display: flex; flex-direction: column; gap: 12px; }
    .macro-card { background: #161b48; border-radius: 12px; padding: 20px; border: 1px solid rgba(69,70,82,0.2); cursor: pointer; transition: all 0.15s; }
    .macro-card:hover { border-color: rgba(69,70,82,0.4); }
    .macro-top { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .macro-name { font-size: 18px; font-weight: 700; color: #dfe0ff; margin: 0; }
    .macro-status { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 10px; border-radius: 9999px; background: rgba(255,255,255,0.05); color: #908f9d; }
    .macro-status.active { background: rgba(105,240,174,0.12); color: #69f0ae; }
    .macro-status.completed { background: rgba(189,194,255,0.1); color: #bdc2ff; }
    .macro-dates { font-size: 13px; color: #908f9d; margin: 0 0 4px; }
    .macro-desc { font-size: 13px; color: #c6c5d4; margin: 0; }
    .empty { color: #908f9d; text-align: center; padding: 40px; }
    .loading { color: #908f9d; }
  `]
})
export class PlanningOverviewComponent {
  protected store = inject(PlanningStore);
  private router = inject(Router);
  private data = inject(DataService);
  private currentTeamId = signal<string | null>(null);

  private club$ = toObservable(this.data.currentClub).pipe(
    filter((c): c is Club => c !== null)
  );

  vm$ = this.club$.pipe(
    take(1),
    switchMap(club => from(this.data.getTeams(club.id))),
    tap(teams => {
      if (teams.length > 0) {
        this.currentTeamId.set(teams[0].id);
        this.store.loadMacrocycles(teams[0].id);
      }
    }),
    map(() => true),
    shareReplay(1)
  );

  go(id: string) {
    this.router.navigate(['/planning', id]);
  }
}
