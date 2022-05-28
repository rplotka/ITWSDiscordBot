const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  CommandInteraction,
  MessageButton,
  MessageActionRow,
} = require('discord.js');
const logger = require('../core/logging');
const { userRoles } = require('../core/constants');
const {
  addCourseModalFactory,
  courseSelectorActionRowFactory,
} = require('../core/utils');
const { Course, CourseTeam } = require('../core/db');

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
    } else if (subcommandGroup === 'courses' && subcommand === 'remove') {
      // Generate list of courses
      const courses = await Course.findAll({
        include: [{ model: CourseTeam, as: 'CourseTeams' }],
      });
      const row = courseSelectorActionRowFactory('remove', courses);

      // Discord gets mad if we send a select menu with no options so we check for that
      if (courses.length === 0) {
        await interaction.reply({
          content: 'ℹ️ There are no courses to remove.',
          ephemeral: true,
        });
        return;
      }

      // Send a message with a select menu of courses
      // When selected, a new interaction will be fired with the custom ID specified
      // Another event handler can pick this up and complete the joining or leaving of the course
      await interaction.reply({
        content: `❔ Choose a course to **remove**. Note that this will lose message history.`,
        components: [row],
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        ephemeral: true,
        content: 'Coming soon!',
      });
    }
  },
};
