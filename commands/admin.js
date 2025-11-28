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

    // CRITICAL: /admin courses add - Show modal IMMEDIATELY, no checks, no logging
    // This must be the FIRST thing we do - Discord gives us 3 seconds
    if (subcommandGroup === 'courses' && subcommand === 'add') {
      // Show modal immediately - don't check anything first, just show it
      try {
        await interaction.showModal(addCourseModalFactory());
        // Only log after modal is shown
        logger.info(
          `Modal shown for /admin courses add by ${interaction.user.tag}`
        );
      } catch (error) {
        // If modal fails, it's probably too late - interaction expired
        logger.error('Failed to show modal:', error.message);
        // Try to reply if still possible
        if (!interaction.replied && !interaction.deferred) {
          try {
            await interaction.reply({
              content:
                '❌ Failed to show form. The interaction may have timed out. Please try again.',
              ephemeral: true,
            });
          } catch (replyError) {
            // Interaction is definitely expired
            logger.error('Interaction expired, cannot reply');
          }
        }
      }
      return; // Exit immediately after showing modal
    }

    // Defer reply for commands that need database queries
    if (subcommandGroup === 'courses' && subcommand === 'remove') {
      // Defer reply if not already deferred (should be deferred by command handler)
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      // Check if database is available
      if (!Course || !CourseTeam) {
        logger.error('Database models not available');
        await interaction.editReply({
          content: '❌ Database is not available. Please contact a Moderator!',
        });
        return;
      }

      try {
        // Generate list of courses with timeout wrapper
        const withTimeout = (queryPromise, timeoutMs = 8000) => {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Database query timed out'));
            }, timeoutMs);
          });
          return Promise.race([queryPromise, timeoutPromise]);
        };

        const courses = await withTimeout(
          Course.findAll({
            include: [{ model: CourseTeam, as: 'CourseTeams' }],
          })
        );
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
        logger.error(`Error message: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);

        let errorMessage =
          '❌ Something went wrong... Please contact a Moderator!';
        if (error.message && error.message.includes('timed out')) {
          errorMessage =
            '❌ Database query timed out. The database may be slow or unavailable. Please try again or contact a Moderator!';
        } else if (error.message) {
          errorMessage = `❌ Error: ${error.message}. Please contact a Moderator!`;
        }

        await interaction.editReply({
          content: errorMessage,
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
