import { Component, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PlanningStore } from '../store/planning.store';
import { PlanningRepository } from '../repositories/planning.repository';

@Component({
  selector: 'app-mesocycle-detail',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink],
  template: `
    <div class="page" *ngIf="store.currentMesocycle() as me">
      <a [routerLink]="['/planning', macrocycleId]" class="back-link">← {{ macroName }}</a>
      <header class="page-header">
        <div>
          <h1 class="page-title">{{ me.name }}</h1>
          <p class="page-meta">{{ me.start_date }} — {{ me.end_date }}</p>
        </div>
        <button class="btn-primary" (click)="generateMicros()" [disabled]="generating">
          {{ generating ? 'Generando...' : 'Generar microciclos' }}
        </button>
      </header>

      <div class="phase-badge" [class]="me.phase">{{ me.phase }}</div>
      <div class="intensity-bar">
        <div class="intensity-fill" [style.width.%]="me.intensity * 10"></div>
        <span>Intensidad {{ me.intensity }}/10</span>
      </div>

      <p class="desc" *ngIf="me.tactical_goals"><strong>Táctico:</strong> {{ me.tactical_goals }}</p>
      <p class="desc" *ngIf="me.technical_goals"><strong>Técnico:</strong> {{ me.technical_goals }}</p>
      <p class="desc" *ngIf="me.physical_goals"><strong>Físico:</strong> {{ me.physical_goals }}</p>

      <h2 class="section-title">Microciclos</h2>
      <div class="micro-list" *ngIf="store.microcycles().length > 0">
        <div class="micro-card" *ngFor="let mi of store.microcycles()" (click)="goMicro(mi.id)">
          <div class="micro-header">
            <span class="micro-week">Semana {{ mi.week_number }}</span>
            <span class="micro-dates">{{ mi.start_date }} — {{ mi.end_date }}</span>
          </div>
          <div class="micro-info">
            <span *ngIf="mi.has_match" class="micro-match">📅 Partido</span>
            <span>{{ mi.planned_sessions }} sesiones</span>
            <span *ngIf="mi.focus">· {{ mi.focus }}</span>
          </div>
        </div>
      </div>
      <p class="empty" *ngIf="store.microcycles().length === 0" (click)="generateMicros()" style="cursor:pointer">
        No hay microciclos. Haz clic para generarlos automáticamente.
      </p>
    </div>
  `,
  styles: [`
    .page { padding: 40px; max-width: 960px; margin: 0 auto; }
    .back-link { color: #bdc2ff; text-decoration: none; font-size: 14px; display: inline-block; margin-bottom: 20px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-title { font-size: 28px; font-weight: 800; color: #dfe0ff; margin: 0 0 4px; }
    .page-meta { font-size: 14px; color: #908f9d; margin: 0; }
    .btn-primary { padding: 10px 20px; border-radius: 10px; background: #0068ed; color: #fff; border: none; font-weight: 700; font-size: 13px; cursor: pointer; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .phase-badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 12px; border-radius: 9999px; background: rgba(255,255,255,0.05); color: #908f9d; margin-bottom: 16px; }
    .phase-badge.preseason { background: rgba(255,183,77,0.12); color: #ffb74d; }
    .phase-badge.competition { background: rgba(0,104,237,0.12); color: #bdc2ff; }
    .phase-badge.peak { background: rgba(105,240,174,0.12); color: #69f0ae; }
    .intensity-bar { height: 8px; background: rgba(255,255,255,0.05); border-radius: 9999px; margin-bottom: 20px; position: relative; overflow: hidden; }
    .intensity-fill { height: 100%; background: #0068ed; border-radius: 9999px; transition: width 0.3s; }
    .intensity-bar span { position: absolute; right: 0; top: -18px; font-size: 11px; color: #908f9d; }
    .desc { font-size: 14px; color: #c6c5d4; margin: 0 0 8px; }
    .section-title { font-size: 20px; font-weight: 700; color: #dfe0ff; margin: 32px 0 16px; }
    .micro-list { display: flex; flex-direction: column; gap: 8px; }
    .micro-card { background: #161b48; border-radius: 10px; padding: 14px 18px; border: 1px solid rgba(69,70,82,0.2); cursor: pointer; }
    .micro-card:hover { border-color: rgba(69,70,82,0.4); }
    .micro-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .micro-week { font-weight: 700; color: #dfe0ff; font-size: 14px; }
    .micro-dates { font-size: 12px; color: #908f9d; }
    .micro-info { display: flex; gap: 12px; font-size: 12px; color: #c6c5d4; }
    .micro-match { color: #bdc2ff; }
    .empty { color: #908f9d; text-align: center; padding: 40px; }
  `]
})
export class MesocycleDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  protected store = inject(PlanningStore);
  private repo = inject(PlanningRepository);

  macrocycleId = '';
  mesocycleId = '';
  macroName = '';
  generating = false;

  constructor() {
    this.macrocycleId = this.route.snapshot.paramMap.get('macrocycleId') || '';
    this.mesocycleId = this.route.snapshot.paramMap.get('mesocycleId') || '';
    if (this.mesocycleId) {
      this.store.loadMesocycle(this.mesocycleId).then(() => {
        const m = this.store.currentMacrocycle;
        if (this.macrocycleId && !m()) {
          this.repo.getMacrocycle(this.macrocycleId).then(data => {
            this.macroName = data?.name || '';
          });
        } else if (this.macrocycleId) {
          this.macroName = m()!.name;
        }
      });
    } else if (this.macrocycleId) {
      this.repo.getMacrocycle(this.macrocycleId).then(data => {
        this.macroName = data?.name || '';
      });
    }
  }

  async generateMicros() {
    if (!this.mesocycleId) return;
    this.generating = true;
    await this.store.generateMicrocycles(this.mesocycleId, 5);
    this.generating = false;
  }

  goMicro(id: string) {
    this.router.navigate(['/planning', this.macrocycleId, 'mesocycles', this.mesocycleId, 'microcycles', id]);
  }
}
