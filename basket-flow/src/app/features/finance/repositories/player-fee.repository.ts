import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { PlayerFee, OverdueFee } from '../../../core/models/models';

@Injectable({ providedIn: 'root' })
export class PlayerFeeRepository {
  private supabase = inject(SupabaseService);

  async findByPlayer(playerId: string): Promise<PlayerFee[]> {
    const { data, error } = await this.supabase.client
      .from('player_fees').select('*').eq('player_id', playerId).order('due_date', { ascending: false });
    if (error) throw error;
    return (data as PlayerFee[]) ?? [];
  }

  async findByPlan(feePlanId: string): Promise<PlayerFee[]> {
    const { data, error } = await this.supabase.client
      .from('player_fees').select('*').eq('fee_plan_id', feePlanId).order('due_date', { ascending: false });
    if (error) throw error;
    return (data as PlayerFee[]) ?? [];
  }

  async findOverdue(clubId: string): Promise<OverdueFee[]> {
    const { data, error } = await this.supabase.client
      .from('v_overdue_fees').select('*').eq('club_id', clubId);
    if (error) throw error;
    return (data as OverdueFee[]) ?? [];
  }

  async updateStatus(id: string, status: PlayerFee['status']): Promise<void> {
    const { error } = await this.supabase.client
      .from('player_fees').update({ status }).eq('id', id);
    if (error) throw error;
  }
}
