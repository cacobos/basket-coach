import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { SeasonService } from '../services/season.service';
import type { Player } from '../models/models';
import type { BaseRepository } from './base.repository';

@Injectable({ providedIn: 'root' })
export class PlayerRepository implements BaseRepository<Player, Omit<Player, 'id' | 'created_at' | 'is_active' | 'deleted_at'> & { is_active?: boolean }, Partial<Player>> {
  private supabase = inject(SupabaseService);
  private seasonService = inject(SeasonService);

  async findAll(teamId?: string, options?: { season?: string }): Promise<Player[]> {
    if (teamId) {
      const season = options?.season || this.seasonService.selectedSeason();
      const { data, error } = await this.supabase.client
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .eq('season', season)
        .is('deleted_at', null)
        .order('last_name');
      if (error) throw error;
      return (data as Player[]) || [];
    }
    return [];
  }

  async findByClub(clubId: string, options?: { season?: string }): Promise<Player[]> {
    const season = options?.season || this.seasonService.selectedSeason();
    const { data, error } = await this.supabase.client
      .from('players')
      .select('*, teams!inner(name)')
      .eq('club_id', clubId)
      .eq('season', season)
      .is('deleted_at', null)
      .order('last_name');
    if (error) throw error;
    return (data as any[])?.map(p => ({ ...p, team_id: p.team_id })) as Player[] || [];
  }

  async findById(id: string): Promise<Player | null> {
    const { data, error } = await this.supabase.client
      .from('players').select('*').eq('id', id).is('deleted_at', null).single();
    if (error) throw error;
    return data;
  }

  async create(dto: Omit<Player, 'id' | 'created_at' | 'is_active' | 'deleted_at'> & { is_active?: boolean }): Promise<Player> {
    const { data, error } = await this.supabase.client
      .from('players')
      .insert({ ...dto, is_active: dto.is_active ?? true, season: dto.season || SeasonService.getCurrentSeason() })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, dto: Partial<Player>): Promise<Player> {
    const { data, error } = await this.supabase.client
      .from('players').update(dto).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('players').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }
}
