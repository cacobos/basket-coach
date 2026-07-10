import { Injectable, signal, computed } from '@angular/core';
import type { SeasonOption } from '../models/models';

@Injectable({ providedIn: 'root' })
export class SeasonService {
  private readonly STORAGE_KEY = 'basketflow-season';

  allSeasons: SeasonOption[] = [];

  selectedSeason = signal(this.loadSavedSeason());

  currentSeason = computed(() => this.selectedSeason());

  constructor() {
    this.initSeasons();
  }

  private loadSavedSeason(): string {
    return localStorage.getItem(this.STORAGE_KEY) || SeasonService.getCurrentSeason();
  }

  private saveSeason(season: string) {
    localStorage.setItem(this.STORAGE_KEY, season);
  }

  selectSeason(season: string) {
    this.selectedSeason.set(season);
    this.saveSeason(season);
  }

  static getCurrentSeason(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    if (month >= 7) {
      return `${year}-${year + 1}`;
    }
    return `${year - 1}-${year}`;
  }

  static generateSeasonOptions(): SeasonOption[] {
    const current = SeasonService.getCurrentSeason();
    const currentStart = parseInt(current.split('-')[0]);
    const options: SeasonOption[] = [];
    for (let offset = -3; offset <= 2; offset++) {
      const s = currentStart + offset;
      const label = `${s}-${s + 1}`;
      options.push({ value: label, label });
    }
    return options;
  }

  private initSeasons() {
    this.allSeasons = SeasonService.generateSeasonOptions();
    const saved = this.selectedSeason();
    if (!this.allSeasons.some(s => s.value === saved)) {
      this.allSeasons.push({ value: saved, label: saved });
    }
  }
}
