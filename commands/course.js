const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  addCourseModalFactory,
  courseSelectorActionRowFactory,
} = require('../core/utils');
const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('course')
    .setDescription('Manage courses (Moderator only)')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add')
        .setDescription('Add a new course with roles and channels')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove a course and all its roles/channels')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add-teams')
        .setDescription('Add teams to an existing course')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove-teams')
        .setDescription('Remove teams from a course')
    )
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

    // CRITICAL: /course add - Show modal IMMEDIATELY, no checks, no logging
    // This must be the FIRST thing we do - Discord gives us 3 seconds
    if (subcommand === 'add') {
      try {
        await interaction.showModal(addCourseModalFactory());
        logger.info(`Modal shown for /course add by ${interaction.user.tag}`);
      } catch (error) {
        logger.error('Failed to show modal:', error.message);
        if (!interaction.replied && !interaction.deferred) {
          try {
            await interaction.reply({
              content:
                '❌ Failed to show form. The interaction may have timed out. Please try again.',
              ephemeral: true,
            });
          } catch (replyError) {
            logger.error('Interaction expired, cannot reply');
          }
        }
      }
      return;
    }

    // /course remove - Show course selector
    if (subcommand === 'remove') {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      if (!Course || !CourseTeam) {
        logger.error('Database models not available');
        await interaction.editReply({
          content: '❌ Database is not available. Please contact a Moderator!',
        });
        return;
      }

      try {
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

        if (courses.length === 0) {
          await interaction.editReply({
            content: 'ℹ️ There are no courses to remove.',
          });
          return;
        }

        await interaction.editReply({
          content:
            '❔ Choose a course to **remove**. Note that this will lose message history.',
          components: [row],
        });
      } catch (error) {
        logger.error('Error in /course remove command:', error);
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
      return;
    }

    // /course add-teams - Show course selector, then modal for team names
    if (subcommand === 'add-teams') {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      if (!Course) {
        logger.error('Database models not available');
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
              'ℹ️ There are no courses. Create a course first with `/course add`.',
          });
          return;
        }

        const row = courseSelectorActionRowFactory('add-teams', courses);
        await interaction.editReply({
          content: '❔ Choose a course to **add teams** to:',
          components: [row],
        });
      } catch (error) {
        logger.error('Error in /course add-teams command:', error);
        await interaction.editReply({
          content: `❌ Error: ${error.message}. Please contact a Moderator!`,
        });
      }
      return;
    }

    // /course remove-teams - Show course selector, then team multi-select
    if (subcommand === 'remove-teams') {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }

      if (!Course || !CourseTeam) {
        logger.error('Database models not available');
        await interaction.editReply({
          content: '❌ Database is not available. Please contact a Moderator!',
        });
        return;
      }

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
        logger.error('Error in /course remove-teams command:', error);
        await interaction.editReply({
          content: `❌ Error: ${error.message}. Please contact a Moderator!`,
        });
      }
      return;
    }

    // /course clear - Coming soon
    if (subcommand === 'clear') {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ ephemeral: true });
      }
      await interaction.editReply({
        content: '🚧 `/course clear` is coming soon!',
      });
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
