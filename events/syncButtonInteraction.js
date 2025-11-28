const { Course } = require('../core/db');
const logger = require('../core/logging');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * Handles sync button interactions
   * @param {import('discord.js').ButtonInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('sync-')) return;

    const action = interaction.customId;
    logger.info(`Sync button pressed: ${action} by ${interaction.user.tag}`);

    try {
      if (action === 'sync-dismiss') {
        await interaction.update({
          content: 'Sync report dismissed.',
          components: [],
        });
        return;
      }

      if (action === 'sync-import-orphans') {
        await interaction.deferUpdate();

        // For now, just acknowledge - importing orphaned roles would require
        // parsing the role names to extract course info, which is complex
        await interaction.editReply({
          content:
            '**Import Orphans** - This feature is not yet implemented.\n\n' +
            'To track these roles, use `/add course` to create courses in the database.\n\n' +
            'The orphaned roles detected are Discord roles that match course/instructor naming patterns ' +
            'but are not tracked in the database.',
          components: [],
        });
        return;
      }

      if (action === 'sync-clean-db') {
        await interaction.deferUpdate();

        if (!Course) {
          await interaction.editReply({
            content: 'Database is not available.',
            components: [],
          });
          return;
        }

        // This would remove database entries that reference non-existent Discord resources
        // For safety, just acknowledge for now
        await interaction.editReply({
          content:
            '**Clean Database** - This feature is not yet implemented.\n\n' +
            'This would remove database entries for roles/channels that no longer exist in Discord.\n\n' +
            'For now, you can manually remove courses using `/remove course`.',
          components: [],
        });
        return;
      }

      // Unknown action
      await interaction.reply({
        content: `Unknown sync action: ${action}`,
        ephemeral: true,
      });
    } catch (error) {
      logger.error(`Error handling sync button ${action}:`, error);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: `Error: ${error.message}`,
            components: [],
          });
        } else {
          await interaction.reply({
            content: `Error: ${error.message}`,
            ephemeral: true,
          });
        }
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};
