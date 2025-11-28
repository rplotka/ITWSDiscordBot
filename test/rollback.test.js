/**
 * Tests for rollback utility
 */
import { describe, it, expect, vi } from 'vitest';
import { withRollback, RollbackTracker } from '../core/rollback.js';

describe('RollbackTracker', () => {
  it('tracks roles for rollback', () => {
    const tracker = new RollbackTracker();
    const mockRole = { id: '1', name: 'Test', delete: vi.fn() };

    tracker.addRole(mockRole);

    expect(tracker.roles).toHaveLength(1);
    expect(tracker.roles[0]).toBe(mockRole);
  });

  it('tracks channels for rollback', () => {
    const tracker = new RollbackTracker();
    const mockChannel = { id: '1', name: 'test', delete: vi.fn() };

    tracker.addChannel(mockChannel);

    expect(tracker.channels).toHaveLength(1);
    expect(tracker.channels[0]).toBe(mockChannel);
  });

  it('tracks category for rollback', () => {
    const tracker = new RollbackTracker();
    const mockCategory = { id: '1', name: 'category', delete: vi.fn() };

    tracker.setCategory(mockCategory);

    expect(tracker.category).toBe(mockCategory);
  });

  it('tracks db records for rollback', () => {
    const tracker = new RollbackTracker();
    const mockRecord = { id: 1, destroy: vi.fn() };

    tracker.addDbRecord(mockRecord);

    expect(tracker.dbRecords).toHaveLength(1);
    expect(tracker.dbRecords[0]).toBe(mockRecord);
  });

  it('rolls back in reverse order', async () => {
    const tracker = new RollbackTracker();
    const callOrder = [];

    const role1 = {
      name: 'Role1',
      delete: vi.fn().mockImplementation(async () => {
        callOrder.push('role1');
      }),
    };
    const role2 = {
      name: 'Role2',
      delete: vi.fn().mockImplementation(async () => {
        callOrder.push('role2');
      }),
    };
    const channel1 = {
      name: 'channel1',
      delete: vi.fn().mockImplementation(async () => {
        callOrder.push('channel1');
      }),
    };

    tracker.addRole(role1);
    tracker.addRole(role2);
    tracker.addChannel(channel1);

    await tracker.rollback('test');

    // Channels before roles, both in reverse order
    expect(callOrder).toEqual(['channel1', 'role2', 'role1']);
  });

  it('continues rollback even if one entity fails', async () => {
    const tracker = new RollbackTracker();

    const role1 = {
      name: 'Role1',
      delete: vi.fn().mockResolvedValue(undefined),
    };
    const role2 = {
      name: 'Role2',
      delete: vi.fn().mockRejectedValue(new Error('Delete failed')),
    };
    const role3 = {
      name: 'Role3',
      delete: vi.fn().mockResolvedValue(undefined),
    };

    tracker.addRole(role1);
    tracker.addRole(role2);
    tracker.addRole(role3);

    const errors = await tracker.rollback('test');

    // All three should have been attempted
    expect(role3.delete).toHaveBeenCalled();
    expect(role2.delete).toHaveBeenCalled();
    expect(role1.delete).toHaveBeenCalled();

    // Should return errors
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('Role2');
  });
});

describe('withRollback', () => {
  it('returns success with result on successful operation', async () => {
    const result = await withRollback(async (_tracker) => {
      return { created: true };
    });

    expect(result.success).toBe(true);
    expect(result.result).toEqual({ created: true });
  });

  it('provides tracker to operation function', async () => {
    let receivedTracker = null;

    await withRollback(async (tracker) => {
      receivedTracker = tracker;
      return 'done';
    });

    expect(receivedTracker).toBeInstanceOf(RollbackTracker);
  });

  it('returns error on failed operation', async () => {
    const result = await withRollback(async (_tracker) => {
      throw new Error('Something went wrong');
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Something went wrong');
  });

  it('automatically rolls back tracked entities on failure', async () => {
    const mockRole = {
      name: 'TestRole',
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const result = await withRollback(async (tracker) => {
      tracker.addRole(mockRole);
      throw new Error('Failed after creating role');
    });

    expect(result.success).toBe(false);
    expect(mockRole.delete).toHaveBeenCalled();
  });

  it('includes rollback errors if any occurred', async () => {
    const mockRole = {
      name: 'TestRole',
      delete: vi.fn().mockRejectedValue(new Error('Cannot delete')),
    };

    const result = await withRollback(async (tracker) => {
      tracker.addRole(mockRole);
      throw new Error('Failed');
    });

    expect(result.success).toBe(false);
    expect(result.rollbackErrors).toBeDefined();
    expect(result.rollbackErrors).toHaveLength(1);
  });

  it('does not include rollbackErrors when rollback succeeds', async () => {
    const mockRole = {
      name: 'TestRole',
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const result = await withRollback(async (tracker) => {
      tracker.addRole(mockRole);
      throw new Error('Failed');
    });

    expect(result.success).toBe(false);
    expect(result.rollbackErrors).toBeUndefined();
  });

  it('can be used with async/await pattern', async () => {
    const result = await withRollback(async (tracker) => {
      // Simulate creating resources
      const mockRole = { id: '1', name: 'Created', delete: vi.fn() };
      tracker.addRole(mockRole);

      // Simulate async operation
      await new Promise((resolve) => setTimeout(resolve, 10));

      return { roleId: mockRole.id };
    });

    expect(result.success).toBe(true);
    expect(result.result.roleId).toBe('1');
  });
});
