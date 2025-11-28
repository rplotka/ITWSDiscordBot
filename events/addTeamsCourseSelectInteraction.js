const { Course } = require('../core/db');
const logger = require('../core/logging');
const { addTeamsModalFactory } = require('../core/utils');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * Handles course selection for add-teams command
   * Shows a modal to enter team names
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    if (
      !interaction.isStringSelectMenu() ||
      interaction.customId !== 'course-add-teams' ||
      !interaction.values.length
    )
      return;

    const courseId = interaction.values[0];
    logger.info(
      `${interaction.user.tag} selected course ID ${courseId} to ADD TEAMS`
    );

    try {
      // Verify course exists
      const course = await Course.findByPk(courseId);
      if (!course) {
        await interaction.reply({
          content: '❌ Course not found.',
          ephemeral: true,
        });
        return;
      }

      // Show modal for team names - must be done within 3 seconds
      await interaction.showModal(addTeamsModalFactory(courseId));
      logger.info(`Add teams modal shown for course ${course.title}`);
    } catch (error) {
      logger.error('Error in add-teams course selection:', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true,
          });
        }
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};
