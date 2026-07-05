import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { Macrocycle, Mesocycle, Microcycle, TacticalObjective, ObjectiveAchievement, MacrocycleCreateDto, MacrocycleSummary } from '../models/planning.models';

@Injectable({ providedIn: 'root' })
export class PlanningRepository {
  private supabase = inject(SupabaseService);

  // Macrocycles
  async getMacrocycles(teamId: string): Promise<Macrocycle[]> {
    const { data } = await this.supabase.client
      .from('macrocycles').select('*').eq('team_id', teamId).order('start_date', { ascending: false });
    return (data as Macrocycle[]) || [];
  }

  async getMacrocycle(id: string): Promise<Macrocycle | null> {
    const { data } = await this.supabase.client
      .from('macrocycles').select('*').eq('id', id).single();
    return data as Macrocycle;
  }

  async createMacrocycle(dto: MacrocycleCreateDto): Promise<Macrocycle> {
    const { data } = await this.supabase.client
      .from('macrocycles').insert(dto).select().single();
    return data as Macrocycle;
  }

  async updateMacrocycle(id: string, dto: Partial<Macrocycle>): Promise<void> {
    await this.supabase.client.from('macrocycles').update(dto).eq('id', id);
  }

  async deleteMacrocycle(id: string): Promise<void> {
    await this.supabase.client.from('macrocycles').delete().eq('id', id);
  }

  // Mesocycles
  async getMesocycles(macrocycleId: string): Promise<Mesocycle[]> {
    const { data } = await this.supabase.client
      .from('mesocycles').select('*').eq('macrocycle_id', macrocycleId).order('sort_order');
    return (data as Mesocycle[]) || [];
  }

  async createMesocycle(dto: Partial<Mesocycle>): Promise<Mesocycle> {
    const { data } = await this.supabase.client
      .from('mesocycles').insert(dto).select().single();
    return data as Mesocycle;
  }

  async updateMesocycle(id: string, dto: Partial<Mesocycle>): Promise<void> {
    await this.supabase.client.from('mesocycles').update(dto).eq('id', id);
  }

  // Microcycles
  async getMicrocycles(mesocycleId: string): Promise<Microcycle[]> {
    const { data } = await this.supabase.client
      .from('microcycles').select('*').eq('mesocycle_id', mesocycleId).order('week_number');
    return (data as Microcycle[]) || [];
  }

  async createMicrocycle(dto: Partial<Microcycle>): Promise<Microcycle> {
    const { data } = await this.supabase.client
      .from('microcycles').insert(dto).select().single();
    return data as Microcycle;
  }

  async updateMicrocycle(id: string, dto: Partial<Microcycle>): Promise<void> {
    await this.supabase.client.from('microcycles').update(dto).eq('id', id);
  }

  // Auto-generate microcycles for a mesocycle
  async generateMicrocycles(mesocycleId: string, plannedPerWeek: number): Promise<void> {
    const { data: meso } = await this.supabase.client
      .from('mesocycles').select('*').eq('id', mesocycleId).single();
    if (!meso) return;
    const start = new Date(meso.start_date);
    const end = new Date(meso.end_date);
    let weekNum = 1;
    let current = new Date(start);
    const inserts: Partial<Microcycle>[] = [];
    while (current <= end) {
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      inserts.push({
        mesocycle_id: mesocycleId,
        week_number: weekNum,
        start_date: current.toISOString().slice(0, 10),
        end_date: weekEnd.toISOString().slice(0, 10),
        planned_sessions: plannedPerWeek,
        load_distribution: { monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1 },
        has_match: false,
      });
      current.setDate(current.getDate() + 7);
      weekNum++;
    }
    if (inserts.length > 0) {
      await this.supabase.client.from('microcycles').insert(inserts);
    }
  }

  // Summary
  async getMacrocycleSummary(macrocycleId: string): Promise<MacrocycleSummary | null> {
    const { data } = await this.supabase.client
      .from('v_macrocycle_summary').select('*').eq('macrocycle_id', macrocycleId).maybeSingle();
    return data as MacrocycleSummary | null;
  }

  // Tactical objectives
  async getTacticalObjectives(clubId: string): Promise<TacticalObjective[]> {
    const { data } = await this.supabase.client
      .from('tactical_objective_catalog').select('*').eq('club_id', clubId);
    return (data as TacticalObjective[]) || [];
  }

  async createTacticalObjective(dto: Partial<TacticalObjective>): Promise<TacticalObjective> {
    const { data } = await this.supabase.client
      .from('tactical_objective_catalog').insert(dto).select().single();
    return data as TacticalObjective;
  }

  // Sessions linked to a microcycle
  async getMicrocycleSessions(microcycleId: string): Promise<any[]> {
    const { data } = await this.supabase.client
      .from('training_sessions').select('*').eq('microcycle_id', microcycleId);
    return (data as any[]) || [];
  }
}
