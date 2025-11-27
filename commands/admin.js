const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  addCourseModalFactory,
  courseSelectorActionRowFactory,
} = require('../core/utils');
const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');

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

    // Show modal immediately - must happen before any deferReply
    // Modals cannot be shown after deferring a reply
    if (subcommandGroup === 'courses' && subcommand === 'add') {
      // Check if already deferred - if so, we can't show modal
      if (interaction.deferred || interaction.replied) {
        logger.error(
          `Cannot show modal - interaction already ${
            interaction.deferred ? 'deferred' : 'replied'
          }`
        );
        try {
          await interaction.editReply({
            content:
              '❌ Cannot show form - interaction already responded. Please try the command again.',
            ephemeral: true,
          });
        } catch (replyError) {
          logger.error('Failed to send error reply:', replyError);
        }
        return;
      }

      try {
        await interaction.showModal(addCourseModalFactory());
        logger.info(
          `Modal shown for /admin courses add by ${interaction.user.tag}`
        );
      } catch (error) {
        logger.error('Error showing modal:', error);
        logger.error(`Error message: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
        // If modal fails, try to reply with error
        if (!interaction.replied && !interaction.deferred) {
          try {
            await interaction.reply({
              content:
                '❌ Failed to show course creation form. Please contact a Moderator!',
              ephemeral: true,
            });
          } catch (replyError) {
            logger.error('Failed to send error reply:', replyError);
          }
        }
      }
      return;
    }

    // Defer reply for commands that need database queries
    if (subcommandGroup === 'courses' && subcommand === 'remove') {
      await interaction.deferReply({ ephemeral: true });
      try {
        // Generate list of courses
        const courses = await Course.findAll({
          include: [{ model: CourseTeam, as: 'CourseTeams' }],
        });
        const row = courseSelectorActionRowFactory('remove', courses);

        // Discord gets mad if we send a select menu with no options so we check for that
        if (courses.length === 0) {
          await interaction.editReply({
            content: 'ℹ️ There are no courses to remove.',
          });
          return;
        }

        // Send a message with a select menu of courses
        // When selected, a new interaction will be fired with the custom ID specified
        // Another event handler can pick this up and complete the joining or leaving of the course
        await interaction.editReply({
          content: `❔ Choose a course to **remove**. Note that this will lose message history.`,
          components: [row],
        });
      } catch (error) {
        logger.error('Error in /admin courses remove command:', error);
        await interaction.editReply({
          content: '❌ Something went wrong... Please contact a Moderator!',
        });
      }
    } else {
      await interaction.deferReply({ ephemeral: true });
      await interaction.editReply({
        content: 'Coming soon!',
      });
    }
  },
};
