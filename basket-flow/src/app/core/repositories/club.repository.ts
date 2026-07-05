import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import type { Club, ClubMember } from '../models/models';
import type { BaseRepository } from './base.repository';

@Injectable({ providedIn: 'root' })
export class ClubRepository implements BaseRepository<Club, { name: string; description?: string }, Partial<Club>> {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  async findAll(): Promise<Club[]> {
    const user = this.auth.user();
    if (!user) return [];
    const { data, error } = await this.supabase.client
      .from('club_members')
      .select('clubs(*)')
      .eq('user_id', user.id);
    if (error) throw error;
    return (data ?? []).map((cm: { clubs: any }) => cm.clubs as Club);
  }

  async findById(id: string): Promise<Club | null> {
    const { data, error } = await this.supabase.client
      .from('clubs').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }

  async create(dto: { name: string; description?: string }): Promise<Club> {
    const user = this.auth.user()!;
    const slug = dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data, error } = await this.supabase.client
      .from('clubs')
      .insert({ name: dto.name, slug, description: dto.description, created_by: user.id })
      .select()
      .single();
    if (error) throw error;
    await this.supabase.client.from('club_members')
      .insert({ club_id: data.id, user_id: user.id, role: 'admin' });
    await this.supabase.client.rpc('seed_match_catalogs', { p_club_id: data.id });
    return data;
  }

  async update(id: string, dto: Partial<Club>): Promise<Club> {
    const { data, error } = await this.supabase.client
      .from('clubs').update(dto).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('clubs').delete().eq('id', id);
    if (error) throw error;
  }

  async getMembers(clubId: string): Promise<ClubMember[]> {
    const { data, error } = await this.supabase.client
      .from('club_members')
      .select('*, profiles(*)')
      .eq('club_id', clubId);
    if (error) throw error;
    return data ?? [];
  }

  async addMember(clubId: string, userId: string, role: ClubMember['role'] = 'coach'): Promise<void> {
    const { error } = await this.supabase.client
      .from('club_members')
      .insert({ club_id: clubId, user_id: userId, role });
    if (error) throw error;
  }

  async updateMemberRole(clubId: string, userId: string, role: ClubMember['role']): Promise<void> {
    const { error } = await this.supabase.client
      .from('club_members')
      .update({ role })
      .eq('club_id', clubId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  async removeMember(clubId: string, userId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('club_members')
      .delete()
      .eq('club_id', clubId)
      .eq('user_id', userId);
    if (error) throw error;
  }
}
