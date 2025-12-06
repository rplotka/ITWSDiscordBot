/**
 * Comprehensive tests for /help command
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockInteraction } from '../mocks/discord.js';

// Mock the logger
vi.mock('../../core/logging', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Import the command after mocking
// eslint-disable-next-line import/first
const helpCommand = await import('../../commands/help.js');

describe('/help command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('command structure', () => {
    it('has correct command name', () => {
      expect(helpCommand.data.name).toBe('help');
    });

    it('has correct description', () => {
      expect(helpCommand.data.description).toContain('command');
    });

    it('exports execute function', () => {
      expect(typeof helpCommand.execute).toBe('function');
    });

    it('has optional command option', () => {
      const options = helpCommand.data.options;
      expect(options).toHaveLength(1);
      expect(options[0].name).toBe('command');
      expect(options[0].required).toBe(false);
    });

    it('has command choices for all documented commands', () => {
      const options = helpCommand.data.options;
      const commandOption = options[0];
      const choices = commandOption.choices;

      expect(choices).toContainEqual({ name: 'add', value: 'add' });
      expect(choices).toContainEqual({ name: 'clear', value: 'clear' });
      expect(choices).toContainEqual({ name: 'join', value: 'join' });
      expect(choices).toContainEqual({ name: 'leave', value: 'leave' });
      expect(choices).toContainEqual({ name: 'list', value: 'list' });
      expect(choices).toContainEqual({ name: 'remove', value: 'remove' });
      expect(choices).toContainEqual({ name: 'sync', value: 'sync' });
    });
  });

  describe('execute - command list', () => {
    it('defers reply with ephemeral flag', async () => {
      const interaction = createMockInteraction({});
      interaction.options = {
        getString: vi.fn().mockReturnValue(null),
      };
      interaction.client = { commands: new Map() };

      await helpCommand.execute(interaction);

      expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    });

    it('sends an embed with all command categories when no command specified', async () => {
      const interaction = createMockInteraction({});
      interaction.options = {
        getString: vi.fn().mockReturnValue(null),
      };
      interaction.client = { commands: new Map() };

      await helpCommand.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith({
        embeds: expect.any(Array),
      });

      const call = interaction.editReply.mock.calls[0][0];
      expect(call.embeds).toHaveLength(1);

      const embed = call.embeds[0];
      expect(embed.data.title).toBe('ITWS Discord Bot Commands');
    });

    it('categorizes commands by type', async () => {
      const interaction = createMockInteraction({});
      interaction.options = {
        getString: vi.fn().mockReturnValue(null),
      };
      interaction.client = { commands: new Map() };

      await helpCommand.execute(interaction);

      const call = interaction.editReply.mock.calls[0][0];
      const embed = call.embeds[0];
      const description = embed.data.description;

      expect(description).toContain('Moderator Commands');
      expect(description).toContain('User Commands');
      expect(description).toContain('Info');
    });

    it('lists all subcommands in categories', async () => {
      const interaction = createMockInteraction({});
      interaction.options = {
        getString: vi.fn().mockReturnValue(null),
      };
      interaction.client = { commands: new Map() };

      await helpCommand.execute(interaction);

      const call = interaction.editReply.mock.calls[0][0];
      const embed = call.embeds[0];
      const description = embed.data.description;

      // Moderator commands
      expect(description).toContain('/add course');
      expect(description).toContain('/add team');
      expect(description).toContain('/clear course');
      expect(description).toContain('/remove course');

      // User commands
      expect(description).toContain('/join course');
      expect(description).toContain('/leave course');
    });

    it('includes help command reference at the end', async () => {
      const interaction = createMockInteraction({});
      interaction.options = {
        getString: vi.fn().mockReturnValue(null),
      };
      interaction.client = { commands: new Map() };

      await helpCommand.execute(interaction);

      const call = interaction.editReply.mock.calls[0][0];
      const embed = call.embeds[0];
      const description = embed.data.description;

      expect(description).toContain('/help <command>');
    });
  });

  describe('execute - specific command help', () => {
    it('shows detailed help for /add command', async () => {
      const interaction = createMockInteraction({});
      interaction.options = {
        getString: vi.fn().mockReturnValue('add'),
      };
      interaction.client = { commands: new Map() };

      await helpCommand.execute(interaction);

      const call = interaction.editReply.mock.calls[0][0];
      const embed = call.embeds[0];

      expect(embed.data.title).toBe('/add');
      expect(embed.data.description).toContain('Create and manage');

      // Should have fields for each subcommand
      const fields = embed.data.fields;
      expect(fields.some((f) => f.name === '/add course')).toBe(true);
      expect(fields.some((f) => f.name === '/add team')).toBe(true);
      expect(fields.some((f) => f.name === '/add channel')).toBe(true);
      expect(fields.some((f) => f.name === '/add students')).toBe(true);
    });

    it('shows detailed help for /join command', async () => {
      const interaction = createMockInteraction({});
      interaction.options = {
        getString: vi.fn().mockReturnValue('join'),
      };
      interaction.client = { commands: new Map() };

      await helpCommand.execute(interaction);

      const call = interaction.editReply.mock.calls[0][0];
      const embed = call.embeds[0];

      expect(embed.data.title).toBe('/join');
      expect(embed.data.footer.text).toBe('Category: User');

      const fields = embed.data.fields;
      expect(fields.some((f) => f.name === '/join course')).toBe(true);
      expect(fields.some((f) => f.name === '/join team')).toBe(true);
    });

    it('includes usage examples in detailed help', async () => {
      const interaction = createMockInteraction({});
      interaction.options = {
        getString: vi.fn().mockReturnValue('clear'),
      };
      interaction.client = { commands: new Map() };

      await helpCommand.execute(interaction);

      const call = interaction.editReply.mock.calls[0][0];
      const embed = call.embeds[0];
      const fields = embed.data.fields;

      // Should have usage and examples
      const courseField = fields.find((f) => f.name === '/clear course');
      expect(courseField.value).toContain('Usage:');
      expect(courseField.value).toContain('Examples:');
      expect(courseField.value).toContain('/clear course');
    });

    it('returns error for unknown command', async () => {
      const interaction = createMockInteraction({});
      interaction.options = {
        getString: vi.fn().mockReturnValue('unknowncommand'),
      };
      interaction.client = { commands: new Map() };

      await helpCommand.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Unknown command'),
      });
    });
  });

  describe('error handling', () => {
    it('handles errors gracefully when deferred', async () => {
      const interaction = createMockInteraction({});
      interaction.options = {
        getString: vi.fn().mockImplementation(() => {
          throw new Error('Test error');
        }),
      };
      interaction.deferred = true;
      interaction.client = { commands: new Map() };

      await helpCommand.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Error'),
      });
    });

    it('handles errors gracefully when not deferred', async () => {
      const interaction = createMockInteraction({});
      interaction.options = {
        getString: vi.fn().mockImplementation(() => {
          throw new Error('Test error');
        }),
      };
      interaction.deferred = false;
      interaction.replied = false;
      interaction.client = { commands: new Map() };

      await helpCommand.execute(interaction);

      expect(interaction.reply).toHaveBeenCalledWith({
        content: expect.stringContaining('Error'),
        ephemeral: true,
      });
    });
  });
});
