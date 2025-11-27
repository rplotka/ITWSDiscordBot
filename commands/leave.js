const { SlashCommandBuilder } = require('@discordjs/builders');
const { Op } = require('sequelize');
const { Course, CourseTeam } = require('../core/db');
const {
  courseSelectorActionRowFactory,
  courseTeamSelectorActionRowFactory,
} = require('../core/utils');
const logger = require('../core/logging');

/**
 * Wraps a database query with a timeout
 * @param {Promise} queryPromise - The database query promise
 * @param {number} timeoutMs - Timeout in milliseconds (default: 8000)
 * @returns {Promise} The query result or throws timeout error
 */
function withTimeout(queryPromise, timeoutMs = 8000) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Database query timed out'));
    }, timeoutMs);
  });
  return Promise.race([queryPromise, timeoutPromise]);
}

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
    // Defer reply if not already deferred (should be deferred by command handler)
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    // Check if database is available
    if (!Course || !CourseTeam) {
      logger.error('Database models not available');
      await interaction.editReply({
        content: '❌ Database is not available. Please contact a Moderator!',
      });
      return;
    }

    const target = interaction.options.getSubcommand(); // "course" or "team"

    const memberRoleIds = interaction.member.roles.cache.map((role) => role.id);

    try {
      if (target === 'course') {
        const courses = await withTimeout(
          Course.findAll({
            where: {
              discordRoleId: {
                [Op.in]: memberRoleIds,
              },
            },
          })
        );
        const row = courseSelectorActionRowFactory('leave', courses);

        // Discord gets mad if we send a select menu with no options so we check for that
        if (courses.length === 0) {
          await interaction.editReply({
            content: 'ℹ️ You are not in any courses.',
          });
          return;
        }

        // Send a message with a select menu of courses
        // When selected, a new interaction will be fired with the custom ID specified
        // Another event handler can pick this up and complete the joining or leaving of the course
        await interaction.editReply({
          content: `❔ Choose a course to **leave**.`,
          components: [row],
        });
      } else if (target === 'team') {
        // Find the course teams that the member is currently in
        const courseTeams = await withTimeout(
          CourseTeam.findAll({
            where: {
              discordRoleId: {
                [Op.in]: memberRoleIds,
              },
            },
            include: [{ model: Course, as: 'Course' }],
          })
        );

        // Discord gets mad if we send a select menu with no options so we check for that
        if (courseTeams.length === 0) {
          await interaction.editReply({
            content: 'ℹ️ You are not in any course teams.',
          });
          return;
        }

        // Generate select menu of these teams
        const row = courseTeamSelectorActionRowFactory('leave', courseTeams);

        // Send a message with a select menu of course teams
        // When selected, a new interaction will be fired with the custom ID specified
        // Another event handler can pick this up and complete the joining or leaving of the course team
        await interaction.editReply({
          content: `❔ Choose a course team to **leave**.`,
          components: [row],
        });
      }
    } catch (error) {
      logger.error(`Error in /leave ${target} command:`, error);
      logger.error(`Error message: ${error.message}`);
      logger.error(`Error stack: ${error.stack}`);

      let errorMessage =
        '❌ Something went wrong... Please contact a Moderator!';
      if (error.message && error.message.includes('timed out')) {
        errorMessage =
          '❌ Database query timed out. The database may be slow or unavailable. Please try again or contact a Moderator!';
      } else if (error.message) {
        errorMessage = `❌ Error: ${error.message}. Please contact a Moderator!`;
      }

      await interaction.editReply({
        content: errorMessage,
      });
    }
  },
};
