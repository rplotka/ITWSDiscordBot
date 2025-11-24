const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require('discord.js');
const { userRoles } = require('../core/constants');

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
    const row = roleButtonsMessageActionRowFactory(userRoles);
    await interaction.reply({
      content: 'Sending message...',
      ephemeral: true,
    });
    await interaction.channel.send({
      content:
        '**Please select a role below in order to gain access to the server.**',
      components: [row],
    });
  },
};
