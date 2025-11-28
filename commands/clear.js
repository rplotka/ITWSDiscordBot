const { SlashCommandBuilder, ChannelType } = require('discord.js');
const {
  courseSelectorActionRowFactory,
  channelSelectorActionRowFactory,
  clearChannel,
} = require('../core/utils');
const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');

/**
 * Handle /clear course command - remove all students from a course
 */
async function handleClearCourse(interaction) {
  const courseId = interaction.options.getString('course');
  const clearTeams = interaction.options.getBoolean('teams') ?? false;

  await interaction.deferReply({ ephemeral: true });

  if (!Course) {
    await interaction.editReply({
      content: '❌ Database is not available. Please contact a Moderator!',
    });
    return;
  }

  // If course specified, proceed with clearing
  if (courseId) {
    try {
      const course = await Course.findByPk(courseId, {
        include: [{ model: CourseTeam, as: 'CourseTeams' }],
      });

      if (!course) {
        await interaction.editReply({ content: '❌ Course not found.' });
        return;
      }

      // Get the course role
      const courseRole = interaction.guild.roles.cache.get(
        course.discordRoleId
      );
      if (!courseRole) {
        await interaction.editReply({
          content: `❌ Course role not found for **${course.title}**.`,
        });
        return;
      }

      const membersToRemove = courseRole.members.size;

      if (membersToRemove === 0) {
        await interaction.editReply({
          content: `ℹ️ **${course.title}** has no enrolled students.`,
        });
        return;
      }

      await interaction.editReply({
        content: `⏳ Clearing ${membersToRemove} student(s) from **${course.title}**...`,
      });

      let cleared = 0;
      let teamCleared = 0;

      // Get team roles if clearing teams
      const teamRoles = [];
      if (clearTeams && course.CourseTeams) {
        course.CourseTeams.forEach((team) => {
          if (team.discordRoleId) {
            const role = interaction.guild.roles.cache.get(team.discordRoleId);
            if (role) {
              teamRoles.push(role);
            }
          }
        });
      }

      // Remove course role from all members
      const members = Array.from(courseRole.members.values());
      await members.reduce(async (promise, member) => {
        await promise;
        try {
          await member.roles.remove(courseRole);
          cleared += 1;

          // Also remove team roles if requested
          if (clearTeams) {
            await teamRoles.reduce(async (teamPromise, teamRole) => {
              await teamPromise;
              if (member.roles.cache.has(teamRole.id)) {
                await member.roles.remove(teamRole);
                teamCleared += 1;
              }
            }, Promise.resolve());
          }
        } catch (error) {
          logger.error(
            `Failed to remove role from ${member.user.tag}: ${error.message}`
          );
        }
      }, Promise.resolve());

      let message = `✅ Cleared **${cleared}** student(s) from **${course.title}**.`;
      if (clearTeams && teamCleared > 0) {
        message += `\nAlso removed **${teamCleared}** team assignment(s).`;
      }

      await interaction.editReply({ content: message });

      logger.info(
        `Cleared ${cleared} students from ${course.title}${
          clearTeams ? ` (${teamCleared} team assignments)` : ''
        }`
      );
    } catch (error) {
      logger.error('Error clearing course:', error);
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
        content: 'ℹ️ There are no courses to clear.',
      });
      return;
    }

    const row = courseSelectorActionRowFactory('clear-course', courses);
    await interaction.editReply({
      content:
        '❔ Choose a course to **clear** (remove all enrolled students):\n\n' +
        '⚠️ This will remove the course role from all students.',
      components: [row],
    });
  } catch (error) {
    logger.error('Error in /clear course command:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}. Please contact a Moderator!`,
    });
  }
}

/**
 * Handle /clear channel command - delete messages from a channel
 */
async function handleClearChannel(interaction) {
  const channelId = interaction.options.getString('channel');
  const count = interaction.options.getInteger('count');

  await interaction.deferReply({ ephemeral: true });

  // If channel specified, clear it
  if (channelId) {
    try {
      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) {
        await interaction.editReply({ content: '❌ Channel not found.' });
        return;
      }

      if (channel.type !== ChannelType.GuildText) {
        await interaction.editReply({
          content: '❌ Can only clear text channels.',
        });
        return;
      }

      await interaction.editReply({
        content: `⏳ Clearing messages from **#${channel.name}**...`,
      });

      const deleted = await clearChannel(channel, count);

      await interaction.editReply({
        content: `✅ Deleted **${deleted}** message(s) from **#${channel.name}**.`,
      });

      logger.info(`Cleared ${deleted} messages from #${channel.name}`);
    } catch (error) {
      logger.error('Error clearing channel:', error);
      await interaction.editReply({
        content: `❌ Error: ${error.message}`,
      });
    }
    return;
  }

  // No channel specified - show channel selector (text channels only)
  try {
    const channels = interaction.guild.channels.cache.filter(
      (c) => c.type === ChannelType.GuildText
    );

    if (channels.size === 0) {
      await interaction.editReply({
        content: 'ℹ️ There are no text channels to clear.',
      });
      return;
    }

    const row = channelSelectorActionRowFactory(
      'clear-channel',
      Array.from(channels.values()).slice(0, 25)
    );
    await interaction.editReply({
      content: '❔ Choose a channel to **clear** (delete all messages):',
      components: [row],
    });
  } catch (error) {
    logger.error('Error in /clear channel command:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}. Please contact a Moderator!`,
    });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription(
      'Clear course enrollments or channel messages (Moderator only)'
    )
    // /clear course [course] [teams]
    .addSubcommand((subcommand) =>
      subcommand
        .setName('course')
        .setDescription('Remove all students from a course')
        .addStringOption((option) =>
          option
            .setName('course')
            .setDescription('Course to clear')
            .setAutocomplete(true)
            .setRequired(false)
        )
        .addBooleanOption((option) =>
          option
            .setName('teams')
            .setDescription('Also clear team assignments')
            .setRequired(false)
        )
    )
    // /clear channel [channel] [count]
    .addSubcommand((subcommand) =>
      subcommand
        .setName('channel')
        .setDescription('Delete messages from a channel')
        .addStringOption((option) =>
          option
            .setName('channel')
            .setDescription('Channel to clear')
            .setAutocomplete(true)
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName('count')
            .setDescription('Number of messages to delete (default: all)')
            .setMinValue(1)
            .setMaxValue(1000)
            .setRequired(false)
        )
    ),
  isModeratorOnly: true,

  /**
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    logger.info(`/clear ${subcommand}: ${interaction.user.tag}`);

    if (subcommand === 'course') {
      await handleClearCourse(interaction);
    } else if (subcommand === 'channel') {
      await handleClearChannel(interaction);
    }
  },
};
