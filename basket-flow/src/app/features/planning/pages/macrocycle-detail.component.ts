import { Component, inject } from '@angular/core';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { PlanningStore } from '../store/planning.store';

@Component({
  selector: 'app-macrocycle-detail',
  standalone: true,
  imports: [AsyncPipe, NgFor, NgIf, RouterLink],
  template: `
    <ng-container *ngIf="vm$ | async">
      <div class="page" *ngIf="store.currentMacrocycle() as m">
        <a routerLink="/planning" class="back-link">← Planificación</a>
        <header class="page-header">
          <div>
            <h1 class="page-title">{{ m.name }}</h1>
            <p class="page-meta">{{ m.start_date }} — {{ m.end_date }}</p>
          </div>
          <div class="header-actions">
            <span class="badge" [class]="m.status">{{ m.status }}</span>
            <a [routerLink]="['/planning', m.id, 'mesocycles', 'new']" class="btn-primary">+ Mesociclo</a>
          </div>
        </header>

        <div class="summary-cards" *ngIf="store.summary() as s">
          <div class="stat-card"><span class="stat-val">{{ s.mesocycle_count }}</span><span class="stat-lbl">Mesociclos</span></div>
          <div class="stat-card"><span class="stat-val">{{ s.microcycle_count }}</span><span class="stat-lbl">Microciclos</span></div>
          <div class="stat-card"><span class="stat-val">{{ s.completed_sessions }}/{{ s.total_sessions }}</span><span class="stat-lbl">Sesiones</span></div>
        </div>

        <p class="desc" *ngIf="m.description">{{ m.description }}</p>
        <p class="desc" *ngIf="m.goals"><strong>Objetivos:</strong> {{ m.goals }}</p>

        <h2 class="section-title">Mesociclos</h2>
        <div class="meso-list" *ngIf="store.mesocycles().length > 0">
          <div class="meso-card" *ngFor="let me of store.mesocycles()" (click)="goMesocycle(me.id)">
            <div class="meso-top">
              <span class="meso-name">{{ me.name }}</span>
              <span class="meso-phase" [class]="me.phase">{{ me.phase }}</span>
            </div>
            <div class="meso-dates">{{ me.start_date }} — {{ me.end_date }}</div>
            <div class="meso-intensity">Intensidad: {{ me.intensity }}/10</div>
          </div>
        </div>
        <p class="empty" *ngIf="store.mesocycles().length === 0">No hay mesociclos aún.</p>
      </div>
    </ng-container>
  `,
  styles: [`
    .page { padding: 40px; max-width: 960px; margin: 0 auto; }
    .back-link { color: #bdc2ff; text-decoration: none; font-size: 14px; display: inline-block; margin-bottom: 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-title { font-size: 28px; font-weight: 800; color: #dfe0ff; margin: 0 0 4px; }
    .page-meta { font-size: 14px; color: #908f9d; margin: 0; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .badge { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 12px; border-radius: 9999px; background: rgba(255,255,255,0.05); color: #908f9d; }
    .badge.active { background: rgba(105,240,174,0.12); color: #69f0ae; }
    .badge.completed { background: rgba(189,194,255,0.1); color: #bdc2ff; }
    .btn-primary { display: inline-flex; align-items: center; padding: 10px 18px; border-radius: 10px; background: #0068ed; color: #fff; text-decoration: none; font-weight: 700; font-size: 13px; }
    .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #161b48; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid rgba(69,70,82,0.2); }
    .stat-val { display: block; font-size: 28px; font-weight: 800; color: #dfe0ff; }
    .stat-lbl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #908f9d; }
    .desc { font-size: 14px; color: #c6c5d4; margin: 0 0 8px; }
    .section-title { font-size: 20px; font-weight: 700; color: #dfe0ff; margin: 32px 0 16px; }
    .meso-list { display: flex; flex-direction: column; gap: 8px; }
    .meso-card { background: #161b48; border-radius: 10px; padding: 16px; border: 1px solid rgba(69,70,82,0.2); cursor: pointer; }
    .meso-card:hover { border-color: rgba(69,70,82,0.4); }
    .meso-top { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .meso-name { font-weight: 700; color: #dfe0ff; font-size: 15px; }
    .meso-phase { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 9999px; background: rgba(255,255,255,0.05); color: #908f9d; }
    .meso-phase.preseason { background: rgba(255,183,77,0.12); color: #ffb74d; }
    .meso-phase.competition { background: rgba(0,104,237,0.12); color: #bdc2ff; }
    .meso-phase.peak { background: rgba(105,240,174,0.12); color: #69f0ae; }
    .meso-dates { font-size: 12px; color: #908f9d; margin-bottom: 4px; }
    .meso-intensity { font-size: 12px; color: #c6c5d4; }
    .empty { color: #908f9d; text-align: center; padding: 40px; }
  `]
})
export class MacrocycleDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected store = inject(PlanningStore);

  vm$ = of(this.route.snapshot.paramMap.get('macrocycleId')).pipe(
    filter(Boolean),
    tap(id => {
      this.store.reset();
      this.store.loadMacrocycle(id);
    }),
    map(() => true)
  );

  goMesocycle(id: string) {
    const macroId = this.route.snapshot.paramMap.get('macrocycleId');
    this.router.navigate(['/planning', macroId, 'mesocycles', id]);
  }
}
