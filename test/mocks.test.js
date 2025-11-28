/**
 * Tests for Discord mock factories
 * Ensures the mocks work correctly for use in other tests
 */
import { describe, it, expect } from 'vitest';
import {
  createMockCollection,
  createMockRole,
  createMockChannel,
  createMockMember,
  createMockGuild,
  createMockInteraction,
  createMockSelectInteraction,
  createMockButtonInteraction,
  createMockModalInteraction,
  createMockAutocompleteInteraction,
} from './mocks/discord.js';

describe('mock factories', () => {
  describe('createMockCollection', () => {
    it('creates a Map-like collection', () => {
      const collection = createMockCollection([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      expect(collection.get('key1')).toBe('value1');
      expect(collection.has('key2')).toBe(true);
      expect(collection.has('key3')).toBe(false);
    });

    it('supports Discord.js collection methods', () => {
      const collection = createMockCollection([
        ['1', { id: '1', name: 'first' }],
        ['2', { id: '2', name: 'second' }],
      ]);

      const found = collection.find((item) => item.name === 'second');
      expect(found.id).toBe('2');

      const mapped = collection.map((item) => item.name);
      expect(mapped).toEqual(['first', 'second']);
    });
  });

  describe('createMockRole', () => {
    it('creates a role with default values', () => {
      const role = createMockRole();

      expect(role.id).toBeDefined();
      expect(role.name).toBe('Test Role');
      expect(role.delete).toBeInstanceOf(Function);
    });

    it('accepts overrides', () => {
      const role = createMockRole({
        id: 'custom-id',
        name: 'Custom Role',
      });

      expect(role.id).toBe('custom-id');
      expect(role.name).toBe('Custom Role');
    });
  });

  describe('createMockChannel', () => {
    it('creates a channel with default values', () => {
      const channel = createMockChannel();

      expect(channel.id).toBeDefined();
      expect(channel.name).toBe('test-channel');
      expect(channel.send).toBeInstanceOf(Function);
      expect(channel.delete).toBeInstanceOf(Function);
    });

    it('has working mock methods', async () => {
      const channel = createMockChannel();

      await expect(channel.send('test')).resolves.toBeDefined();
      await expect(channel.delete()).resolves.toBeUndefined();
    });
  });

  describe('createMockMember', () => {
    it('creates a member with roles', () => {
      const role = createMockRole({ id: 'role-1' });
      const member = createMockMember({
        username: 'testuser',
        roles: [role],
      });

      expect(member.user.username).toBe('testuser');
      expect(member.roles.cache.has('role-1')).toBe(true);
    });

    it('has working role methods', async () => {
      const member = createMockMember();

      await expect(member.roles.add('new-role')).resolves.toBeUndefined();
      await expect(member.roles.remove('old-role')).resolves.toBeUndefined();
    });
  });

  describe('createMockGuild', () => {
    it('creates a guild with collections', () => {
      const guild = createMockGuild();

      expect(guild.id).toBeDefined();
      expect(guild.roles.cache).toBeDefined();
      expect(guild.channels.cache).toBeDefined();
      expect(guild.members.cache).toBeDefined();
    });

    it('can create roles', async () => {
      const guild = createMockGuild();
      const role = await guild.roles.create({ name: 'New Role' });

      expect(role.name).toBe('New Role');
    });

    it('can create channels', async () => {
      const guild = createMockGuild();
      const channel = await guild.channels.create({ name: 'new-channel' });

      expect(channel.name).toBe('new-channel');
    });
  });

  describe('createMockInteraction', () => {
    it('creates an interaction with default values', () => {
      const interaction = createMockInteraction();

      expect(interaction.id).toBeDefined();
      expect(interaction.guild).toBeDefined();
      expect(interaction.member).toBeDefined();
      expect(interaction.deferReply).toBeInstanceOf(Function);
      expect(interaction.editReply).toBeInstanceOf(Function);
    });

    it('handles options', () => {
      const interaction = createMockInteraction({
        subcommand: 'test-subcommand',
        options: {
          course: 'course-123',
          team: 'team-456',
        },
      });

      expect(interaction.options.getSubcommand()).toBe('test-subcommand');
      expect(interaction.options.getString('course')).toBe('course-123');
      expect(interaction.options.getString('team')).toBe('team-456');
      expect(interaction.options.getString('nonexistent')).toBeNull();
    });

    it('can defer and edit replies', async () => {
      const interaction = createMockInteraction();

      await interaction.deferReply({ ephemeral: true });
      await interaction.editReply({ content: 'Updated' });

      expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
      expect(interaction.editReply).toHaveBeenCalledWith({
        content: 'Updated',
      });
    });
  });

  describe('createMockSelectInteraction', () => {
    it('creates a select menu interaction', () => {
      const interaction = createMockSelectInteraction({
        customId: 'join-course',
        values: ['course-1', 'course-2'],
      });

      expect(interaction.customId).toBe('join-course');
      expect(interaction.values).toEqual(['course-1', 'course-2']);
      expect(interaction.update).toBeInstanceOf(Function);
    });
  });

  describe('createMockButtonInteraction', () => {
    it('creates a button interaction', () => {
      const interaction = createMockButtonInteraction({
        customId: 'confirm-action',
      });

      expect(interaction.customId).toBe('confirm-action');
      expect(interaction.componentType).toBe(2);
      expect(interaction.update).toBeInstanceOf(Function);
    });
  });

  describe('createMockModalInteraction', () => {
    it('creates a modal submit interaction', () => {
      const interaction = createMockModalInteraction({
        customId: 'add-course-modal',
        fields: {
          'course-title': 'Test Course',
          'course-short': 'test',
        },
      });

      expect(interaction.customId).toBe('add-course-modal');
      expect(interaction.fields.getTextInputValue('course-title')).toBe(
        'Test Course'
      );
      expect(interaction.fields.getTextInputValue('course-short')).toBe('test');
    });
  });

  describe('createMockAutocompleteInteraction', () => {
    it('creates an autocomplete interaction', () => {
      const interaction = createMockAutocompleteInteraction({
        focused: 'test-query',
      });

      expect(interaction.options.getFocused()).toBe('test-query');
      expect(interaction.respond).toBeInstanceOf(Function);
    });

    it('can respond with choices', async () => {
      const interaction = createMockAutocompleteInteraction();

      await interaction.respond([
        { name: 'Choice 1', value: '1' },
        { name: 'Choice 2', value: '2' },
      ]);

      expect(interaction.respond).toHaveBeenCalledWith([
        { name: 'Choice 1', value: '1' },
        { name: 'Choice 2', value: '2' },
      ]);
    });
  });
});
