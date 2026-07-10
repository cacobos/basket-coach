import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FinanceStore } from '../store/finance.store';
import { PaymentRepository } from '../repositories/payment.repository';
import { ReceiptService } from '../services/receipt.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { AuthService } from '../../../core/auth/auth.service';
import type { Player, PlayerFee, Payment } from '../../../core/models/models';

@Component({
  selector: 'app-player-finance-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe],
  template: `
    <div class="page">
      <div class="header">
        <a routerLink="/finance" class="btn-back">&#8592; Finanzas</a>
        <h1>{{ playerName() }}</h1>
      </div>

      @if (loading()) {
        <div class="loading">Cargando...</div>
      } @else {
        <div class="summary-card">
          <div class="summary-item">
            <span class="label">Pendiente</span>
            <span class="value pending">{{ pendingTotal() | currency:'EUR' }}</span>
          </div>
          <div class="summary-item">
            <span class="label">Pagado</span>
            <span class="value paid">{{ paidTotal() | currency:'EUR' }}</span>
          </div>
        </div>

        <section class="section">
          <h2>Cuotas</h2>
          @if (store.playerFees().length === 0) {
            <p class="text-muted">Sin cuotas registradas.</p>
          } @else {
            <table class="table">
              <thead>
                <tr>
                  <th>Vencimiento</th>
                  <th>Importe</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (fee of store.playerFees(); track fee.id) {
                  <tr>
                    <td>{{ fee.due_date | date:'dd/MM/yyyy' }}</td>
                    <td class="amount">{{ fee.amount | currency:'EUR' }}</td>
                    <td>
                      <span class="status-badge" [class]="'badge-' + fee.status">{{ statusLabel(fee.status) }}</span>
                    </td>
                    <td>
                      @if (fee.status === 'pending' || fee.status === 'overdue') {
                        <button class="btn-small" (click)="registerPayment(fee)">Registrar Pago</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>

        <section class="section">
          <h2>Pagos</h2>
          @if (payments().length === 0) {
            <p class="text-muted">Sin pagos registrados.</p>
          } @else {
            <table class="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Importe</th>
                  <th>Método</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (p of payments(); track p.id) {
                  <tr>
                    <td>{{ p.paid_at | date:'dd/MM/yyyy HH:mm' }}</td>
                    <td class="amount">{{ p.amount | currency:'EUR' }}</td>
                    <td>{{ methodLabel(p.method) }}</td>
                    <td><button class="btn-small" (click)="downloadReceipt(p)">Recibo</button></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </section>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 800px; margin: 0 auto; }
    .header { margin-bottom: 24px; }
    .header h1 { margin: 8px 0 0; font-size: 22px; font-weight: 700; color: var(--text-primary); }
    .btn-back { color: var(--text-secondary); text-decoration: none; font-size: 14px; transition: color 0.15s; }
    .btn-back:hover { color: var(--text-primary); }
    .loading { text-align: center; padding: 60px; color: var(--text-secondary); }
    .summary-card { display: flex; gap: 16px; margin-bottom: 24px; }
    .summary-item { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px 24px; flex: 1; }
    .label { display: block; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-secondary); margin-bottom: 4px; }
    .value { font-size: 22px; font-weight: 700; }
    .pending { color: #f59e0b; }
    .paid { color: #10b981; }
    .section { background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .section h2 { margin: 0 0 16px; font-size: 16px; font-weight: 600; color: var(--text-primary); }
    .table { width: 100%; border-collapse: collapse; }
    .table th { text-align: left; padding: 10px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-secondary); border-bottom: 1px solid var(--border-subtle); }
    .table td { padding: 10px 12px; border-bottom: 1px solid var(--border-subtle); font-size: 14px; color: var(--text-primary); }
    .amount { font-weight: 700; }
    .status-badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.3px; }
    .badge-paid { background: rgba(16,185,129,0.15); color: #10b981; }
    .badge-pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
    .badge-overdue { background: rgba(239,68,68,0.15); color: #ef4444; }
    .badge-cancelled { background: rgba(107,114,128,0.15); color: #6b7280; }
    .text-muted { color: var(--text-secondary); font-size: 14px; }
    .btn-small { background: #bdc2ff; color: #030737; padding: 6px 14px; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
    .btn-small:hover { opacity: 0.9; }
  `]
})
export class PlayerFinanceDetailComponent {
  private route = inject(ActivatedRoute);
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  store = inject(FinanceStore);
  private paymentRepo = inject(PaymentRepository);
  private receiptService = inject(ReceiptService);

  playerName = signal('');
  clubName = signal('');
  payments = signal<Payment[]>([]);
  loading = signal(true);

  pendingTotal = computed(() =>
    this.store.playerFees().filter(f => f.status === 'pending' || f.status === 'overdue').reduce((s, f) => s + f.amount, 0)
  );

  paidTotal = computed(() =>
    this.store.playerFees().filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
  );

  private playerId = '';

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.playerId = id;
        this.loadAll();
      }
    });
  }

  private async loadAll() {
    this.loading.set(true);
    try {
      const { data: player } = await this.supabase.client
        .from('players').select('first_name, last_name, club_id').eq('id', this.playerId).single();
      if (player) {
        this.playerName.set(`${player.first_name} ${player.last_name}`);
        const { data: club } = await this.supabase.client
          .from('clubs').select('name').eq('id', player.club_id).single();
        if (club) this.clubName.set(club.name);
      }

      await this.store.loadPlayerFees(this.playerId);
    } finally {
      this.loading.set(false);
    }
  }

  async registerPayment(fee: PlayerFee) {
    const methodStr = prompt('Método de pago (transfer/cash/bizum/other):', 'cash');
    if (!methodStr || !['transfer', 'cash', 'bizum', 'other'].includes(methodStr)) return;

    const amountStr = prompt('Importe:', fee.amount.toString());
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) return;

    const userId = this.auth.user()?.id;
    if (!userId) return;

    await this.store.markAsPaid(fee.id, amount, methodStr as any, userId);
    await this.store.loadPlayerFees(this.playerId);
  }

  statusLabel(s: string): string {
    const map: Record<string, string> = { paid: 'Pagado', pending: 'Pendiente', overdue: 'Vencido', cancelled: 'Cancelado' };
    return map[s] || s;
  }

  methodLabel(m: string): string {
    const map: Record<string, string> = { transfer: 'Transferencia', cash: 'Efectivo', bizum: 'Bizum', other: 'Otro' };
    return map[m] || m;
  }

  async downloadReceipt(payment: Payment) {
    const fee = this.store.playerFees().find(f => f.id === payment.player_fee_id);
    if (!fee) return;
    await this.receiptService.generateReceipt(payment, fee, this.playerName(), this.clubName());
  }
}
