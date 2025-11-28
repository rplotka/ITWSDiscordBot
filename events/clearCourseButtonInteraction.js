const { Course } = require('../core/db');
const logger = require('../core/logging');
const { clearCourse } = require('../core/utils');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * Handles clear course confirmation buttons
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    if (!interaction.isButton()) return;

    // Handle cancel button
    if (interaction.customId === 'clear-cancel') {
      await interaction.update({
        content: '❌ Course clear cancelled.',
        components: [],
      });
      return;
    }

    // Handle clear confirmation buttons
    const isConfirm = interaction.customId.startsWith('clear-confirm-');
    const isConfirmWithTeams = interaction.customId.startsWith(
      'clear-confirm-teams-'
    );

    if (!isConfirm && !isConfirmWithTeams) return;

    // Extract course ID
    let courseId;
    if (isConfirmWithTeams) {
      courseId = interaction.customId.replace('clear-confirm-teams-', '');
    } else {
      courseId = interaction.customId.replace('clear-confirm-', '');
    }

    logger.info(
      `clearCourseButton: ${interaction.user.tag} confirmed clear for course ID ${courseId}, removeTeams=${isConfirmWithTeams}`
    );

    try {
      await interaction.deferUpdate();

      // Show progress
      await interaction.editReply({
        content: '⏳ Clearing course... This may take a moment.',
        components: [],
      });

      // Get the course
      const course = await Course.findByPk(courseId);
      if (!course) {
        await interaction.editReply({
          content: '❌ Course not found.',
          components: [],
        });
        return;
      }

      // Clear the course
      const results = await clearCourse(interaction.guild, course, {
        removeStudents: true,
        clearMessages: true,
        removeTeams: isConfirmWithTeams,
      });

      // Success message
      let summary = `✅ **Cleared "${course.title}"!**\n\n`;
      summary += `• Removed **${results.studentsRemoved}** student(s)\n`;
      summary += `• Cleared **${results.messagesCleared}** channel(s)\n`;
      if (isConfirmWithTeams) {
        summary += `• Removed **${results.teamsRemoved}** team(s)\n`;
      }

      await interaction.editReply({
        content: summary,
        components: [],
      });

      logger.info(
        `clearCourseButton: Successfully cleared ${course.title} - ${results.studentsRemoved} students, ${results.messagesCleared} channels, ${results.teamsRemoved} teams`
      );
    } catch (error) {
      logger.error('Error clearing course:', error);
      try {
        await interaction.editReply({
          content: `❌ Error clearing course: ${error.message}`,
          components: [],
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};
