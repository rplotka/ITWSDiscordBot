const { SlashCommandBuilder } = require('discord.js');
const { Op } = require('sequelize');
const { Course, CourseTeam } = require('../core/db');
const {
  courseSelectorActionRowFactory,
  courseTeamSelectorActionRowFactory,
} = require('../core/utils');
const logger = require('../core/logging');

/**
 * Wraps a database query with a timeout
 * @param {Promise} queryPromise - The database query promise
 * @param {number} timeoutMs - Timeout in milliseconds (default: 8000)
 * @returns {Promise} The query result or throws timeout error
 */
function withTimeout(queryPromise, timeoutMs = 8000) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Database query timed out'));
    }, timeoutMs);
  });
  return Promise.race([queryPromise, timeoutPromise]);
}

/**
 * Handle /leave course command
 */
async function handleLeaveCourse(interaction) {
  const courseId = interaction.options.getString('course');

  // Defer reply if not already deferred
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  if (!Course || !CourseTeam) {
    await interaction.editReply({
      content: '❌ Database is not available. Please contact a Moderator!',
    });
    return;
  }

  const memberRoleIds = interaction.member.roles.cache.map((role) => role.id);

  try {
    // If course specified, leave directly
    if (courseId) {
      const course = await withTimeout(
        Course.findByPk(courseId, {
          include: [{ model: CourseTeam, as: 'CourseTeams' }],
        })
      );

      if (!course) {
        await interaction.editReply({ content: '❌ Course not found.' });
        return;
      }

      // Check if actually in course
      if (!interaction.member.roles.cache.has(course.discordRoleId)) {
        await interaction.editReply({
          content: `ℹ️ You're not enrolled in **${course.title}**.`,
        });
        return;
      }

      // Remove course role
      await interaction.member.roles.remove(course.discordRoleId);

      // Also remove any team roles from this course
      let teamsLeft = 0;
      if (course.CourseTeams) {
        await course.CourseTeams.reduce(async (promise, team) => {
          await promise;
          if (interaction.member.roles.cache.has(team.discordRoleId)) {
            await interaction.member.roles.remove(team.discordRoleId);
            teamsLeft += 1;
          }
        }, Promise.resolve());
      }

      let message = `✅ You've left **${course.title}**.`;
      if (teamsLeft > 0) {
        message += `\nAlso removed from ${teamsLeft} team(s).`;
      }

      await interaction.editReply({ content: message });

      logger.info(`${interaction.user.tag} left ${course.title}`);
      return;
    }

    // No course specified - show selector
    const courses = await withTimeout(
      Course.findAll({
        where: {
          discordRoleId: {
            [Op.in]: memberRoleIds,
          },
        },
      })
    );

    if (courses.length === 0) {
      await interaction.editReply({
        content: 'ℹ️ You are not in any courses.',
      });
      return;
    }

    const row = courseSelectorActionRowFactory('leave-course', courses);
    await interaction.editReply({
      content: '❔ Choose a course to **leave**:',
      components: [row],
    });
  } catch (error) {
    logger.error('Error in /leave course:', error);

    let errorMessage = '❌ Something went wrong... Please contact a Moderator!';
    if (error.message?.includes('timed out')) {
      errorMessage =
        '❌ Database query timed out. Please try again or contact a Moderator!';
    } else if (error.message) {
      errorMessage = `❌ Error: ${error.message}. Please contact a Moderator!`;
    }

    await interaction.editReply({ content: errorMessage });
  }
}

/**
 * Handle /leave team command
 */
async function handleLeaveTeam(interaction) {
  const teamId = interaction.options.getString('team');

  // Defer reply if not already deferred
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  if (!Course || !CourseTeam) {
    await interaction.editReply({
      content: '❌ Database is not available. Please contact a Moderator!',
    });
    return;
  }

  const memberRoleIds = interaction.member.roles.cache.map((role) => role.id);

  try {
    // If team specified, leave directly
    if (teamId) {
      const team = await withTimeout(
        CourseTeam.findByPk(teamId, {
          include: [{ model: Course, as: 'Course' }],
        })
      );

      if (!team) {
        await interaction.editReply({ content: '❌ Team not found.' });
        return;
      }

      // Check if actually in team
      if (!interaction.member.roles.cache.has(team.discordRoleId)) {
        await interaction.editReply({
          content: `ℹ️ You're not in **${team.title}**.`,
        });
        return;
      }

      // Remove team role
      await interaction.member.roles.remove(team.discordRoleId);

      await interaction.editReply({
        content: `✅ You've left **${team.title}**.`,
      });

      logger.info(`${interaction.user.tag} left ${team.title}`);
      return;
    }

    // No team specified - show selector
    const courseTeams = await withTimeout(
      CourseTeam.findAll({
        where: {
          discordRoleId: {
            [Op.in]: memberRoleIds,
          },
        },
        include: [{ model: Course, as: 'Course' }],
      })
    );

    if (courseTeams.length === 0) {
      await interaction.editReply({
        content: 'ℹ️ You are not in any course teams.',
      });
      return;
    }

    const row = courseTeamSelectorActionRowFactory('leave-team', courseTeams);
    await interaction.editReply({
      content: '❔ Choose a team to **leave**:',
      components: [row],
    });
  } catch (error) {
    logger.error('Error in /leave team:', error);

    let errorMessage = '❌ Something went wrong... Please contact a Moderator!';
    if (error.message?.includes('timed out')) {
      errorMessage =
        '❌ Database query timed out. Please try again or contact a Moderator!';
    } else if (error.message) {
      errorMessage = `❌ Error: ${error.message}. Please contact a Moderator!`;
    }

    await interaction.editReply({ content: errorMessage });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Leave a course or a course team')
    // /leave course [course]
    .addSubcommand((sc) =>
      sc
        .setName('course')
        .setDescription('Leave a course you are currently in')
        .addStringOption((option) =>
          option
            .setName('course')
            .setDescription('Course to leave')
            .setAutocomplete(true)
            .setRequired(false)
        )
    )
    // /leave team [team]
    .addSubcommand((sc) =>
      sc
        .setName('team')
        .setDescription('Leave a course team you are currently in')
        .addStringOption((option) =>
          option
            .setName('team')
            .setDescription('Team to leave')
            .setAutocomplete(true)
            .setRequired(false)
        )
    ),

  /**
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    logger.info(`/leave ${subcommand}: ${interaction.user.tag}`);

    if (subcommand === 'course') {
      await handleLeaveCourse(interaction);
    } else if (subcommand === 'team') {
      await handleLeaveTeam(interaction);
    }
  },
};
