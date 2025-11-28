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

    options: {
      ...base.options,
      getFocused: vi.fn().mockReturnValue(overrides.focused || ''),
    },

    respond: vi.fn().mockResolvedValue(undefined),

    ...overrides,
  };
}
