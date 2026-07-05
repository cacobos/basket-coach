import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import type { Evaluation } from '../models/models';
import type { BaseRepository } from './base.repository';

@Injectable({ providedIn: 'root' })
export class EvaluationRepository implements BaseRepository<Evaluation, Omit<Evaluation, 'id' | 'created_at'>, Partial<Evaluation>> {
  private supabase = inject(SupabaseService);

  async findAll(playerId?: string): Promise<Evaluation[]> {
    if (!playerId) return [];
    const { data, error } = await this.supabase.client
      .from('evaluations')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Evaluation[]) || [];
  }

  async findByClub(clubId: string): Promise<Evaluation[]> {
    const { data, error } = await this.supabase.client
      .from('evaluations')
      .select('*')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Evaluation[]) || [];
  }

  async findById(id: string): Promise<Evaluation | null> {
    const { data, error } = await this.supabase.client
      .from('evaluations').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async create(dto: Omit<Evaluation, 'id' | 'created_at'>): Promise<Evaluation> {
    const { data, error } = await this.supabase.client
      .from('evaluations')
      .insert(dto)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, dto: Partial<Evaluation>): Promise<Evaluation> {
    const { data, error } = await this.supabase.client
      .from('evaluations').update(dto).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('evaluations').delete().eq('id', id);
    if (error) throw error;
  }
}
