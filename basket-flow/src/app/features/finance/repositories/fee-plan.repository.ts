import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { FeePlan } from '../../../core/models/models';

@Injectable({ providedIn: 'root' })
export class FeePlanRepository {
  private supabase = inject(SupabaseService);

  async findAll(clubId: string): Promise<FeePlan[]> {
    const { data, error } = await this.supabase.client
      .from('fee_plans').select('*').eq('club_id', clubId).order('name');
    if (error) throw error;
    return (data as FeePlan[]) ?? [];
  }

  async findById(id: string): Promise<FeePlan | null> {
    const { data, error } = await this.supabase.client
      .from('fee_plans').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as FeePlan | null;
  }

  async create(plan: Partial<FeePlan>): Promise<FeePlan> {
    const { data, error } = await this.supabase.client
      .from('fee_plans').insert(plan).select().single();
    if (error) throw error;
    return data as FeePlan;
  }

  async update(id: string, plan: Partial<FeePlan>): Promise<void> {
    const { error } = await this.supabase.client
      .from('fee_plans').update(plan).eq('id', id);
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('fee_plans').delete().eq('id', id);
    if (error) throw error;
  }
}
