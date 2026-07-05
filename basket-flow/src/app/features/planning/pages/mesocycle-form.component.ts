import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PlanningRepository } from '../repositories/planning.repository';

@Component({
  selector: 'app-mesocycle-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page">
      <a [routerLink]="['/planning', macrocycleId]" class="back-link">← Volver</a>
      <h1 class="page-title">Nuevo mesociclo</h1>
      <form (ngSubmit)="save()" class="form">
        <div class="field">
          <label class="field-label">Nombre</label>
          <input class="field-input" [(ngModel)]="name" name="name" required placeholder="Pre-temporada" />
        </div>
        <div class="field">
          <label class="field-label">Fase</label>
          <select class="field-input" [(ngModel)]="phase" name="phase" required>
            <option value="preseason">Pre-temporada</option>
            <option value="competition">Competición</option>
            <option value="peak">Pico</option>
            <option value="transition">Transición</option>
            <option value="rest">Descanso</option>
            <option value="special">Especial</option>
          </select>
        </div>
        <div class="field-row">
          <div class="field">
            <label class="field-label">Inicio</label>
            <input class="field-input" type="date" [(ngModel)]="startDate" name="startDate" required />
          </div>
          <div class="field">
            <label class="field-label">Fin</label>
            <input class="field-input" type="date" [(ngModel)]="endDate" name="endDate" required />
          </div>
        </div>
        <div class="field">
          <label class="field-label">Intensidad (1-10)</label>
          <input class="field-input" type="number" min="1" max="10" [(ngModel)]="intensity" name="intensity" />
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Crear mesociclo</button>
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
    .form-actions { padding-top: 8px; }
    .btn-primary { padding: 12px 24px; border-radius: 12px; background: #0068ed; color: #fff; border: none; font-weight: 700; font-size: 14px; cursor: pointer; }
  `]
})
export class MesocycleFormComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private repo = inject(PlanningRepository);

  macrocycleId = '';
  name = '';
  phase = 'preseason';
  startDate = '';
  endDate = '';
  intensity = 5;

  constructor() {
    this.macrocycleId = this.route.snapshot.paramMap.get('macrocycleId') || '';
  }

  async save() {
    if (!this.macrocycleId || !this.name || !this.startDate || !this.endDate) return;
    const mesoCount = await this.repo.getMesocycles(this.macrocycleId);
    const meso = await this.repo.createMesocycle({
      macrocycle_id: this.macrocycleId,
      name: this.name,
      phase: this.phase as any,
      start_date: this.startDate,
      end_date: this.endDate,
      intensity: this.intensity,
      sort_order: mesoCount.length,
    });
    this.router.navigate(['/planning', this.macrocycleId, 'mesocycles', meso.id]);
  }
}
