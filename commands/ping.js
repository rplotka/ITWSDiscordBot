const { SlashCommandBuilder } = require('@discordjs/builders');
const { CommandInteraction } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  /**
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    await interaction.reply('Hi');
  },
};
