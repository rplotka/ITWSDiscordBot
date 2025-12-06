/**
 * Tests for /join command
 *
 * Note: Due to CommonJS/ESM module challenges with vitest mocking,
 * these tests focus on command structure and the database-unavailable path.
 * Full integration tests should be done with MSW (see integration tests).
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

// Import the command - database will be null in test env
// eslint-disable-next-line import/first
const joinCommand = await import('../../commands/join.js');

describe('/join command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('command structure', () => {
    it('has correct command name', () => {
      expect(joinCommand.data.name).toBe('join');
    });

    it('has correct description', () => {
      expect(joinCommand.data.description).toBe(
        'Join a course or a course team'
      );
    });

    it('has course subcommand', () => {
      const json = joinCommand.data.toJSON();
      const courseSubcommand = json.options.find(
        (opt) => opt.name === 'course'
      );
      expect(courseSubcommand).toBeDefined();
      expect(courseSubcommand.type).toBe(1); // SUB_COMMAND
      expect(courseSubcommand.description).toBe('Join a course');
    });

    it('has team subcommand', () => {
      const json = joinCommand.data.toJSON();
      const teamSubcommand = json.options.find((opt) => opt.name === 'team');
      expect(teamSubcommand).toBeDefined();
      expect(teamSubcommand.type).toBe(1); // SUB_COMMAND
      expect(teamSubcommand.description).toBe(
        'Join or switch to a course team'
      );
    });

    it('course subcommand has optional course option with autocomplete', () => {
      const json = joinCommand.data.toJSON();
      const courseSubcommand = json.options.find(
        (opt) => opt.name === 'course'
      );
      const courseOption = courseSubcommand.options.find(
        (opt) => opt.name === 'course'
      );
      expect(courseOption).toBeDefined();
      expect(courseOption.required).toBe(false);
      expect(courseOption.autocomplete).toBe(true);
    });

    it('team subcommand has team and from options', () => {
      const json = joinCommand.data.toJSON();
      const teamSubcommand = json.options.find((opt) => opt.name === 'team');
      const teamOption = teamSubcommand.options.find(
        (opt) => opt.name === 'team'
      );
      const fromOption = teamSubcommand.options.find(
        (opt) => opt.name === 'from'
      );

      expect(teamOption).toBeDefined();
      expect(teamOption.autocomplete).toBe(true);
      expect(fromOption).toBeDefined();
      expect(fromOption.description).toContain('switch');
    });

    it('exports execute function', () => {
      expect(typeof joinCommand.execute).toBe('function');
    });
  });

  describe('/join course - database unavailable', () => {
    it('defers reply with ephemeral flag', async () => {
      const interaction = createMockInteraction({
        subcommand: 'course',
        options: {},
      });

      await joinCommand.execute(interaction);

      expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    });

    it('shows database unavailable error', async () => {
      const interaction = createMockInteraction({
        subcommand: 'course',
        options: {},
      });

      await joinCommand.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Database is not available'),
      });
    });
  });

  describe('/join team - database unavailable', () => {
    it('defers reply with ephemeral flag', async () => {
      const interaction = createMockInteraction({
        subcommand: 'team',
        options: {},
      });

      await joinCommand.execute(interaction);

      expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    });

    it('shows database unavailable error', async () => {
      const interaction = createMockInteraction({
        subcommand: 'team',
        options: {},
      });

      await joinCommand.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith({
        content: expect.stringContaining('Database is not available'),
      });
    });
  });

  describe('interaction state handling', () => {
    it('does not defer if already deferred', async () => {
      const interaction = createMockInteraction({
        subcommand: 'course',
        options: {},
      });
      interaction.deferred = true;

      await joinCommand.execute(interaction);

      expect(interaction.deferReply).not.toHaveBeenCalled();
    });

    it('does not defer if already replied', async () => {
      const interaction = createMockInteraction({
        subcommand: 'course',
        options: {},
      });
      interaction.replied = true;

      await joinCommand.execute(interaction);

      expect(interaction.deferReply).not.toHaveBeenCalled();
    });
  });
});
