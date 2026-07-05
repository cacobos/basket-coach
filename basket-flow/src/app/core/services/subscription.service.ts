import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import { DataService } from './data.service';

/**
 * Tracks club-level subscription plan info for billing display purposes.
 * Feature access is now controlled by PermissionService, not subscriptions.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionService {
  private supabase = inject(SupabaseService);
  private data = inject(DataService);

  readonly planName = signal<string>('Free');
  private loaded = signal(false);

  async load() {
    if (this.loaded()) return;
    const clubId = this.data.currentClub()?.id;
    if (!clubId) return;
    const { data } = await this.supabase.client
      .from('v_club_features')
      .select('plan_name')
      .eq('club_id', clubId)
      .single();
    if (data?.plan_name) {
      this.planName.set(data.plan_name);
    }
    this.loaded.set(true);
  }

  refresh() {
    this.loaded.set(false);
    return this.load();
  }
}
