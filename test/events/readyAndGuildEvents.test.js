/**
 * Tests for ready and guild member events
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockClient,
  createMockMember,
  createMockGuild,
} from '../mocks/discord.js';

import ready from '../../events/ready.js';
import guildMemberAdd from '../../events/guildMemberAdd.js';

describe('ready event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('event metadata', () => {
    it('has correct event name', () => {
      expect(ready.name).toBe('ready');
    });

    it('is a once handler', () => {
      expect(ready.once).toBe(true);
    });

    it('exports execute function', () => {
      expect(typeof ready.execute).toBe('function');
    });
  });

  describe('execution', () => {
    it('logs when client is ready', async () => {
      const client = createMockClient();

      // Execute the ready handler
      await ready.execute(client);

      // Should complete without error
      // The handler just logs a message
    });
  });
});

describe('guildMemberAdd event', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('event metadata', () => {
    it('has correct event name', () => {
      expect(guildMemberAdd.name).toBe('guildMemberAdd');
    });

    it('is a once handler', () => {
      // This handler is marked as once: true
      expect(guildMemberAdd.once).toBe(true);
    });

    it('is disabled', () => {
      // This handler is currently disabled
      expect(guildMemberAdd.disabled).toBe(true);
    });

    it('exports execute function', () => {
      expect(typeof guildMemberAdd.execute).toBe('function');
    });
  });

  describe('execution', () => {
    it('sends welcome message to new member', async () => {
      const guild = createMockGuild({ id: 'test-guild' });
      const member = createMockMember({
        id: 'new-member',
        username: 'newuser',
      });
      // Mock the message.awaitMessageComponent to throw (timeout)
      member.send.mockResolvedValue({
        awaitMessageComponent: vi.fn().mockRejectedValue(new Error('Timeout')),
        reply: vi.fn().mockResolvedValue({}),
      });
      member.guild = guild;

      // Execute the handler
      await guildMemberAdd.execute(member);

      // Should have sent welcome message
      expect(member.send).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('Welcome'),
          components: expect.any(Array),
        })
      );
    });
  });
});
