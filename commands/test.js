const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require('discord.js');
const { userRoles } = require('../core/constants');
const logger = require('../core/logging');

const roleButtonsMessageActionRowFactory = (roles) =>
  new ActionRowBuilder().addComponents(
    roles.map((userRole) => {
      if (userRole.customId) {
        return new ButtonBuilder()
          .setCustomId(`set-role-${userRole.customId}`)
          .setLabel(userRole.label)
          .setStyle(ButtonStyle.Primary);
      }

      return new ButtonBuilder()
        .setURL(userRole.url)
        .setLabel(userRole.label)
        .setStyle(ButtonStyle.Link);
    })
  );

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Test something')
    .addStringOption((op) =>
      op
        .setName('item')
        .setDescription('The test to run')
        .setRequired(true)
        .addChoices({ name: 'Send Role Button', value: 'role-button' })
    ),
  isModeratorOnly: true,
  /**
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    logger.info(`Test command executed by ${interaction.user.tag}`);
    
    try {
      // Defer reply immediately to avoid timeout
      await interaction.deferReply({ ephemeral: true });
      
      logger.info(`Attempting to create role buttons for channel ${interaction.channel.id}`);
      const row = roleButtonsMessageActionRowFactory(userRoles);
      
      logger.info(`Sending message to channel ${interaction.channel.id}`);
      await interaction.channel.send({
        content:
          '**Please select a role below in order to gain access to the server.**',
        components: [row],
      });
      
      logger.info('Successfully sent role buttons message');
      
      await interaction.editReply({
        content: '✅ Message sent successfully!',
      });
    } catch (error) {
      logger.error('Error in test command:', error);
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);
      
      // Try to send error message
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
