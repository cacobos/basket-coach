import { Injectable, signal, computed } from '@angular/core';
import type { Match, Possession, MatchSubstitution, MatchSquad } from '../../../core/models/models';
import type { LineupPlayer } from '../../../core/models/models';

@Injectable({ providedIn: 'root' })
export class MatchStore {
  private readonly matchSignal = signal<Match | null>(null);
  private readonly possessionsSignal = signal<Possession[]>([]);
  private readonly substitutionsSignal = signal<MatchSubstitution[]>([]);
  private readonly squadSignal = signal<MatchSquad[]>([]);
  private readonly lineupSignal = signal<LineupPlayer[]>([]);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);

  readonly match = this.matchSignal.asReadonly();
  readonly possessions = this.possessionsSignal.asReadonly();
  readonly substitutions = this.substitutionsSignal.asReadonly();
  readonly squad = this.squadSignal.asReadonly();
  readonly lineup = this.lineupSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  readonly score = computed(() => {
    const possessions = this.possessionsSignal();
    return {
      own: possessions.filter(p => p.side === 'own').reduce((s, p) => s + p.points, 0),
      rival: possessions.filter(p => p.side === 'rival').reduce((s, p) => s + p.points, 0),
    };
  });

  readonly possessionCount = computed(() => ({
    own: this.possessionsSignal().filter(p => p.side === 'own').length,
    rival: this.possessionsSignal().filter(p => p.side === 'rival').length,
  }));

  readonly ppp = computed(() => {
    const own = this.possessionsSignal().filter(p => p.side === 'own');
    return own.length > 0 ? +(own.reduce((s, p) => s + p.points, 0) / own.length).toFixed(2) : 0;
  });

  readonly ownPossessions = computed(() =>
    this.possessionsSignal().filter(p => p.side === 'own')
  );
  readonly rivalPossessions = computed(() =>
    this.possessionsSignal().filter(p => p.side === 'rival')
  );

  setMatch(match: Match): void { this.matchSignal.set(match); }
  setPossessions(possessions: Possession[]): void { this.possessionsSignal.set(possessions); }
  setSubstitutions(subs: MatchSubstitution[]): void { this.substitutionsSignal.set(subs); }
  setSquad(squad: MatchSquad[]): void { this.squadSignal.set(squad); }
  setLineup(lineup: LineupPlayer[]): void { this.lineupSignal.set(lineup); }

  setLoading(loading: boolean): void { this.loadingSignal.set(loading); }
  setError(error: string | null): void { this.errorSignal.set(error); }

  addPossession(possession: Possession): void {
    this.possessionsSignal.update(prev => [...prev, possession]);
  }

  updatePossession(id: string, changes: Partial<Possession>): void {
    this.possessionsSignal.update(prev =>
      prev.map(p => p.id === id ? { ...p, ...changes } : p)
    );
  }

  removePossession(id: string): void {
    this.possessionsSignal.update(prev =>
      prev.map(p => p.id === id ? { ...p, deleted: true } : p)
    );
  }

  undoLastPossession(): void {
    this.possessionsSignal.update(prev => prev.slice(0, -1));
  }

  addSubstitution(sub: MatchSubstitution): void {
    this.substitutionsSignal.update(prev => [...prev, sub]);
  }

  addSquadMember(member: MatchSquad): void {
    this.squadSignal.update(prev => [...prev, member]);
  }

  reset(): void {
    this.matchSignal.set(null);
    this.possessionsSignal.set([]);
    this.substitutionsSignal.set([]);
    this.squadSignal.set([]);
    this.lineupSignal.set([]);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
  }
}
