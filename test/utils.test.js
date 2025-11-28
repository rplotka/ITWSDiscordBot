/**
 * Unit tests for utility functions
 */
import { describe, it, expect } from 'vitest';
import {
  addCourseModalFactory,
  courseSelectorActionRowFactory,
  courseTeamSelectorActionRowFactory,
  generateSequentialTeamNames,
} from '../core/utils.js';

describe('addCourseModalFactory', () => {
  it('creates modal with correct structure', () => {
    const modal = addCourseModalFactory();
    const data = modal.toJSON();

    expect(data.custom_id).toBe('add-course-modal');
    expect(data.title).toBe('Add Course');
    expect(data.components).toHaveLength(4); // Four input fields: title, short, instructor, teams

    // Check first field (title)
    const titleField = data.components[0].components[0];
    expect(titleField.custom_id).toBe('add-course-title');
    expect(titleField.label).toBe("What's the FULL name of the course?");
    expect(titleField.required).toBe(true);

    // Check second field (short title)
    const shortTitleField = data.components[1].components[0];
    expect(shortTitleField.custom_id).toBe('add-course-short');
    expect(shortTitleField.label).toBe("What's the SHORT name of the course?");

    // Check third field (instructor)
    const instructorField = data.components[2].components[0];
    expect(instructorField.custom_id).toBe('add-course-instructor');
    expect(instructorField.label).toBe('Instructor username/nickname');

    // Check fourth field (teams)
    const teamsField = data.components[3].components[0];
    expect(teamsField.custom_id).toBe('add-course-teams');
    expect(teamsField.label).toBe('Number of teams (0 for none)');
  });

  it('supports prefill values', () => {
    const modal = addCourseModalFactory({
      name: 'Test Course',
      short: 'test',
      instructor: 'testuser',
      teams: 5,
    });
    const data = modal.toJSON();

    const titleField = data.components[0].components[0];
    expect(titleField.value).toBe('Test Course');

    const shortField = data.components[1].components[0];
    expect(shortField.value).toBe('test');

    const instructorField = data.components[2].components[0];
    expect(instructorField.value).toBe('testuser');

    const teamsField = data.components[3].components[0];
    expect(teamsField.value).toBe('5');
  });
});

describe('courseSelectorActionRowFactory', () => {
  it('creates selector with correct custom ID', () => {
    const mockCourses = [
      { id: 1, title: 'Test Course 1', instructors: ['instructor1'] },
      { id: 2, title: 'Test Course 2', instructors: ['instructor2'] },
    ];

    const row = courseSelectorActionRowFactory('join', mockCourses);
    const rowData = row.toJSON();
    const selectMenu = rowData.components[0];

    expect(selectMenu.custom_id).toBe('join-course');
    expect(selectMenu.options).toHaveLength(2);
    expect(selectMenu.options[0].label).toBe('Test Course 1');
    expect(selectMenu.options[0].value).toBe('1');
    expect(selectMenu.options[1].label).toBe('Test Course 2');
    expect(selectMenu.options[1].value).toBe('2');
  });

  it('handles empty courses array', () => {
    const row = courseSelectorActionRowFactory('leave', []);
    const rowData = row.toJSON();
    const selectMenu = rowData.components[0];

    expect(selectMenu.custom_id).toBe('leave-course');
    expect(selectMenu.options).toHaveLength(0);
  });

  it('supports all action types', () => {
    const mockCourses = [{ id: 1, title: 'Test', instructors: [] }];

    // Test each action type maps to correct custom ID
    const actions = {
      join: 'join-course',
      leave: 'leave-course',
      remove: 'remove-course',
      clear: 'clear-course',
      'add-teams': 'add-team-select',
      'remove-teams': 'remove-team-select',
      'add-students': 'add-students-course',
    };

    Object.entries(actions).forEach(([action, expectedId]) => {
      const row = courseSelectorActionRowFactory(action, mockCourses);
      const rowData = row.toJSON();
      expect(rowData.components[0].custom_id).toBe(expectedId);
    });
  });
});

describe('courseTeamSelectorActionRowFactory', () => {
  it('creates selector with correct structure', () => {
    const mockCourseTeams = [
      {
        id: 1,
        title: 'Team Alpha',
        Course: { title: 'Test Course 1' },
      },
      {
        id: 2,
        title: 'Team Beta',
        Course: { title: 'Test Course 2' },
      },
    ];

    const row = courseTeamSelectorActionRowFactory('join', mockCourseTeams);
    const rowData = row.toJSON();
    const selectMenu = rowData.components[0];

    expect(selectMenu.custom_id).toBe('join-team');
    expect(selectMenu.options).toHaveLength(2);
    expect(selectMenu.options[0].label).toBe('Team Alpha');
    expect(selectMenu.options[0].description).toBe('Test Course 1');
    expect(selectMenu.options[0].value).toBe('1');
  });

  it('handles leave action', () => {
    const mockCourseTeams = [
      {
        id: 1,
        title: 'Team Alpha',
        Course: { title: 'Test Course 1' },
      },
    ];

    const row = courseTeamSelectorActionRowFactory('leave', mockCourseTeams);
    const rowData = row.toJSON();
    const selectMenu = rowData.components[0];

    expect(selectMenu.custom_id).toBe('leave-team');
  });
});

describe('generateSequentialTeamNames', () => {
  it('generates correct team names with padding', () => {
    const names = generateSequentialTeamNames('ITWS', 3);

    expect(names).toEqual(['ITWS-Team-01', 'ITWS-Team-02', 'ITWS-Team-03']);
  });

  it('supports custom start number', () => {
    const names = generateSequentialTeamNames('CSCI', 2, 5);

    expect(names).toEqual(['CSCI-Team-05', 'CSCI-Team-06']);
  });

  it('handles single team', () => {
    const names = generateSequentialTeamNames('TEST', 1);
    expect(names).toEqual(['TEST-Team-01']);
  });

  it('handles zero teams', () => {
    const names = generateSequentialTeamNames('TEST', 0);
    expect(names).toEqual([]);
  });

  it('pads numbers correctly up to 99', () => {
    const names = generateSequentialTeamNames('X', 2, 99);
    expect(names).toEqual(['X-Team-99', 'X-Team-100']);
  });
});
