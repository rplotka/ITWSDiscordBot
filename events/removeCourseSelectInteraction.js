// JSDoc types: CommandInteraction
const { Course } = require('../core/db');
const logger = require('../core/logging');
const { removeCourse } = require('../core/utils');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   *
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    // Early exit if not our interaction
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== 'remove-course') return;
    if (!interaction.values.length) return;

    const courseId = interaction.values[0];
    logger.info(`${interaction.user} selected course ID ${courseId} to REMOVE`);

    // CRITICAL: Defer IMMEDIATELY - must be first async operation
    // Discord gives us only 3 seconds to acknowledge
    try {
      await interaction.deferUpdate();
    } catch (deferError) {
      logger.error('Failed to defer remove-course interaction:', deferError);
      return;
    }

    // Wrap remaining logic in try-catch
    try {
      // Check if database is available
      if (!Course) {
        logger.error('Course model not available - database not connected');
        await interaction.editReply({
          components: [],
          content: '❌ Database is not available. Please contact a Moderator!',
        });
        return;
      }

      // Find course they want to REMOVE
      const course = await Course.findByPk(courseId);

      // Check if course exists
      if (!course) {
        await interaction.editReply({
          components: [],
          content: '❌ Course not found.',
        });
        return;
      }

      // Update status to show we're working on it
      await interaction.editReply({
        content: `⏳ Removing **${course.title}**...`,
        components: [],
      });

      // Attempt to remove course and all data
      try {
        await removeCourse(interaction.guild, course);
        logger.info(
          `Successfully removed course '${course.title}' (${course.id})`
        );
      } catch (error) {
        await interaction.editReply({
          content: `❌ Failed to remove course: ${error.message}. Please contact a Moderator!`,
          components: [],
        });
        logger.error(
          `Failed to remove course '${course.title}' (${course.id})`
        );
        logger.error(error);
        return;
      }

      // Update status
      await interaction.editReply({
        content: `❎ You have **removed** **${course.title}** along with its roles and channels.`,
        components: [],
      });
    } catch (error) {
      // Catch any unhandled errors
      logger.error('Unhandled error in removeCourseSelectInteraction:', error);
      logger.error(`Error message: ${error.message || 'No error message'}`);
      logger.error(`Error stack: ${error.stack || 'No stack trace'}`);

      // Try to respond if possible
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: `❌ An unexpected error occurred: ${error.message}. Please contact a Moderator!`,
            components: [],
          });
        } else {
          await interaction.reply({
            content: `❌ An unexpected error occurred: ${error.message}. Please contact a Moderator!`,
            ephemeral: true,
          });
        }
      } catch (replyError) {
        logger.error('Failed to send error message:', replyError);
      }
    }
  },
};
