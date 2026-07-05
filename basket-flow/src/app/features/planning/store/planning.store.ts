import { Injectable, inject, signal } from '@angular/core';
import { PlanningRepository } from '../repositories/planning.repository';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { Macrocycle, Mesocycle, Microcycle, MacrocycleSummary } from '../models/planning.models';

@Injectable({ providedIn: 'root' })
export class PlanningStore {
  private repo = inject(PlanningRepository);
  private supabase = inject(SupabaseService);

  readonly macrocycles = signal<Macrocycle[]>([]);
  readonly currentMacrocycle = signal<Macrocycle | null>(null);
  readonly mesocycles = signal<Mesocycle[]>([]);
  readonly currentMesocycle = signal<Mesocycle | null>(null);
  readonly microcycles = signal<Microcycle[]>([]);
  readonly summary = signal<MacrocycleSummary | null>(null);
  readonly loading = signal(false);

  async loadMacrocycles(teamId: string) {
    this.loading.set(true);
    const items = await this.repo.getMacrocycles(teamId);
    this.macrocycles.set(items);
    this.loading.set(false);
  }

  async loadMacrocycle(id: string) {
    this.loading.set(true);
    const [macro, summary] = await Promise.all([
      this.repo.getMacrocycle(id),
      this.repo.getMacrocycleSummary(id),
    ]);
    this.currentMacrocycle.set(macro);
    this.summary.set(summary);
    if (macro) {
      const mesos = await this.repo.getMesocycles(id);
      this.mesocycles.set(mesos);
    }
    this.loading.set(false);
  }

  async loadMesocycle(id: string) {
    const { data } = await this.supabase.client
      .from('mesocycles').select('*').eq('id', id).single();
    this.currentMesocycle.set(data as Mesocycle);
    const micros = await this.repo.getMicrocycles(id);
    this.microcycles.set(micros);
  }

  async createMacrocycle(dto: any) {
    const macro = await this.repo.createMacrocycle(dto);
    this.macrocycles.update(list => [macro, ...list]);
    return macro;
  }

  async deleteMacrocycle(id: string) {
    await this.repo.deleteMacrocycle(id);
    this.macrocycles.update(list => list.filter(m => m.id !== id));
  }

  async generateMicrocycles(mesocycleId: string, plannedPerWeek: number) {
    await this.repo.generateMicrocycles(mesocycleId, plannedPerWeek);
    const micros = await this.repo.getMicrocycles(mesocycleId);
    this.microcycles.set(micros);
  }

  reset() {
    this.currentMacrocycle.set(null);
    this.currentMesocycle.set(null);
    this.mesocycles.set([]);
    this.microcycles.set([]);
    this.summary.set(null);
  }
}
