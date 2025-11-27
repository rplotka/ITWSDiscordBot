// JSDoc types: CommandInteraction
const { PermissionFlagsBits } = require('discord.js');
const logger = require('../core/logging');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   *
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    logger.info(
      `Received interaction: ${interaction.commandName} from ${interaction.user.tag}`
    );
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`Command not found: ${interaction.commandName}`);
      return;
    }

    logger.info(
      `Command found: ${interaction.commandName}, isModeratorOnly: ${
        command.isModeratorOnly || false
      }`
    );

    // For commands that need database access, defer IMMEDIATELY to prevent timeout
    // This must happen before any other processing
    const needsDatabase = ['join', 'leave', 'admin'].includes(
      interaction.commandName
    );
    if (needsDatabase && !interaction.replied && !interaction.deferred) {
      try {
        await interaction.deferReply({ ephemeral: true });
        logger.info(`Deferred reply for ${interaction.commandName}`);
      } catch (deferError) {
        logger.error(`Failed to defer reply: ${deferError.message}`);
        // Continue anyway - command might handle its own reply
      }
    }

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
