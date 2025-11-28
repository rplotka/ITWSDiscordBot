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
      interaction.customId !== 'add-teams' ||
      !interaction.values.length
    )
      return;

    const courseId = interaction.values[0];
    logger.info(
      `${interaction.user.tag} selected course ID ${courseId} to ADD TEAMS`
    );

    try {
      // Show modal immediately - must be done within 3 seconds
      // Course validation will happen in the modal submission handler
      await interaction.showModal(addTeamsModalFactory(courseId));
      logger.info(`Add teams modal shown for course ID ${courseId}`);
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
