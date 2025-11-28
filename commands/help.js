const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../core/logging');

/**
 * Extracts subcommands from a SlashCommandBuilder data object
 * @param {Object} commandData - The command.data object from SlashCommandBuilder
 * @returns {Array} Array of {name, description} objects for each subcommand
 */
function getSubcommands(commandData) {
  const subcommands = [];

  // Check if command has options (subcommands are stored as options)
  if (commandData.options && commandData.options.length > 0) {
    commandData.options.forEach((option) => {
      // Type 1 = SUB_COMMAND
      if (option.type === 1) {
        subcommands.push({
          name: option.name,
          description: option.description || 'No description',
        });
      }
      // Type 2 = SUB_COMMAND_GROUP - recurse into it
      if (option.type === 2 && option.options) {
        option.options.forEach((subOption) => {
          if (subOption.type === 1) {
            subcommands.push({
              name: `${option.name} ${subOption.name}`,
              description: subOption.description || 'No description',
            });
          }
        });
      }
    });
  }

  return subcommands;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all available commands and their descriptions'),
  /**
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const { commands } = interaction.client;

      // Group commands by category
      const courseCommands = [];
      const userCommands = [];
      const otherCommands = [];

      commands.forEach((command) => {
        try {
          const commandName = command.data.name;
          const isModOnly = command.isModeratorOnly || false;
          const subcommands = getSubcommands(command.data);

          if (commandName === 'course') {
            // Course management commands - show all subcommands
            subcommands.forEach((sub) => {
              courseCommands.push(
                `  \`/course ${sub.name}\` - ${sub.description}`
              );
            });
          } else if (commandName === 'join' || commandName === 'leave') {
            // User commands - show subcommands
            subcommands.forEach((sub) => {
              userCommands.push(
                `  \`/${commandName} ${sub.name}\` - ${sub.description}`
              );
            });
          } else if (commandName === 'help') {
            // Skip help in listing, we'll add it at the end
          } else if (commandName === 'test') {
            // Test command
            const modText = isModOnly ? ' *(Mod only)*' : '';
            otherCommands.push(
              `  \`/${commandName}\` - ${command.data.description}${modText}`
            );
          } else {
            // Other commands
            const modText = isModOnly ? ' *(Mod only)*' : '';
            if (subcommands.length > 0) {
              subcommands.forEach((sub) => {
                otherCommands.push(
                  `  \`/${commandName} ${sub.name}\` - ${sub.description}${modText}`
                );
              });
            } else {
              otherCommands.push(
                `  \`/${commandName}\` - ${command.data.description}${modText}`
              );
            }
          }
        } catch (err) {
          logger.error('Error processing command in help:', err);
        }
      });

      // Build the help text
      const sections = [];

      if (courseCommands.length > 0) {
        sections.push(
          `**📚 Course Management** *(Moderator only)*\n${courseCommands.join(
            '\n'
          )}`
        );
      }

      if (userCommands.length > 0) {
        sections.push(`**👤 User Commands**\n${userCommands.join('\n')}`);
      }

      if (otherCommands.length > 0) {
        sections.push(`**🔧 Other**\n${otherCommands.join('\n')}`);
      }

      // Always add help at the end
      sections.push(`**ℹ️ Help**\n  \`/help\` - List all available commands`);

      const description = sections.join('\n\n');

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle('🤖 ITWS Discord Bot Commands')
        .setDescription(
          description.length > 4096
            ? `${description.substring(0, 4093)}...`
            : description
        )
        .setColor(0x5865f2) // Discord blurple color
        .setTimestamp()
        .setFooter({ text: 'ITWS Discord Bot' });

      logger.info(`Help command: Sending embed with ${commands.size} commands`);
      await interaction.editReply({ embeds: [embed] });
      logger.info(`${interaction.user.tag} used /help command`);
    } catch (error) {
      logger.error('Error in help command:', error);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: `❌ Error: ${error.message}`,
          });
        } else {
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
