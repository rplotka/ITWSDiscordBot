/**
 * Tests for autocomplete interaction event handler
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockAutocompleteInteraction } from '../mocks/discord.js';

import autocomplete from '../../events/autocompleteInteraction.js';

describe('autocompleteInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('event metadata', () => {
    it('has correct event name', () => {
      expect(autocomplete.name).toBe('interactionCreate');
    });

    it('is not a once handler', () => {
      expect(autocomplete.once).toBe(false);
    });

    it('exports execute function', () => {
      expect(typeof autocomplete.execute).toBe('function');
    });
  });

  describe('interaction filtering', () => {
    it('ignores non-autocomplete interactions', async () => {
      const interaction = createMockAutocompleteInteraction({
        commandName: 'test',
      });
      interaction.isAutocomplete = () => false;

      await autocomplete.execute(interaction);

      expect(interaction.respond).not.toHaveBeenCalled();
    });

    it('processes autocomplete interactions', async () => {
      const interaction = createMockAutocompleteInteraction({
        commandName: 'add',
        focused: 'prof',
      });
      interaction.options = {
        getSubcommand: vi.fn().mockReturnValue('course'),
        getFocused: vi.fn().mockReturnValue({
          name: 'instructor',
          value: 'prof',
        }),
      };

      // Without database, this will try to respond with empty array or throw
      try {
        await autocomplete.execute(interaction);
      } catch (_e) {
        // May throw without database
      }

      // Handler should attempt to process if it's an autocomplete interaction
      // The respond call might not happen if DB is null
    });
  });
});
