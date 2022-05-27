const { SlashCommandBuilder } = require('@discordjs/builders');
const { CommandInteraction } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Test something'),
  /**
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    interaction.client.emit('guildMemberAdd', interaction.member);
  },
};
