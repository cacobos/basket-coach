import { Injectable, signal, computed, inject } from '@angular/core';
import type { SeasonOption } from '../models/models';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable({ providedIn: 'root' })
export class SeasonService {
  private readonly STORAGE_KEY = 'basketflow-season';
  private supabase = inject(SupabaseService);

  allSeasons: SeasonOption[] = [];

  selectedSeason = signal(this.loadSavedSeason());

  currentSeason = computed(() => this.selectedSeason());

  constructor() {
    this.allSeasons = [SeasonService.optionFor(this.loadSavedSeason())];
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
    if (month >= 9) {
      return `${year}-${year + 1}`;
    }
    return `${year - 1}-${year}`;
  }

  private static optionFor(s: string): SeasonOption {
    return { value: s, label: s };
  }

  async loadFromDb(clubId: string) {
    const { data } = await this.supabase.client
      .from('teams')
      .select('season')
      .eq('club_id', clubId)
      .is('archived_at', null);
    const seasons = [...new Set((data ?? []).map((t: any) => t.season).filter(Boolean))] as string[];

    const now = new Date();
    if (now.getMonth() + 1 >= 6) {
      const current = SeasonService.getCurrentSeason();
      const nextStart = parseInt(current.split('-')[0]) + 1;
      const next = `${nextStart}-${nextStart + 1}`;
      if (!seasons.includes(next)) seasons.push(next);
    }

    seasons.sort();
    this.allSeasons = seasons.map(SeasonService.optionFor);
    const saved = this.selectedSeason();
    if (!seasons.includes(saved)) {
      this.selectSeason(seasons[0] || SeasonService.getCurrentSeason());
    }
  }
}
