/**
 * Unit tests for /join command handlers
 *
 * Note: Due to the CommonJS/ESM mocking complexity, these tests focus on
 * the command structure and basic behavior verification. Full integration
 * testing should be done with a real test database or in a deployed environment.
 */
import { describe, it, expect } from 'vitest';

describe('/join command', () => {
  describe('command definition', () => {
    it('has correct command structure', async () => {
      const { data } = await import('../../commands/join.js');
      const json = data.toJSON();

      expect(json.name).toBe('join');
      expect(json.description).toBe('Join a course or a course team');
      expect(json.options).toHaveLength(2);

      // Check subcommands
      const courseSubcommand = json.options.find(
        (opt) => opt.name === 'course'
      );
      const teamSubcommand = json.options.find((opt) => opt.name === 'team');

      expect(courseSubcommand).toBeDefined();
      expect(courseSubcommand.description).toBe('Join a course');

      expect(teamSubcommand).toBeDefined();
      expect(teamSubcommand.description).toBe(
        'Join or switch to a course team'
      );
    });

    it('course subcommand has correct options', async () => {
      const { data } = await import('../../commands/join.js');
      const json = data.toJSON();

      const courseSubcommand = json.options.find(
        (opt) => opt.name === 'course'
      );
      expect(courseSubcommand.options).toHaveLength(1);

      const courseOption = courseSubcommand.options[0];
      expect(courseOption.name).toBe('course');
      expect(courseOption.required).toBe(false);
      expect(courseOption.autocomplete).toBe(true);
    });

    it('team subcommand has correct options', async () => {
      const { data } = await import('../../commands/join.js');
      const json = data.toJSON();

      const teamSubcommand = json.options.find((opt) => opt.name === 'team');
      expect(teamSubcommand.options).toHaveLength(2);

      const teamOption = teamSubcommand.options.find(
        (opt) => opt.name === 'team'
      );
      const fromOption = teamSubcommand.options.find(
        (opt) => opt.name === 'from'
      );

      expect(teamOption).toBeDefined();
      expect(teamOption.required).toBe(false);
      expect(teamOption.autocomplete).toBe(true);

      expect(fromOption).toBeDefined();
      expect(fromOption.description).toContain('switch');
    });

    it('exports an execute function', async () => {
      const joinCommand = await import('../../commands/join.js');
      expect(typeof joinCommand.execute).toBe('function');
    });
  });
});
