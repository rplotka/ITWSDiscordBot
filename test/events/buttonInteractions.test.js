/**
 * Tests for button interaction event handlers
 * - clearCourseButtonInteraction
 * - roleButtonInteraction
 * - syncButtonInteraction
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockButtonInteraction } from '../mocks/discord.js';

// Import handlers directly
import clearCourseButton from '../../events/clearCourseButtonInteraction.js';
import roleButton from '../../events/roleButtonInteraction.js';
import syncButton from '../../events/syncButtonInteraction.js';

describe('clearCourseButtonInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('event metadata', () => {
    it('has correct event name', () => {
      expect(clearCourseButton.name).toBe('interactionCreate');
    });

    it('is not a once handler', () => {
      expect(clearCourseButton.once).toBe(false);
    });

    it('exports execute function', () => {
      expect(typeof clearCourseButton.execute).toBe('function');
    });
  });

  describe('interaction filtering', () => {
    it('ignores non-button interactions', async () => {
      const interaction = createMockButtonInteraction({
        customId: 'clear-course-123',
      });
      interaction.isButton = () => false;

      await clearCourseButton.execute(interaction);

      expect(interaction.deferUpdate).not.toHaveBeenCalled();
    });

    it('ignores buttons with wrong customId prefix', async () => {
      const interaction = createMockButtonInteraction({
        customId: 'other-button',
      });

      await clearCourseButton.execute(interaction);

      expect(interaction.deferUpdate).not.toHaveBeenCalled();
    });
  });
});

describe('roleButtonInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('event metadata', () => {
    it('has correct event name', () => {
      expect(roleButton.name).toBe('interactionCreate');
    });

    it('is not a once handler', () => {
      expect(roleButton.once).toBe(false);
    });

    it('exports execute function', () => {
      expect(typeof roleButton.execute).toBe('function');
    });
  });

  describe('interaction filtering', () => {
    it('ignores non-button interactions', async () => {
      const interaction = createMockButtonInteraction({
        customId: 'role-button-123',
      });
      interaction.isButton = () => false;

      await roleButton.execute(interaction);

      expect(interaction.deferReply).not.toHaveBeenCalled();
    });

    it('ignores buttons with wrong customId prefix', async () => {
      const interaction = createMockButtonInteraction({
        customId: 'other-button',
      });

      await roleButton.execute(interaction);

      expect(interaction.deferReply).not.toHaveBeenCalled();
    });
  });
});

describe('syncButtonInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('event metadata', () => {
    it('has correct event name', () => {
      expect(syncButton.name).toBe('interactionCreate');
    });

    it('is not a once handler', () => {
      expect(syncButton.once).toBe(false);
    });

    it('exports execute function', () => {
      expect(typeof syncButton.execute).toBe('function');
    });
  });

  describe('interaction filtering', () => {
    it('ignores non-button interactions', async () => {
      const interaction = createMockButtonInteraction({
        customId: 'sync-confirm',
      });
      interaction.isButton = () => false;

      await syncButton.execute(interaction);

      expect(interaction.deferUpdate).not.toHaveBeenCalled();
    });

    it('ignores buttons with wrong customId', async () => {
      const interaction = createMockButtonInteraction({
        customId: 'other-button',
      });

      await syncButton.execute(interaction);

      expect(interaction.deferUpdate).not.toHaveBeenCalled();
    });
  });
});
