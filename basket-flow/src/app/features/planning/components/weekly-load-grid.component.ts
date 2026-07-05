import { Component, input } from '@angular/core';
import { NgFor } from '@angular/common';

const DAY_LABELS: Record<string, string> = {
  monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles',
  thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo',
};

@Component({
  selector: 'app-weekly-load-grid',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="load-grid">
      <div class="load-day" *ngFor="let day of days()">
        <span class="day-label">{{ DAY_LABELS[day] || day }}</span>
        <div class="day-bar-bg">
          <div class="day-bar-fill" [style.width.%]="(load()[day] || 0) * 20"></div>
        </div>
        <span class="day-val">{{ load()[day] || 0 }}</span>
      </div>
    </div>
  `,
  styles: [`
    .load-grid { display: flex; flex-direction: column; gap: 8px; }
    .load-day { display: flex; align-items: center; gap: 10px; }
    .day-label { width: 80px; font-size: 12px; font-weight: 600; color: #c6c5d4; text-transform: capitalize; }
    .day-bar-bg { flex: 1; height: 10px; background: rgba(255,255,255,0.05); border-radius: 5px; overflow: hidden; }
    .day-bar-fill { height: 100%; background: #0068ed; border-radius: 5px; }
    .day-val { width: 20px; font-size: 11px; color: #908f9d; text-align: right; }
  `]
})
export class WeeklyLoadGridComponent {
  protected DAY_LABELS = DAY_LABELS;
  load = input<Record<string, number>>({});
  days = input(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
}
