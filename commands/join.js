const { SlashCommandBuilder } = require('discord.js');
const { Op } = require('sequelize');
const { Course, CourseTeam } = require('../core/db');
const {
  courseSelectorActionRowFactory,
  courseTeamSelectorActionRowFactory,
  switchTeam,
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
 * Handle /join course command
 */
async function handleJoinCourse(interaction) {
  const courseId = interaction.options.getString('course');

  // Defer reply if not already deferred
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ ephemeral: true });
  }

  if (!Course) {
    await interaction.editReply({
      content: '❌ Database is not available. Please contact a Moderator!',
    });
    return;
  }

  try {
    // If course specified, join directly
    if (courseId) {
      const course = await withTimeout(Course.findByPk(courseId));

      if (!course) {
        await interaction.editReply({ content: '❌ Course not found.' });
        return;
      }

      // Check if already in course
      if (interaction.member.roles.cache.has(course.discordRoleId)) {
        await interaction.editReply({
          content: `ℹ️ You're already enrolled in **${course.title}**.`,
        });
        return;
      }

      // Join the course
      await interaction.member.roles.add(course.discordRoleId);

      await interaction.editReply({
        content: `✅ You've joined **${course.title}**!`,
      });

      logger.info(`${interaction.user.tag} joined ${course.title}`);
      return;
    }

    // No course specified - show selector
    const memberRoleIds = interaction.member.roles.cache.map((role) => role.id);

    const courses = await withTimeout(
      Course.findAll({
        where: {
          discordRoleId: {
            [Op.notIn]: memberRoleIds,
          },
        },
      })
    );

    if (courses.length === 0) {
      await interaction.editReply({
        content: 'ℹ️ There are no other courses to join.',
      });
      return;
    }

    const row = courseSelectorActionRowFactory('join-course', courses);
    await interaction.editReply({
      content: '❔ Choose a course to **join**:',
      components: [row],
    });
  } catch (error) {
    logger.error('Error in /join course:', error);

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
 * Handle /join team command (including team switching)
 */
async function handleJoinTeam(interaction) {
  const teamId = interaction.options.getString('team');
  const fromTeamId = interaction.options.getString('from');

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
    // If switching teams (both from and team specified)
    if (teamId && fromTeamId) {
      const toTeam = await withTimeout(
        CourseTeam.findByPk(teamId, {
          include: [{ model: Course, as: 'Course' }],
        })
      );
      const fromTeam = await withTimeout(
        CourseTeam.findByPk(fromTeamId, {
          include: [{ model: Course, as: 'Course' }],
        })
      );

      if (!toTeam || !fromTeam) {
        await interaction.editReply({
          content: '❌ One or both teams not found.',
        });
        return;
      }

      // Verify both teams are in the same course
      if (toTeam.CourseId !== fromTeam.CourseId) {
        await interaction.editReply({
          content: '❌ Can only switch between teams in the same course.',
        });
        return;
      }

      // Verify user is in the from team
      if (!interaction.member.roles.cache.has(fromTeam.discordRoleId)) {
        await interaction.editReply({
          content: `❌ You're not currently in **${fromTeam.title}**.`,
        });
        return;
      }

      // Switch teams
      const result = await switchTeam(interaction.member, fromTeam, toTeam);

      if (result.success) {
        await interaction.editReply({
          content:
            `✅ Switched from **${fromTeam.title}** to **${toTeam.title}**!\n\n` +
            `You now have access to the ${toTeam.title} channel.`,
        });
        logger.info(
          `${interaction.user.tag} switched from ${fromTeam.title} to ${toTeam.title}`
        );
      } else {
        await interaction.editReply({
          content: `❌ Failed to switch teams: ${result.error}`,
        });
      }
      return;
    }

    // If only team specified, join directly
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

      // Check if user is in the course
      if (!interaction.member.roles.cache.has(team.Course?.discordRoleId)) {
        await interaction.editReply({
          content: `❌ You must join **${
            team.Course?.title || 'the course'
          }** before joining this team.`,
        });
        return;
      }

      // Check if already in team
      if (interaction.member.roles.cache.has(team.discordRoleId)) {
        await interaction.editReply({
          content: `ℹ️ You're already in **${team.title}**.`,
        });
        return;
      }

      // Check if user is already in another team for this course
      const courseTeams = await withTimeout(
        CourseTeam.findAll({
          where: { CourseId: team.CourseId },
        })
      );

      const existingTeam = courseTeams.find((t) =>
        interaction.member.roles.cache.has(t.discordRoleId)
      );

      if (existingTeam) {
        await interaction.editReply({
          content:
            `⚠️ You're already in **${existingTeam.title}** for this course.\n\n` +
            `To switch teams, use: \`/join team team:${team.title} from:${existingTeam.title}\``,
        });
        return;
      }

      // Join the team
      await interaction.member.roles.add(team.discordRoleId);

      await interaction.editReply({
        content:
          `✅ You've joined **${team.title}**!\n\n` +
          `You now have access to the team's private channel.`,
      });

      logger.info(`${interaction.user.tag} joined ${team.title}`);
      return;
    }

    // No team specified - show selector
    const courseTeams = await withTimeout(
      CourseTeam.findAll({
        where: {
          '$Course.discordRoleId$': {
            [Op.in]: memberRoleIds,
          },
          discordRoleId: {
            [Op.notIn]: memberRoleIds,
          },
        },
        include: [{ model: Course, as: 'Course' }],
      })
    );

    if (courseTeams.length === 0) {
      // Check if user has any courses
      const currentCourses = await withTimeout(
        Course.findAll({
          where: {
            discordRoleId: {
              [Op.in]: memberRoleIds,
            },
          },
        })
      );

      if (currentCourses.length === 0) {
        await interaction.editReply({
          content:
            'ℹ️ You need to join a course first before joining a team.\n\nUse `/join course` to enroll in a course.',
        });
      } else {
        await interaction.editReply({
          content: `ℹ️ There are no available teams in your courses (${currentCourses
            .map((c) => c.title)
            .join(', ')}).`,
        });
      }
      return;
    }

    const row = courseTeamSelectorActionRowFactory('join-team', courseTeams);
    await interaction.editReply({
      content:
        '❔ Choose a team to **join**:\n\n' +
        '💡 *To switch teams, use `/join team team:[new] from:[current]`*',
      components: [row],
    });
  } catch (error) {
    logger.error('Error in /join team:', error);

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
    .setName('join')
    .setDescription('Join a course or a course team')
    // /join course [course]
    .addSubcommand((sc) =>
      sc
        .setName('course')
        .setDescription('Join a course')
        .addStringOption((option) =>
          option
            .setName('course')
            .setDescription('Course to join')
            .setAutocomplete(true)
            .setRequired(false)
        )
    )
    // /join team [team] [from]
    .addSubcommand((sc) =>
      sc
        .setName('team')
        .setDescription('Join or switch to a course team')
        .addStringOption((option) =>
          option
            .setName('team')
            .setDescription('Team to join')
            .setAutocomplete(true)
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('from')
            .setDescription('Current team to switch from (for team switching)')
            .setAutocomplete(true)
            .setRequired(false)
        )
    ),

  /**
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    logger.info(`/join ${subcommand}: ${interaction.user.tag}`);

    if (subcommand === 'course') {
      await handleJoinCourse(interaction);
    } else if (subcommand === 'team') {
      await handleJoinTeam(interaction);
    }
  },
};
