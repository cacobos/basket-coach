import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { AuthService } from '../auth/auth.service';
import type { Exercise, ExerciseCategory, ExerciseVariant, TagInfo, Tag } from '../models/models';
import type { BaseRepository } from './base.repository';

@Injectable({ providedIn: 'root' })
export class ExerciseRepository implements BaseRepository<Exercise, Omit<Exercise, 'id' | 'created_at' | 'created_by' | 'deleted_at'>, Partial<Exercise>> {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  async findAll(clubId: string): Promise<Exercise[]> {
    const { data, error } = await this.supabase.client
      .from('exercises')
      .select(`
        *,
        exercise_tags (
          tags (*)
        )
      `)
      .eq('club_id', clubId)
      .is('deleted_at', null)
      .order('name');
    if (error) throw error;
    return ((data || []) as any[]).map(ex => ({
      ...ex,
      tags: (ex.exercise_tags || []).map((et: any) => et.tags).filter(Boolean) as TagInfo[],
    })) as Exercise[];
  }

  async findById(id: string): Promise<Exercise | null> {
    const { data, error } = await this.supabase.client
      .from('exercises')
      .select(`
        *,
        exercise_tags (
          tags (*)
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();
    if (error) throw error;
    if (!data) return null;
    const d = data as any;
    return {
      ...d,
      tags: (d.exercise_tags || []).map((et: any) => et.tags).filter(Boolean) as TagInfo[],
    } as Exercise;
  }

  async create(dto: Omit<Exercise, 'id' | 'created_at' | 'created_by' | 'deleted_at'>): Promise<Exercise> {
    const { tags, ...dbData } = dto;
    const { data, error } = await this.supabase.client
      .from('exercises')
      .insert({ ...dbData, created_by: this.auth.user()!.id })
      .select()
      .single();
    if (error) throw error;
    return { ...(data as any), tags: [] };
  }

  async update(id: string, dto: Partial<Exercise>): Promise<Exercise> {
    const { tags, ...dbData } = dto as any;
    const { data, error } = await this.supabase.client
      .from('exercises').update(dbData).eq('id', id).select().single();
    if (error) throw error;
    return { ...(data as any), tags: [] };
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('exercises').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }

  async removeTagFromExercises(tag: string): Promise<void> {
    const { error } = await this.supabase.client
      .rpc('remove_tag_from_exercises', { tag_name: tag });
    if (error) throw error;
  }

  // ── Categories ──
  async getCategories(clubId: string): Promise<ExerciseCategory[]> {
    const { data, error } = await this.supabase.client
      .from('exercise_categories')
      .select('*')
      .eq('club_id', clubId)
      .order('name');
    if (error) throw error;
    return (data as ExerciseCategory[]) || [];
  }

  async createCategory(name: string, color: string, clubId: string): Promise<ExerciseCategory> {
    const { data, error } = await this.supabase.client
      .from('exercise_categories')
      .insert({ club_id: clubId, name, color })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ── Variants ──
  async getVariants(exerciseId: string): Promise<ExerciseVariant[]> {
    const { data, error } = await this.supabase.client
      .from('exercise_variants')
      .select('*')
      .eq('exercise_id', exerciseId)
      .order('name');
    if (error) throw error;
    return (data as ExerciseVariant[]) || [];
  }

  async createVariant(v: Omit<ExerciseVariant, 'id' | 'created_at' | 'created_by'>): Promise<ExerciseVariant> {
    const { data, error } = await this.supabase.client
      .from('exercise_variants')
      .insert({ ...v, created_by: this.auth.user()!.id })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteVariant(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('exercise_variants').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Tags (many-to-many) ──
  async getTags(clubId: string): Promise<Tag[]> {
    const { data, error } = await this.supabase.client
      .from('tags')
      .select('*')
      .eq('club_id', clubId)
      .order('name');
    if (error) throw error;
    return (data as Tag[]) || [];
  }

  async createTag(data: { name: string; color?: string; club_id: string }): Promise<Tag> {
    const { data: tag, error } = await this.supabase.client
      .from('tags')
      .insert({ name: data.name, color: data.color || '#4f6ef7', club_id: data.club_id })
      .select()
      .single();
    if (error) throw error;
    return tag;
  }

  async deleteTag(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('tags').delete().eq('id', id);
    if (error) throw error;
  }

  async updateExerciseTags(exerciseId: string, tagIds: string[]): Promise<void> {
    const { error: delError } = await this.supabase.client
      .from('exercise_tags')
      .delete()
      .eq('exercise_id', exerciseId);
    if (delError) throw delError;

    if (tagIds.length === 0) return;

    const { error: insError } = await this.supabase.client
      .from('exercise_tags')
      .insert(tagIds.map(tagId => ({ exercise_id: exerciseId, tag_id: tagId })));
    if (insError) throw insError;
  }
}
