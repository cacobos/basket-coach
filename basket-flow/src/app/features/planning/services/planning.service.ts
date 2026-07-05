import { Injectable, inject } from '@angular/core';
import { PlanningRepository } from '../repositories/planning.repository';

@Injectable({ providedIn: 'root' })
export class PlanningService {
  private repo = inject(PlanningRepository);

  async generateMicrocycles(mesocycleId: string, plannedSessionsPerWeek: number) {
    return this.repo.generateMicrocycles(mesocycleId, plannedSessionsPerWeek);
  }
}
