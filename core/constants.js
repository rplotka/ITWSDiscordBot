const { PermissionFlagsBits } = require('discord.js');

const SERVER_ID = process.env.DISCORD_SERVER_ID;

/**
 * Used in displaying the possible roles to users, as well as determining what roles to assign/remove to users.
 */
module.exports.userRoles = [
  {
    label: 'Prospective Students',
    customId: 'prospective',
    discordRoleId: process.env.DISCORD_PROSPECTIVE_STUDENTS_ROLE_ID,
  },
  {
    label: 'Accepted Students',
    customId: 'accepted',
    discordRoleId: process.env.DISCORD_ACCEPTED_STUDENTS_ROLE_ID,
  },
  {
    label: 'Current Students',
    url: 'https://itws-discord.herokuapp.com/',
  },
  {
    label: 'Alumni',
    url: 'https://forms.gle/DisKuZy4AJf17pk69',
  },
];

/**
 * Generators for each type of channel topic.
 */
module.exports.courseChannelTopics = {
  announcements: (course) => `📢 Course announcements for **${course.title}**!`,
  general: (course) => `💬 General chat for **${course.title}**.`,
  discussion: (course) => `🗣️ Discussion room for **${course.title}**.`,
  team: (teamTitle, course) =>
    `🔒 Private discussion channel for **Team ${teamTitle}** in **${course.title}**.`,
};

module.exports.coursePermissions = {
  /** Base permissions for a course category channel. */
  base: (courseInstructorRoleId, courseRoleId) => [
    // Block everyone by default from seeing the channel
    {
      id: SERVER_ID,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    // {
    //   id: ADMIN_ROLE_ID,
    //   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    // },
    // Let everyone in the course see and send in the channel
    {
      id: courseRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    // Let instructors also manage messages in the channel
    {
      id: courseInstructorRoleId,
      allow: [PermissionFlagsBits.ManageMessages],
    },
  ],
  announcements: (courseInstructorRoleId, courseRoleId) => [
    // Block everyone by default from seeing the channel
    {
      id: SERVER_ID,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    // Course students can only read messages
    {
      id: courseRoleId,
      deny: [PermissionFlagsBits.SendMessages],
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    // Only instructors can send messages
    {
      id: courseInstructorRoleId,
      allow: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
      ],
    },
  ],
  team: (courseInstructorRoleId, courseRoleId, teamRoleId) => [
    // Block everyone by default from seeing the channel
    {
      id: SERVER_ID,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    // Block course students from seeing the channel
    {
      id: courseRoleId,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    // Allow course instructor to see, send, and manage messages
    {
      id: courseInstructorRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
      ],
    },
    // Allow team members to see and send messages
    {
      id: teamRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.Connect,
        PermissionFlagsBits.Speak,
      ],
    },
  ],
  // teamVoice: (courseInstructorRoleId, courseRoleId, teamRoleId) => [
  //   {
  //     id: SERVER_ID,
  //     deny: ['VIEW_CHANNEL'],
  //   },
  //   {
  //     id: courseRoleId,
  //     deny: ['VIEW_CHANNEL'],
  //   },
  //   {
  //     id: courseInstructorRoleId,
  //     allow: ['VIEW_CHANNEL'],
  //   },
  //   {
  //     id: teamRoleId,
  //     allow: ['VIEW_CHANNEL', 'CONNECT', 'SPEAK'],
  //   },
  // ],
};

/**
 * Standardized custom ID patterns for Discord interactions.
 * Format: [action]-[entity]-[context]
 */
module.exports.customIds = {
  // Course actions
  course: {
    add: 'add-course',
    addModal: 'add-course-modal',
    remove: 'remove-course',
    join: 'join-course',
    leave: 'leave-course',
    clear: 'clear-course',
    clearConfirm: (courseId) => `clear-course-confirm-${courseId}`,
    clearConfirmWithTeams: (courseId) =>
      `clear-course-confirm-teams-${courseId}`,
    clearCancel: 'clear-course-cancel',
  },
  // Team actions
  team: {
    add: (courseId) => `add-team-${courseId}`,
    addModal: (courseId) => `add-team-modal-${courseId}`,
    remove: (courseId) => `remove-team-${courseId}`,
    join: 'join-team',
    leave: 'leave-team',
    switch: (courseId, from, to) => `switch-team-${courseId}-${from}-${to}`,
  },
  // Channel actions
  channel: {
    add: 'add-channel',
    addModal: 'add-channel-modal',
    remove: 'remove-channel',
    clear: 'clear-channel',
    clearConfirm: (channelId) => `clear-channel-confirm-${channelId}`,
  },
  // Sync actions
  sync: {
    server: 'sync-server',
    confirm: 'sync-server-confirm',
    cancel: 'sync-server-cancel',
    addToDb: (type, id) => `sync-add-db-${type}-${id}`,
    removeFromDb: (type, id) => `sync-remove-db-${type}-${id}`,
    createInDiscord: (type, id) => `sync-create-discord-${type}-${id}`,
  },
  // Students bulk actions
  students: {
    add: 'add-students',
    selectCourse: 'add-students-course',
  },
  // Helper to parse custom IDs
  parse: (customId) => {
    const parts = customId.split('-');
    if (parts.length < 2)
      return { action: customId, entity: null, context: null };
    return {
      action: parts[0],
      entity: parts[1],
      context: parts.slice(2).join('-'),
    };
  },
  // Helper to check if customId matches a pattern
  matches: (customId, pattern) => {
    if (typeof pattern === 'string') {
      return customId === pattern;
    }
    if (typeof pattern === 'function') {
      // For dynamic patterns, check if it starts with the base
      return customId.startsWith(pattern('').replace(/-$/, ''));
    }
    return false;
  },
};
