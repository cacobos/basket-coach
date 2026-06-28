import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from './notification.service';
import type {
  Club, ClubMember, Team, Player, Exercise, ExerciseCategory, ExerciseVariant,
  TrainingSession, SessionSection, SessionExercise, Attendance, GameStats,
  PlayerGameStats, Evaluation, PlaybookDB
} from '../models/models';

@Injectable({ providedIn: 'root' })
export class DataService {
  private notification = inject(NotificationService);
  private _clubs = signal<Club[]>([]);
  private _currentClub = signal<Club | null>(null);

  clubs = this._clubs.asReadonly();
  currentClub = this._currentClub.asReadonly();

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) {
    this._init();
  }

  private async _init() {
    await this.auth.ready;
    const user = this.auth.user();
    if (user) {
      try {
        const { data } = await this.supabase.client
          .from('club_members')
          .select('clubs(*)')
          .eq('user_id', user.id);
        if (data) {
          const clubs = data.map((cm: any) => cm.clubs as Club);
          this._clubs.set(clubs);
          if (clubs.length > 0) this._currentClub.set(clubs[0]);
        }
      } catch (e) {
        this.notification.show(e instanceof Error ? e.message : String(e));
      }
    }
  }

  setCurrentClub(club: Club) {
    this._currentClub.set(club);
  }

  // ── Clubs ──
  async createClub(name: string, description?: string): Promise<Club | null> {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const { data } = await this.supabase.client
      .from('clubs')
      .insert({ name, slug, description, created_by: this.auth.user()!.id })
      .select()
      .single();
    if (data) {
      await this.supabase.client.from('club_members')
        .insert({ club_id: data.id, user_id: this.auth.user()!.id, role: 'admin' });
      await this._init();
      return data as Club;
    }
    return null;
  }

  // ── Teams ──
  async getTeams(clubId?: string): Promise<Team[]> {
    const cid = clubId || this._currentClub()?.id;
    if (!cid) return [];
    const { data } = await this.supabase.client
      .from('teams')
      .select('*')
      .eq('club_id', cid)
      .order('name');
    return (data as Team[]) || [];
  }

  async createTeam(name: string, category: string, season?: string): Promise<Team | null> {
    const clubId = this._currentClub()?.id;
    if (!clubId) return null;
    const { data } = await this.supabase.client
      .from('teams')
      .insert({ club_id: clubId, name, category, season: season || new Date().getFullYear().toString() })
      .select()
      .single();
    return data as Team | null;
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<void> {
    await this.supabase.client.from('teams').update(updates).eq('id', id);
  }

  async deleteTeam(id: string): Promise<void> {
    await this.supabase.client.from('teams').delete().eq('id', id);
  }

  // ── Players ──
  async getPlayers(teamId?: string): Promise<Player[]> {
    if (teamId) {
      const { data } = await this.supabase.client
        .from('players')
        .select('*')
        .eq('team_id', teamId)
        .order('last_name');
      return (data as Player[]) || [];
    }
    const clubId = this._currentClub()?.id;
    if (!clubId) return [];
    const { data } = await this.supabase.client
      .from('players')
      .select('*, teams!inner(club_id)')
      .eq('teams.club_id', clubId)
      .order('last_name');
    return (data as any[])?.map(p => ({ ...p, team_id: p.team_id })) as Player[] || [];
  }

  async createPlayer(player: Omit<Player, 'id' | 'created_at' | 'is_active'> & { is_active?: boolean }): Promise<Player | null> {
    const { data } = await this.supabase.client
      .from('players')
      .insert({ ...player, is_active: player.is_active ?? true })
      .select()
      .single();
    return data as Player | null;
  }

  async updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
    await this.supabase.client.from('players').update(updates).eq('id', id);
  }

  async deletePlayer(id: string): Promise<void> {
    await this.supabase.client.from('players').delete().eq('id', id);
  }

  // ── Exercise Categories ──
  async getCategories(clubId?: string): Promise<ExerciseCategory[]> {
    const cid = clubId || this._currentClub()?.id;
    if (!cid) return [];
    const { data } = await this.supabase.client
      .from('exercise_categories')
      .select('*')
      .eq('club_id', cid)
      .order('name');
    return (data as ExerciseCategory[]) || [];
  }

  async createCategory(name: string, color: string): Promise<ExerciseCategory | null> {
    const clubId = this._currentClub()?.id;
    if (!clubId) return null;
    const { data } = await this.supabase.client
      .from('exercise_categories')
      .insert({ club_id: clubId, name, color })
      .select()
      .single();
    return data as ExerciseCategory | null;
  }

  // ── Exercises ──
  async getExercises(clubId?: string): Promise<Exercise[]> {
    const cid = clubId || this._currentClub()?.id;
    if (!cid) return [];
    const { data } = await this.supabase.client
      .from('exercises')
      .select('*')
      .eq('club_id', cid)
      .order('name');
    return (data as Exercise[]) || [];
  }

  async createExercise(ex: Omit<Exercise, 'id' | 'created_at' | 'created_by'>): Promise<Exercise | null> {
    const { data } = await this.supabase.client
      .from('exercises')
      .insert({ ...ex, created_by: this.auth.user()!.id })
      .select()
      .single();
    return data as Exercise | null;
  }

  async updateExercise(id: string, updates: Partial<Exercise>): Promise<void> {
    await this.supabase.client.from('exercises').update(updates).eq('id', id);
  }

  async deleteExercise(id: string): Promise<void> {
    await this.supabase.client.from('exercises').delete().eq('id', id);
  }

  async removeTagFromExercises(tag: string): Promise<void> {
    await this.supabase.client.rpc('remove_tag_from_exercises', { tag_name: tag });
  }

  // ── Training Sessions ──
  async getSessions(teamId?: string): Promise<TrainingSession[]> {
    if (teamId) {
      const { data } = await this.supabase.client
        .from('training_sessions')
        .select('*')
        .eq('team_id', teamId)
        .order('date', { ascending: false });
      return (data as TrainingSession[]) || [];
    }
    const clubId = this._currentClub()?.id;
    if (!clubId) return [];
    const { data } = await this.supabase.client
      .from('training_sessions')
      .select('*')
      .eq('club_id', clubId)
      .order('date', { ascending: false });
    return (data as TrainingSession[]) || [];
  }

  async createSession(session: Omit<TrainingSession, 'id' | 'created_at' | 'created_by'>): Promise<TrainingSession | null> {
    const { data } = await this.supabase.client
      .from('training_sessions')
      .insert({ ...session, created_by: this.auth.user()!.id })
      .select()
      .single();
    return data as TrainingSession | null;
  }

  async updateSession(id: string, updates: Partial<TrainingSession>): Promise<void> {
    await this.supabase.client.from('training_sessions').update(updates).eq('id', id);
  }

  async deleteSession(id: string): Promise<void> {
    await this.supabase.client.from('training_sessions').delete().eq('id', id);
  }

  // ── Session Sections ──
  async getSections(sessionId: string): Promise<SessionSection[]> {
    const { data } = await this.supabase.client
      .from('session_sections')
      .select('*')
      .eq('session_id', sessionId)
      .order('sort_order');
    return (data as SessionSection[]) || [];
  }

  async createSection(section: Omit<SessionSection, 'id' | 'created_at'>): Promise<SessionSection | null> {
    const { data } = await this.supabase.client
      .from('session_sections')
      .insert(section)
      .select()
      .single();
    return data as SessionSection | null;
  }

  async updateSection(id: string, updates: Partial<SessionSection>): Promise<void> {
    await this.supabase.client.from('session_sections').update(updates).eq('id', id);
  }

  async deleteSection(id: string): Promise<void> {
    await this.supabase.client.from('session_sections').delete().eq('id', id);
  }

  // ── Session Exercises ──
  async getSessionExercises(sessionId?: string): Promise<SessionExercise[]> {
    let query = this.supabase.client
      .from('session_exercises')
      .select('*')
      .order('order');
    if (sessionId) query = query.eq('session_id', sessionId);
    const { data } = await query;
    return (data as SessionExercise[]) || [];
  }

  async getSectionExercises(sectionId: string): Promise<SessionExercise[]> {
    const { data } = await this.supabase.client
      .from('session_exercises')
      .select('*')
      .eq('section_id', sectionId)
      .order('order');
    return (data as SessionExercise[]) || [];
  }

  async addSessionExercise(se: Omit<SessionExercise, 'id' | 'created_at'>): Promise<SessionExercise | null> {
    const { data } = await this.supabase.client
      .from('session_exercises')
      .insert(se)
      .select()
      .single();
    return data as SessionExercise | null;
  }

  async updateSessionExercise(id: string, updates: Partial<SessionExercise>): Promise<void> {
    await this.supabase.client.from('session_exercises').update(updates).eq('id', id);
  }

  async removeSessionExercise(id: string): Promise<void> {
    await this.supabase.client.from('session_exercises').delete().eq('id', id);
  }

  // ── Exercise Variants ──
  async getVariants(exerciseId: string): Promise<ExerciseVariant[]> {
    const { data } = await this.supabase.client
      .from('exercise_variants')
      .select('*')
      .eq('exercise_id', exerciseId)
      .order('name');
    return (data as ExerciseVariant[]) || [];
  }

  async createVariant(v: Omit<ExerciseVariant, 'id' | 'created_at' | 'created_by'>): Promise<ExerciseVariant | null> {
    const { data } = await this.supabase.client
      .from('exercise_variants')
      .insert({ ...v, created_by: this.auth.user()!.id })
      .select()
      .single();
    return data as ExerciseVariant | null;
  }

  async deleteVariant(id: string): Promise<void> {
    await this.supabase.client.from('exercise_variants').delete().eq('id', id);
  }

  async getSessionsByDateRange(from: string, to: string): Promise<TrainingSession[]> {
    const clubId = this._currentClub()?.id;
    if (!clubId) return [];
    const { data } = await this.supabase.client
      .from('training_sessions')
      .select('*, teams(name)')
      .eq('club_id', clubId)
      .gte('date', from)
      .lte('date', to)
      .order('date');
    return (data as any[]) || [];
  }

  // ── Playbooks ──
  async getPlaybooks(): Promise<PlaybookDB[]> {
    const clubId = this._currentClub()?.id;
    if (!clubId) return [];
    const { data } = await this.supabase.client
      .from('playbooks')
      .select('*')
      .eq('club_id', clubId)
      .order('updated_at', { ascending: false });
    return (data as PlaybookDB[]) || [];
  }

  async getPlaybook(id: string): Promise<PlaybookDB | null> {
    const { data } = await this.supabase.client
      .from('playbooks')
      .select('*')
      .eq('id', id)
      .single();
    return data as PlaybookDB | null;
  }

  async createPlaybook(pb: Omit<PlaybookDB, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<PlaybookDB | null> {
    const { data } = await this.supabase.client
      .from('playbooks')
      .insert({ ...pb, created_by: this.auth.user()!.id })
      .select()
      .single();
    return data as PlaybookDB | null;
  }

  async updatePlaybook(id: string, updates: Partial<PlaybookDB>): Promise<void> {
    await this.supabase.client
      .from('playbooks')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
  }

  async deletePlaybook(id: string): Promise<void> {
    await this.supabase.client.from('playbooks').delete().eq('id', id);
  }

  // ── Attendance ──
  async getAttendance(sessionId: string): Promise<Attendance[]> {
    const { data } = await this.supabase.client
      .from('attendance')
      .select('*')
      .eq('session_id', sessionId);
    return (data as Attendance[]) || [];
  }

  async setAttendance(sessionId: string, playerId: string, status: Attendance['status'], notes?: string): Promise<void> {
    await this.supabase.client
      .from('attendance')
      .upsert({ session_id: sessionId, player_id: playerId, status, notes }, { onConflict: 'session_id,player_id' });
  }

  // ── Game Stats ──
  async getGames(teamId: string): Promise<GameStats[]> {
    const { data } = await this.supabase.client
      .from('game_stats')
      .select('*')
      .eq('team_id', teamId)
      .order('date', { ascending: false });
    return (data as GameStats[]) || [];
  }

  async createGame(game: Omit<GameStats, 'id' | 'created_at'>): Promise<GameStats | null> {
    const { data } = await this.supabase.client
      .from('game_stats')
      .insert(game)
      .select()
      .single();
    return data as GameStats | null;
  }

  async getPlayerGameStats(gameId: string): Promise<PlayerGameStats[]> {
    const { data } = await this.supabase.client
      .from('player_game_stats')
      .select('*')
      .eq('game_id', gameId);
    return (data as PlayerGameStats[]) || [];
  }

  async savePlayerGameStats(stats: Omit<PlayerGameStats, 'id' | 'created_at'>): Promise<void> {
    await this.supabase.client
      .from('player_game_stats')
      .upsert(stats, { onConflict: 'game_id,player_id' });
  }

  // ── Evaluations ──
  async getEvaluations(clubId?: string): Promise<Evaluation[]> {
    const cid = clubId || this._currentClub()?.id;
    if (!cid) return [];
    const { data } = await this.supabase.client
      .from('evaluations')
      .select('*')
      .eq('club_id', cid)
      .order('date', { ascending: false });
    return (data as Evaluation[]) || [];
  }

  async createEvaluation(ev: Omit<Evaluation, 'id' | 'created_at' | 'evaluator_id'>): Promise<Evaluation | null> {
    const { data } = await this.supabase.client
      .from('evaluations')
      .insert({ ...ev, evaluator_id: this.auth.user()!.id })
      .select()
      .single();
    return data as Evaluation | null;
  }

  async deleteEvaluation(id: string): Promise<void> {
    await this.supabase.client.from('evaluations').delete().eq('id', id);
  }
}
