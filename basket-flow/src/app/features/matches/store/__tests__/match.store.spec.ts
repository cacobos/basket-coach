import { MatchStore } from '../match.store';
import type { Match, Possession, MatchSubstitution, MatchSquad } from '../../../../core/models/models';

function makePossession(overrides: Partial<Possession> = {}): Possession {
  return {
    id: crypto.randomUUID(),
    match_id: 'match-1',
    period: 1,
    number: 1,
    side: 'own',
    init_type: 'saque_inicial',
    attack_type: 'estatico',
    system: 'Motion',
    result: 't2_anotado',
    points: 2,
    rebounds: 0,
    assists: 0,
    turnovers: 0,
    fouls: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  } as Possession;
}

describe('MatchStore', () => {
  let store: MatchStore;

  beforeEach(() => {
    store = new MatchStore();
  });

  it('should initialize with empty state', () => {
    expect(store.match()).toBeNull();
    expect(store.possessions()).toEqual([]);
    expect(store.substitutions()).toEqual([]);
    expect(store.squad()).toEqual([]);
    expect(store.lineup()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  describe('score computed', () => {
    it('should sum own and rival points separately', () => {
      store.setPossessions([
        makePossession({ side: 'own', points: 2 }),
        makePossession({ side: 'own', points: 3 }),
        makePossession({ side: 'rival', points: 2 }),
      ]);
      expect(store.score()).toEqual({ own: 5, rival: 2 });
    });

    it('should return 0-0 for empty possessions', () => {
      expect(store.score()).toEqual({ own: 0, rival: 0 });
    });
  });

  describe('ppp computed', () => {
    it('should calculate points per own possession', () => {
      store.setPossessions([
        makePossession({ side: 'own', points: 2 }),
        makePossession({ side: 'own', points: 0 }),
        makePossession({ side: 'own', points: 3 }),
        makePossession({ side: 'rival', points: 2 }),
      ]);
      expect(store.ppp()).toBe(1.67);
    });

    it('should return 0 when no own possessions', () => {
      store.setPossessions([makePossession({ side: 'rival', points: 2 })]);
      expect(store.ppp()).toBe(0);
    });
  });

  describe('possessionCount computed', () => {
    it('should count own and rival possessions', () => {
      store.setPossessions([
        makePossession({ side: 'own' }),
        makePossession({ side: 'own' }),
        makePossession({ side: 'rival' }),
      ]);
      expect(store.possessionCount()).toEqual({ own: 2, rival: 1 });
    });
  });

  describe('ownPossessions / rivalPossessions', () => {
    it('should filter possessions by side', () => {
      const own = makePossession({ side: 'own' });
      const rival = makePossession({ side: 'rival' });
      store.setPossessions([own, rival]);
      expect(store.ownPossessions()).toEqual([own]);
      expect(store.rivalPossessions()).toEqual([rival]);
    });
  });

  describe('addPossession', () => {
    it('should append a possession', () => {
      const p1 = makePossession({ number: 1 });
      const p2 = makePossession({ number: 2 });
      store.addPossession(p1);
      store.addPossession(p2);
      expect(store.possessions().length).toBe(2);
      expect(store.possessions()[1].number).toBe(2);
    });
  });

  describe('updatePossession', () => {
    it('should update specific possession by id', () => {
      const p = makePossession({ id: 'p1', points: 0 });
      store.setPossessions([p]);
      store.updatePossession('p1', { points: 3 });
      expect(store.possessions()[0].points).toBe(3);
    });

    it('should not modify other possessions', () => {
      const p1 = makePossession({ id: 'p1', points: 0 });
      const p2 = makePossession({ id: 'p2', points: 0 });
      store.setPossessions([p1, p2]);
      store.updatePossession('p1', { points: 3 });
      expect(store.possessions()[1].points).toBe(0);
    });
  });

  describe('removePossession', () => {
    it('should mark possession as deleted', () => {
      const p = makePossession({ id: 'p1' });
      store.setPossessions([p]);
      store.removePossession('p1');
      expect((store.possessions()[0] as any).deleted).toBe(true);
    });
  });

  describe('undoLastPossession', () => {
    it('should remove the last possession', () => {
      store.setPossessions([
        makePossession({ number: 1 }),
        makePossession({ number: 2 }),
      ]);
      store.undoLastPossession();
      expect(store.possessions().length).toBe(1);
      expect(store.possessions()[0].number).toBe(1);
    });

    it('should handle empty list gracefully', () => {
      store.undoLastPossession();
      expect(store.possessions()).toEqual([]);
    });
  });

  describe('addSubstitution', () => {
    it('should add a substitution', () => {
      const sub: MatchSubstitution = {
        id: 's1',
        match_id: 'm1',
        player_out: 'p1',
        player_in: 'p2',
        period: 1,
        order_in_period: 1,
        created_at: new Date().toISOString(),
      };
      store.addSubstitution(sub);
      expect(store.substitutions().length).toBe(1);
      expect(store.substitutions()[0].player_out).toBe('p1');
    });
  });

  describe('addSquadMember', () => {
    it('should add a squad member', () => {
      const member: MatchSquad = {
        match_id: 'm1',
        player_id: 'p1',
        starter: true,
        created_at: new Date().toISOString(),
      };
      store.addSquadMember(member);
      expect(store.squad().length).toBe(1);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      store.setMatch({ id: 'm1' } as Match);
      store.setPossessions([makePossession()]);
      store.setLoading(true);
      store.setError('test error');

      store.reset();

      expect(store.match()).toBeNull();
      expect(store.possessions()).toEqual([]);
      expect(store.substitutions()).toEqual([]);
      expect(store.squad()).toEqual([]);
      expect(store.lineup()).toEqual([]);
      expect(store.loading()).toBe(false);
      expect(store.error()).toBeNull();
    });
  });

  describe('setMatch', () => {
    it('should set the current match', () => {
      const match = { id: 'm1', rival: 'FC Barcelona', score_own: 0, score_rival: 0 } as Match;
      store.setMatch(match);
      expect(store.match()?.rival).toBe('FC Barcelona');
    });
  });
});
