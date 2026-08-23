import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="empty-state">
      <span class="material-symbols-outlined empty-icon">{{ icon() }}</span>
      <h3>{{ title() }}</h3>
      @if (hint()) {
        <p>{{ hint() }}</p>
      }
      @if (ctaLabel()) {
        @if (ctaLink(); as link) {
          <a class="cta" [routerLink]="link">{{ ctaLabel() }}</a>
        } @else {
          <button type="button" class="cta" (click)="ctaAction.emit()">
            {{ ctaLabel() }}
          </button>
        }
      }
      <ng-content />
    </div>
  `,
  styles: [
    `
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 80px 20px;
        text-align: center;
        color: var(--text-secondary, #908f9d);
      }
      .empty-icon { font-size: 48px; color: inherit; }
      h3 { margin: 0; font-size: 18px; font-weight: 700; color: var(--text-primary, #dfe0ff); }
      p { margin: 0; font-size: 14px; max-width: 420px; line-height: 1.5; }
      .cta {
        margin-top: 8px;
        display: inline-flex; align-items: center; gap: 6px;
        background: #0068ed; color: #f2f3ff;
        padding: 10px 20px; border-radius: 10px;
        border: none; font-weight: 700; font-size: 14px;
        cursor: pointer; text-decoration: none;
        transition: all 0.15s;
        font-family: 'Hanken Grotesk', sans-serif;
      }
      .cta:hover { opacity: 0.92; }
    `,
  ],
})
export class EmptyStateComponent {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly ctaLabel = input<string | null>(null);
  readonly ctaLink = input<string | null>(null);
  readonly ctaAction = output<void>();
}
