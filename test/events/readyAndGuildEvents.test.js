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

    it('is not a once handler', () => {
      // This handler should run for every member join
      expect(guildMemberAdd.once).toBe(false);
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
      member.send.mockResolvedValue({});
      member.guild = guild;
      member.user = { bot: false, tag: 'newuser#0000', id: 'new-member' };

      // Execute the handler
      await guildMemberAdd.execute(member);

      // Should have sent welcome message with verification instructions
      expect(member.send).toHaveBeenCalledWith(
        expect.stringContaining('Welcome')
      );
      expect(member.send).toHaveBeenCalledWith(
        expect.stringContaining('/verify me')
      );
    });

    it('skips bots', async () => {
      const guild = createMockGuild({ id: 'test-guild' });
      const member = createMockMember({
        id: 'bot-member',
        username: 'botuser',
      });
      member.guild = guild;
      member.user = { bot: true, tag: 'botuser#0000', id: 'bot-member' };

      // Execute the handler
      await guildMemberAdd.execute(member);

      // Should not have sent any message
      expect(member.send).not.toHaveBeenCalled();
    });
  });
});
