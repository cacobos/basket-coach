import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { FeePlan, PlayerFee } from '../../../../core/models/models';

const mockFeePlanRepo = {
  findAll: vi.fn().mockResolvedValue([]),
  findById: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue({ id: 'fp1', name: 'Mensual', amount: 50 } as FeePlan),
  update: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
};

const mockPlayerFeeRepo = {
  findAll: vi.fn().mockResolvedValue([]),
  findById: vi.fn().mockResolvedValue(null),
  findByPlayer: vi.fn().mockResolvedValue([]),
  findOverdue: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  updateStatus: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
};

const mockPaymentRepo = {
  findAll: vi.fn().mockResolvedValue([]),
  findById: vi.fn().mockResolvedValue(null),
  findByPlayerFee: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@angular/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@angular/core')>();
  return {
    ...actual,
    inject: (token: any) => {
      if (token?.name === 'FeePlanRepository') return mockFeePlanRepo;
      if (token?.name === 'PlayerFeeRepository') return mockPlayerFeeRepo;
      if (token?.name === 'PaymentRepository') return mockPaymentRepo;
      return actual.inject(token);
    },
  };
});

const { FinanceStore } = await import('../finance.store');

describe('FinanceStore', () => {
  let store: InstanceType<typeof FinanceStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = new FinanceStore();
  });

  it('should initialize with empty state', () => {
    expect(store.feePlans()).toEqual([]);
    expect(store.playerFees()).toEqual([]);
    expect(store.payments()).toEqual([]);
    expect(store.overdueFees()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  describe('totalPending computed', () => {
    it('should sum pending fees', () => {
      store.playerFees.set([
        { id: '1', amount: 50, status: 'pending' } as PlayerFee,
        { id: '2', amount: 30, status: 'pending' } as PlayerFee,
        { id: '3', amount: 20, status: 'paid' } as PlayerFee,
      ]);
      expect(store.totalPending()).toBe(80);
    });

    it('should return 0 when no pending fees', () => {
      expect(store.totalPending()).toBe(0);
    });

    it('should handle mixed statuses', () => {
      store.playerFees.set([
        { id: '1', amount: 100, status: 'pending' } as PlayerFee,
        { id: '2', amount: 50, status: 'overdue' } as PlayerFee,
        { id: '3', amount: 30, status: 'paid' } as PlayerFee,
        { id: '4', amount: 20, status: 'cancelled' } as PlayerFee,
      ]);
      expect(store.totalPending()).toBe(100);
    });
  });

  describe('totalOverdue computed', () => {
    it('should sum overdue fees', () => {
      store.overdueFees.set([
        { id: '1', amount: 50 } as any,
        { id: '2', amount: 30 } as any,
      ]);
      expect(store.totalOverdue()).toBe(80);
    });
  });

  describe('loadFeePlans', () => {
    it('should load fee plans and set loading state', async () => {
      const plans = [{ id: 'fp1', name: 'Mensual', amount: 50 }] as FeePlan[];
      mockFeePlanRepo.findAll.mockResolvedValueOnce(plans);

      await store.loadFeePlans('club-1');

      expect(mockFeePlanRepo.findAll).toHaveBeenCalledWith('club-1');
      expect(store.feePlans()).toEqual(plans);
      expect(store.loading()).toBe(false);
    });

    it('should set loading to false even on error', async () => {
      mockFeePlanRepo.findAll.mockRejectedValueOnce(new Error('DB error'));

      try {
        await store.loadFeePlans('club-1');
      } catch {
        // expected
      }
      expect(store.loading()).toBe(false);
    });
  });

  describe('loadOverdueFees', () => {
    it('should load overdue fees', async () => {
      const overdue = [{ id: 'of1', amount: 50, team_name: 'Senior A' }];
      mockPlayerFeeRepo.findOverdue.mockResolvedValueOnce(overdue);

      await store.loadOverdueFees('club-1');

      expect(mockPlayerFeeRepo.findOverdue).toHaveBeenCalledWith('club-1');
      expect(store.overdueFees()).toEqual(overdue);
    });
  });

  describe('loadPlayerFees', () => {
    it('should load fees for a player', async () => {
      const fees = [{ id: 'pf1', player_id: 'p1', amount: 50, status: 'pending' }];
      mockPlayerFeeRepo.findByPlayer.mockResolvedValueOnce(fees);

      await store.loadPlayerFees('p1');

      expect(mockPlayerFeeRepo.findByPlayer).toHaveBeenCalledWith('p1');
      expect(store.playerFees()).toEqual(fees);
    });
  });

  describe('loadPayments', () => {
    it('should load payments for a player fee', async () => {
      const payments = [{ id: 'pay1', amount: 50, method: 'cash' }];
      mockPaymentRepo.findByPlayerFee.mockResolvedValueOnce(payments);

      await store.loadPayments('pf1');

      expect(mockPaymentRepo.findByPlayerFee).toHaveBeenCalledWith('pf1');
      expect(store.payments()).toEqual(payments);
    });
  });

  describe('createFeePlan', () => {
    it('should create and append fee plan', async () => {
      const result = await store.createFeePlan({ name: 'Mensual', amount: 50 });

      expect(mockFeePlanRepo.create).toHaveBeenCalled();
      expect(result.name).toBe('Mensual');
      expect(store.feePlans().length).toBe(1);
    });
  });

  describe('deleteFeePlan', () => {
    it('should remove fee plan from list', async () => {
      store.feePlans.set([
        { id: 'fp1', name: 'Plan 1' } as FeePlan,
        { id: 'fp2', name: 'Plan 2' } as FeePlan,
      ]);

      await store.deleteFeePlan('fp1');

      expect(mockFeePlanRepo.remove).toHaveBeenCalledWith('fp1');
      expect(store.feePlans().length).toBe(1);
      expect(store.feePlans()[0].id).toBe('fp2');
    });
  });

  describe('markAsPaid', () => {
    it('should create payment and update fee status', async () => {
      store.playerFees.set([
        { id: 'pf1', amount: 50, status: 'pending' } as PlayerFee,
      ]);

      await store.markAsPaid('pf1', 50, 'cash', 'admin-1');

      expect(mockPaymentRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          player_fee_id: 'pf1',
          amount: 50,
          method: 'cash',
          registered_by: 'admin-1',
        })
      );
      expect(mockPlayerFeeRepo.updateStatus).toHaveBeenCalledWith('pf1', 'paid');
      expect(store.playerFees()[0].status).toBe('paid');
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      store.feePlans.set([{ id: 'fp1' } as FeePlan]);
      store.playerFees.set([{ id: 'pf1' } as PlayerFee]);
      store.payments.set([{ id: 'pay1' } as any]);
      store.overdueFees.set([{ id: 'of1' } as any]);

      store.reset();

      expect(store.feePlans()).toEqual([]);
      expect(store.playerFees()).toEqual([]);
      expect(store.payments()).toEqual([]);
      expect(store.overdueFees()).toEqual([]);
    });
  });
});
