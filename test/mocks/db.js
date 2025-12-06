/**
 * Database mock factories for testing
 * Creates mock Sequelize models that simulate database behavior
 */
import { vi } from 'vitest';

/**
 * Creates a mock Course model instance
 */
export function createMockCourse(overrides = {}) {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    title: overrides.title || 'Test Course',
    shortTitle: overrides.shortTitle || 'TEST',
    isPublic: overrides.isPublic ?? true,
    instructors: overrides.instructors || [],
    discordCategoryId: overrides.discordCategoryId || `category-${id}`,
    discordRoleId: overrides.discordRoleId || `role-${id}`,
    discordInstructorRoleId:
      overrides.discordInstructorRoleId || `instructor-role-${id}`,
    courseNumber: overrides.courseNumber || 'TEST-1000',

    // Sequelize model methods
    destroy: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    toJSON() {
      return { ...this };
    },

    ...overrides,
  };
}

/**
 * Creates a mock CourseTeam model instance
 */
export function createMockCourseTeam(overrides = {}) {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    title: overrides.title || 'Team-01',
    CourseId: overrides.CourseId || 1,
    discordTextChannelId:
      overrides.discordTextChannelId || `text-channel-${id}`,
    discordVoiceChannelId:
      overrides.discordVoiceChannelId || `voice-channel-${id}`,
    discordRoleId: overrides.discordRoleId || `team-role-${id}`,

    // Associated Course (for includes)
    Course: overrides.Course || null,

    // Sequelize model methods
    destroy: vi.fn().mockResolvedValue(undefined),
    save: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    toJSON() {
      return { ...this };
    },

    ...overrides,
  };
}

/**
 * Creates a mock Course model (static methods)
 */
export function createMockCourseModel(courses = []) {
  const courseMap = new Map(courses.map((c) => [c.id, c]));

  return {
    findAll: vi.fn().mockImplementation(async (options = {}) => {
      let results = Array.from(courseMap.values());

      // Handle where clause
      if (options.where) {
        results = results.filter((course) => {
          return Object.entries(options.where).every(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              // Handle Sequelize operators (simplified)
              return true;
            }
            return course[key] === value;
          });
        });
      }

      return results;
    }),

    findOne: vi.fn().mockImplementation(async (options = {}) => {
      if (options.where) {
        const results = Array.from(courseMap.values());
        return (
          results.find((course) => {
            return Object.entries(options.where).every(
              ([key, value]) => course[key] === value
            );
          }) || null
        );
      }
      return courseMap.values().next().value || null;
    }),

    findByPk: vi.fn().mockImplementation(async (id) => {
      return courseMap.get(id) || null;
    }),

    create: vi.fn().mockImplementation(async (data) => {
      const course = createMockCourse(data);
      courseMap.set(course.id, course);
      return course;
    }),

    count: vi.fn().mockImplementation(async () => courseMap.size),

    // Allow adding courses to the mock
    _addCourse: (course) => {
      courseMap.set(course.id, course);
    },
    _clear: () => {
      courseMap.clear();
    },
    _getAll: () => Array.from(courseMap.values()),
  };
}

/**
 * Creates a mock CourseTeam model (static methods)
 */
export function createMockCourseTeamModel(teams = []) {
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  return {
    findAll: vi.fn().mockImplementation(async (options = {}) => {
      let results = Array.from(teamMap.values());

      // Handle where clause
      if (options.where) {
        results = results.filter((team) => {
          return Object.entries(options.where).every(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              // Handle Op.in
              if (Array.isArray(value)) {
                return value.includes(team[key]);
              }
              return true;
            }
            return team[key] === value;
          });
        });
      }

      // Handle include
      if (options.include) {
        results = results.map((team) => ({ ...team }));
      }

      return results;
    }),

    findOne: vi.fn().mockImplementation(async (options = {}) => {
      if (options.where) {
        const results = Array.from(teamMap.values());
        return (
          results.find((team) => {
            return Object.entries(options.where).every(
              ([key, value]) => team[key] === value
            );
          }) || null
        );
      }
      return teamMap.values().next().value || null;
    }),

    findByPk: vi.fn().mockImplementation(async (id, options = {}) => {
      const team = teamMap.get(id) || null;
      if (team && options.include) {
        return { ...team };
      }
      return team;
    }),

    create: vi.fn().mockImplementation(async (data) => {
      const team = createMockCourseTeam(data);
      teamMap.set(team.id, team);
      return team;
    }),

    count: vi.fn().mockImplementation(async (options = {}) => {
      if (options.where) {
        const results = Array.from(teamMap.values()).filter((team) => {
          return Object.entries(options.where).every(
            ([key, value]) => team[key] === value
          );
        });
        return results.length;
      }
      return teamMap.size;
    }),

    // Allow adding teams to the mock
    _addTeam: (team) => {
      teamMap.set(team.id, team);
    },
    _clear: () => {
      teamMap.clear();
    },
    _getAll: () => Array.from(teamMap.values()),
  };
}

/**
 * Creates a complete mock database module
 */
export function createMockDatabase(options = {}) {
  const courses = (options.courses || []).map((c) => createMockCourse(c));
  const teams = (options.teams || []).map((t) => createMockCourseTeam(t));

  return {
    Course: createMockCourseModel(courses),
    CourseTeam: createMockCourseTeamModel(teams),
    sequelize: {
      authenticate: vi.fn().mockResolvedValue(undefined),
      sync: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      transaction: vi.fn().mockImplementation(async (callback) => {
        const mockTransaction = { commit: vi.fn(), rollback: vi.fn() };
        if (callback) {
          return callback(mockTransaction);
        }
        return mockTransaction;
      }),
    },
    Group: null,
  };
}
