/**
 * Unit tests for /leave command handlers
 *
 * Note: Due to the CommonJS/ESM mocking complexity, these tests focus on
 * the command structure and basic behavior verification. Full integration
 * testing should be done with a real test database or in a deployed environment.
 */
import { describe, it, expect } from 'vitest';

describe('/leave command', () => {
  describe('command definition', () => {
    it('has correct command structure', async () => {
      const { data } = await import('../../commands/leave.js');
      const json = data.toJSON();

      expect(json.name).toBe('leave');
      expect(json.description).toBe('Leave a course or a course team');
      expect(json.options).toHaveLength(2);

      // Check subcommands
      const courseSubcommand = json.options.find(
        (opt) => opt.name === 'course'
      );
      const teamSubcommand = json.options.find((opt) => opt.name === 'team');

      expect(courseSubcommand).toBeDefined();
      expect(courseSubcommand.description).toContain('Leave');
      expect(courseSubcommand.description).toContain('course');

      expect(teamSubcommand).toBeDefined();
      expect(teamSubcommand.description).toContain('Leave');
      expect(teamSubcommand.description).toContain('team');
    });

    it('course subcommand has correct options', async () => {
      const { data } = await import('../../commands/leave.js');
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
      const { data } = await import('../../commands/leave.js');
      const json = data.toJSON();

      const teamSubcommand = json.options.find((opt) => opt.name === 'team');
      expect(teamSubcommand.options).toHaveLength(1);

      const teamOption = teamSubcommand.options[0];
      expect(teamOption.name).toBe('team');
      expect(teamOption.required).toBe(false);
      expect(teamOption.autocomplete).toBe(true);
    });

    it('exports an execute function', async () => {
      const leaveCommand = await import('../../commands/leave.js');
      expect(typeof leaveCommand.execute).toBe('function');
    });
  });
});
