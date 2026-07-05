import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { Match, Possession, MatchSubstitution, MatchSquad } from '../../../core/models/models';

@Injectable({ providedIn: 'root' })
export class MatchRepository {
  private supabase = inject(SupabaseService);

  async findById(id: string): Promise<Match | null> {
    const { data, error } = await this.supabase.client
      .from('matches').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async findByTeam(teamId: string): Promise<Match[]> {
    const { data, error } = await this.supabase.client
      .from('matches').select('*').eq('team_id', teamId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async create(match: Partial<Match>): Promise<Match> {
    const { data, error } = await this.supabase.client
      .from('matches').insert(match).select().single();
    if (error) throw error;
    return data;
  }

  async update(id: string, changes: Partial<Match>): Promise<Match> {
    const { data, error } = await this.supabase.client
      .from('matches').update(changes).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    await this.supabase.client.from('matches').delete().eq('id', id);
  }

  async findPossessions(matchId: string): Promise<Possession[]> {
    const { data, error } = await this.supabase.client
      .from('possessions').select('*').eq('match_id', matchId)
      .order('number', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findLastPossession(matchId: string): Promise<Possession | null> {
    const { data, error } = await this.supabase.client
      .from('possessions').select('*').eq('match_id', matchId)
      .order('number', { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    return data;
  }

  async createPossession(possession: Partial<Possession>): Promise<Possession> {
    const { data, error } = await this.supabase.client
      .from('possessions').insert(possession).select().single();
    if (error) throw error;
    return data;
  }

  async updatePossession(id: string, changes: Partial<Possession>): Promise<void> {
    const { error } = await this.supabase.client
      .from('possessions').update(changes).eq('id', id);
    if (error) throw error;
  }

  async softDeletePossession(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('possessions').update({ deleted: true }).eq('id', id);
    if (error) throw error;
  }

  async findSubstitutions(matchId: string): Promise<MatchSubstitution[]> {
    const { data, error } = await this.supabase.client
      .from('match_substitutions').select('*').eq('match_id', matchId)
      .order('period', { ascending: true }).order('order_in_period', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async createSubstitution(sub: Partial<MatchSubstitution>): Promise<MatchSubstitution> {
    const { data, error } = await this.supabase.client
      .from('match_substitutions').insert(sub).select().single();
    if (error) throw error;
    return data;
  }

  async findSquad(matchId: string): Promise<MatchSquad[]> {
    const { data, error } = await this.supabase.client
      .from('match_squads').select('*').eq('match_id', matchId);
    if (error) throw error;
    return data ?? [];
  }

  async createSquadMember(member: Partial<MatchSquad>): Promise<MatchSquad> {
    const { data, error } = await this.supabase.client
      .from('match_squads').insert(member).select().single();
    if (error) throw error;
    return data;
  }

  async deleteSquad(matchId: string): Promise<void> {
    await this.supabase.client.from('match_squads').delete().eq('match_id', matchId);
  }

  async getLineup(matchId: string, period: number, possessionNumber: number) {
    const { data, error } = await this.supabase.client
      .rpc('get_match_lineup', {
        p_match_id: matchId,
        p_period: period,
        p_possession_number: possessionNumber,
      });
    if (error) throw error;
    return data ?? [];
  }
}
