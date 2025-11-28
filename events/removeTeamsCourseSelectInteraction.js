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
      interaction.customId !== 'remove-teams' ||
      !interaction.values.length
    )
      return;

    const courseId = interaction.values[0];
    logger.info(
      `removeTeamsCourseSelect: ${interaction.user.tag} selected course ID ${courseId}`
    );

    try {
      // Defer and show loading message immediately
      logger.info('removeTeamsCourseSelect: Deferring update');
      await interaction.deferUpdate();

      // Show loading state while we fetch from database
      logger.info('removeTeamsCourseSelect: Showing loading message');
      await interaction.editReply({
        content: '⏳ Loading teams...',
        components: [],
      });

      // Get the course with its teams
      logger.info('removeTeamsCourseSelect: Querying database');
      const course = await Course.findByPk(courseId, {
        include: [{ model: CourseTeam, as: 'CourseTeams' }],
      });
      logger.info(
        `removeTeamsCourseSelect: Query complete, course=${
          course ? course.title : 'null'
        }`
      );

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

      logger.info(
        `removeTeamsCourseSelect: Found ${course.CourseTeams.length} teams`
      );

      // Show team multi-select
      const row = removeTeamsSelectorActionRowFactory(
        courseId,
        course.CourseTeams
      );
      await interaction.editReply({
        content: `❔ Select teams to **remove** from **${course.title}**:\n\n⚠️ This will delete the team roles, channels, and all message history.`,
        components: [row],
      });
      logger.info('removeTeamsCourseSelect: Successfully showed team selector');
    } catch (error) {
      logger.error('Error in remove-teams course selection:', error);
      logger.error(`removeTeamsCourseSelect error: ${error.message}`);
      logger.error(`removeTeamsCourseSelect stack: ${error.stack}`);
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
