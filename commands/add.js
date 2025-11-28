const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  addCourseModalFactory,
  courseSelectorActionRowFactory,
} = require('../core/utils');
const { Course } = require('../core/db');
const logger = require('../core/logging');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Add courses or teams (Moderator only)')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('course')
        .setDescription('Add a new course with roles and channels')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('team')
        .setDescription('Add team(s) to an existing course')
    ),
  isModeratorOnly: true,
  /**
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    logger.info(`/add ${subcommand}: ${interaction.user.tag}`);

    // /add course - Show modal immediately (no defer - modal must be shown within 3 seconds)
    if (subcommand === 'course') {
      try {
        await interaction.showModal(addCourseModalFactory());
        logger.info('Add course modal shown');
      } catch (error) {
        logger.error('Error showing add course modal:', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: `❌ Error: ${error.message}`,
            ephemeral: true,
          });
        }
      }
      return;
    }

    // /add team - Show course selector
    if (subcommand === 'team') {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      if (!Course) {
        logger.error('add team: Database models not available');
        await interaction.editReply({
          content: '❌ Database is not available. Please contact a Moderator!',
        });
        return;
      }

      try {
        const courses = await Course.findAll();

        if (courses.length === 0) {
          await interaction.editReply({
            content:
              'ℹ️ No courses available. Create a course first with `/add course`.',
          });
          return;
        }

        const row = courseSelectorActionRowFactory('add-teams', courses);
        await interaction.editReply({
          content: '❔ Choose a course to **add teams** to:',
          components: [row],
        });
      } catch (error) {
        logger.error('Error in /add team command:', error);
        await interaction.editReply({
          content: `❌ Error: ${error.message}. Please contact a Moderator!`,
        });
      }
    }
  },
};
