import { Injectable, inject } from '@angular/core';
import { MatchRepository } from '../repositories/match.repository';
import { MatchStore } from '../store/match.store';
import { ConfigurationService } from './configuration.service';
import type { Match, Possession, MatchSubstitution, MatchSquad } from '../../../core/models/models';
import type { CreateMatchData, PossessionFormData, SubstitutionFormData, ServiceResult } from '../models/match.models';

@Injectable({ providedIn: 'root' })
export class MatchService {
  private repository = inject(MatchRepository);
  private store = inject(MatchStore);
  private configService = inject(ConfigurationService);

  async loadMatch(id: string): Promise<ServiceResult<Match>> {
    this.store.setLoading(true);
    try {
      const match = await this.repository.findById(id);
      if (!match) return { success: false, error: 'Partido no encontrado' };

      const [possessions, substitutions, squad, lineup] = await Promise.all([
        this.repository.findPossessions(id),
        this.repository.findSubstitutions(id),
        this.repository.findSquad(id),
        this.repository.getLineup(id, match.current_period, 999),
      ]);

      this.store.setMatch(match);
      this.store.setPossessions(possessions);
      this.store.setSubstitutions(substitutions);
      this.store.setSquad(squad);
      this.store.setLineup(lineup);

      await Promise.all([
        this.configService.loadCatalogs(match.club_id),
        this.configService.loadSystems(match.team_id),
      ]);

      return { success: true, data: match };
    } catch (error) {
      const msg = (error as Error).message;
      this.store.setError(msg);
      return { success: false, error: msg };
    } finally {
      this.store.setLoading(false);
    }
  }

  async createMatch(data: CreateMatchData): Promise<ServiceResult<Match>> {
    try {
      const match = await this.repository.create({
        ...data,
        score_own: 0,
        score_rival: 0,
        current_period: 1,
        status: 'created',
      });
      this.store.setMatch(match);
      return { success: true, data: match };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async startMatch(matchId: string): Promise<ServiceResult<void>> {
    try {
      await this.repository.update(matchId, {
        status: 'in_progress',
        start_time: new Date().toISOString(),
      });
      const updated = await this.repository.findById(matchId);
      if (updated) this.store.setMatch(updated);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async finishMatch(matchId: string): Promise<ServiceResult<void>> {
    try {
      const score = this.store.score();
      await this.repository.update(matchId, {
        status: 'finished',
        end_time: new Date().toISOString(),
        score_own: score.own,
        score_rival: score.rival,
      });
      const updated = await this.repository.findById(matchId);
      if (updated) this.store.setMatch(updated);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async changePeriod(matchId: string, period: number): Promise<ServiceResult<void>> {
    try {
      await this.repository.update(matchId, { current_period: period });
      const updated = await this.repository.findById(matchId);
      if (updated) this.store.setMatch(updated);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async savePossession(data: PossessionFormData): Promise<ServiceResult<Possession>> {
    try {
      const number = data.number ?? ((await this.repository.findLastPossession(data.matchId))?.number ?? 0) + 1;

      const possession = await this.repository.createPossession({
        match_id: data.matchId,
        side: data.side,
        period: data.period ?? this.store.match()?.current_period ?? 1,
        number,
        init_type_id: data.initTypeId,
        attack_type_id: data.attackTypeId,
        system_id: data.systemId ?? null,
        result_id: data.resultId,
        finisher_id: data.finisherId ?? null,
        creator_id: data.creatorId ?? null,
        time_bucket: data.timeBucket,
        points: data.points,
        notes: data.notes ?? null,
        tags: data.tags ?? null,
      });

      this.store.addPossession(possession);
      return { success: true, data: possession };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async updateMatchScore(matchId: string, scoreOwn: number, scoreRival: number): Promise<ServiceResult<void>> {
    try {
      await this.repository.update(matchId, { score_own: scoreOwn, score_rival: scoreRival });
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async undoLastPossession(matchId: string): Promise<ServiceResult<void>> {
    try {
      const last = await this.repository.findLastPossession(matchId);
      if (!last) return { success: false, error: 'No hay posesiones que deshacer' };

      await this.repository.softDeletePossession(last.id);
      this.store.removePossession(last.id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async saveSquad(matchId: string, members: { player_id: string; starter: boolean }[]): Promise<ServiceResult<void>> {
    try {
      await this.repository.deleteSquad(matchId);
      for (const member of members) {
        await this.repository.createSquadMember({
          match_id: matchId,
          player_id: member.player_id,
          starter: member.starter,
        });
      }
      const squad = await this.repository.findSquad(matchId);
      this.store.setSquad(squad);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async saveSubstitution(data: SubstitutionFormData): Promise<ServiceResult<MatchSubstitution>> {
    try {
      const subs = this.store.substitutions();
      const orderInPeriod = subs.filter(s => s.period === data.period).length + 1;

      const sub = await this.repository.createSubstitution({
        match_id: data.matchId,
        player_out: data.playerOut,
        player_in: data.playerIn,
        period: data.period,
        order_in_period: orderInPeriod,
      });

      this.store.addSubstitution(sub);

      const match = this.store.match();
      if (match) {
        const lineup = await this.repository.getLineup(data.matchId, match.current_period, 999);
        this.store.setLineup(lineup);
      }

      return { success: true, data: sub };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async deleteMatch(id: string): Promise<ServiceResult<void>> {
    try {
      await this.repository.delete(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}
