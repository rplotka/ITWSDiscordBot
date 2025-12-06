/**
 * Tests for modal submit interaction event handlers
 * Structure and filtering tests (no database mocking)
 *
 * Note: Full integration tests with database are handled separately
 * in test/integration/ tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockModalInteraction } from '../mocks/discord.js';

// Import handler directly - will use real db which returns null without DATABASE_URL
import addCourseModal from '../../events/addCourseModalInteraction.js';

describe('addCourseModalInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('event metadata', () => {
    it('has correct event name', () => {
      expect(addCourseModal.name).toBe('interactionCreate');
    });

    it('is not a once handler', () => {
      expect(addCourseModal.once).toBe(false);
    });

    it('exports execute function', () => {
      expect(typeof addCourseModal.execute).toBe('function');
    });
  });

  describe('interaction filtering', () => {
    it('ignores non-modal interactions', async () => {
      const interaction = createMockModalInteraction({
        customId: 'add-course-modal',
      });
      interaction.isModalSubmit = () => false;

      await addCourseModal.execute(interaction);

      expect(interaction.deferReply).not.toHaveBeenCalled();
    });

    it('ignores modals with wrong customId', async () => {
      const interaction = createMockModalInteraction({
        customId: 'other-modal',
      });

      await addCourseModal.execute(interaction);

      expect(interaction.deferReply).not.toHaveBeenCalled();
    });

    it('processes valid add-course-modal interactions', async () => {
      const interaction = createMockModalInteraction({
        customId: 'add-course-modal',
        fields: {
          'add-course-number': 'ITWS-4500',
          'add-course-title': 'Web Science',
          'add-course-instructor': 'profsmith',
          'add-course-teams': '0',
        },
      });
      interaction.member = {
        permissions: {
          has: vi.fn().mockReturnValue(true), // Has admin
        },
      };

      await addCourseModal.execute(interaction);

      // deferReply should be called for valid modals
      expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    });
  });

  describe('permission checks', () => {
    it('rejects non-moderator users', async () => {
      const interaction = createMockModalInteraction({
        customId: 'add-course-modal',
        fields: {
          'add-course-number': 'ITWS-4500',
          'add-course-title': 'Web Science',
          'add-course-instructor': 'profsmith',
          'add-course-teams': '0',
        },
      });
      interaction.member = {
        permissions: {
          has: vi.fn().mockReturnValue(false), // No admin or manage guild
        },
      };

      await addCourseModal.execute(interaction);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('moderators'),
        })
      );
    });

    it('allows moderator users', async () => {
      const interaction = createMockModalInteraction({
        customId: 'add-course-modal',
        fields: {
          'add-course-number': 'ITWS-4500',
          'add-course-title': 'Web Science',
          'add-course-instructor': 'profsmith',
          'add-course-teams': '0',
        },
      });
      interaction.member = {
        permissions: {
          has: vi.fn().mockReturnValue(true), // Has admin
        },
      };

      await addCourseModal.execute(interaction);

      // Should defer reply first
      expect(interaction.deferReply).toHaveBeenCalled();
      // Should not reject with moderators message (permission check passes)
      const editReplyCall = interaction.editReply.mock.calls[0];
      if (editReplyCall) {
        expect(editReplyCall[0].content).not.toContain('moderators');
      }
    });
  });
});
