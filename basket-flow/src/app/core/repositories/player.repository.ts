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

  async findByTeamIncludingLinked(teamId: string, options?: { season?: string }): Promise<Player[]> {
    const season = options?.season || this.seasonService.selectedSeason();

    const [primary, linkedIds] = await Promise.all([
      this.supabase.client
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .eq('season', season)
        .is('deleted_at', null),
      this.getLinkedPlayerIds(teamId),
    ]);

    let linked: Player[] = [];
    if (linkedIds.length > 0) {
      const { data, error } = await this.supabase.client
        .from('players')
        .select('*')
        .in('id', linkedIds)
        .eq('season', season)
        .is('deleted_at', null);
      if (error) throw error;
      linked = (data as Player[]) || [];
    }

    const byId = new Map<string, Player>();
    for (const p of (primary.data as Player[]) || []) byId.set(p.id, p);
    for (const p of linked) byId.set(p.id, p);
    return Array.from(byId.values()).sort((a, b) => a.last_name.localeCompare(b.last_name));
  }

  async getLinkedPlayerIds(teamId: string): Promise<string[]> {
    const { data, error } = await this.supabase.client
      .from('player_teams')
      .select('player_id')
      .eq('team_id', teamId);
    if (error) throw error;
    return (data || []).map(r => r.player_id as string);
  }

  async linkPlayers(teamId: string, playerIds: string[]): Promise<void> {
    if (playerIds.length === 0) return;
    const { error } = await this.supabase.client.from('player_teams').upsert(
      playerIds.map(player_id => ({ team_id: teamId, player_id }))
    );
    if (error) throw error;
  }

  async unlinkPlayers(teamId: string, playerIds: string[]): Promise<void> {
    if (playerIds.length === 0) return;
    const { error } = await this.supabase.client
      .from('player_teams')
      .delete()
      .eq('team_id', teamId)
      .in('player_id', playerIds);
    if (error) throw error;
  }

  async findByClub(clubId: string, options?: { season?: string }): Promise<Player[]> {
    const season = options?.season || this.seasonService.selectedSeason();
    const { data, error } = await this.supabase.client
      .from('players')
      .select('*')
      .eq('club_id', clubId)
      .eq('season', season)
      .is('deleted_at', null)
      .order('last_name');
    if (error) throw error;
    return (data as Player[]) || [];
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

  async restore(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('players').update({ deleted_at: null }).eq('id', id);
    if (error) throw error;
  }

  async findDeleted(clubId: string): Promise<Player[]> {
    const { data, error } = await this.supabase.client
      .from('players')
      .select('*')
      .eq('club_id', clubId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    if (error) throw error;
    return (data as Player[]) || [];
  }
}
