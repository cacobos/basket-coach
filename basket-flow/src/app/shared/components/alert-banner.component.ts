import { Component, input, output, signal } from '@angular/core';

type Severity = 'info' | 'warn' | 'danger';

const ICONS: Record<Severity, string> = {
  info: '&#8505;',
  warn: '&#9888;',
  danger: '&#9888;',
};

@Component({
  selector: 'app-alert-banner',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="banner" [class]="'banner ' + severity()" role="alert">
        <span class="icon" [innerHTML]="icons[severity()]"></span>
        <div class="content">
          <ng-content />
        </div>
        @if (actionLabel()) {
          <button
            type="button"
            class="action-btn"
            (click)="action.emit()"
            [disabled]="actionDisabled()"
          >
            {{ actionLabel() }}
          </button>
        }
        @if (dismissible()) {
          <button
            type="button"
            class="close-btn"
            aria-label="Descartar aviso"
            (click)="onClose()"
          >
            &times;
          </button>
        }
      </div>
    }
  `,
  styles: [
    `
      .banner {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        border-radius: 10px;
        padding: 14px 18px;
        margin-bottom: 24px;
      }
      .banner.info {
        background: rgba(99, 102, 241, 0.12);
        border: 1px solid rgba(129, 140, 248, 0.3);
      }
      .banner.warn {
        background: rgba(245, 158, 11, 0.12);
        border: 1px solid rgba(245, 158, 11, 0.3);
      }
      .banner.danger {
        background: rgba(239, 68, 68, 0.12);
        border: 1px solid rgba(239, 68, 68, 0.35);
      }
      .icon {
        font-size: 20px;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .info .icon { color: #818cf8; }
      .warn .icon { color: #f59e0b; }
      .danger .icon { color: #ef4444; }
      .content {
        flex: 1;
        color: var(--text-primary, #dfe0ff);
        font-size: 14px;
        min-width: 0;
      }
      .content > :first-child { display: block; margin-bottom: 4px; }
      .action-btn {
        background: rgba(189, 194, 255, 0.15);
        border: 1px solid rgba(189, 194, 255, 0.4);
        color: #bdc2ff;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.15s;
      }
      .action-btn:hover:not(:disabled) { background: rgba(189, 194, 255, 0.25); }
      .action-btn:disabled { opacity: 0.5; cursor: default; }
      .close-btn {
        background: none;
        border: none;
        color: var(--text-secondary, #908f9d);
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 6px;
      }
      .close-btn:hover { color: var(--text-primary, #dfe0ff); background: rgba(255, 255, 255, 0.06); }
    `,
  ],
})
export class AlertBannerComponent {
  readonly severity = input<Severity>('warn');
  readonly dismissible = input(false);
  readonly actionLabel = input<string | null>(null);
  readonly actionDisabled = input(false);
  readonly dismissed = output<void>();
  readonly action = output<void>();

  protected readonly icons = ICONS;
  protected readonly visible = signal(true);

  protected onClose(): void {
    this.visible.set(false);
    this.dismissed.emit();
  }
}
