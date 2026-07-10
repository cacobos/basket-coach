import { Injectable, inject, signal } from '@angular/core';
import { AnnouncementRepository } from '../repositories/announcement.repository';
import { AuthService } from '../../../core/auth/auth.service';
import type { Announcement } from '../../../core/models/models';

@Injectable({ providedIn: 'root' })
export class AnnouncementService {
  private repo = inject(AnnouncementRepository);
  private auth = inject(AuthService);

  readonly announcements = signal<Announcement[]>([]);
  readonly loading = signal(false);

  async loadByClub(clubId: string): Promise<void> {
    this.loading.set(true);
    try {
      const items = await this.repo.findAll(clubId);
      this.announcements.set(items);
    } finally {
      this.loading.set(false);
    }
  }

  async loadByTeam(teamId: string): Promise<void> {
    this.loading.set(true);
    try {
      const items = await this.repo.findByTeam(teamId);
      this.announcements.set(items);
    } finally {
      this.loading.set(false);
    }
  }

  async create(announcement: Partial<Announcement>): Promise<Announcement> {
    const created = await this.repo.create({ ...announcement, created_by: this.auth.user()?.id });
    this.announcements.update(list => [created, ...list]);
    return created;
  }

  async delete(id: string): Promise<void> {
    await this.repo.remove(id);
    this.announcements.update(list => list.filter(a => a.id !== id));
  }

  async markAsRead(announcementId: string): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) return;
    await this.repo.markAsRead(announcementId, userId);
  }
}
