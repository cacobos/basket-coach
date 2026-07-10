import { Component, input } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-achievement-card',
  standalone: true,
  imports: [NgFor, NgIf],
  template: `
    <div class="ach-card">
      <div class="ach-header">
        <span class="ach-title">{{ title() }}</span>
        <span class="ach-pct" [class.done]="achieved() >= total()" [class.partial]="achieved() > 0">
          {{ achieved() }}/{{ total() }}
        </span>
      </div>
      <div class="ach-bar-bg">
        <div class="ach-bar-fill" [style.width.%]="pct"></div>
      </div>
      <div class="ach-items" *ngIf="items().length">
        <div class="ach-item" *ngFor="let item of items()">
          <span class="ach-item-dot" [class.checked]="item.done"></span>
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .ach-card { background: #161b48; border-radius: 12px; padding: 16px; border: 1px solid rgba(69,70,82,0.2); }
    .ach-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .ach-title { font-size: 14px; font-weight: 600; color: #dfe0ff; }
    .ach-pct { font-size: 13px; font-weight: 700; color: #908f9d; }
    .ach-pct.done { color: #69f0ae; }
    .ach-pct.partial { color: #ffb74d; }
    .ach-bar-bg { height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; margin-bottom: 12px; }
    .ach-bar-fill { height: 100%; background: #0068ed; border-radius: 3px; }
    .ach-items { display: flex; flex-direction: column; gap: 6px; }
    .ach-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #c6c5d4; }
    .ach-item-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.1); flex-shrink: 0; }
    .ach-item-dot.checked { background: #69f0ae; }
  `]
})
export class AchievementCardComponent {
  title = input<string>('');
  achieved = input<number>(0);
  total = input<number>(0);
  items = input<{ label: string; done: boolean }[]>([]);

  get pct(): number {
    const t = this.total();
    return t > 0 ? (this.achieved() / t) * 100 : 0;
  }
}
