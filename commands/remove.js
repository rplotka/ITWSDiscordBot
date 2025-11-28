const { SlashCommandBuilder } = require('@discordjs/builders');
const { courseSelectorActionRowFactory } = require('../core/utils');
const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove courses or teams (Moderator only)')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('course')
        .setDescription('Remove a course and all its roles/channels')
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('team').setDescription('Remove team(s) from a course')
    ),
  isModeratorOnly: true,
  /**
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    logger.info(`/remove ${subcommand}: ${interaction.user.tag}`);

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    if (!Course) {
      logger.error('remove: Database models not available');
      await interaction.editReply({
        content: '❌ Database is not available. Please contact a Moderator!',
      });
      return;
    }

    // /remove course - Show course selector
    if (subcommand === 'course') {
      try {
        const courses = await Course.findAll();

        if (courses.length === 0) {
          await interaction.editReply({
            content: 'ℹ️ There are no courses to remove.',
          });
          return;
        }

        const row = courseSelectorActionRowFactory('remove', courses);
        await interaction.editReply({
          content:
            '❔ Choose a course to **remove**:\n\n' +
            '⚠️ This will delete the course role, category, all channels, and all teams.',
          components: [row],
        });
      } catch (error) {
        logger.error('Error in /remove course command:', error);
        await interaction.editReply({
          content: `❌ Error: ${error.message}. Please contact a Moderator!`,
        });
      }
      return;
    }

    // /remove team - Show course selector, then team multi-select
    if (subcommand === 'team') {
      try {
        // Get courses that have teams
        const courses = await Course.findAll({
          include: [{ model: CourseTeam, as: 'CourseTeams' }],
        });

        // Filter to only courses with teams
        const coursesWithTeams = courses.filter(
          (c) => c.CourseTeams && c.CourseTeams.length > 0
        );

        if (coursesWithTeams.length === 0) {
          await interaction.editReply({
            content: 'ℹ️ There are no courses with teams to remove.',
          });
          return;
        }

        const row = courseSelectorActionRowFactory(
          'remove-teams',
          coursesWithTeams
        );
        await interaction.editReply({
          content: '❔ Choose a course to **remove teams** from:',
          components: [row],
        });
      } catch (error) {
        logger.error('Error in /remove team command:', error);
        await interaction.editReply({
          content: `❌ Error: ${error.message}. Please contact a Moderator!`,
        });
      }
    }
  },
};
