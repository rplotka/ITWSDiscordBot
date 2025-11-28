/**
 * Command structure validation tests
 */
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load all command files
const commandsPath = path.join(__dirname, '../commands');
const commandFiles = readdirSync(commandsPath).filter((file) =>
  file.endsWith('.js')
);

describe('commands', () => {
  it('all command files export required structure', async () => {
    for (const file of commandFiles) {
      const command = await import(path.join(commandsPath, file));

      expect(
        command.data,
        `${file} should export 'data' property`
      ).toBeTruthy();
      expect(
        command.execute,
        `${file} should export 'execute' function`
      ).toBeTruthy();
      expect(
        typeof command.execute,
        `${file} execute should be a function`
      ).toBe('function');

      // Check SlashCommandBuilder structure
      expect(
        command.data.name,
        `${file} should have command name`
      ).toBeTruthy();
      expect(
        command.data.description,
        `${file} should have command description`
      ).toBeTruthy();
    }
  });

  it('commands have valid names', async () => {
    for (const file of commandFiles) {
      const command = await import(path.join(commandsPath, file));
      const name = command.data.name;

      // Discord command names must be lowercase and match pattern
      expect(
        name.toLowerCase(),
        `${file} command name should be lowercase`
      ).toBe(name);
      expect(
        /^[\w-]{1,32}$/.test(name),
        `${file} command name should match Discord naming rules`
      ).toBe(true);
    }
  });

  it('commands have non-empty descriptions', async () => {
    for (const file of commandFiles) {
      const command = await import(path.join(commandsPath, file));
      const description = command.data.description;

      expect(description, `${file} should have a description`).toBeTruthy();
      expect(
        description.length > 0,
        `${file} description should not be empty`
      ).toBe(true);
      expect(
        description.length <= 100,
        `${file} description should be 100 characters or less`
      ).toBe(true);
    }
  });

  it('moderator commands are marked correctly', async () => {
    const moderatorCommands = ['add', 'remove', 'clear', 'sync'];

    for (const file of commandFiles) {
      const command = await import(path.join(commandsPath, file));
      const name = command.data.name;

      if (moderatorCommands.includes(name)) {
        expect(
          command.isModeratorOnly,
          `${name} should be marked as moderator only`
        ).toBe(true);
      }
    }
  });
});
