const { SlashCommandBuilder } = require('@discordjs/builders');
const { Op } = require('sequelize');
const { Course, CourseTeam } = require('../core/db');
const {
  courseSelectorActionRowFactory,
  courseTeamSelectorActionRowFactory,
} = require('../core/utils');
const logger = require('../core/logging');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join a course or a course team.')
    .addSubcommand((sc) => sc.setName('course').setDescription('Join a course'))
    .addSubcommand((sc) =>
      sc.setName('team').setDescription('Join a course team')
    ),
  /**
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    // Defer reply to prevent timeout during database queries
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getSubcommand(); // "course" or "team"

    const memberRoleIds = interaction.member.roles.cache.map((role) => role.id);

    try {
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
          await interaction.editReply({
            content: 'ℹ️ There are no other courses to join.',
          });
          return;
        }

        // Send a message with a select menu of courses
        // When selected, a new interaction will be fired with the custom ID specified
        // Another event handler can pick this up and complete the joining or leaving of the course
        await interaction.editReply({
          content: `❔ Choose a course to **join**.`,
          components: [row],
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
          await interaction.editReply({
            content: `ℹ️ There are no teams in your courses **${currentCourses
              .map((course) => course.title)
              .join(', ')}** to join.`,
          });
          return;
        }

        // Send a message with a select menu of course teams
        // When selected, a new interaction will be fired with the custom ID specified
        // Another event handler can pick this up and complete the joining or leaving of the course team
        await interaction.editReply({
          content: `❔ Choose a course team to **join**.`,
          components: [row],
        });
      }
    } catch (error) {
      logger.error(`Error in /join ${target} command:`, error);
      await interaction.editReply({
        content: '❌ Something went wrong... Please contact a Moderator!',
      });
    }
  },
};
