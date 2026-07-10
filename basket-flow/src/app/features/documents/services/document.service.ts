import { Injectable, inject, signal } from '@angular/core';
import { DocumentRepository } from '../repositories/document.repository';
import type { PlayerDocumentsStatus } from '../../../core/models/models';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private repo = inject(DocumentRepository);

  readonly statuses = signal<PlayerDocumentsStatus[]>([]);
  readonly expiringSoon = signal<any[]>([]);
  readonly loading = signal(false);

  async loadStatuses(clubId: string): Promise<void> {
    this.loading.set(true);
    try {
      const [statuses, expiring] = await Promise.all([
        this.repo.getPlayerDocumentsStatus(clubId),
        this.repo.getExpiringSoon(clubId),
      ]);
      this.statuses.set(statuses);
      this.expiringSoon.set(expiring);
    } finally {
      this.loading.set(false);
    }
  }

  getExpiringCount(): number {
    return this.expiringSoon().length;
  }

  getPlayersWithExpiredDocs(): PlayerDocumentsStatus[] {
    return this.statuses().filter(s => s.expired_docs > 0);
  }

  getPlayersWithPendingDocs(): PlayerDocumentsStatus[] {
    return this.statuses().filter(s => s.pending_docs > 0);
  }

  reset() {
    this.statuses.set([]);
    this.expiringSoon.set([]);
  }
}
