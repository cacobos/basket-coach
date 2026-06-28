import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: number;
  message: string;
  type: 'error' | 'success' | 'info';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _notifications = signal<Notification[]>([]);
  notifications = this._notifications.asReadonly();
  private _nextId = 0;

  show(message: string, type: Notification['type'] = 'error', duration = 5000): void {
    const id = this._nextId++;
    this._notifications.update(n => [...n, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  dismiss(id: number): void {
    this._notifications.update(n => n.filter(x => x.id !== id));
  }
}
