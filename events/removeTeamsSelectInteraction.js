const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');
const { removeTeams } = require('../core/utils');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * Handles team selection for removal
   * Removes selected teams from the course
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    // Check if this is a teams-remove select menu
    if (
      !interaction.isStringSelectMenu() ||
      !interaction.customId.startsWith('teams-remove-') ||
      !interaction.values.length
    )
      return;

    // Extract course ID from customId (format: teams-remove-{courseId})
    const courseId = interaction.customId.replace('teams-remove-', '');
    const teamIds = interaction.values;

    logger.info(
      `${interaction.user.tag} selected ${teamIds.length} team(s) to remove from course ID ${courseId}`
    );

    try {
      // Use deferUpdate since we're updating the original message
      await interaction.deferUpdate();

      // Get the course
      const course = await Course.findByPk(courseId);
      if (!course) {
        await interaction.editReply({
          content: '❌ Course not found.',
          components: [],
        });
        return;
      }

      // Get the teams to remove
      const teams = await CourseTeam.findAll({
        where: {
          id: teamIds,
          CourseId: courseId,
        },
      });

      if (teams.length === 0) {
        await interaction.editReply({
          content: '❌ No valid teams found to remove.',
          components: [],
        });
        return;
      }

      // Show progress message
      await interaction.editReply({
        content: `⏳ Removing ${teams.length} team(s) from **${course.title}**...`,
        components: [],
      });

      // Get team names before deletion
      const teamNames = teams.map((t) => t.title);

      // Remove the teams
      await removeTeams(interaction.guild, teams);

      // Success message
      const teamList = teamNames.map((name) => `• ${name}`).join('\n');
      await interaction.editReply({
        content:
          `✅ **Removed ${teams.length} team(s) from ${course.title}!**\n\n` +
          `${teamList}\n\n` +
          `The team roles, channels, and message history have been deleted.`,
        components: [],
      });

      logger.info(
        `Successfully removed ${teams.length} teams from course ${course.title}`
      );
    } catch (error) {
      logger.error('Error removing teams:', error);
      try {
        await interaction.editReply({
          content: `❌ Failed to remove teams: ${error.message}`,
          components: [],
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};
