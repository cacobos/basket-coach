import { Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { DataService } from '../../../core/services/data.service';
import type { Payment } from '../../../core/models/models';

@Component({
  selector: 'app-payments-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, SlicePipe],
  template: `
    <div class="page">
      <div class="header">
        <div>
          <a routerLink="/finance" class="btn-back">&#8592; Finanzas</a>
          <h1>Pagos Registrados</h1>
        </div>
      </div>

      @if (loading()) {
        <div class="loading">Cargando...</div>
      } @else if (payments().length === 0) {
        <div class="empty">
          <h3>No hay pagos registrados</h3>
          <p>Los pagos de cuotas aparecerán aquí cuando se registren.</p>
        </div>
      } @else {
        <table class="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Importe</th>
              <th>Método</th>
              <th>Registrado por</th>
            </tr>
          </thead>
          <tbody>
            @for (p of payments(); track p.id) {
              <tr>
                <td>{{ p.paid_at | date:'dd/MM/yyyy HH:mm' }}</td>
                <td class="amount">{{ p.amount | number:'1.2-2' }} €</td>
                <td>{{ methodLabel(p.method) }}</td>
                <td class="text-muted">{{ p.registered_by | slice:0:8 }}...</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 900px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .header h1 { margin: 8px 0 0; font-size: 22px; font-weight: 700; color: var(--text-primary); }
    .btn-back { color: var(--text-secondary); text-decoration: none; font-size: 14px; transition: color 0.15s; }
    .btn-back:hover { color: var(--text-primary); }
    .loading { text-align: center; padding: 60px; color: var(--text-secondary); }
    .empty { text-align: center; padding: 80px 24px; }
    .empty h3 { margin: 0 0 8px; color: var(--text-primary); }
    .empty p { color: var(--text-secondary); margin: 0; }
    .table { width: 100%; background: var(--bg-card); border-radius: 12px; overflow: hidden; border-collapse: collapse; }
    .table th { text-align: left; padding: 12px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-secondary); background: var(--bg-secondary); border-bottom: 1px solid var(--border-subtle); }
    .table td { padding: 12px 16px; border-bottom: 1px solid var(--border-subtle); font-size: 14px; color: var(--text-primary); }
    .amount { font-weight: 700; color: #10b981; }
    .text-muted { color: var(--text-secondary); font-size: 13px; }
  `]
})
export class PaymentsListComponent {
  private repo = inject(PaymentRepository);
  private dataService = inject(DataService);

  payments = signal<Payment[]>([]);
  loading = signal(true);

  constructor() {
    this.load();
  }

  private async load() {
    const club = this.dataService.currentClub();
    if (!club) return;
    try {
      const items = await this.repo.findAll(club.id);
      this.payments.set(items);
    } finally {
      this.loading.set(false);
    }
  }

  methodLabel(m: string): string {
    const map: Record<string, string> = { transfer: 'Transferencia', cash: 'Efectivo', bizum: 'Bizum', other: 'Otro' };
    return map[m] || m;
  }
}
