import { NotificationService } from '../notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = new NotificationService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with empty notifications', () => {
    expect(service.notifications()).toEqual([]);
  });

  describe('show', () => {
    it('should add a notification', () => {
      service.show('Test message', 'success');
      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].message).toBe('Test message');
      expect(service.notifications()[0].type).toBe('success');
    });

    it('should default to error type', () => {
      service.show('Error occurred');
      expect(service.notifications()[0].type).toBe('error');
    });

    it('should auto-dismiss after duration', () => {
      service.show('Auto dismiss', 'info', 3000);
      expect(service.notifications().length).toBe(1);

      vi.advanceTimersByTime(3000);
      expect(service.notifications().length).toBe(0);
    });

    it('should not auto-dismiss when duration is 0', () => {
      service.show('Persistent', 'error', 0);
      vi.advanceTimersByTime(10_000);
      expect(service.notifications().length).toBe(1);
    });

    it('should assign unique incrementing ids', () => {
      service.show('First', 'info');
      service.show('Second', 'info');
      const ids = service.notifications().map(n => n.id);
      expect(ids[0]).toBeLessThan(ids[1]);
    });

    it('should support info type', () => {
      service.show('Info message', 'info');
      expect(service.notifications()[0].type).toBe('info');
    });
  });

  describe('dismiss', () => {
    it('should remove notification by id', () => {
      service.show('Message 1', 'error');
      service.show('Message 2', 'success');
      const idToRemove = service.notifications()[0].id;

      service.dismiss(idToRemove);
      expect(service.notifications().length).toBe(1);
      expect(service.notifications()[0].message).toBe('Message 2');
    });

    it('should be safe to dismiss non-existent id', () => {
      service.show('Message', 'info');
      service.dismiss(9999);
      expect(service.notifications().length).toBe(1);
    });

    it('should handle dismissing all notifications', () => {
      service.show('First', 'info');
      service.show('Second', 'info');
      const [id1, id2] = service.notifications().map(n => n.id);

      service.dismiss(id1);
      service.dismiss(id2);
      expect(service.notifications()).toEqual([]);
    });
  });
});
