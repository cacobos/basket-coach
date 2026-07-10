import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { Document, PlayerLicense, PlayerDocumentsStatus } from '../../../core/models/models';

@Injectable({ providedIn: 'root' })
export class DocumentRepository {
  private supabase = inject(SupabaseService);

  async findAll(clubId: string): Promise<Document[]> {
    const { data, error } = await this.supabase.client
      .from('documents').select('*').eq('club_id', clubId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Document[]) ?? [];
  }

  async findByPlayer(playerId: string): Promise<Document[]> {
    const { data, error } = await this.supabase.client
      .from('documents').select('*').eq('player_id', playerId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data as Document[]) ?? [];
  }

  async create(doc: Partial<Document>): Promise<Document> {
    const { data, error } = await this.supabase.client
      .from('documents').insert(doc).select().single();
    if (error) throw error;
    return data as Document;
  }

  async update(id: string, doc: Partial<Document>): Promise<void> {
    const { error } = await this.supabase.client
      .from('documents').update(doc).eq('id', id);
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('documents').delete().eq('id', id);
    if (error) throw error;
  }

  async getLicense(playerId: string): Promise<PlayerLicense | null> {
    const { data, error } = await this.supabase.client
      .from('player_licenses').select('*').eq('player_id', playerId).maybeSingle();
    if (error) throw error;
    return data as PlayerLicense | null;
  }

  async upsertLicense(license: Partial<PlayerLicense>): Promise<PlayerLicense> {
    const { data, error } = await this.supabase.client
      .from('player_licenses').upsert(license).select().single();
    if (error) throw error;
    return data as PlayerLicense;
  }

  async getPlayerDocumentsStatus(clubId: string): Promise<PlayerDocumentsStatus[]> {
    const { data, error } = await this.supabase.client
      .from('v_player_documents_status').select('*').eq('club_id', clubId);
    if (error) throw error;
    return (data as PlayerDocumentsStatus[]) ?? [];
  }

  async getExpiringSoon(clubId: string, days = 30): Promise<Document[]> {
    const { data, error } = await this.supabase.client
      .from('documents').select('*, players(first_name, last_name)')
      .eq('club_id', clubId)
      .not('expires_at', 'is', null)
      .lte('expires_at', new Date(Date.now() + days * 86400000).toISOString())
      .gte('expires_at', new Date().toISOString());
    if (error) throw error;
    return (data as any[]) ?? [];
  }
}
