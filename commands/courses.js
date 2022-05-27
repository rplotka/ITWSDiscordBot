const { SlashCommandBuilder } = require('@discordjs/builders');
const { CommandInteraction } = require('discord.js');
const { Course } = require('../core/db');
const { createCourseMessageEmbed } = require('../core/utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('courses')
    .setDescription('Manage your courses.')
    .addSubcommand((subcommand) =>
      subcommand.setName('list').setDescription('List the available courses')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('join')
        .setDescription('Join a course')
        .addStringOption((option) =>
          option
            .setName('course')
            .setDescription('ID or title of the course to join')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('leave')
        .setDescription('Leave a course')
        .addStringOption((option) =>
          option
            .setName('course')
            .setDescription('ID or title of the course to leave')
            .setRequired(true)
        )
    ),
  /**
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    const courses = await Course.findAll();

    // Check if users want to list, join, or leave a course
    if (subcommand === 'list') {
      interaction.reply({
        content:
          'Here are the current courses. You can join them with `/courses join coursename`.',
        embeds: courses.map(createCourseMessageEmbed),
        ephemeral: true,
      });
    }
  },
};
