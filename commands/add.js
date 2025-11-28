const { SlashCommandBuilder, ChannelType } = require('discord.js');
const {
  addCourseModalFactory,
  addTeamsModalFactory,
  courseSelectorActionRowFactory,
  generateSequentialTeamNames,
  createTeamsForCourse,
  findMemberByIdentifier,
} = require('../core/utils');
const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');

/**
 * Handle /add course command
 */
async function handleAddCourse(interaction) {
  const name = interaction.options.getString('name');
  const short = interaction.options.getString('short');
  const instructor = interaction.options.getString('instructor');
  const teams = interaction.options.getInteger('teams');

  // If all required params provided, we could process directly
  // But since we need to create roles/channels, always show modal for confirmation
  // Pre-fill with any provided values
  const prefill = {};
  if (name) prefill.name = name;
  if (short) prefill.short = short;
  if (instructor) {
    // If instructor is a Discord ID (from autocomplete), resolve to username
    const member = interaction.guild.members.cache.get(instructor);
    prefill.instructor = member
      ? member.nickname || member.user.username
      : instructor;
  }
  if (teams !== null) prefill.teams = teams;

  try {
    await interaction.showModal(addCourseModalFactory(prefill));
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
}

/**
 * Handle /add team command
 */
async function handleAddTeam(interaction) {
  const courseId = interaction.options.getString('course');
  const count = interaction.options.getInteger('count');

  if (!Course) {
    await interaction.reply({
      content: '❌ Database is not available. Please contact a Moderator!',
      ephemeral: true,
    });
    return;
  }

  // If both course and count provided, create teams directly
  if (courseId && count) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const course = await Course.findByPk(courseId);
      if (!course) {
        await interaction.editReply({ content: '❌ Course not found.' });
        return;
      }

      // Get existing team count
      const existingTeams = await CourseTeam.findAll({
        where: { CourseId: course.id },
      });
      const startFrom = existingTeams.length + 1;

      // Generate team names
      const teamNames = generateSequentialTeamNames(
        course.shortTitle,
        count,
        startFrom
      );

      await interaction.editReply({
        content: `⏳ Creating ${count} team(s) for **${course.title}**...`,
      });

      // Create teams
      const createdTeams = await createTeamsForCourse(
        interaction.guild,
        course,
        teamNames
      );

      const teamList = createdTeams.map((t) => `• ${t.title}`).join('\n');
      await interaction.editReply({
        content:
          `✅ **Created ${createdTeams.length} team(s) for ${course.title}!**\n\n` +
          `${teamList}\n\n` +
          `Students can join teams using \`/join team\`.`,
      });

      logger.info(`Created ${createdTeams.length} teams for ${course.title}`);
    } catch (error) {
      logger.error('Error creating teams:', error);
      await interaction.editReply({
        content: `❌ Error: ${error.message}`,
      });
    }
    return;
  }

  // If only course provided, show modal for count
  if (courseId) {
    try {
      const course = await Course.findByPk(courseId);
      if (!course) {
        await interaction.reply({
          content: '❌ Course not found.',
          ephemeral: true,
        });
        return;
      }

      const existingTeams = await CourseTeam.findAll({
        where: { CourseId: course.id },
      });

      await interaction.showModal(
        addTeamsModalFactory(courseId, course.title, existingTeams.length)
      );
    } catch (error) {
      logger.error('Error showing add teams modal:', error);
      await interaction.reply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
    return;
  }

  // No params - show course selector
  await interaction.deferReply({ ephemeral: true });

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

/**
 * Handle /add channel command
 */
async function handleAddChannel(interaction) {
  const name = interaction.options.getString('name');
  const type = interaction.options.getString('type') || 'text';
  const categoryId = interaction.options.getString('category');

  await interaction.deferReply({ ephemeral: true });

  try {
    const channelType =
      type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;

    const channelOptions = {
      name,
      type: channelType,
    };

    if (categoryId) {
      const category = interaction.guild.channels.cache.get(categoryId);
      if (category && category.type === ChannelType.GuildCategory) {
        channelOptions.parent = categoryId;
      }
    }

    const channel = await interaction.guild.channels.create(channelOptions);

    await interaction.editReply({
      content: `✅ Created ${type} channel: ${channel}`,
    });

    logger.info(`Created channel: ${channel.name}`);
  } catch (error) {
    logger.error('Error creating channel:', error);
    await interaction.editReply({
      content: `❌ Error creating channel: ${error.message}`,
    });
  }
}

/**
 * Handle /add students command (bulk import from CSV)
 */
async function handleAddStudents(interaction) {
  const courseId = interaction.options.getString('course');
  const file = interaction.options.getAttachment('file');

  await interaction.deferReply({ ephemeral: true });

  if (!Course) {
    await interaction.editReply({
      content: '❌ Database is not available.',
    });
    return;
  }

  try {
    // Validate file
    if (!file.name.endsWith('.csv')) {
      await interaction.editReply({
        content: '❌ Please upload a CSV file.',
      });
      return;
    }

    // Get course
    const course = await Course.findByPk(courseId);
    if (!course) {
      await interaction.editReply({
        content: '❌ Course not found.',
      });
      return;
    }

    // Fetch CSV content
    const response = await fetch(file.url);
    const csvContent = await response.text();

    // Parse CSV (simple parsing - assumes format: username,team)
    const lines = csvContent.trim().split('\n');
    const header = lines[0].toLowerCase();
    const hasTeamColumn = header.includes('team');

    const results = {
      added: 0,
      notFound: [],
      alreadyEnrolled: 0,
      errors: [],
    };

    // Get course teams if needed
    let courseTeams = [];
    if (hasTeamColumn) {
      courseTeams = await CourseTeam.findAll({
        where: { CourseId: course.id },
      });
    }

    await interaction.editReply({
      content: `⏳ Processing ${lines.length - 1} students...`,
    });

    // Process each line (skip header)
    const dataLines = lines.slice(1);
    await dataLines.reduce(async (promise, line, index) => {
      await promise;

      const parts = line.split(',').map((p) => p.trim());
      const username = parts[0];
      const teamNum = hasTeamColumn && parts[1] ? parts[1] : null;

      if (!username) return;

      try {
        // Find member
        const member = await findMemberByIdentifier(
          interaction.guild,
          username
        );

        if (!member) {
          results.notFound.push(username);
          return;
        }

        // Check if already has course role
        if (member.roles.cache.has(course.discordRoleId)) {
          results.alreadyEnrolled += 1;
        } else {
          // Add course role
          await member.roles.add(course.discordRoleId);
          results.added += 1;
        }

        // Add team role if specified
        if (teamNum && courseTeams.length > 0) {
          const teamName = `${course.shortTitle}-Team-${teamNum.padStart(
            2,
            '0'
          )}`;
          const team = courseTeams.find((t) => t.title === teamName);
          if (team && !member.roles.cache.has(team.discordRoleId)) {
            await member.roles.add(team.discordRoleId);
          }
        }
      } catch (error) {
        results.errors.push(`${username}: ${error.message}`);
      }

      // Progress update every 10 students
      if ((index + 1) % 10 === 0) {
        await interaction.editReply({
          content: `⏳ Processing... ${index + 1}/${dataLines.length}`,
        });
      }
    }, Promise.resolve());

    // Final report
    let report = `✅ **Bulk Import Complete for ${course.title}**\n\n`;
    report += `• Added: ${results.added}\n`;
    report += `• Already enrolled: ${results.alreadyEnrolled}\n`;

    if (results.notFound.length > 0) {
      report += `• Not found (${results.notFound.length}): ${results.notFound
        .slice(0, 10)
        .join(', ')}`;
      if (results.notFound.length > 10) {
        report += ` ... and ${results.notFound.length - 10} more`;
      }
      report += '\n';
    }

    if (results.errors.length > 0) {
      report += `• Errors: ${results.errors.length}\n`;
    }

    await interaction.editReply({ content: report });

    logger.info(
      `Bulk import: ${results.added} added, ${results.notFound.length} not found`
    );
  } catch (error) {
    logger.error('Error in bulk import:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}`,
    });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription(
      'Add courses, teams, channels, or students (Moderator only)'
    )
    // /add course [name] [short] [instructor] [teams]
    .addSubcommand((subcommand) =>
      subcommand
        .setName('course')
        .setDescription('Add a new course with roles and channels')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Full course name')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('short')
            .setDescription('Short name for channels (e.g., intro, capstone)')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('instructor')
            .setDescription('Instructor username/nickname')
            .setAutocomplete(true)
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName('teams')
            .setDescription('Number of teams to create (0 for none)')
            .setMinValue(0)
            .setMaxValue(99)
            .setRequired(false)
        )
    )
    // /add team [course] [count]
    .addSubcommand((subcommand) =>
      subcommand
        .setName('team')
        .setDescription('Add team(s) to an existing course')
        .addStringOption((option) =>
          option
            .setName('course')
            .setDescription('Course to add teams to')
            .setAutocomplete(true)
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName('count')
            .setDescription('Number of teams to create')
            .setMinValue(1)
            .setMaxValue(99)
            .setRequired(false)
        )
    )
    // /add channel [name] [type] [category]
    .addSubcommand((subcommand) =>
      subcommand
        .setName('channel')
        .setDescription('Add a standalone channel')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Channel name')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Channel type')
            .setRequired(false)
            .addChoices(
              { name: 'Text', value: 'text' },
              { name: 'Voice', value: 'voice' }
            )
        )
        .addStringOption((option) =>
          option
            .setName('category')
            .setDescription('Parent category')
            .setAutocomplete(true)
            .setRequired(false)
        )
    )
    // /add students [course] [file] - placeholder for bulk import
    .addSubcommand((subcommand) =>
      subcommand
        .setName('students')
        .setDescription('Bulk add students from CSV file')
        .addStringOption((option) =>
          option
            .setName('course')
            .setDescription('Course to add students to')
            .setAutocomplete(true)
            .setRequired(true)
        )
        .addAttachmentOption((option) =>
          option
            .setName('file')
            .setDescription('CSV file with student usernames')
            .setRequired(true)
        )
    ),
  isModeratorOnly: true,

  /**
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    logger.info(`/add ${subcommand}: ${interaction.user.tag}`);

    if (subcommand === 'course') {
      await handleAddCourse(interaction);
    } else if (subcommand === 'team') {
      await handleAddTeam(interaction);
    } else if (subcommand === 'channel') {
      await handleAddChannel(interaction);
    } else if (subcommand === 'students') {
      await handleAddStudents(interaction);
    }
  },
};
