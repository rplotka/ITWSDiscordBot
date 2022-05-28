const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  CommandInteraction,
  MessageButton,
  MessageActionRow,
} = require('discord.js');
const logger = require('../core/logging');
const { userRoles } = require('../core/constants');
const { addCourseModalFactory } = require('../core/utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Test something')
    .addSubcommandGroup((group) =>
      group
        .setName('courses')
        .setDescription('Manage courses')
        .addSubcommand((subcommand) =>
          subcommand
            .setName('add')
            .setDescription('Add a new course and generate roles and channels')
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('add-teams')
            .setDescription(
              'Add new teams for a course and generate roles and channels'
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('remove')
            .setDescription('Add a new course and generate roles and channels')
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('remove-teams')
            .setDescription(
              'Remove teams from a course and remove their roles and channels'
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName('clear')
            .setDescription(
              'Reset a course by removing students and clearing channels'
            )
        )
    ),
  isModeratorOnly: true,
  /**
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    if (subcommandGroup === 'courses' && subcommand === 'add') {
      await interaction.showModal(addCourseModalFactory());
    } else {
      await interaction.reply({
        ephemeral: true,
        content: 'Coming soon!',
      });
    }
  },
};
