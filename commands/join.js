const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  CommandInteraction,
  MessageActionRow,
  MessageSelectMenu,
} = require('discord.js');
const { Op } = require('sequelize');
const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');
const {
  courseSelectorActionRowFactory,
  courseTeamSelectorActionRowFactory,
} = require('../core/utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join/leave a course and/or a course team.')
    .addSubcommand((sc) => sc.setName('course').setDescription('Join a course'))
    .addSubcommand((sc) =>
      sc.setName('team').setDescription('Join a course team')
    ),
  /**
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    const target = interaction.options.getSubcommand(); // "course" or "team"

    const memberRoleIds = interaction.member.roles.cache.map((role) => role.id);

    if (target === 'course') {
      const courses = await Course.findAll({
        where: {
          discordRoleId: {
            [Op.notIn]: memberRoleIds,
          },
        },
      });
      const row = courseSelectorActionRowFactory('join', courses);

      // Discord gets mad if we send a select menu with no options so we check for that
      if (courses.length === 0) {
        await interaction.reply({
          content: 'ℹ️ There are no other courses to join.',
          ephemeral: true,
        });
        return;
      }

      // Send a message with a select menu of courses
      // When selected, a new interaction will be fired with the custom ID specified
      // Another event handler can pick this up and complete the joining or leaving of the course
      await interaction.reply({
        content: `❔ Choose a course to **join**.`,
        components: [row],
        ephemeral: true,
      });
    } else if (target === 'team') {
      // Find the course teams that are for the courses the member is in and aren't currently in
      const courseTeams = await CourseTeam.findAll({
        where: {
          '$Course.discordRoleId$': {
            [Op.in]: memberRoleIds,
          },
          discordRoleId: {
            [Op.notIn]: memberRoleIds,
          },
        },
        include: [{ model: Course, as: 'Course' }],
      });

      // Generate select menu of these teams
      const row = courseTeamSelectorActionRowFactory('join', courseTeams);

      // Discord gets mad if we send a select menu with no options so we check for that
      if (courseTeams.length === 0) {
        const currentCourses = await Course.findAll({
          where: {
            discordRoleId: {
              [Op.in]: memberRoleIds,
            },
          },
        });
        await interaction.reply({
          content: `ℹ️ There are no teams in your courses **${currentCourses
            .map((course) => course.title)
            .join(', ')}** to join.`,
          ephemeral: true,
        });
        return;
      }

      // Send a message with a select menu of course teams
      // When selected, a new interaction will be fired with the custom ID specified
      // Another event handler can pick this up and complete the joining or leaving of the course team
      await interaction.reply({
        content: `❔ Choose a course team to **join**.`,
        components: [row],
        ephemeral: true,
      });
    }
  },
};
