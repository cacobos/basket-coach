import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { Consent } from '../../../core/models/models';

@Injectable({ providedIn: 'root' })
export class ConsentRepository {
  private supabase = inject(SupabaseService);

  async findByPlayer(playerId: string): Promise<Consent[]> {
    const { data, error } = await this.supabase.client
      .from('consents').select('*').eq('player_id', playerId).order('granted_at', { ascending: false });
    if (error) throw error;
    return (data as Consent[]) ?? [];
  }

  async grant(playerId: string, guardianId: string | null, consentType: Consent['consent_type']): Promise<Consent> {
    const { data, error } = await this.supabase.client
      .from('consents').insert({
        player_id: playerId,
        guardian_id: guardianId,
        consent_type: consentType,
        granted_at: new Date().toISOString(),
      }).select().single();
    if (error) throw error;
    return data as Consent;
  }

  async revoke(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('consents').update({ revoked_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  }
}
