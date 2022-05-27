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
    .setName('leave')
    .setDescription('Leave a course or a course team.')
    .addSubcommand((sc) =>
      sc.setName('course').setDescription('Leave a course you are currently in')
    )
    .addSubcommand((sc) =>
      sc
        .setName('team')
        .setDescription('Leave a course team you are currently in')
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
            [Op.in]: memberRoleIds,
          },
        },
      });
      const row = courseSelectorActionRowFactory('leave', courses);

      // Discord gets mad if we send a select menu with no options so we check for that
      if (courses.length === 0) {
        await interaction.reply({
          content: 'ℹ️ You are not in any courses.',
          ephemeral: true,
        });
        return;
      }

      // Send a message with a select menu of courses
      // When selected, a new interaction will be fired with the custom ID specified
      // Another event handler can pick this up and complete the joining or leaving of the course
      await interaction.reply({
        content: `❔ Choose a course to **leave**.`,
        components: [row],
        ephemeral: true,
      });
    } else if (target === 'team') {
      // Find the course teams that are for the courses the member is in and aren't currently in
      const courseTeams = await CourseTeam.findAll({
        where: {
          discordRoleId: {
            [Op.in]: memberRoleIds,
          },
        },
      });

      // Discord gets mad if we send a select menu with no options so we check for that
      if (courseTeams.length === 0) {
        await interaction.reply({
          content: 'ℹ️ You are not in any course teams.',
          ephemeral: true,
        });
        return;
      }

      // Generate select menu of these teams
      const row = courseTeamSelectorActionRowFactory('leave', courseTeams);

      // Send a message with a select menu of course teams
      // When selected, a new interaction will be fired with the custom ID specified
      // Another event handler can pick this up and complete the joining or leaving of the course team
      await interaction.reply({
        content: `❔ Choose a course team to **leave**.`,
        components: [row],
        ephemeral: true,
      });
    }
  },
};
