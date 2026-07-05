import { Injectable, inject, signal } from '@angular/core';
import { ConfigurationRepository } from '../repositories/configuration.repository';
import type { CatalogAttackType, CatalogSystem, CatalogResult, CatalogInitType } from '../../../core/models/models';

@Injectable({ providedIn: 'root' })
export class ConfigurationService {
  private repo = inject(ConfigurationRepository);

  readonly attackTypes = signal<CatalogAttackType[]>([]);
  readonly systems = signal<CatalogSystem[]>([]);
  readonly results = signal<CatalogResult[]>([]);
  readonly initTypes = signal<CatalogInitType[]>([]);
  readonly loaded = signal(false);

  private currentClubId: string | null = null;
  private currentTeamId: string | null = null;

  async loadCatalogs(clubId: string): Promise<void> {
    if (this.currentClubId === clubId && this.loaded()) return;

    const [attackTypes, results, initTypes] = await Promise.all([
      this.repo.findAttackTypes(clubId),
      this.repo.findResults(clubId),
      this.repo.findInitTypes(clubId),
    ]);

    this.attackTypes.set(attackTypes);
    this.results.set(results);
    this.initTypes.set(initTypes);
    this.currentClubId = clubId;
    this.loaded.set(true);
  }

  async loadSystems(teamId: string): Promise<void> {
    if (this.currentTeamId === teamId && this.systems().length > 0) return;
    const systems = await this.repo.findSystems(teamId);
    this.systems.set(systems);
    this.currentTeamId = teamId;
  }

  getResultPoints(resultId: string): number {
    return this.results().find(r => r.id === resultId)?.points ?? 0;
  }

  async seedCatalogs(clubId: string): Promise<void> {
    await this.repo.seedMatchCatalogs(clubId);
    await this.loadCatalogs(clubId);
  }

  getResultName(resultId: string): string {
    return this.results().find(r => r.id === resultId)?.name ?? '';
  }
}
