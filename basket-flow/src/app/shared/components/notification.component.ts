import { Component, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [NgFor],
  template: `
    <div class="notifications-container">
      <div *ngFor="let n of notif.notifications()" class="notification" [class.error]="n.type === 'error'" [class.success]="n.type === 'success'" [class.info]="n.type === 'info'" (click)="notif.dismiss(n.id)">
        <span class="msg">{{ n.message }}</span>
      </div>
    </div>
  `,
  styles: [`
    .notifications-container {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 400px;
    }
    .notification {
      padding: 12px 16px;
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideIn 0.3s ease;
    }
    .notification.error { background: #ba1a1a; }
    .notification.success { background: #2e7d32; }
    .notification.info { background: #1565c0; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class NotificationComponent {
  notif = inject(NotificationService);
}
