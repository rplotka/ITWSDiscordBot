// JSDoc types: CommandInteraction
const { PermissionFlagsBits } = require('discord.js');
const logger = require('../core/logging');
const { addCourseModalFactory } = require('../core/utils');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   *
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Command not found: ${interaction.commandName}`);
      return;
    }

    // CRITICAL: For /admin courses add, show modal IMMEDIATELY before any checks
    // This must happen within 3 seconds or Discord times out
    if (
      interaction.commandName === 'admin' &&
      interaction.options.getSubcommandGroup() === 'courses' &&
      interaction.options.getSubcommand() === 'add'
    ) {
      // Show modal first, check permissions later in modal submission
      try {
        await interaction.showModal(addCourseModalFactory());
        logger.info(
          `Modal shown for /admin courses add by ${interaction.user.tag}`
        );
        return; // Exit immediately - don't do permission checks
      } catch (error) {
        logger.error('Failed to show modal:', error.message);
        // If modal fails, fall through to normal handling
      }
    }

    logger.info(
      `Received interaction: ${interaction.commandName} from ${interaction.user.tag}`
    );

    logger.info(
      `Command found: ${interaction.commandName}, isModeratorOnly: ${
        command.isModeratorOnly || false
      }`
    );

    // Check permissions - do this quickly to avoid interaction timeout
    if (command.isModeratorOnly) {
      try {
        // Check if member has permissions - Administrator or Manage Guild
        if (!interaction.member || !interaction.member.permissions) {
          logger.warn(
            `Permission check failed: member=${!!interaction.member}, permissions=${!!interaction
              .member?.permissions}`
          );
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content:
                '❌ Only moderators can run that command! (No permissions object)',
              ephemeral: true,
            });
          }
          return;
        }

        const hasAdmin = interaction.member.permissions.has(
          PermissionFlagsBits.Administrator
        );
        const hasManageGuild = interaction.member.permissions.has(
          PermissionFlagsBits.ManageGuild
        );
        const hasPermission = hasAdmin || hasManageGuild;

        logger.info(
          `Permission check for ${interaction.user.tag}: ADMINISTRATOR=${hasAdmin}, MANAGE_GUILD=${hasManageGuild}, hasPermission=${hasPermission}`
        );

        if (!hasPermission) {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: `❌ Only moderators can run that command! (You have: ADMIN=${hasAdmin}, MANAGE_GUILD=${hasManageGuild})`,
              ephemeral: true,
            });
          }
          return;
        }
      } catch (error) {
        logger.error(`Error checking permissions: ${error.message}`);
        logger.error(`Error name: ${error.name}`);
        logger.error(`Error stack: ${error.stack}`);
        logger.error(
          `PermissionFlagsBits object: ${typeof PermissionFlagsBits}, Administrator: ${typeof PermissionFlagsBits?.Administrator}`
        );
        // Only reply if interaction is still valid
        if (!interaction.replied && !interaction.deferred) {
          try {
            await interaction.deferReply({ ephemeral: true });
            await interaction.editReply({
              content: `❌ Error checking permissions: ${error.message}`,
            });
          } catch (replyError) {
            logger.error(
              `Failed to send permission error reply: ${replyError.message}`
            );
          }
        }
        return;
      }
    }

    try {
      logger.info(
        `${interaction.user} issued command '${interaction.commandName}'`
      );
      await command.execute(interaction);
    } catch (error) {
      logger.error('Error executing command:', error);
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
      try {
        await interaction[interaction.replied ? 'followUp' : 'reply']({
          content: `❌ There was an error while executing this command! ${error.message}`,
          ephemeral: true,
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};
