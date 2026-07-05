import { Component, input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-cycle-timeline',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="timeline">
      <div class="tl-item" *ngFor="let item of items(); let i = index">
        <div class="tl-dot" [class.active]="item.active"></div>
        <div class="tl-content">
          <div class="tl-label">{{ item.label }}</div>
          <div class="tl-sub" *ngIf="item.sub">{{ item.sub }}</div>
        </div>
        <div class="tl-line" *ngIf="i < items().length - 1"></div>
      </div>
    </div>
  `,
  styles: [`
    .timeline { display: flex; flex-direction: column; gap: 0; }
    .tl-item { display: flex; align-items: flex-start; gap: 12px; position: relative; }
    .tl-dot { width: 12px; height: 12px; border-radius: 50%; background: rgba(255,255,255,0.1); flex-shrink: 0; margin-top: 4px; }
    .tl-dot.active { background: #0068ed; box-shadow: 0 0 8px rgba(0,104,237,0.4); }
    .tl-content { padding-bottom: 16px; }
    .tl-label { font-size: 14px; font-weight: 600; color: #dfe0ff; }
    .tl-sub { font-size: 12px; color: #908f9d; }
    .tl-line { position: absolute; left: 5px; top: 16px; bottom: 0; width: 2px; background: rgba(255,255,255,0.05); }
  `]
})
export class CycleTimelineComponent {
  items = input<{ label: string; sub?: string; active?: boolean }[]>([]);
}
