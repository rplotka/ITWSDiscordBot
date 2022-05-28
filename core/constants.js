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
      deny: ['VIEW_CHANNEL'],
    },
    // {
    //   id: ADMIN_ROLE_ID,
    //   allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
    // },
    // Let everyone in the course see and send in the channel
    {
      id: courseRoleId,
      allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
    },
    // Let instructors also manage messages in the channel
    {
      id: courseInstructorRoleId,
      allow: ['MANAGE_MESSAGES'],
    },
  ],
  announcements: (courseInstructorRoleId, courseRoleId) => [
    // Block everyone by default from seeing the channel
    {
      id: SERVER_ID,
      deny: ['VIEW_CHANNEL'],
    },
    // Course students can only read messages
    {
      id: courseRoleId,
      deny: ['SEND_MESSAGES'],
      allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
    },
    // Only instructors can send messages
    {
      id: courseInstructorRoleId,
      allow: ['SEND_MESSAGES', 'MANAGE_MESSAGES'],
    },
  ],
  team: (courseInstructorRoleId, courseRoleId, teamRoleId) => [
    // Block everyone by default from seeing the channel
    {
      id: SERVER_ID,
      deny: ['VIEW_CHANNEL'],
    },
    // Block course students from seeing the channel
    {
      id: courseRoleId,
      deny: ['VIEW_CHANNEL'],
    },
    // Allow course instructor to see, send, and manage messages
    {
      id: courseInstructorRoleId,
      allow: [
        'VIEW_CHANNEL',
        'SEND_MESSAGES',
        'MANAGE_MESSAGES',
        'READ_MESSAGE_HISTORY',
        'CONNECT',
        'SPEAK',
      ],
    },
    // Allow team members to see and send messages
    {
      id: teamRoleId,
      allow: [
        'VIEW_CHANNEL',
        'SEND_MESSAGES',
        'READ_MESSAGE_HISTORY',
        'VIEW_CHANNEL',
        'CONNECT',
        'SPEAK',
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
