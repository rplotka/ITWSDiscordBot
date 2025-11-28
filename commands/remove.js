const { SlashCommandBuilder, ChannelType } = require('discord.js');
const {
  courseSelectorActionRowFactory,
  teamSelectorActionRowFactory,
  channelSelectorActionRowFactory,
} = require('../core/utils');
const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');

/**
 * Handle /remove course command
 */
async function handleRemoveCourse(interaction) {
  const courseId = interaction.options.getString('course');

  await interaction.deferReply({ ephemeral: true });

  if (!Course) {
    await interaction.editReply({
      content: '❌ Database is not available. Please contact a Moderator!',
    });
    return;
  }

  // If course specified, show confirmation
  if (courseId) {
    try {
      const course = await Course.findByPk(courseId, {
        include: [{ model: CourseTeam, as: 'CourseTeams' }],
      });

      if (!course) {
        await interaction.editReply({ content: '❌ Course not found.' });
        return;
      }

      const teamCount = course.CourseTeams?.length || 0;

      await interaction.editReply({
        content:
          `⚠️ **Are you sure you want to remove ${course.title}?**\n\n` +
          `This will delete:\n` +
          `• Course role\n` +
          `• Course category and all channels\n` +
          `• ${teamCount} team(s) with their roles and channels\n\n` +
          `Select the course again from the dropdown to confirm.`,
        components: [courseSelectorActionRowFactory('remove', [course])],
      });
    } catch (error) {
      logger.error('Error in /remove course:', error);
      await interaction.editReply({
        content: `❌ Error: ${error.message}`,
      });
    }
    return;
  }

  // No course specified - show course selector
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
}

/**
 * Handle /remove team command
 */
async function handleRemoveTeam(interaction) {
  const courseId = interaction.options.getString('course');
  const teamId = interaction.options.getString('team');

  await interaction.deferReply({ ephemeral: true });

  if (!Course || !CourseTeam) {
    await interaction.editReply({
      content: '❌ Database is not available. Please contact a Moderator!',
    });
    return;
  }

  // If both course and team specified, remove immediately
  if (courseId && teamId) {
    try {
      const team = await CourseTeam.findByPk(teamId, {
        include: [{ model: Course, as: 'Course' }],
      });

      if (!team) {
        await interaction.editReply({ content: '❌ Team not found.' });
        return;
      }

      // Verify team belongs to specified course
      if (team.CourseId.toString() !== courseId) {
        await interaction.editReply({
          content: '❌ Team does not belong to the specified course.',
        });
        return;
      }

      await interaction.editReply({
        content: `⏳ Removing team **${team.title}**...`,
      });

      // Delete team channel
      if (team.discordChannelId) {
        const channel = interaction.guild.channels.cache.get(
          team.discordChannelId
        );
        if (channel) {
          await channel.delete('Team removed');
        }
      }

      // Delete team role
      if (team.discordRoleId) {
        const role = interaction.guild.roles.cache.get(team.discordRoleId);
        if (role) {
          await role.delete('Team removed');
        }
      }

      // Delete from database
      await team.destroy();

      await interaction.editReply({
        content: `✅ Removed team **${team.title}** from ${
          team.Course?.title || 'course'
        }.`,
      });

      logger.info(`Removed team: ${team.title}`);
    } catch (error) {
      logger.error('Error removing team:', error);
      await interaction.editReply({
        content: `❌ Error: ${error.message}`,
      });
    }
    return;
  }

  // If only course specified, show team selector
  if (courseId) {
    try {
      const course = await Course.findByPk(courseId, {
        include: [{ model: CourseTeam, as: 'CourseTeams' }],
      });

      if (!course) {
        await interaction.editReply({ content: '❌ Course not found.' });
        return;
      }

      if (!course.CourseTeams || course.CourseTeams.length === 0) {
        await interaction.editReply({
          content: `ℹ️ **${course.title}** has no teams to remove.`,
        });
        return;
      }

      const row = teamSelectorActionRowFactory(
        'remove-team',
        course.CourseTeams
      );
      await interaction.editReply({
        content: `❔ Choose team(s) to **remove** from **${course.title}**:`,
        components: [row],
      });
    } catch (error) {
      logger.error('Error in /remove team:', error);
      await interaction.editReply({
        content: `❌ Error: ${error.message}`,
      });
    }
    return;
  }

  // No params - show course selector
  try {
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

/**
 * Handle /remove channel command
 */
async function handleRemoveChannel(interaction) {
  const channelId = interaction.options.getString('channel');

  await interaction.deferReply({ ephemeral: true });

  // If channel specified, remove it
  if (channelId) {
    try {
      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) {
        await interaction.editReply({ content: '❌ Channel not found.' });
        return;
      }

      // Don't allow removing categories with children
      if (
        channel.type === ChannelType.GuildCategory &&
        channel.children.cache.size > 0
      ) {
        await interaction.editReply({
          content: `❌ Cannot remove category **${channel.name}** - it contains ${channel.children.cache.size} channel(s). Remove or move them first.`,
        });
        return;
      }

      const channelName = channel.name;
      await channel.delete('Removed via /remove channel');

      await interaction.editReply({
        content: `✅ Removed channel **${channelName}**.`,
      });

      logger.info(`Removed channel: ${channelName}`);
    } catch (error) {
      logger.error('Error removing channel:', error);
      await interaction.editReply({
        content: `❌ Error: ${error.message}`,
      });
    }
    return;
  }

  // No channel specified - show channel selector
  try {
    // Get text and voice channels (not categories)
    const channels = interaction.guild.channels.cache.filter(
      (c) =>
        c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice
    );

    if (channels.size === 0) {
      await interaction.editReply({
        content: 'ℹ️ There are no channels to remove.',
      });
      return;
    }

    const row = channelSelectorActionRowFactory(
      'remove-channel',
      Array.from(channels.values()).slice(0, 25)
    );
    await interaction.editReply({
      content: '❔ Choose a channel to **remove**:',
      components: [row],
    });
  } catch (error) {
    logger.error('Error in /remove channel command:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}. Please contact a Moderator!`,
    });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove courses, teams, or channels (Moderator only)')
    // /remove course [course]
    .addSubcommand((subcommand) =>
      subcommand
        .setName('course')
        .setDescription('Remove a course and all its roles/channels')
        .addStringOption((option) =>
          option
            .setName('course')
            .setDescription('Course to remove')
            .setAutocomplete(true)
            .setRequired(false)
        )
    )
    // /remove team [course] [team]
    .addSubcommand((subcommand) =>
      subcommand
        .setName('team')
        .setDescription('Remove team(s) from a course')
        .addStringOption((option) =>
          option
            .setName('course')
            .setDescription('Course to remove teams from')
            .setAutocomplete(true)
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('team')
            .setDescription('Specific team to remove')
            .setAutocomplete(true)
            .setRequired(false)
        )
    )
    // /remove channel [channel]
    .addSubcommand((subcommand) =>
      subcommand
        .setName('channel')
        .setDescription('Remove a channel')
        .addStringOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel to remove')
            .setAutocomplete(true)
            .setRequired(false)
        )
    ),
  isModeratorOnly: true,

  /**
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    logger.info(`/remove ${subcommand}: ${interaction.user.tag}`);

    if (subcommand === 'course') {
      await handleRemoveCourse(interaction);
    } else if (subcommand === 'team') {
      await handleRemoveTeam(interaction);
    } else if (subcommand === 'channel') {
      await handleRemoveChannel(interaction);
    }
  },
};
