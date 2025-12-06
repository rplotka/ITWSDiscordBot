/**
 * Tests for select menu interaction event handlers
 * Structure and filtering tests (no database mocking)
 *
 * Note: Full integration tests with database are handled separately
 * in test/integration/ tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSelectInteraction } from '../mocks/discord.js';

// Import handlers directly - they will use real db which returns null without DATABASE_URL
// We only test filtering behavior here, not database operations
import joinCourseSelect from '../../events/joinCourseSelectInteraction.js';
import leaveCourseSelect from '../../events/leaveCourseSelectInteraction.js';

describe('joinCourseSelectInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('event metadata', () => {
    it('has correct event name', () => {
      expect(joinCourseSelect.name).toBe('interactionCreate');
    });

    it('is not a once handler', () => {
      expect(joinCourseSelect.once).toBe(false);
    });

    it('exports execute function', () => {
      expect(typeof joinCourseSelect.execute).toBe('function');
    });
  });

  describe('interaction filtering', () => {
    it('ignores non-select-menu interactions', async () => {
      const interaction = createMockSelectInteraction({
        customId: 'join-course',
        values: ['1'],
      });
      interaction.isStringSelectMenu = () => false;

      await joinCourseSelect.execute(interaction);

      expect(interaction.deferUpdate).not.toHaveBeenCalled();
    });

    it('ignores interactions with wrong customId', async () => {
      const interaction = createMockSelectInteraction({
        customId: 'other-select',
        values: ['1'],
      });

      await joinCourseSelect.execute(interaction);

      expect(interaction.deferUpdate).not.toHaveBeenCalled();
    });

    it('ignores interactions with no values', async () => {
      const interaction = createMockSelectInteraction({
        customId: 'join-course',
        values: [],
      });

      await joinCourseSelect.execute(interaction);

      expect(interaction.deferUpdate).not.toHaveBeenCalled();
    });

    it('attempts to process valid join-course interactions', async () => {
      const interaction = createMockSelectInteraction({
        customId: 'join-course',
        values: ['1'],
      });

      // Without DATABASE_URL, Course is null and will throw
      // We're just verifying the handler tries to process it (defers update first)
      try {
        await joinCourseSelect.execute(interaction);
      } catch (_e) {
        // Expected - Course is null
      }

      // deferUpdate should have been called before the DB operation
      expect(interaction.deferUpdate).toHaveBeenCalledWith({ ephemeral: true });
    });
  });
});

describe('leaveCourseSelectInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('event metadata', () => {
    it('has correct event name', () => {
      expect(leaveCourseSelect.name).toBe('interactionCreate');
    });

    it('is not a once handler', () => {
      expect(leaveCourseSelect.once).toBe(false);
    });

    it('exports execute function', () => {
      expect(typeof leaveCourseSelect.execute).toBe('function');
    });
  });

  describe('interaction filtering', () => {
    it('ignores non-select-menu interactions', async () => {
      const interaction = createMockSelectInteraction({
        customId: 'leave-course',
        values: ['1'],
      });
      interaction.isStringSelectMenu = () => false;

      await leaveCourseSelect.execute(interaction);

      expect(interaction.deferUpdate).not.toHaveBeenCalled();
    });

    it('ignores interactions with wrong customId', async () => {
      const interaction = createMockSelectInteraction({
        customId: 'join-course', // wrong ID
        values: ['1'],
      });

      await leaveCourseSelect.execute(interaction);

      expect(interaction.deferUpdate).not.toHaveBeenCalled();
    });

    it('ignores interactions with no values', async () => {
      const interaction = createMockSelectInteraction({
        customId: 'leave-course',
        values: [],
      });

      await leaveCourseSelect.execute(interaction);

      expect(interaction.deferUpdate).not.toHaveBeenCalled();
    });

    it('attempts to process valid leave-course interactions', async () => {
      const interaction = createMockSelectInteraction({
        customId: 'leave-course',
        values: ['1'],
      });

      // Without DATABASE_URL, Course is null and will throw
      try {
        await leaveCourseSelect.execute(interaction);
      } catch (_e) {
        // Expected - Course is null
      }

      // deferUpdate should be called before any DB operations
      expect(interaction.deferUpdate).toHaveBeenCalledWith({ ephemeral: true });
    });
  });
});
