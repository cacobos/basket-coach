import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import type { Team } from '../models/models';
import type { BaseRepository } from './base.repository';

@Injectable({ providedIn: 'root' })
export class TeamRepository implements BaseRepository<Team, { name: string; category: string; season?: string; club_id: string }, Partial<Team>> {
  private supabase = inject(SupabaseService);

  async findAll(clubId?: string): Promise<Team[]> {
    if (!clubId) return [];
    const { data, error } = await this.supabase.client
      .from('teams')
      .select('*')
      .eq('club_id', clubId)
      .order('name');
    if (error) throw error;
    return (data as Team[]) || [];
  }

  async findById(id: string): Promise<Team | null> {
    const { data, error } = await this.supabase.client
      .from('teams').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async create(dto: { name: string; category: string; season?: string; club_id: string }): Promise<Team> {
    const { data, error } = await this.supabase.client
      .from('teams')
      .insert({ club_id: dto.club_id, name: dto.name, category: dto.category, season: dto.season || new Date().getFullYear().toString() })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, dto: Partial<Team>): Promise<Team> {
    const { data, error } = await this.supabase.client
      .from('teams').update(dto).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('teams').delete().eq('id', id);
    if (error) throw error;
  }
}
