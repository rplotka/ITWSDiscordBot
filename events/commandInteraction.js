const { Client, CommandInteraction } = require('discord.js');
const logger = require('../core/logging');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   *
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.isCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) return;

    try {
      logger.info(
        `${interaction.user} issued command '${interaction.commandName}'`
      );
      await command.execute(interaction);
    } catch (error) {
      logger.error(error);
      await interaction[interaction.replied ? 'followUp' : 'reply']({
        content: 'There was an error while executing this command!',
        ephemeral: true,
      });
    }
  },
};
