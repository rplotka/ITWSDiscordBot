const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ChannelType } = require('discord.js');
const { Op } = require('sequelize');
const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');

/**
 * Handle /list course command
 * @param {import('discord.js').CommandInteraction} interaction
 */
async function handleListCourse(interaction) {
  const nameQuery = interaction.options.getString('name');
  logger.info(
    `list course: ${interaction.user.tag} searching for "${nameQuery}"`
  );

  if (!Course) {
    await interaction.editReply({
      content: '❌ Database is not available.',
    });
    return;
  }

  try {
    let courses;

    if (nameQuery === '*') {
      // Get all courses
      courses = await Course.findAll({
        include: [{ model: CourseTeam, as: 'CourseTeams' }],
        order: [['title', 'ASC']],
      });
    } else {
      // Search by name (case-insensitive partial match)
      courses = await Course.findAll({
        where: {
          [Op.or]: [
            { title: { [Op.iLike]: `%${nameQuery}%` } },
            { shortTitle: { [Op.iLike]: `%${nameQuery}%` } },
          ],
        },
        include: [{ model: CourseTeam, as: 'CourseTeams' }],
        order: [['title', 'ASC']],
      });
    }

    if (courses.length === 0) {
      await interaction.editReply({
        content:
          nameQuery === '*'
            ? 'ℹ️ No courses found.'
            : `ℹ️ No courses found matching "${nameQuery}".`,
      });
      return;
    }

    // Build response
    const embeds = [];

    courses.forEach((course) => {
      const role = interaction.guild.roles.cache.get(course.discordRoleId);
      const studentCount = role ? role.members.size : 0;
      const teamCount = course.CourseTeams ? course.CourseTeams.length : 0;

      const embed = new EmbedBuilder()
        .setTitle(course.title)
        .setColor(role ? role.color : 0x5865f2)
        .addFields(
          {
            name: 'Short Title',
            value: course.shortTitle || 'N/A',
            inline: true,
          },
          {
            name: 'Public',
            value: course.isPublic ? 'Yes' : 'No',
            inline: true,
          },
          { name: 'Students', value: studentCount.toString(), inline: true },
          { name: 'Teams', value: teamCount.toString(), inline: true },
          {
            name: 'Instructors',
            value:
              course.instructors.length > 0
                ? course.instructors.join(', ')
                : 'None',
            inline: true,
          },
          { name: 'ID', value: course.id.toString(), inline: true }
        );

      // Add team list if there are teams
      if (course.CourseTeams && course.CourseTeams.length > 0) {
        const teamList = course.CourseTeams.map((t) => `• ${t.title}`).join(
          '\n'
        );
        embed.addFields({
          name: 'Teams',
          value:
            teamList.length > 1024
              ? `${teamList.substring(0, 1020)}...`
              : teamList,
          inline: false,
        });
      }

      embeds.push(embed);
    });

    // Discord limits to 10 embeds per message
    if (embeds.length <= 10) {
      await interaction.editReply({
        content: `📚 **Found ${courses.length} course(s):**`,
        embeds,
      });
    } else {
      // Send first 10, then follow up with rest
      await interaction.editReply({
        content: `📚 **Found ${courses.length} course(s)** (showing first 10):`,
        embeds: embeds.slice(0, 10),
      });

      // Send remaining in chunks of 10 using reduce for sequential execution
      const chunks = [];
      for (let i = 10; i < embeds.length; i += 10) {
        chunks.push({
          start: i,
          end: Math.min(i + 10, embeds.length),
          embedSlice: embeds.slice(i, i + 10),
        });
      }

      await chunks.reduce(async (promise, chunk) => {
        await promise;
        await interaction.followUp({
          content: `📚 **Courses ${chunk.start + 1}-${chunk.end}:**`,
          embeds: chunk.embedSlice,
          ephemeral: true,
        });
      }, Promise.resolve());
    }

    logger.info(
      `list course: Found ${courses.length} courses for "${nameQuery}"`
    );
  } catch (error) {
    logger.error('Error listing courses:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}`,
    });
  }
}

/**
 * Handle /list channel command
 * @param {import('discord.js').CommandInteraction} interaction
 */
