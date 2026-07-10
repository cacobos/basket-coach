import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AnnouncementService } from '../services/announcement.service';
import { DataService } from '../../../core/services/data.service';
import { AuthService } from '../../../core/auth/auth.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { AnnouncementRepository } from '../repositories/announcement.repository';
import type { Announcement } from '../../../core/models/models';

@Component({
  selector: 'app-announcements-list',
  standalone: true,
  imports: [RouterLink, DatePipe],
  template: `
    <div class="page">
      <div class="header">
        <h1>Comunicaciones</h1>
        @if (!isFamilyUser) {
          <a routerLink="/announcements/new" class="btn-primary">+ Nuevo Aviso</a>
        }
      </div>

      @if (loading()) {
        <div class="loading">Cargando...</div>
      } @else if (announcements().length === 0) {
        <div class="empty">
          <h3>No hay comunicaciones</h3>
          <p>Los avisos y comunicaciones del club aparecerán aquí.</p>
        </div>
      } @else {
        <div class="announcements-list">
          @for (item of announcements(); track item.id) {
            <div class="card" [class.unread]="!readIds().has(item.id)" (click)="markRead(item)">
              <div class="card-header">
                <h3>{{ item.title }}</h3>
                <span class="date">{{ item.sent_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <p class="card-body">{{ item.body }}</p>
              @if (item.team_id) {
                <span class="team-badge">Equipo</span>
              } @else {
                <span class="club-badge">Club</span>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 900px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .header h1 { font-size: 24px; font-weight: 700; margin: 0; color: var(--text-primary); }
    .loading { text-align: center; padding: 60px; color: var(--text-secondary); }
    .empty { text-align: center; padding: 80px 24px; }
    .empty h3 { margin: 0 0 8px; color: var(--text-primary); }
    .empty p { color: var(--text-secondary); margin: 0; }
    .announcements-list { display: flex; flex-direction: column; gap: 12px; }
    .card {
      background: var(--bg-card); border: 1px solid var(--border-subtle);
      border-radius: 12px; padding: 18px; cursor: pointer;
      transition: all 0.15s; position: relative;
    }
    .card:hover { border-color: rgba(189,194,255,0.3); }
    .unread { border-left: 3px solid #818cf8; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .card-header h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-primary); }
    .date { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
    .card-body { margin: 0; font-size: 14px; color: var(--text-secondary); line-height: 1.5; white-space: pre-wrap; }
    .team-badge, .club-badge {
      display: inline-block; margin-top: 10px; font-size: 11px; font-weight: 600;
      padding: 3px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.3px;
    }
    .team-badge { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .club-badge { background: rgba(99,102,241,0.12); color: #818cf8; }
    .btn-primary {
      background: #bdc2ff; color: #030737; padding: 8px 18px; border: none;
      border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer;
      text-decoration: none; transition: opacity 0.2s;
    }
    .btn-primary:hover { opacity: 0.9; }
  `]
})
export class AnnouncementsListPage {
  private supabase = inject(SupabaseService);
  private service = inject(AnnouncementService);
  private repo = inject(AnnouncementRepository);
  private dataService = inject(DataService);
  private auth = inject(AuthService);

  announcements = this.service.announcements;
  loading = this.service.loading;
  readIds = signal<Set<string>>(new Set());
  isFamilyUser = false;

  constructor() {
    this.loadData();
  }

  private async loadData() {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    const club = this.dataService.currentClub();
    if (club) {
      await this.service.loadByClub(club.id);
    } else {
      // Family user — load announcements via player guardians
      const { data: guardians } = await this.supabase.client
        .from('player_guardians')
        .select('player_id')
        .eq('user_id', userId);
      if (!guardians?.length) return;

      this.isFamilyUser = true;
      const { data: players } = await this.supabase.client
        .from('players')
        .select('teams!inner(club_id)')
        .in('id', guardians.map(g => g.player_id))
        .is('deleted_at', null);
      if (!players?.length) return;

      const clubIds = [...new Set(players.map((p: any) => p.teams?.club_id).filter(Boolean))];
      const { data: items } = await this.supabase.client
        .from('announcements')
        .select('*')
        .in('club_id', clubIds)
        .order('sent_at', { ascending: false });

      this.service.announcements.set((items ?? []) as Announcement[]);
      this.loading.set(false);
    }

    const reads: any[] = [];
    for (const a of this.announcements()) {
      const readBy = await this.repo.getReadBy(a.id);
      reads.push(...readBy.filter(r => r.user_id === userId));
    }
    this.readIds.set(new Set(reads.map(r => r.announcement_id)));
  }

  async markRead(item: Announcement) {
    if (!this.readIds().has(item.id)) {
      await this.service.markAsRead(item.id);
      this.readIds.update(s => { s.add(item.id); return new Set(s); });
    }
  }
}
