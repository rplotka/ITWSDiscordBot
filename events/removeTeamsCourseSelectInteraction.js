const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');
const { removeTeamsSelectorActionRowFactory } = require('../core/utils');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * Handles course selection for remove-teams command
   * Shows a multi-select dropdown of teams to remove
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    if (
      !interaction.isStringSelectMenu() ||
      interaction.customId !== 'course-remove-teams' ||
      !interaction.values.length
    )
      return;

    const courseId = interaction.values[0];
    logger.info(
      `${interaction.user.tag} selected course ID ${courseId} to REMOVE TEAMS`
    );

    try {
      // Use deferUpdate since we're updating the original message
      await interaction.deferUpdate();

      // Get the course with its teams
      const course = await Course.findByPk(courseId, {
        include: [{ model: CourseTeam, as: 'CourseTeams' }],
      });

      if (!course) {
        await interaction.editReply({
          content: '❌ Course not found.',
          components: [],
        });
        return;
      }

      if (!course.CourseTeams || course.CourseTeams.length === 0) {
        await interaction.editReply({
          content: `ℹ️ **${course.title}** has no teams to remove.`,
          components: [],
        });
        return;
      }

      // Show team multi-select
      const row = removeTeamsSelectorActionRowFactory(
        courseId,
        course.CourseTeams
      );
      await interaction.editReply({
        content: `❔ Select teams to **remove** from **${course.title}**:\n\n⚠️ This will delete the team roles, channels, and all message history.`,
        components: [row],
      });
    } catch (error) {
      logger.error('Error in remove-teams course selection:', error);
      try {
        await interaction.editReply({
          content: `❌ Error: ${error.message}`,
          components: [],
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};
