import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { Payment } from '../../../core/models/models';

@Injectable({ providedIn: 'root' })
export class PaymentRepository {
  private supabase = inject(SupabaseService);

  async findByPlayerFee(playerFeeId: string): Promise<Payment[]> {
    const { data, error } = await this.supabase.client
      .from('payments').select('*').eq('player_fee_id', playerFeeId).order('paid_at', { ascending: false });
    if (error) throw error;
    return (data as Payment[]) ?? [];
  }

  async findAll(clubId: string): Promise<Payment[]> {
    const { data, error } = await this.supabase.client
      .from('payments').select('*, player_fees(player_id, fee_plans(name))')
      .eq('player_fees.fee_plans.club_id', clubId)
      .order('paid_at', { ascending: false });
    if (error) throw error;
    return (data as any[]) ?? [];
  }

  async create(payment: Partial<Payment>): Promise<Payment> {
    const { data, error } = await this.supabase.client
      .from('payments').insert(payment).select().single();
    if (error) throw error;
    return data as Payment;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('payments').delete().eq('id', id);
    if (error) throw error;
  }
}