async function handleListChannel(interaction) {
  const pattern = interaction.options.getString('pattern');
  logger.info(
    `list channel: ${interaction.user.tag} searching for "${pattern}"`
  );

  try {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars except *
      .replace(/\*/g, '.*'); // Convert * to .*

    const regex = new RegExp(`^${regexPattern}$`, 'i');

    // Get all channels matching the pattern
    const channels = interaction.guild.channels.cache
      .filter((channel) => regex.test(channel.name))
      .sort((a, b) => {
        // Sort by type first (categories, then text, then voice)
        const typeOrder = {
          [ChannelType.GuildCategory]: 0,
          [ChannelType.GuildText]: 1,
          [ChannelType.GuildVoice]: 2,
          [ChannelType.GuildForum]: 3,
          [ChannelType.GuildAnnouncement]: 4,
        };
        const aOrder = typeOrder[a.type] ?? 99;
        const bOrder = typeOrder[b.type] ?? 99;
        if (aOrder !== bOrder) return aOrder - bOrder;
        // Then by name
        return a.name.localeCompare(b.name);
      });

    if (channels.size === 0) {
      await interaction.editReply({
        content: `ℹ️ No channels found matching "${pattern}".`,
      });
      return;
    }

    // Group by type
    const categories = channels.filter(
      (c) => c.type === ChannelType.GuildCategory
    );
    const textChannels = channels.filter(
      (c) => c.type === ChannelType.GuildText
    );
    const voiceChannels = channels.filter(
      (c) => c.type === ChannelType.GuildVoice
    );
    const otherChannels = channels.filter(
      (c) =>
        c.type !== ChannelType.GuildCategory &&
        c.type !== ChannelType.GuildText &&
        c.type !== ChannelType.GuildVoice
    );

    // Build response
    let response = `📁 **Found ${channels.size} channel(s) matching "${pattern}":**\n\n`;

    if (categories.size > 0) {
      response += `**Categories (${categories.size}):**\n`;
      categories.forEach((c) => {
        const childCount = interaction.guild.channels.cache.filter(
          (ch) => ch.parentId === c.id
        ).size;
        response += `• 📂 ${c.name} (${childCount} children)\n`;
      });
      response += '\n';
    }

    if (textChannels.size > 0) {
      response += `**Text Channels (${textChannels.size}):**\n`;
      textChannels.forEach((c) => {
        const parent = c.parent ? ` [${c.parent.name}]` : '';
        response += `• 💬 #${c.name}${parent}\n`;
      });
      response += '\n';
    }

    if (voiceChannels.size > 0) {
      response += `**Voice Channels (${voiceChannels.size}):**\n`;
      voiceChannels.forEach((c) => {
        const parent = c.parent ? ` [${c.parent.name}]` : '';
        response += `• 🔊 ${c.name}${parent}\n`;
      });
      response += '\n';
    }

    if (otherChannels.size > 0) {
      response += `**Other Channels (${otherChannels.size}):**\n`;
      otherChannels.forEach((c) => {
        response += `• ${c.name} (${ChannelType[c.type]})\n`;
      });
    }

    // Discord message limit is 2000 chars
    if (response.length > 2000) {
      response = `${response.substring(
        0,
        1950
      )}...\n\n*(Truncated - too many results)*`;
    }

    await interaction.editReply({
      content: response,
    });

    logger.info(
      `list channel: Found ${channels.size} channels for "${pattern}"`
    );
  } catch (error) {
    logger.error('Error listing channels:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}`,
    });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list')
    .setDescription('List courses or channels')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('course')
        .setDescription('List course(s) and their details')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Course name to search for, or * for all courses')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('channel')
        .setDescription('List channel(s) matching a pattern')
        .addStringOption((option) =>
          option
            .setName('pattern')
            .setDescription(
              'Channel name pattern (use * as wildcard, e.g. "intro*" or "*voice*")'
            )
            .setRequired(true)
        )
    ),
  isModeratorOnly: true,
  /**
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ ephemeral: true });
    }

    if (subcommand === 'course') {
      await handleListCourse(interaction);
    } else if (subcommand === 'channel') {
      await handleListChannel(interaction);
    }
  },
};
