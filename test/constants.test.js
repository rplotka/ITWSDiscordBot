/**
 * Tests for constants and customIds helpers
 */
import { describe, it, expect } from 'vitest';
import { customIds } from '../core/constants.js';

describe('customIds', () => {
  describe('static IDs', () => {
    it('has correct course action IDs', () => {
      expect(customIds.course.add).toBe('add-course');
      expect(customIds.course.addModal).toBe('add-course-modal');
      expect(customIds.course.remove).toBe('remove-course');
      expect(customIds.course.join).toBe('join-course');
      expect(customIds.course.leave).toBe('leave-course');
      expect(customIds.course.clear).toBe('clear-course');
    });

    it('has correct team action IDs', () => {
      expect(customIds.team.join).toBe('join-team');
      expect(customIds.team.leave).toBe('leave-team');
    });

    it('has correct channel action IDs', () => {
      expect(customIds.channel.add).toBe('add-channel');
      expect(customIds.channel.addModal).toBe('add-channel-modal');
      expect(customIds.channel.remove).toBe('remove-channel');
      expect(customIds.channel.clear).toBe('clear-channel');
    });

    it('has correct sync action IDs', () => {
      expect(customIds.sync.server).toBe('sync-server');
      expect(customIds.sync.confirm).toBe('sync-server-confirm');
      expect(customIds.sync.cancel).toBe('sync-server-cancel');
    });
  });

  describe('dynamic ID generators', () => {
    it('generates correct course clear confirm IDs', () => {
      expect(customIds.course.clearConfirm('123')).toBe(
        'clear-course-confirm-123'
      );
      expect(customIds.course.clearConfirmWithTeams('456')).toBe(
        'clear-course-confirm-teams-456'
      );
    });

    it('generates correct team action IDs', () => {
      expect(customIds.team.add('course-1')).toBe('add-team-course-1');
      expect(customIds.team.addModal('course-2')).toBe(
        'add-team-modal-course-2'
      );
      expect(customIds.team.remove('course-3')).toBe('remove-team-course-3');
    });

    it('generates correct team switch ID', () => {
      expect(customIds.team.switch('course-1', 'team-a', 'team-b')).toBe(
        'switch-team-course-1-team-a-team-b'
      );
    });

    it('generates correct channel clear confirm ID', () => {
      expect(customIds.channel.clearConfirm('ch-123')).toBe(
        'clear-channel-confirm-ch-123'
      );
    });

    it('generates correct sync action IDs', () => {
      expect(customIds.sync.addToDb('role', 'r-1')).toBe(
        'sync-add-db-role-r-1'
      );
      expect(customIds.sync.removeFromDb('channel', 'c-2')).toBe(
        'sync-remove-db-channel-c-2'
      );
      expect(customIds.sync.createInDiscord('category', 'cat-3')).toBe(
        'sync-create-discord-category-cat-3'
      );
    });
  });

  describe('parse helper', () => {
    it('parses simple custom IDs', () => {
      const result = customIds.parse('join-course');
      expect(result).toEqual({
        action: 'join',
        entity: 'course',
        context: '',
      });
    });

    it('parses custom IDs with context', () => {
      const result = customIds.parse('add-team-modal-123');
      expect(result).toEqual({
        action: 'add',
        entity: 'team',
        context: 'modal-123',
      });
    });

    it('parses custom IDs with multiple context parts', () => {
      const result = customIds.parse('switch-team-course-1-team-a-team-b');
      expect(result).toEqual({
        action: 'switch',
        entity: 'team',
        context: 'course-1-team-a-team-b',
      });
    });

    it('handles single-part IDs', () => {
      const result = customIds.parse('test');
      expect(result).toEqual({
        action: 'test',
        entity: null,
        context: null,
      });
    });
  });

  describe('matches helper', () => {
    it('matches static string patterns', () => {
      expect(customIds.matches('join-course', 'join-course')).toBe(true);
      expect(customIds.matches('join-course', 'leave-course')).toBe(false);
    });

    it('matches dynamic function patterns', () => {
      // The matches function checks if the customId starts with the pattern base
      expect(
        customIds.matches('add-team-modal-123', customIds.team.addModal)
      ).toBe(true);
      expect(
        customIds.matches('add-team-modal-456', customIds.team.addModal)
      ).toBe(true);
      expect(customIds.matches('remove-team-789', customIds.team.remove)).toBe(
        true
      );
    });

    it('rejects non-matching dynamic patterns', () => {
      expect(customIds.matches('join-course', customIds.team.addModal)).toBe(
        false
      );
      expect(customIds.matches('add-course', customIds.team.remove)).toBe(
        false
      );
    });
  });
});
