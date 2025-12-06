/**
 * Discord.js mock factories for testing
 * Creates mock objects that simulate Discord.js behavior
 */
import { vi } from 'vitest';

/**
 * Creates a mock Discord Collection (Map-like with extra methods)
 */
export function createMockCollection(entries = []) {
  const map = new Map(entries);

  return {
    ...map,
    get: (key) => map.get(key),
    set: (key, value) => map.set(key, value),
    has: (key) => map.has(key),
    delete: (key) => map.delete(key),
    clear: () => map.clear(),
    size: map.size,
    forEach: (fn) => map.forEach(fn),
    map: (fn) => Array.from(map.values()).map(fn),
    filter: (fn) => Array.from(map.values()).filter(fn),
    find: (fn) => Array.from(map.values()).find(fn),
    some: (fn) => Array.from(map.values()).some(fn),
    every: (fn) => Array.from(map.values()).every(fn),
    first: () => map.values().next().value,
    values: () => map.values(),
    keys: () => map.keys(),
    entries: () => map.entries(),
    cache: map, // For nested .cache access
    [Symbol.iterator]: () => map.entries(),
  };
}

/**
 * Creates a mock Discord Role
 */
export function createMockRole(overrides = {}) {
  const id = overrides.id || `role-${Date.now()}`;
  return {
    id,
    name: overrides.name || 'Test Role',
    color: overrides.color || 0x000000,
    position: overrides.position || 1,
    permissions: overrides.permissions || [],
    members: createMockCollection(overrides.members || []),
    delete: vi.fn().mockResolvedValue(undefined),
    edit: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Creates a mock Discord Channel
 */
export function createMockChannel(overrides = {}) {
  const id = overrides.id || `channel-${Date.now()}`;
  return {
    id,
    name: overrides.name || 'test-channel',
    type: overrides.type || 0, // GuildText
    parentId: overrides.parentId || null,
    parent: overrides.parent || null,
    position: overrides.position || 0,
    children: createMockCollection(overrides.children || []),
    permissionOverwrites: createMockCollection(),
    send: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined),
    edit: vi.fn().mockResolvedValue(undefined),
    bulkDelete: vi.fn().mockResolvedValue(createMockCollection()),
    messages: {
      fetch: vi.fn().mockResolvedValue(createMockCollection()),
    },
    ...overrides,
  };
}

/**
 * Creates a mock Discord Guild Member
 */
export function createMockMember(overrides = {}) {
  const roles = overrides.roles || [];
  const roleEntries = roles.map((r) => [r.id, r]);
  const roleCache = createMockCollection(roleEntries);

  // Add has method that works correctly
  roleCache.has = (id) => roleEntries.some(([roleId]) => roleId === id);

  const rolesObj = {
    cache: roleCache,
    add: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
  };

  // Extract overrides that shouldn't spread over roles
  const { roles: _unusedRoles, ...restOverrides } = overrides;

  return {
    id: overrides.id || `member-${Date.now()}`,
    user: {
      id: overrides.userId || overrides.id || `user-${Date.now()}`,
      username: overrides.username || 'testuser',
      tag: overrides.tag || 'testuser#0000',
      discriminator: overrides.discriminator || '0000',
      bot: overrides.bot || false,
    },
    nickname: overrides.nickname || null,
    roles: rolesObj,
    displayName: overrides.nickname || overrides.username || 'testuser',
    send: vi.fn().mockResolvedValue({}),
    kick: vi.fn().mockResolvedValue(undefined),
    ban: vi.fn().mockResolvedValue(undefined),
    ...restOverrides,
  };
}

/**
 * Creates a mock Discord Guild
 */
export function createMockGuild(overrides = {}) {
  return {
    id: overrides.id || `guild-${Date.now()}`,
    name: overrides.name || 'Test Guild',
    roles: {
      cache: createMockCollection(overrides.roles || []),
      create: vi.fn().mockImplementation(async (options) => {
        return createMockRole({ name: options.name, ...options });
      }),
      fetch: vi
        .fn()
        .mockResolvedValue(createMockCollection(overrides.roles || [])),
    },
    channels: {
      cache: createMockCollection(overrides.channels || []),
      create: vi.fn().mockImplementation(async (options) => {
        return createMockChannel({ name: options.name, ...options });
      }),
      fetch: vi
        .fn()
        .mockResolvedValue(createMockCollection(overrides.channels || [])),
    },
    members: {
      cache: createMockCollection(overrides.members || []),
      fetch: vi
        .fn()
        .mockResolvedValue(createMockCollection(overrides.members || [])),
    },
    ...overrides,
  };
}

/**
 * Creates a mock Discord CommandInteraction
 */
export function createMockInteraction(overrides = {}) {
  const guild = overrides.guild || createMockGuild();
  const member = overrides.member || createMockMember();
  const optionValues = overrides.options || {};

  // Extract special overrides that shouldn't spread
  const {
    guild: _unusedGuild,
    member: _unusedMember,
    options: _unusedOptions,
    subcommand,
    optionOverrides,
    ...restOverrides
  } = overrides;

  const interaction = {
    id: overrides.id || `interaction-${Date.now()}`,
    type: 2, // ApplicationCommand
    commandName: overrides.commandName || 'test',
    user: member.user,
    member,
    guild,
    guildId: guild.id,
    channel: overrides.channel || createMockChannel(),
    channelId: overrides.channelId || 'test-channel-id',

    // State
    deferred: false,
    replied: false,

    // Options
    options: {
      getSubcommand: vi.fn().mockReturnValue(subcommand || null),
      getString: vi.fn().mockImplementation((name) => {
        return optionValues[name] || null;
      }),
      getInteger: vi.fn().mockImplementation((name) => {
        return optionValues[name] || null;
      }),
      getBoolean: vi.fn().mockImplementation((name) => {
        return optionValues[name] ?? null;
      }),
      getUser: vi.fn().mockImplementation((name) => {
        return optionValues[name] || null;
      }),
      getChannel: vi.fn().mockImplementation((name) => {
        return optionValues[name] || null;
      }),
      getRole: vi.fn().mockImplementation((name) => {
        return optionValues[name] || null;
      }),
      getMember: vi.fn().mockImplementation((name) => {
        return optionValues[name] || null;
      }),
      ...optionOverrides,
    },

    // Response methods
    deferReply: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue({}),
    followUp: vi.fn().mockResolvedValue({}),
    deleteReply: vi.fn().mockResolvedValue(undefined),

    // Modal
    showModal: vi.fn().mockResolvedValue(undefined),

    ...restOverrides,
  };

  return interaction;
}

/**
 * Creates a mock Discord SelectMenuInteraction
 */
export function createMockSelectInteraction(overrides = {}) {
  const base = createMockInteraction(overrides);

  return {
    ...base,
    type: 3, // MessageComponent
    componentType: 3, // StringSelect
    customId: overrides.customId || 'test-select',
    values: overrides.values || [],

    // Type check methods
    isStringSelectMenu: () => true,
    isButton: () => false,
    isModalSubmit: () => false,
    isCommand: () => false,
    isChatInputCommand: () => false,
    isAutocomplete: () => false,

    // Select-specific methods
    update: vi.fn().mockResolvedValue({}),
    deferUpdate: vi.fn().mockResolvedValue(undefined),

    ...overrides,
  };
}

/**
 * Creates a mock Discord ButtonInteraction
 */
export function createMockButtonInteraction(overrides = {}) {
  const base = createMockInteraction(overrides);

  return {
    ...base,
    type: 3, // MessageComponent
    componentType: 2, // Button
    customId: overrides.customId || 'test-button',

    // Type check methods
    isButton: () => true,
    isStringSelectMenu: () => false,
    isModalSubmit: () => false,
    isCommand: () => false,
    isChatInputCommand: () => false,
    isAutocomplete: () => false,

    // Button-specific methods
    update: vi.fn().mockResolvedValue({}),
    deferUpdate: vi.fn().mockResolvedValue(undefined),

    ...overrides,
  };
}

/**
 * Creates a mock Discord ModalSubmitInteraction
 */
export function createMockModalInteraction(overrides = {}) {
  const base = createMockInteraction(overrides);
  const fieldValues = overrides.fields || {};

  return {
    ...base,
    type: 5, // ModalSubmit
    customId: overrides.customId || 'test-modal',

    // Type check methods
    isModalSubmit: () => true,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isCommand: () => false,
    isChatInputCommand: () => false,
    isAutocomplete: () => false,

    fields: {
      getTextInputValue: vi.fn().mockImplementation((fieldId) => {
        return fieldValues[fieldId] || '';
      }),
      ...overrides.fieldOverrides,
    },
  };
}

/**
 * Creates a mock Discord AutocompleteInteraction
 */
export function createMockAutocompleteInteraction(overrides = {}) {
  const base = createMockInteraction(overrides);

  return {
    ...base,
    type: 4, // ApplicationCommandAutocomplete

    // Type check methods
    isAutocomplete: () => true,
    isModalSubmit: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isCommand: () => false,
    isChatInputCommand: () => false,

    options: {
      ...base.options,
      getFocused: vi.fn().mockReturnValue(overrides.focused || ''),
    },

    respond: vi.fn().mockResolvedValue(undefined),

    ...overrides,
  };
}

/**
 * Creates a mock Discord Category Channel
 */
export function createMockCategory(overrides = {}) {
  const id = overrides.id || `category-${Date.now()}`;
  const childrenEntries = (overrides.children || []).map((c) => [c.id, c]);

  return {
    id,
    name: overrides.name || 'Test Category',
    type: 4, // GuildCategory
    position: overrides.position || 0,
    children: {
      cache: createMockCollection(childrenEntries),
      ...overrides.childrenOverrides,
    },
    permissionOverwrites: {
      cache: createMockCollection(),
    },
    delete: vi.fn().mockResolvedValue(undefined),
    edit: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/**
 * Creates a fully populated mock guild with channels, roles, and members
 */
export function createPopulatedMockGuild(options = {}) {
  const roles = (options.roles || []).map((r) =>
    r.id ? r : createMockRole(r)
  );
  const channels = (options.channels || []).map((c) =>
    c.id ? c : createMockChannel(c)
  );
  const members = (options.members || []).map((m) =>
    m.id ? m : createMockMember(m)
  );

  // Create role entries for collection
  const roleEntries = roles.map((r) => [r.id, r]);
  const channelEntries = channels.map((c) => [c.id, c]);
  const memberEntries = members.map((m) => [m.id, m]);

  const guild = {
    id: options.id || `guild-${Date.now()}`,
    name: options.name || 'Test Guild',

    roles: {
      cache: createMockCollection(roleEntries),
      create: vi.fn().mockImplementation(async (opts) => {
        const newRole = createMockRole({ name: opts.name, ...opts });
        roleEntries.push([newRole.id, newRole]);
        guild.roles.cache = createMockCollection(roleEntries);
        return newRole;
      }),
      delete: vi.fn().mockImplementation(async (roleId) => {
        const index = roleEntries.findIndex(([id]) => id === roleId);
        if (index !== -1) {
          roleEntries.splice(index, 1);
          guild.roles.cache = createMockCollection(roleEntries);
        }
      }),
      fetch: vi.fn().mockResolvedValue(createMockCollection(roleEntries)),
    },

    channels: {
      cache: createMockCollection(channelEntries),
      create: vi.fn().mockImplementation(async (opts) => {
        const newChannel = createMockChannel({ name: opts.name, ...opts });
        channelEntries.push([newChannel.id, newChannel]);
        guild.channels.cache = createMockCollection(channelEntries);
        return newChannel;
      }),
      delete: vi.fn().mockImplementation(async (channelId) => {
        const index = channelEntries.findIndex(([id]) => id === channelId);
        if (index !== -1) {
          channelEntries.splice(index, 1);
          guild.channels.cache = createMockCollection(channelEntries);
        }
      }),
      fetch: vi.fn().mockResolvedValue(createMockCollection(channelEntries)),
    },

    members: {
      cache: createMockCollection(memberEntries),
      fetch: vi.fn().mockResolvedValue(createMockCollection(memberEntries)),
    },

    ...options,
  };

  return guild;
}

/**
 * Creates a mock Discord Client
 */
export function createMockClient(overrides = {}) {
  const guilds = overrides.guilds || [];
  const guildEntries = guilds.map((g) => [g.id, g]);

  return {
    user: {
      id: 'bot-user-id',
      username: 'TestBot',
      tag: 'TestBot#0000',
    },
    application: {
      id: 'bot-application-id',
      name: 'TestBot',
    },
    guilds: {
      cache: createMockCollection(guildEntries),
      fetch: vi.fn().mockResolvedValue(createMockCollection(guildEntries)),
    },
    channels: {
      cache: createMockCollection(),
      fetch: vi.fn().mockResolvedValue(null),
    },
    commands: createMockCollection(),
    login: vi.fn().mockResolvedValue('token'),
    destroy: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    once: vi.fn(),
    emit: vi.fn(),
    ...overrides,
  };
}

/**
 * Helper to create a complete test scenario with guild, members, roles, courses
 */
export function createTestScenario(options = {}) {
  // Create roles
  const studentRole = createMockRole({
    id: 'student-role',
    name: 'Student',
    ...options.studentRole,
  });
  const facultyRole = createMockRole({
    id: 'faculty-role',
    name: 'Faculty',
    ...options.facultyRole,
  });
  const courseRole = createMockRole({
    id: 'course-role',
    name: 'TEST - Test Course',
    ...options.courseRole,
  });
  const instructorRole = createMockRole({
    id: 'instructor-role',
    name: 'TEST - Instructor',
    ...options.instructorRole,
  });
  const teamRole = createMockRole({
    id: 'team-role',
    name: 'TEST - Team-01',
    ...options.teamRole,
  });

  // Create channels
  const generalChannel = createMockChannel({
    id: 'general-channel',
    name: 'general',
    type: 0,
    ...options.generalChannel,
  });
  const announcementsChannel = createMockChannel({
    id: 'announcements-channel',
    name: 'announcements',
    type: 0,
    ...options.announcementsChannel,
  });
  const teamTextChannel = createMockChannel({
    id: 'team-text-channel',
    name: 'test-team-01',
    type: 0,
    ...options.teamTextChannel,
  });
  const teamVoiceChannel = createMockChannel({
    id: 'team-voice-channel',
    name: 'TEST Team-01 Voice',
    type: 2,
    ...options.teamVoiceChannel,
  });

  // Create category with children
  const courseCategory = createMockCategory({
    id: 'course-category',
    name: 'TEST - Test Course',
    children: [generalChannel, announcementsChannel, teamTextChannel],
    ...options.courseCategory,
  });

  // Update channel parents
  generalChannel.parent = courseCategory;
  generalChannel.parentId = courseCategory.id;
  announcementsChannel.parent = courseCategory;
  announcementsChannel.parentId = courseCategory.id;
  teamTextChannel.parent = courseCategory;
  teamTextChannel.parentId = courseCategory.id;
  teamVoiceChannel.parent = courseCategory;
  teamVoiceChannel.parentId = courseCategory.id;

  // Create members
  const instructor = createMockMember({
    id: 'instructor-member',
    username: 'professor',
    nickname: 'Prof. Smith',
    roles: [facultyRole, instructorRole],
    ...options.instructor,
  });
  const student = createMockMember({
    id: 'student-member',
    username: 'student1',
    roles: [studentRole, courseRole],
    ...options.student,
  });
  const studentWithTeam = createMockMember({
    id: 'student-with-team',
    username: 'student2',
    roles: [studentRole, courseRole, teamRole],
    ...options.studentWithTeam,
  });

  // Create guild
  const guild = createPopulatedMockGuild({
    id: 'test-guild',
    name: 'Test Server',
    roles: [studentRole, facultyRole, courseRole, instructorRole, teamRole],
    channels: [
      courseCategory,
      generalChannel,
      announcementsChannel,
      teamTextChannel,
      teamVoiceChannel,
    ],
    members: [instructor, student, studentWithTeam],
    ...options.guild,
  });

  // Update members with guild reference
  instructor.guild = guild;
  student.guild = guild;
  studentWithTeam.guild = guild;

  return {
    guild,
    roles: {
      student: studentRole,
      faculty: facultyRole,
      course: courseRole,
      instructor: instructorRole,
      team: teamRole,
    },
    channels: {
      category: courseCategory,
      general: generalChannel,
      announcements: announcementsChannel,
      teamText: teamTextChannel,
      teamVoice: teamVoiceChannel,
    },
    members: {
      instructor,
      student,
      studentWithTeam,
    },
  };
}
