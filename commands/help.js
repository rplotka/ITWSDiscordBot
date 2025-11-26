const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../core/logging');

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
      const commandList = [];

      // Build list of commands
      commands.forEach((command) => {
        try {
          const name = `\`/${command.data.name}\``;
          const description = command.data.description || 'No description';
          const isModOnly = command.isModeratorOnly ? ' (Moderator only)' : '';
          commandList.push(`${name} - ${description}${isModOnly}`);
        } catch (err) {
          logger.error('Error processing command in help:', err);
        }
      });
      
      if (commandList.length === 0) {
        commandList.push('No commands available');
      }

      // Create embed
      const description = commandList.join('\n');
      const embed = new EmbedBuilder()
        .setTitle('🤖 Available Commands')
        .setDescription(description.length > 4096 ? `${description.substring(0, 4093)}...` : description)
        .setColor(0x5865f2) // Discord blurple color
        .setTimestamp()
        .setFooter({ text: 'ITWS Discord Bot' });

      logger.info(`Help command: Sending embed with ${commandList.length} commands`);
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

