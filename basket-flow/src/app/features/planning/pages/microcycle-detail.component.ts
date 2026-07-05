import { Component, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PlanningRepository } from '../repositories/planning.repository';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { Microcycle } from '../models/planning.models';

@Component({
  selector: 'app-microcycle-detail',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink],
  template: `
    <div class="page" *ngIf="micro">
      <a [routerLink]="['/planning', macrocycleId, 'mesocycles', mesocycleId]" class="back-link">← Mesociclo</a>
      <h1 class="page-title">Semana {{ micro.week_number }}</h1>
      <p class="page-meta">{{ micro.start_date }} — {{ micro.end_date }}</p>

      <div class="info-grid">
        <div class="info-card">
          <span class="info-lbl">Sesiones</span>
          <span class="info-val">{{ micro.planned_sessions }}</span>
        </div>
        <div class="info-card">
          <span class="info-lbl">Partido</span>
          <span class="info-val">{{ micro.has_match ? 'Sí' : 'No' }}</span>
        </div>
        <div class="info-card" *ngIf="micro.match_day">
          <span class="info-lbl">Día partido</span>
          <span class="info-val">{{ micro.match_day }}</span>
        </div>
      </div>

      <div class="focus-box" *ngIf="micro.focus">
        <h3>Foco</h3>
        <p>{{ micro.focus }}</p>
      </div>

      <h2 class="section-title">Sesiones</h2>
      <div class="sessions-list" *ngIf="sessions.length > 0">
        <div class="session-item" *ngFor="let s of sessions">
          <span class="session-title">{{ s.title }}</span>
          <span class="session-date">{{ s.date }}</span>
          <span class="session-status" [class]="s.status">{{ s.status }}</span>
        </div>
      </div>
      <p class="empty" *ngIf="sessions.length === 0">No hay sesiones vinculadas a esta semana.</p>

      <div class="load-section" *ngIf="micro.load_distribution">
        <h2 class="section-title">Distribución de carga</h2>
        <div class="load-grid">
          <div class="load-day" *ngFor="let day of days">
            <span class="day-name">{{ day.label }}</span>
            <div class="day-bar"><div class="day-fill" [style.width.%]="getLoad(day.key) * 20"></div></div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { padding: 40px; max-width: 960px; margin: 0 auto; }
    .back-link { color: #bdc2ff; text-decoration: none; font-size: 14px; display: inline-block; margin-bottom: 20px; }
    .page-title { font-size: 28px; font-weight: 800; color: #dfe0ff; margin: 0 0 4px; }
    .page-meta { font-size: 14px; color: #908f9d; margin: 0 0 24px; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
    .info-card { background: #161b48; border-radius: 12px; padding: 16px; border: 1px solid rgba(69,70,82,0.2); }
    .info-lbl { display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #908f9d; margin-bottom: 4px; }
    .info-val { font-size: 24px; font-weight: 800; color: #dfe0ff; }
    .focus-box { background: #161b48; border-radius: 12px; padding: 20px; border: 1px solid rgba(69,70,82,0.2); margin-bottom: 24px; }
    .focus-box h3 { font-size: 14px; font-weight: 700; color: #dfe0ff; margin: 0 0 8px; }
    .focus-box p { font-size: 14px; color: #c6c5d4; margin: 0; }
    .section-title { font-size: 20px; font-weight: 700; color: #dfe0ff; margin: 32px 0 16px; }
    .sessions-list { display: flex; flex-direction: column; gap: 8px; }
    .session-item { display: flex; align-items: center; gap: 16px; background: #161b48; border-radius: 10px; padding: 12px 16px; border: 1px solid rgba(69,70,82,0.2); }
    .session-title { flex: 1; font-weight: 600; color: #dfe0ff; font-size: 14px; }
    .session-date { font-size: 12px; color: #908f9d; }
    .session-status { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 9999px; background: rgba(255,255,255,0.05); color: #908f9d; }
    .session-status.completed { background: rgba(105,240,174,0.12); color: #69f0ae; }
    .session-status.planned { background: rgba(0,104,237,0.12); color: #bdc2ff; }
    .load-grid { display: flex; flex-direction: column; gap: 8px; }
    .load-day { display: flex; align-items: center; gap: 12px; }
    .day-name { width: 80px; font-size: 13px; font-weight: 600; color: #c6c5d4; text-transform: capitalize; }
    .day-bar { flex: 1; height: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; overflow: hidden; }
    .day-fill { height: 100%; background: #0068ed; border-radius: 6px; transition: width 0.3s; }
    .empty { color: #908f9d; text-align: center; padding: 40px; }
  `]
})
export class MicrocycleDetailComponent {
  private route = inject(ActivatedRoute);
  private repo = inject(PlanningRepository);
  private supabase = inject(SupabaseService);

  macrocycleId = '';
  mesocycleId = '';
  microcycleId = '';
  micro: Microcycle | null = null;
  sessions: any[] = [];

  readonly days = [
    { key: 'monday', label: 'Lunes' },
    { key: 'tuesday', label: 'Martes' },
    { key: 'wednesday', label: 'Miércoles' },
    { key: 'thursday', label: 'Jueves' },
    { key: 'friday', label: 'Viernes' },
  ];

  constructor() {
    this.macrocycleId = this.route.snapshot.paramMap.get('macrocycleId') || '';
    this.mesocycleId = this.route.snapshot.paramMap.get('mesocycleId') || '';
    this.microcycleId = this.route.snapshot.paramMap.get('microcycleId') || '';
    if (this.microcycleId) {
      this.supabase.client
        .from('microcycles').select('*').eq('id', this.microcycleId).single()
        .then(({ data }) => {
          this.micro = data as Microcycle;
          return this.supabase.client
            .from('training_sessions').select('*').eq('microcycle_id', this.microcycleId);
        })
        .then(({ data: sessions }) => {
          this.sessions = (sessions as any[]) || [];
        });
    }
  }

  getLoad(key: string): number {
    return (this.micro?.load_distribution as any)?.[key] ?? 0;
  }
}
