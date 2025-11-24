// JSDoc types: CommandInteraction
const logger = require('../core/logging');
const { isModeratorOrAbove } = require('../core/permissions');

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

    if (!command) return;

    // Check permissions
    if (command.isModeratorOnly) {
      try {
        await isModeratorOrAbove(interaction.member);
      } catch (error) {
        await interaction.reply({
          content: '❌ Only moderators can run that command!',
          ephemeral: true,
        });
        return;
      }
    }

    try {
      logger.info(
        `${interaction.user} issued command '${interaction.commandName}'`
      );
      await command.execute(interaction);
    } catch (error) {
      logger.error(error);
      await interaction[interaction.replied ? 'followUp' : 'reply']({
        content: '❌ There was an error while executing this command!',
        ephemeral: true,
      });
    }
  },
};
