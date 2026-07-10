import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { Announcement, AnnouncementRead } from '../../../core/models/models';

@Injectable({ providedIn: 'root' })
export class AnnouncementRepository {
  private supabase = inject(SupabaseService);

  async findAll(clubId: string): Promise<Announcement[]> {
    const { data, error } = await this.supabase.client
      .from('announcements').select('*').eq('club_id', clubId).order('sent_at', { ascending: false });
    if (error) throw error;
    return (data as Announcement[]) ?? [];
  }

  async findByTeam(teamId: string): Promise<Announcement[]> {
    const { data, error } = await this.supabase.client
      .from('announcements').select('*').or(`team_id.eq.${teamId},team_id.is.null`).order('sent_at', { ascending: false });
    if (error) throw error;
    return (data as Announcement[]) ?? [];
  }

  async create(announcement: Partial<Announcement>): Promise<Announcement> {
    const { data, error } = await this.supabase.client
      .from('announcements').insert({ ...announcement, sent_at: new Date().toISOString() }).select().single();
    if (error) throw error;
    return data as Announcement;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('announcements').delete().eq('id', id);
    if (error) throw error;
  }

  async markAsRead(announcementId: string, userId: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('announcement_reads').upsert({ announcement_id: announcementId, user_id: userId, read_at: new Date().toISOString() }, { onConflict: 'announcement_id,user_id' });
    if (error) throw error;
  }

  async getReadBy(announcementId: string): Promise<AnnouncementRead[]> {
    const { data, error } = await this.supabase.client
      .from('announcement_reads').select('*').eq('announcement_id', announcementId);
    if (error) throw error;
    return (data as AnnouncementRead[]) ?? [];
  }

  async getUnreadCount(userId: string, clubId: string): Promise<number> {
    const { count, error } = await this.supabase.client
      .from('announcements').select('id', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .not('id', 'in', (
        this.supabase.client.from('announcement_reads').select('announcement_id').eq('user_id', userId)
      ) as any);
    if (error) throw error;
    return count ?? 0;
  }
}
