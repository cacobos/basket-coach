import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../core/supabase/supabase.service';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private supabase = inject(SupabaseService);

  async generateRecurringFees(): Promise<{ created: number }> {
    const { data, error } = await this.supabase.client.rpc('generate_recurring_fees');
    if (error) throw error;
    return { created: (data as number) || 0 };
  }
}
