import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { CatalogAttackType, CatalogSystem, CatalogResult, CatalogInitType, CatalogTag } from '../../../core/models/models';

@Injectable({ providedIn: 'root' })
export class ConfigurationRepository {
  private supabase = inject(SupabaseService);

  async findAttackTypes(clubId: string): Promise<CatalogAttackType[]> {
    const { data, error } = await this.supabase.client
      .from('catalog_attack_types').select('*').eq('club_id', clubId)
      .eq('active', true).order('sort_order');
    if (error) throw error;
    return data ?? [];
  }

  async createAttackType(clubId: string, data: Partial<CatalogAttackType>): Promise<CatalogAttackType> {
    const { data: result, error } = await this.supabase.client
      .from('catalog_attack_types').insert({ club_id: clubId, name: data.name, short_name: data.short_name, color: data.color })
      .select().single();
    if (error) throw error;
    return result;
  }

  async updateAttackType(id: string, data: Partial<CatalogAttackType>): Promise<void> {
    const { error } = await this.supabase.client
      .from('catalog_attack_types').update(data).eq('id', id);
    if (error) throw error;
  }

  async deleteAttackType(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('catalog_attack_types').update({ active: false }).eq('id', id);
    if (error) throw error;
  }

  async findSystems(teamId: string): Promise<CatalogSystem[]> {
    const { data, error } = await this.supabase.client
      .from('catalog_systems').select('*').eq('team_id', teamId)
      .eq('active', true).order('sort_order');
    if (error) throw error;
    return data ?? [];
  }

  async createSystem(teamId: string, data: Partial<CatalogSystem>): Promise<CatalogSystem> {
    const { data: result, error } = await this.supabase.client
      .from('catalog_systems').insert({ team_id: teamId, name: data.name, short_name: data.short_name, color: data.color })
      .select().single();
    if (error) throw error;
    return result;
  }

  async updateSystem(id: string, data: Partial<CatalogSystem>): Promise<void> {
    const { error } = await this.supabase.client
      .from('catalog_systems').update(data).eq('id', id);
    if (error) throw error;
  }

  async deleteSystem(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('catalog_systems').update({ active: false }).eq('id', id);
    if (error) throw error;
  }

  async findResults(clubId: string): Promise<CatalogResult[]> {
    const { data, error } = await this.supabase.client
      .from('catalog_results').select('*').eq('club_id', clubId)
      .eq('active', true).order('sort_order');
    if (error) throw error;
    return data ?? [];
  }

  async createResult(clubId: string, data: Partial<CatalogResult>): Promise<CatalogResult> {
    const { data: result, error } = await this.supabase.client
      .from('catalog_results').insert({ club_id: clubId, name: data.name, short_name: data.short_name, color: data.color, points: data.points ?? 0 })
      .select().single();
    if (error) throw error;
    return result;
  }

  async updateResult(id: string, data: Partial<CatalogResult>): Promise<void> {
    const { error } = await this.supabase.client
      .from('catalog_results').update(data).eq('id', id);
    if (error) throw error;
  }

  async deleteResult(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('catalog_results').update({ active: false }).eq('id', id);
    if (error) throw error;
  }

  async findInitTypes(clubId: string): Promise<CatalogInitType[]> {
    const { data, error } = await this.supabase.client
      .from('catalog_init_types').select('*').eq('club_id', clubId)
      .eq('active', true).order('sort_order');
    if (error) throw error;
    return data ?? [];
  }

  async createInitType(clubId: string, data: Partial<CatalogInitType>): Promise<CatalogInitType> {
    const { data: result, error } = await this.supabase.client
      .from('catalog_init_types').insert({ club_id: clubId, name: data.name, short_name: data.short_name, color: data.color })
      .select().single();
    if (error) throw error;
    return result;
  }

  async updateInitType(id: string, data: Partial<CatalogInitType>): Promise<void> {
    const { error } = await this.supabase.client
      .from('catalog_init_types').update(data).eq('id', id);
    if (error) throw error;
  }

  async deleteInitType(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('catalog_init_types').update({ active: false }).eq('id', id);
    if (error) throw error;
  }

  async seedMatchCatalogs(clubId: string): Promise<void> {
    const { error } = await this.supabase.client.rpc('seed_match_catalogs', { p_club_id: clubId });
    if (error) throw error;
  }

  async findTags(clubId: string): Promise<CatalogTag[]> {
    const { data, error } = await this.supabase.client
      .from('catalog_tags').select('*').eq('club_id', clubId)
      .eq('active', true).order('name');
    if (error) throw error;
    return data ?? [];
  }
}
