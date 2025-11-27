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
