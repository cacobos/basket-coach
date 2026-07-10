import { Component, input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sessions-panel',
  standalone: true,
  imports: [NgFor, NgIf, RouterLink],
  template: `
    <div class="sess-panel">
      <div class="sess-item" *ngFor="let s of sessions()">
        <div class="sess-left">
          <span class="sess-title">{{ s.title }}</span>
          <span class="sess-date">{{ s.date }}</span>
        </div>
        <div class="sess-right">
          <span class="sess-status" [class]="s.status">{{ s.status }}</span>
          <a *ngIf="s.id" [routerLink]="['/sessions', s.id]" class="sess-link">Ver</a>
        </div>
      </div>
      <p class="empty" *ngIf="sessions().length === 0">No hay sesiones.</p>
    </div>
  `,
  styles: [`
    .sess-panel { display: flex; flex-direction: column; gap: 6px; }
    .sess-item { display: flex; justify-content: space-between; align-items: center; background: #161b48; border-radius: 8px; padding: 10px 14px; border: 1px solid rgba(69,70,82,0.2); }
    .sess-left { display: flex; flex-direction: column; gap: 2px; }
    .sess-title { font-size: 14px; font-weight: 600; color: #dfe0ff; }
    .sess-date { font-size: 11px; color: #908f9d; }
    .sess-right { display: flex; align-items: center; gap: 10px; }
    .sess-status { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 2px 8px; border-radius: 9999px; background: rgba(255,255,255,0.05); color: #908f9d; }
    .sess-status.completed { background: rgba(105,240,174,0.12); color: #69f0ae; }
    .sess-status.planned { background: rgba(0,104,237,0.12); color: #bdc2ff; }
    .sess-status.draft { background: rgba(255,183,77,0.12); color: #ffb74d; }
    .sess-link { font-size: 12px; color: #bdc2ff; text-decoration: none; font-weight: 600; }
    .sess-link:hover { text-decoration: underline; }
    .empty { color: #908f9d; text-align: center; padding: 20px; font-size: 13px; }
  `]
})
export class SessionsPanelComponent {
  sessions = input<{ id?: string; title: string; date: string; status: string }[]>([]);
}
