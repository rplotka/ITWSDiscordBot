/**
 * Integration tests using MSW to mock Discord API
 * These tests verify our handlers work correctly with API-level mocking
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers, mockStore, setupTestGuild } from '../msw/handlers.js';

// Create MSW server with handlers
const server = setupServer(...handlers);

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));

// Reset handlers and mock store after each test
afterEach(() => {
  server.resetHandlers();
  mockStore.reset();
});

// Clean up after all tests
afterAll(() => server.close());

describe('MSW Discord API Integration', () => {
  describe('mockStore', () => {
    it('stores and retrieves guilds', () => {
      const guild = { id: 'guild-1', name: 'Test Guild' };
      mockStore.addGuild(guild);

      expect(mockStore.guilds.get('guild-1')).toEqual(guild);
    });

    it('stores and retrieves channels', () => {
      const channel = { id: 'channel-1', name: 'general', guild_id: 'guild-1' };
      mockStore.addChannel(channel);

      expect(mockStore.channels.get('channel-1')).toEqual(channel);
    });

    it('stores and retrieves roles per guild', () => {
      const role = { id: 'role-1', name: 'Admin' };
      mockStore.addRole('guild-1', role);

      expect(mockStore.roles.get('guild-1').get('role-1')).toEqual(role);
    });

    it('stores and retrieves members per guild', () => {
      const member = { user: { id: 'user-1' }, roles: [] };
      mockStore.addMember('guild-1', member);

      expect(mockStore.members.get('guild-1').get('user-1')).toEqual(member);
    });

    it('resets all stores', () => {
      mockStore.addGuild({ id: 'guild-1' });
      mockStore.addChannel({ id: 'channel-1' });
      mockStore.addRole('guild-1', { id: 'role-1' });
      mockStore.addMember('guild-1', { user: { id: 'user-1' }, roles: [] });

      mockStore.reset();

      expect(mockStore.guilds.size).toBe(0);
      expect(mockStore.channels.size).toBe(0);
      expect(mockStore.roles.size).toBe(0);
      expect(mockStore.members.size).toBe(0);
    });
  });

  describe('setupTestGuild helper', () => {
    it('creates guild with default values', () => {
      const result = setupTestGuild();

      expect(result.guildId).toBe('test-guild');
      expect(result.guild.name).toBe('Test Guild');
      expect(mockStore.guilds.has('test-guild')).toBe(true);
    });

    it('creates guild with custom values', () => {
      const result = setupTestGuild({
        guildId: 'custom-guild',
        name: 'My Server',
      });

      expect(result.guildId).toBe('custom-guild');
      expect(result.guild.name).toBe('My Server');
    });

    it('adds @everyone role by default', () => {
      setupTestGuild({ guildId: 'guild-1' });

      const guildRoles = mockStore.roles.get('guild-1');
      expect(guildRoles.has('guild-1')).toBe(true); // @everyone has same ID as guild
    });

    it('adds custom roles', () => {
      setupTestGuild({
        guildId: 'guild-1',
        roles: [
          { id: 'admin-role', name: 'Admin' },
          { id: 'mod-role', name: 'Moderator' },
        ],
      });

      const guildRoles = mockStore.roles.get('guild-1');
      expect(guildRoles.has('admin-role')).toBe(true);
      expect(guildRoles.has('mod-role')).toBe(true);
    });

    it('adds channels to guild', () => {
      setupTestGuild({
        guildId: 'guild-1',
        channels: [
          { id: 'channel-1', name: 'general', type: 0 },
          { id: 'channel-2', name: 'voice', type: 2 },
        ],
      });

      expect(mockStore.channels.has('channel-1')).toBe(true);
      expect(mockStore.channels.has('channel-2')).toBe(true);
      expect(mockStore.channels.get('channel-1').guild_id).toBe('guild-1');
    });

    it('adds members to guild', () => {
      setupTestGuild({
        guildId: 'guild-1',
        members: [
          { user: { id: 'user-1', username: 'alice' }, roles: [] },
          { user: { id: 'user-2', username: 'bob' }, roles: ['role-1'] },
        ],
      });

      const guildMembers = mockStore.members.get('guild-1');
      expect(guildMembers.has('user-1')).toBe(true);
      expect(guildMembers.has('user-2')).toBe(true);
    });
  });

  describe('API endpoint handlers', () => {
    it('responds to GET /users/@me', async () => {
      const response = await fetch('https://discord.com/api/v10/users/@me');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.username).toBe('TestBot');
      expect(data.bot).toBe(true);
    });

    it('responds to GET /gateway', async () => {
      const response = await fetch('https://discord.com/api/v10/gateway');
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toBe('wss://gateway.discord.gg');
    });

    it('returns 404 for unknown guild', async () => {
      const response = await fetch(
        'https://discord.com/api/v10/guilds/unknown-guild'
      );

      expect(response.status).toBe(404);
    });

    it('returns guild when it exists', async () => {
      setupTestGuild({ guildId: 'my-guild', name: 'My Guild' });

      const response = await fetch(
        'https://discord.com/api/v10/guilds/my-guild'
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe('my-guild');
      expect(data.name).toBe('My Guild');
    });

    it('creates a role via POST', async () => {
      setupTestGuild({ guildId: 'guild-1' });

      const response = await fetch(
        'https://discord.com/api/v10/guilds/guild-1/roles',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'New Role', color: 0xff0000 }),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('New Role');
      expect(data.color).toBe(0xff0000);
    });

    it('creates a channel via POST', async () => {
      setupTestGuild({ guildId: 'guild-1' });

      const response = await fetch(
        'https://discord.com/api/v10/guilds/guild-1/channels',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'new-channel', type: 0 }),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('new-channel');
      expect(data.type).toBe(0);
      expect(data.guild_id).toBe('guild-1');
    });

    it('adds role to member via PUT', async () => {
      setupTestGuild({
        guildId: 'guild-1',
        roles: [{ id: 'role-1', name: 'Test Role' }],
        members: [{ user: { id: 'user-1' }, roles: [] }],
      });

      const response = await fetch(
        'https://discord.com/api/v10/guilds/guild-1/members/user-1/roles/role-1',
        { method: 'PUT' }
      );

      expect(response.status).toBe(204);

      // Verify the role was added
      const member = mockStore.members.get('guild-1').get('user-1');
      expect(member.roles).toContain('role-1');
    });

    it('removes role from member via DELETE', async () => {
      setupTestGuild({
        guildId: 'guild-1',
        members: [{ user: { id: 'user-1' }, roles: ['role-1', 'role-2'] }],
      });

      const response = await fetch(
        'https://discord.com/api/v10/guilds/guild-1/members/user-1/roles/role-1',
        { method: 'DELETE' }
      );

      expect(response.status).toBe(204);

      // Verify the role was removed
      const member = mockStore.members.get('guild-1').get('user-1');
      expect(member.roles).not.toContain('role-1');
      expect(member.roles).toContain('role-2');
    });
  });
});
