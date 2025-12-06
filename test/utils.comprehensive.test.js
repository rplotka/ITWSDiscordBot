/**
 * Comprehensive unit tests for utility functions in core/utils.js
 * Tests all exported functions with various scenarios
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockMember,
  createMockRole,
  createMockChannel,
  createMockCategory,
  createTestScenario,
} from './mocks/discord.js';
import { createMockCourse } from './mocks/db.js';

// Mock the database module
vi.mock('../core/db', () => ({
  Course: null,
  CourseTeam: null,
  sequelize: null,
}));

// Import utils after mocking
import {
  generateSequentialTeamNames,
  addCourseModalFactory,
  addTeamsModalFactory,
  courseSelectorActionRowFactory,
  courseTeamSelectorActionRowFactory,
  removeTeamsSelectorActionRowFactory,
  channelSelectorActionRowFactory,
  findCourseGeneralChannel,
  toggleMemberRole,
} from '../core/utils.js';

describe('generateSequentialTeamNames', () => {
  it('generates correct team names with default start', () => {
    const names = generateSequentialTeamNames('ITWS', 3);
    expect(names).toEqual(['ITWS-Team-01', 'ITWS-Team-02', 'ITWS-Team-03']);
  });

  it('generates correct team names with custom start', () => {
    const names = generateSequentialTeamNames('CSCI', 3, 5);
    expect(names).toEqual(['CSCI-Team-05', 'CSCI-Team-06', 'CSCI-Team-07']);
  });

  it('handles zero teams', () => {
    const names = generateSequentialTeamNames('TEST', 0);
    expect(names).toEqual([]);
  });

  it('handles single team', () => {
    const names = generateSequentialTeamNames('WEB', 1);
    expect(names).toEqual(['WEB-Team-01']);
  });

  it('pads single digit numbers correctly', () => {
    const names = generateSequentialTeamNames('X', 9);
    expect(names[0]).toBe('X-Team-01');
    expect(names[8]).toBe('X-Team-09');
  });

  it('handles double digit numbers', () => {
    const names = generateSequentialTeamNames('X', 2, 10);
    expect(names).toEqual(['X-Team-10', 'X-Team-11']);
  });

  it('handles large team counts starting from custom number', () => {
    const names = generateSequentialTeamNames('BIG', 5, 97);
    expect(names).toEqual([
      'BIG-Team-97',
      'BIG-Team-98',
      'BIG-Team-99',
      'BIG-Team-100',
      'BIG-Team-101',
    ]);
  });

  it('handles special characters in course short title', () => {
    const names = generateSequentialTeamNames('WEB-SCI', 2);
    expect(names).toEqual(['WEB-SCI-Team-01', 'WEB-SCI-Team-02']);
  });
});

describe('addCourseModalFactory', () => {
  it('creates modal with correct structure', () => {
    const modal = addCourseModalFactory();
    const data = modal.toJSON();

    expect(data.custom_id).toBe('add-course-modal');
    expect(data.title).toBe('Add Course');
    expect(data.components).toHaveLength(4);
  });

  it('has correct field custom IDs', () => {
    const modal = addCourseModalFactory();
    const data = modal.toJSON();

    const fieldIds = data.components.map((row) => row.components[0].custom_id);
    expect(fieldIds).toEqual([
      'add-course-number',
      'add-course-title',
      'add-course-instructor',
      'add-course-teams',
    ]);
  });

  it('sets default teams value to 0', () => {
    const modal = addCourseModalFactory();
    const data = modal.toJSON();

    const teamsField = data.components[3].components[0];
    expect(teamsField.value).toBe('0');
  });

  it('applies prefill values correctly', () => {
    const modal = addCourseModalFactory({
      courseNumber: 'ITWS-4500',
      name: 'Web Science',
      instructor: 'profsmith',
      teams: 5,
    });
    const data = modal.toJSON();

    expect(data.components[0].components[0].value).toBe('ITWS-4500');
    expect(data.components[1].components[0].value).toBe('Web Science');
    expect(data.components[2].components[0].value).toBe('profsmith');
    expect(data.components[3].components[0].value).toBe('5');
  });

  it('handles partial prefill values', () => {
    const modal = addCourseModalFactory({
      name: 'Only Name',
    });
    const data = modal.toJSON();

    expect(data.components[0].components[0].value).toBeUndefined();
    expect(data.components[1].components[0].value).toBe('Only Name');
    expect(data.components[2].components[0].value).toBeUndefined();
    expect(data.components[3].components[0].value).toBe('0');
  });

  it('marks required fields correctly', () => {
    const modal = addCourseModalFactory();
    const data = modal.toJSON();

    // Course number, title, instructor, and teams should all be required
    data.components.forEach((row) => {
      expect(row.components[0].required).toBe(true);
    });
  });
});

describe('addTeamsModalFactory', () => {
  it('creates modal with correct custom ID', () => {
    const modal = addTeamsModalFactory('course-123');
    const data = modal.toJSON();

    expect(data.custom_id).toBe('add-team-modal-course-123');
  });

  it('includes course title in modal title', () => {
    const modal = addTeamsModalFactory('123', 'Web Science');
    const data = modal.toJSON();

    expect(data.title).toContain('Web Science');
  });

  it('truncates long course titles', () => {
    const longTitle =
      'This Is A Very Long Course Title That Should Be Truncated';
    const modal = addTeamsModalFactory('123', longTitle);
    const data = modal.toJSON();

    expect(data.title.length).toBeLessThanOrEqual(45); // "Add Teams: " + 30 chars
  });

  it('shows placeholder for existing teams', () => {
    const modal = addTeamsModalFactory('123', 'Course', 5);
    const data = modal.toJSON();

    const placeholder = data.components[0].components[0].placeholder;
    expect(placeholder).toContain('Team-06');
    expect(placeholder).toContain('Team-07');
  });

  it('shows default placeholder when no existing teams', () => {
    const modal = addTeamsModalFactory('123', 'Course', 0);
    const data = modal.toJSON();

    const placeholder = data.components[0].components[0].placeholder;
    expect(placeholder).toContain('Team-01');
    expect(placeholder).toContain('Team-02');
  });
});

describe('courseSelectorActionRowFactory', () => {
  const mockCourses = [
    { id: 1, title: 'Web Science', shortTitle: 'WEB', instructors: ['prof1'] },
    {
      id: 2,
      title: 'Data Structures',
      shortTitle: 'DS',
      instructors: ['prof2', 'prof3'],
    },
    { id: 3, title: 'Algorithms', shortTitle: 'ALGO', instructors: [] },
  ];

  it('creates join selector with correct custom ID', () => {
    const row = courseSelectorActionRowFactory('join', mockCourses);
    const data = row.toJSON();

    expect(data.components[0].custom_id).toBe('join-course');
  });

  it('creates leave selector with correct custom ID', () => {
    const row = courseSelectorActionRowFactory('leave', mockCourses);
    const data = row.toJSON();

    expect(data.components[0].custom_id).toBe('leave-course');
  });

  it('creates remove selector with correct custom ID', () => {
    const row = courseSelectorActionRowFactory('remove', mockCourses);
    const data = row.toJSON();

    expect(data.components[0].custom_id).toBe('remove-course');
  });

  it('creates clear selector with correct custom ID', () => {
    const row = courseSelectorActionRowFactory('clear', mockCourses);
    const data = row.toJSON();

    expect(data.components[0].custom_id).toBe('clear-course');
  });

  it('creates add-teams selector with correct custom ID', () => {
    const row = courseSelectorActionRowFactory('add-teams', mockCourses);
    const data = row.toJSON();

    expect(data.components[0].custom_id).toBe('add-team-select');
  });

  it('creates remove-teams selector with correct custom ID', () => {
    const row = courseSelectorActionRowFactory('remove-teams', mockCourses);
    const data = row.toJSON();

    expect(data.components[0].custom_id).toBe('remove-team-select');
  });

  it('creates add-students selector with correct custom ID', () => {
    const row = courseSelectorActionRowFactory('add-students', mockCourses);
    const data = row.toJSON();

    expect(data.components[0].custom_id).toBe('add-students-course');
  });

  it('includes all courses as options', () => {
    const row = courseSelectorActionRowFactory('join', mockCourses);
    const data = row.toJSON();

    expect(data.components[0].options).toHaveLength(3);
  });

  it('uses course title as label', () => {
    const row = courseSelectorActionRowFactory('join', mockCourses);
    const data = row.toJSON();

    const labels = data.components[0].options.map((opt) => opt.label);
    expect(labels).toContain('Web Science');
    expect(labels).toContain('Data Structures');
    expect(labels).toContain('Algorithms');
  });

  it('uses course id as value', () => {
    const row = courseSelectorActionRowFactory('join', mockCourses);
    const data = row.toJSON();

    const values = data.components[0].options.map((opt) => opt.value);
    expect(values).toContain('1');
    expect(values).toContain('2');
    expect(values).toContain('3');
  });

  it('shows instructors in description when available', () => {
    const row = courseSelectorActionRowFactory('join', mockCourses);
    const data = row.toJSON();

    const webScienceOpt = data.components[0].options.find(
      (opt) => opt.label === 'Web Science'
    );
    expect(webScienceOpt.description).toContain('prof1');
  });

  it('shows shortTitle when no instructors', () => {
    const row = courseSelectorActionRowFactory('join', mockCourses);
    const data = row.toJSON();

    const algoOpt = data.components[0].options.find(
      (opt) => opt.label === 'Algorithms'
    );
    expect(algoOpt.description).toBe('ALGO');
  });

  it('handles empty courses array', () => {
    const row = courseSelectorActionRowFactory('join', []);
    const data = row.toJSON();

    expect(data.components[0].options).toHaveLength(0);
  });
});

describe('courseTeamSelectorActionRowFactory', () => {
  const mockTeams = [
    { id: 1, title: 'Team-01', Course: { title: 'Web Science' } },
    { id: 2, title: 'Team-02', Course: { title: 'Web Science' } },
    { id: 3, title: 'Team-01', Course: { title: 'Data Structures' } },
  ];

  it('creates join team selector with correct custom ID', () => {
    const row = courseTeamSelectorActionRowFactory('join', mockTeams);
    const data = row.toJSON();

    expect(data.components[0].custom_id).toBe('join-team');
  });

  it('creates leave team selector with correct custom ID', () => {
    const row = courseTeamSelectorActionRowFactory('leave', mockTeams);
    const data = row.toJSON();

    expect(data.components[0].custom_id).toBe('leave-team');
  });

  it('includes all teams as options', () => {
    const row = courseTeamSelectorActionRowFactory('join', mockTeams);
    const data = row.toJSON();

    expect(data.components[0].options).toHaveLength(3);
  });

  it('uses team title as label', () => {
    const row = courseTeamSelectorActionRowFactory('join', mockTeams);
    const data = row.toJSON();

    const labels = data.components[0].options.map((opt) => opt.label);
    expect(labels).toContain('Team-01');
    expect(labels).toContain('Team-02');
  });

  it('uses course title as description', () => {
    const row = courseTeamSelectorActionRowFactory('join', mockTeams);
    const data = row.toJSON();

    const firstOpt = data.components[0].options[0];
    expect(firstOpt.description).toBe('Web Science');
  });

  it('handles missing Course gracefully', () => {
    const teamsWithMissingCourse = [{ id: 1, title: 'Team-01', Course: null }];

    const row = courseTeamSelectorActionRowFactory(
      'join',
      teamsWithMissingCourse
    );
    const data = row.toJSON();

    expect(data.components[0].options[0].description).toBe('Unknown course');
  });
});

describe('removeTeamsSelectorActionRowFactory', () => {
  const mockTeams = [
    { id: 1, title: 'Team-01' },
    { id: 2, title: 'Team-02' },
    { id: 3, title: 'Team-03' },
  ];

  it('creates selector with correct custom ID', () => {
    const row = removeTeamsSelectorActionRowFactory('course-123', mockTeams);
    const data = row.toJSON();

    expect(data.components[0].custom_id).toBe('remove-team-course-123');
  });

  it('allows multi-select', () => {
    const row = removeTeamsSelectorActionRowFactory('course-123', mockTeams);
    const data = row.toJSON();

    expect(data.components[0].min_values).toBe(1);
    expect(data.components[0].max_values).toBe(3);
  });

  it('includes all teams as options', () => {
    const row = removeTeamsSelectorActionRowFactory('course-123', mockTeams);
    const data = row.toJSON();

    expect(data.components[0].options).toHaveLength(3);
  });
});

describe('channelSelectorActionRowFactory', () => {
  let mockGuild;
  let textChannel1;
  let textChannel2;
  let voiceChannel;
  let category;

  beforeEach(() => {
    textChannel1 = createMockChannel({
      id: 'ch-1',
      name: 'general',
      type: 0,
      parent: { name: 'Category 1' },
    });
    textChannel2 = createMockChannel({
      id: 'ch-2',
      name: 'announcements',
      type: 0,
      parent: { name: 'Category 1' },
    });
    voiceChannel = createMockChannel({
      id: 'ch-3',
      name: 'Voice Channel',
      type: 2,
      parent: null,
    });
    category = createMockChannel({
      id: 'cat-1',
      name: 'Category 1',
      type: 4,
    });

    // Create a proper guild with channels cache that has values()
    const channelMap = new Map([
      [textChannel1.id, textChannel1],
      [textChannel2.id, textChannel2],
      [voiceChannel.id, voiceChannel],
      [category.id, category],
    ]);

    mockGuild = {
      id: 'test-guild',
      channels: {
        cache: {
          values: () => channelMap.values(),
          get: (id) => channelMap.get(id),
          filter: (fn) => Array.from(channelMap.values()).filter(fn),
        },
      },
    };
  });

  it('creates remove channel selector with correct custom ID', () => {
    const row = channelSelectorActionRowFactory(mockGuild, 'remove');
    const data = row.toJSON();

    expect(data.components[0].custom_id).toBe('remove-channel');
  });

  it('creates clear channel selector with correct custom ID', () => {
    const row = channelSelectorActionRowFactory(mockGuild, 'clear');
    const data = row.toJSON();

    expect(data.components[0].custom_id).toBe('clear-channel');
  });

  it('only includes text and voice channels (not categories)', () => {
    const row = channelSelectorActionRowFactory(mockGuild, 'remove');
    const data = row.toJSON();

    // Should have 3 channels (2 text + 1 voice, no category)
    expect(data.components[0].options).toHaveLength(3);
  });

  it('filters channels by pattern', () => {
    const row = channelSelectorActionRowFactory(mockGuild, 'remove', 'general');
    const data = row.toJSON();

    expect(data.components[0].options).toHaveLength(1);
    expect(data.components[0].options[0].label).toBe('general');
  });

  it('shows category name in description', () => {
    const row = channelSelectorActionRowFactory(mockGuild, 'remove');
    const data = row.toJSON();

    const generalOpt = data.components[0].options.find(
      (opt) => opt.label === 'general'
    );
    expect(generalOpt.description).toBe('Category 1');
  });

  it('shows "No category" for channels without parent', () => {
    const row = channelSelectorActionRowFactory(mockGuild, 'remove');
    const data = row.toJSON();

    const voiceOpt = data.components[0].options.find(
      (opt) => opt.label === 'Voice Channel'
    );
    expect(voiceOpt.description).toBe('No category');
  });
});

describe('findCourseGeneralChannel', () => {
  it('finds the general channel in a course category', () => {
    const generalChannel = createMockChannel({
      id: 'general-ch',
      name: 'general',
      type: 0,
    });
    const otherChannel = createMockChannel({
      id: 'other-ch',
      name: 'other',
      type: 0,
    });

    const courseCategory = createMockCategory({
      id: 'course-cat',
      name: 'Course Category',
      children: [generalChannel, otherChannel],
    });

    // Add find method to children that works like Discord.js collection
    courseCategory.children.find = (fn) =>
      [generalChannel, otherChannel].find(fn);

    // Create a proper guild with channels cache
    const channelMap = new Map([[courseCategory.id, courseCategory]]);
    const guild = {
      id: 'test-guild',
      channels: {
        cache: {
          get: (id) => channelMap.get(id),
          values: () => channelMap.values(),
        },
      },
    };

    const course = createMockCourse({
      discordCategoryId: courseCategory.id,
    });

    const result = findCourseGeneralChannel(guild, course);

    expect(result).toBe(generalChannel);
  });
});

describe('toggleMemberRole', () => {
  it('adds role when member does not have it', async () => {
    const role = createMockRole({ id: 'new-role' });
    const member = createMockMember({ roles: [] });

    const result = await toggleMemberRole(member, role.id);

    expect(result).toBe(true);
    expect(member.roles.add).toHaveBeenCalledWith(role.id);
  });

  it('removes role when member has it', async () => {
    const role = createMockRole({ id: 'existing-role' });
    const member = createMockMember({ roles: [role] });

    const result = await toggleMemberRole(member, role.id);

    expect(result).toBe(false);
    expect(member.roles.remove).toHaveBeenCalledWith(role.id);
  });
});

describe('Test Scenario Helper', () => {
  it('creates a complete test scenario', () => {
    const scenario = createTestScenario();

    expect(scenario.guild).toBeDefined();
    expect(scenario.roles).toBeDefined();
    expect(scenario.channels).toBeDefined();
    expect(scenario.members).toBeDefined();
  });

  it('has all expected roles', () => {
    const scenario = createTestScenario();

    expect(scenario.roles.student).toBeDefined();
    expect(scenario.roles.faculty).toBeDefined();
    expect(scenario.roles.course).toBeDefined();
    expect(scenario.roles.instructor).toBeDefined();
    expect(scenario.roles.team).toBeDefined();
  });

  it('has all expected channels', () => {
    const scenario = createTestScenario();

    expect(scenario.channels.category).toBeDefined();
    expect(scenario.channels.general).toBeDefined();
    expect(scenario.channels.announcements).toBeDefined();
    expect(scenario.channels.teamText).toBeDefined();
    expect(scenario.channels.teamVoice).toBeDefined();
  });

  it('has all expected members', () => {
    const scenario = createTestScenario();

    expect(scenario.members.instructor).toBeDefined();
    expect(scenario.members.student).toBeDefined();
    expect(scenario.members.studentWithTeam).toBeDefined();
  });

  it('members have correct roles', () => {
    const scenario = createTestScenario();

    expect(
      scenario.members.instructor.roles.cache.has(scenario.roles.faculty.id)
    ).toBe(true);
    expect(
      scenario.members.student.roles.cache.has(scenario.roles.course.id)
    ).toBe(true);
    expect(
      scenario.members.studentWithTeam.roles.cache.has(scenario.roles.team.id)
    ).toBe(true);
  });
});
