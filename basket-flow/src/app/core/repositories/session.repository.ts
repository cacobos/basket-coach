import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import { SeasonService } from '../services/season.service';
import type { TrainingSession, SessionSection, SessionExercise, Attendance, SessionPlayerReview } from '../models/models';
import type { BaseRepository } from './base.repository';

@Injectable({ providedIn: 'root' })
export class SessionRepository implements BaseRepository<TrainingSession, Omit<TrainingSession, 'id' | 'created_at' | 'created_by' | 'deleted_at'>, Partial<TrainingSession>> {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private seasonService = inject(SeasonService);

  async findAll(clubId: string, options?: { season?: string }): Promise<TrainingSession[]> {
    const season = options?.season || this.seasonService.selectedSeason();
    const teamIds = await this.getSeasonTeamIds(clubId, season);
    if (teamIds.length === 0) return [];
    const { data, error } = await this.supabase.client
      .from('training_sessions')
      .select('*')
      .eq('club_id', clubId)
      .is('deleted_at', null)
      .in('team_id', teamIds)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data as TrainingSession[]) || [];
  }

  async findByTeam(teamId: string): Promise<TrainingSession[]> {
    const { data, error } = await this.supabase.client
      .from('training_sessions')
      .select('*')
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data as TrainingSession[]) || [];
  }

  async findByDateRange(clubId: string, from: string, to: string, options?: { season?: string }): Promise<TrainingSession[]> {
    const season = options?.season || this.seasonService.selectedSeason();
    const teamIds = await this.getSeasonTeamIds(clubId, season);
    if (teamIds.length === 0) return [];
    const { data, error } = await this.supabase.client
      .from('training_sessions')
      .select('*, teams(name)')
      .eq('club_id', clubId)
      .is('deleted_at', null)
      .in('team_id', teamIds)
      .gte('date', from)
      .lte('date', to)
      .order('date');
    if (error) throw error;
    return (data as any[]) || [];
  }

  private async getSeasonTeamIds(clubId: string, season: string): Promise<string[]> {
    const { data } = await this.supabase.client
      .from('teams')
      .select('id')
      .eq('club_id', clubId)
      .eq('season', season)
      .is('archived_at', null);
    return (data || []).map(t => t.id);
  }

  async findById(id: string): Promise<TrainingSession | null> {
    const { data, error } = await this.supabase.client
      .from('training_sessions').select('*').eq('id', id).is('deleted_at', null).single();
    if (error) throw error;
    return data;
  }

  async create(dto: Omit<TrainingSession, 'id' | 'created_at' | 'created_by' | 'deleted_at'>): Promise<TrainingSession> {
    const { data, error } = await this.supabase.client
      .from('training_sessions')
      .insert({ ...dto, created_by: this.auth.user()!.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(id: string, dto: Partial<TrainingSession>): Promise<TrainingSession> {
    const { data, error } = await this.supabase.client
      .from('training_sessions').update(dto).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('training_sessions').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }

  // ── Sections ──
  async getSections(sessionId: string): Promise<SessionSection[]> {
    const { data, error } = await this.supabase.client
      .from('session_sections')
      .select('*')
      .eq('session_id', sessionId)
      .order('sort_order');
    if (error) throw error;
    return (data as SessionSection[]) || [];
  }

  async createSection(section: Omit<SessionSection, 'id' | 'created_at'>): Promise<SessionSection> {
    const { data, error } = await this.supabase.client
      .from('session_sections')
      .insert(section)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateSection(id: string, updates: Partial<SessionSection>): Promise<void> {
    const { error } = await this.supabase.client
      .from('session_sections').update(updates).eq('id', id);
    if (error) throw error;
  }

  async deleteSection(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('session_sections').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Session Exercises ──
  async getSessionExercises(sessionId?: string): Promise<SessionExercise[]> {
    let query = this.supabase.client
      .from('session_exercises')
      .select('*')
      .order('order');
    if (sessionId) query = query.eq('session_id', sessionId);
    const { data, error } = await query;
    if (error) throw error;
    return (data as SessionExercise[]) || [];
  }

  async getSectionExercises(sectionId: string): Promise<SessionExercise[]> {
    const { data, error } = await this.supabase.client
      .from('session_exercises')
      .select('*')
      .eq('section_id', sectionId)
      .order('order');
    if (error) throw error;
    return (data as SessionExercise[]) || [];
  }

  async addSessionExercise(se: Omit<SessionExercise, 'id' | 'created_at'>): Promise<SessionExercise> {
    const { data, error } = await this.supabase.client
      .from('session_exercises')
      .insert(se)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateSessionExercise(id: string, updates: Partial<SessionExercise>): Promise<void> {
    const { error } = await this.supabase.client
      .from('session_exercises').update(updates).eq('id', id);
    if (error) throw error;
  }

  async removeSessionExercise(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('session_exercises').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Attendance ──
  async getAttendance(sessionId: string): Promise<Attendance[]> {
    const { data, error } = await this.supabase.client
      .from('attendance')
      .select('*')
      .eq('session_id', sessionId);
    if (error) throw error;
    return (data as Attendance[]) || [];
  }

  async setAttendance(sessionId: string, playerId: string, status: Attendance['status'], notes?: string, lateMinutes?: number): Promise<void> {
    const { error } = await this.supabase.client
      .from('attendance')
      .upsert({ session_id: sessionId, player_id: playerId, status, notes, late_minutes: lateMinutes }, { onConflict: 'session_id,player_id' });
    if (error) throw error;
  }

  // ── Session Reviews ──
  async getSessionReviews(sessionId: string): Promise<SessionPlayerReview[]> {
    const { data, error } = await this.supabase.client
      .from('session_player_reviews')
      .select('*')
      .eq('session_id', sessionId);
    if (error) throw error;
    return (data as SessionPlayerReview[]) || [];
  }

  async upsertSessionReview(sessionId: string, playerId: string, review: Partial<SessionPlayerReview>): Promise<void> {
    const { error } = await this.supabase.client
      .from('session_player_reviews')
      .upsert({
        session_id: sessionId,
        player_id: playerId,
        comments: review.comments ?? '',
      }, { onConflict: 'session_id,player_id' });
    if (error) throw error;
  }

  async deleteSessionReview(sessionId: string, playerId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('session_player_reviews')
      .delete()
      .eq('session_id', sessionId)
      .eq('player_id', playerId);
    if (error) throw error;
  }
}
