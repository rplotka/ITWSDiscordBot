const { SlashCommandBuilder } = require('@discordjs/builders');
const { courseSelectorActionRowFactory } = require('../core/utils');
const { Course } = require('../core/db');
const logger = require('../core/logging');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('course')
    .setDescription('Course management (Moderator only)')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('clear')
        .setDescription('Reset course - remove students and clear channels')
    ),
  isModeratorOnly: true,
  /**
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    // /course clear - Show course selector
    if (subcommand === 'clear') {
      logger.info(`/course clear: ${interaction.user.tag}`);

      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      if (!Course) {
        logger.error('clear: Database models not available');
        await interaction.editReply({
          content: '❌ Database is not available. Please contact a Moderator!',
        });
        return;
      }

      try {
        const courses = await Course.findAll();

        if (courses.length === 0) {
          await interaction.editReply({
            content: 'ℹ️ There are no courses to clear.',
          });
          return;
        }

        const row = courseSelectorActionRowFactory('clear', courses);
        await interaction.editReply({
          content:
            '❔ Choose a course to **clear**:\n\n' +
            '⚠️ This will:\n' +
            '• Remove all students from the course\n' +
            '• Delete all messages in course channels\n' +
            '• Optionally remove all teams',
          components: [row],
        });
        logger.info('clear: Successfully showed course selector');
      } catch (error) {
        logger.error('Error in /course clear command:', error);
        await interaction.editReply({
          content: `❌ Error: ${error.message}. Please contact a Moderator!`,
        });
      }
      return;
    }

    // Fallback for unknown subcommands
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }
    await interaction.editReply({
      content: '❌ Unknown subcommand.',
    });
  },
};
