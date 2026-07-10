import { Injectable, inject, signal, computed } from '@angular/core';
import { FeePlanRepository } from '../repositories/fee-plan.repository';
import { PlayerFeeRepository } from '../repositories/player-fee.repository';
import { PaymentRepository } from '../repositories/payment.repository';
import type { FeePlan, PlayerFee, Payment, OverdueFee } from '../../../core/models/models';

@Injectable({ providedIn: 'root' })
export class FinanceStore {
  private feePlanRepo = inject(FeePlanRepository);
  private playerFeeRepo = inject(PlayerFeeRepository);
  private paymentRepo = inject(PaymentRepository);

  readonly feePlans = signal<FeePlan[]>([]);
  readonly playerFees = signal<PlayerFee[]>([]);
  readonly payments = signal<Payment[]>([]);
  readonly overdueFees = signal<OverdueFee[]>([]);
  readonly loading = signal(false);

  readonly totalPending = computed(() =>
    this.playerFees().filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0)
  );

  readonly totalOverdue = computed(() =>
    this.overdueFees().reduce((s, f) => s + f.amount, 0)
  );

  async loadFeePlans(clubId: string) {
    this.loading.set(true);
    try {
      const plans = await this.feePlanRepo.findAll(clubId);
      this.feePlans.set(plans);
    } finally {
      this.loading.set(false);
    }
  }

  async loadOverdueFees(clubId: string) {
    const items = await this.playerFeeRepo.findOverdue(clubId);
    this.overdueFees.set(items);
  }

  async loadPlayerFees(playerId: string) {
    const items = await this.playerFeeRepo.findByPlayer(playerId);
    this.playerFees.set(items);
  }

  async loadPayments(playerFeeId: string) {
    const items = await this.paymentRepo.findByPlayerFee(playerFeeId);
    this.payments.set(items);
  }

  async createFeePlan(plan: Partial<FeePlan>): Promise<FeePlan> {
    const created = await this.feePlanRepo.create(plan);
    this.feePlans.update(list => [...list, created]);
    return created;
  }

  async deleteFeePlan(id: string) {
    await this.feePlanRepo.remove(id);
    this.feePlans.update(list => list.filter(p => p.id !== id));
  }

  async markAsPaid(playerFeeId: string, amount: number, method: Payment['method'], registeredBy: string): Promise<void> {
    await this.paymentRepo.create({
      player_fee_id: playerFeeId,
      amount,
      method,
      registered_by: registeredBy,
      paid_at: new Date().toISOString(),
    });
    await this.playerFeeRepo.updateStatus(playerFeeId, 'paid');
    this.playerFees.update(list =>
      list.map(f => f.id === playerFeeId ? { ...f, status: 'paid' as const } : f)
    );
  }

  reset() {
    this.feePlans.set([]);
    this.playerFees.set([]);
    this.payments.set([]);
    this.overdueFees.set([]);
  }
}
