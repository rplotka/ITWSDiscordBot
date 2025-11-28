const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require('discord.js');
const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');

/**
 * Find potential courses in Discord that could be imported to DB
 * A course is identified by having an "X Instructor" role pattern
 */
function findImportableCourses(guild, existingCourses) {
  const existingRoleIds = new Set();
  existingCourses.forEach((c) => {
    if (c.discordRoleId) existingRoleIds.add(c.discordRoleId);
    if (c.discordInstructorRoleId)
      existingRoleIds.add(c.discordInstructorRoleId);
  });

  const importable = [];
  const instructorRoles = guild.roles.cache.filter(
    (r) => r.name.endsWith(' Instructor') && !existingRoleIds.has(r.id)
  );

  instructorRoles.forEach((instructorRole) => {
    // Extract course name from "X Instructor" -> "X"
    const courseName = instructorRole.name.replace(/ Instructor$/, '');

    // Look for matching course role (same name without "Instructor")
    const courseRole = guild.roles.cache.find(
      (r) => r.name === courseName && !existingRoleIds.has(r.id)
    );

    // Look for matching category
    const category = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildCategory &&
        (c.name === courseName ||
          c.name.toLowerCase() === courseName.toLowerCase())
    );

    importable.push({
      name: courseName,
      instructorRole,
      courseRole: courseRole || null,
      category: category || null,
      memberCount: courseRole ? courseRole.members.size : 0,
      instructorCount: instructorRole.members.size,
    });
  });

  return importable;
}

/**
 * Handle /sync import command - preview and import Discord resources to DB
 */
async function handleSyncImport(interaction) {
  await interaction.deferReply({ ephemeral: true });

  if (!Course) {
    await interaction.editReply({
      content: '❌ Database is not available. Please contact a Moderator!',
    });
    return;
  }

  try {
    await interaction.editReply({
      content: '⏳ Scanning Discord for importable courses...',
    });

    const existingCourses = await Course.findAll();
    const importable = findImportableCourses(
      interaction.guild,
      existingCourses
    );

    if (importable.length === 0) {
      await interaction.editReply({
        content:
          '✅ **No courses to import.**\n\n' +
          'Courses are identified by having an "X Instructor" role pattern.\n' +
          `Currently tracking ${existingCourses.length} course(s) in the database.`,
      });
      return;
    }

    // Build preview report
    let report = `**📥 Found ${importable.length} Course(s) to Import**\n\n`;
    report +=
      'The following Discord resources will be linked in the database:\n\n';

    importable.slice(0, 15).forEach((item, index) => {
      report += `**${index + 1}. ${item.name}**\n`;
      report += `   • Instructor Role: ${item.instructorRole.name} (${item.instructorCount} members)\n`;
      if (item.courseRole) {
        report += `   • Course Role: ${item.courseRole.name} (${item.memberCount} members)\n`;
      } else {
        report += `   • Course Role: ⚠️ Not found\n`;
      }
      if (item.category) {
        report += `   • Category: ${item.category.name}\n`;
      } else {
        report += `   • Category: ⚠️ Not found\n`;
      }
      report += '\n';
    });

    if (importable.length > 15) {
      report += `... and ${importable.length - 15} more\n\n`;
    }

    report +=
      '⚠️ **This will NOT create any new Discord resources.**\n' +
      'It only links existing Discord roles/categories to database entries.\n';

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('sync-confirm-import')
        .setLabel(`Import ${importable.length} Course(s)`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('📥'),
      new ButtonBuilder()
        .setCustomId('sync-dismiss')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
      content: report,
      components: [row],
    });

    logger.info(`Sync import preview: ${importable.length} courses found`);
  } catch (error) {
    logger.error('Error in /sync import:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}`,
    });
  }
}

/**
 * Handle /sync server command - analyze and report discrepancies
 */
async function handleSyncServer(interaction) {
  await interaction.deferReply({ ephemeral: true });

  if (!Course || !CourseTeam) {
    await interaction.editReply({
      content: '❌ Database is not available. Please contact a Moderator!',
    });
    return;
  }

  try {
    await interaction.editReply({
      content: '⏳ Analyzing server state...',
    });

    const discrepancies = {
      missingRoles: [], // Roles in DB but not in Discord
      missingChannels: [], // Channels in DB but not in Discord
      missingCategories: [], // Categories in DB but not in Discord
      orphanedRoles: [], // Roles that look like course/team roles but aren't in DB
      orphanedChannels: [], // Channels in course categories but not in DB
    };

    // Get all courses and teams from database
    const courses = await Course.findAll({
      include: [{ model: CourseTeam, as: 'CourseTeams' }],
    });

    // Check each course
    courses.forEach((course) => {
      // Check course role
      if (course.discordRoleId) {
        const role = interaction.guild.roles.cache.get(course.discordRoleId);
        if (!role) {
          discrepancies.missingRoles.push({
            type: 'course',
            name: course.title,
            id: course.id,
            discordId: course.discordRoleId,
          });
        }
      }

      // Check instructor role
      if (course.discordInstructorRoleId) {
        const role = interaction.guild.roles.cache.get(
          course.discordInstructorRoleId
        );
        if (!role) {
          discrepancies.missingRoles.push({
            type: 'instructor',
            name: `${course.title} Instructor`,
            id: course.id,
            discordId: course.discordInstructorRoleId,
          });
        }
      }

      // Check category
      if (course.discordCategoryId) {
        const category = interaction.guild.channels.cache.get(
          course.discordCategoryId
        );
        if (!category) {
          discrepancies.missingCategories.push({
            name: course.title,
            id: course.id,
            discordId: course.discordCategoryId,
          });
        }
      }

      // Check course teams
      if (course.CourseTeams) {
        course.CourseTeams.forEach((team) => {
          // Check team role
          if (team.discordRoleId) {
            const role = interaction.guild.roles.cache.get(team.discordRoleId);
            if (!role) {
              discrepancies.missingRoles.push({
                type: 'team',
                name: team.title,
                id: team.id,
                courseId: course.id,
                discordId: team.discordRoleId,
              });
            }
          }

          // Check team channel
          if (team.discordChannelId) {
            const channel = interaction.guild.channels.cache.get(
              team.discordChannelId
            );
            if (!channel) {
              discrepancies.missingChannels.push({
                type: 'team',
                name: team.title,
                id: team.id,
                courseId: course.id,
                discordId: team.discordChannelId,
              });
            }
          }
        });
      }
    });

    // Check for orphaned roles (roles that look like course roles but aren't tracked)
    const dbRoleIds = new Set();
    courses.forEach((course) => {
      if (course.discordRoleId) dbRoleIds.add(course.discordRoleId);
      if (course.discordInstructorRoleId)
        dbRoleIds.add(course.discordInstructorRoleId);
      if (course.CourseTeams) {
        course.CourseTeams.forEach((team) => {
          if (team.discordRoleId) dbRoleIds.add(team.discordRoleId);
        });
      }
    });

    // Look for roles that match course/team naming patterns
    const coursePattern = /^(ITWS|CSCI|ECSE|MGMT|COMM)\s*\d{4}/i;
    const teamPattern = /^[A-Za-z]+-Team-\d{2}$/;
    const instructorPattern = /Instructor$/;

    interaction.guild.roles.cache.forEach((role) => {
      if (dbRoleIds.has(role.id)) return; // Already tracked

      // Check if it looks like a course/team/instructor role
      if (
        coursePattern.test(role.name) ||
        teamPattern.test(role.name) ||
        (instructorPattern.test(role.name) && role.name.includes(' '))
      ) {
        discrepancies.orphanedRoles.push({
          name: role.name,
          id: role.id,
          memberCount: role.members.size,
        });
      }
    });

    // Build report
    let report = '**📊 Server Sync Report**\n\n';

    const totalIssues =
      discrepancies.missingRoles.length +
      discrepancies.missingChannels.length +
      discrepancies.missingCategories.length +
      discrepancies.orphanedRoles.length;

    if (totalIssues === 0) {
      report += '✅ **All synchronized!** No discrepancies found.\n\n';
      report += `• ${courses.length} course(s) in database\n`;
      report += `• All roles and channels match\n`;

      await interaction.editReply({ content: report });
      return;
    }

    report += `⚠️ **Found ${totalIssues} discrepancy(ies)**\n\n`;

    // Missing in Discord (exist in DB)
    if (discrepancies.missingRoles.length > 0) {
      report += `**Missing Roles** (in DB but not Discord):\n`;
      discrepancies.missingRoles.slice(0, 10).forEach((item) => {
        report += `• ${item.type}: ${item.name}\n`;
      });
      if (discrepancies.missingRoles.length > 10) {
        report += `  ... and ${discrepancies.missingRoles.length - 10} more\n`;
      }
      report += '\n';
    }

    if (discrepancies.missingCategories.length > 0) {
      report += `**Missing Categories** (in DB but not Discord):\n`;
      discrepancies.missingCategories.slice(0, 10).forEach((item) => {
        report += `• ${item.name}\n`;
      });
      report += '\n';
    }

    if (discrepancies.missingChannels.length > 0) {
      report += `**Missing Channels** (in DB but not Discord):\n`;
      discrepancies.missingChannels.slice(0, 10).forEach((item) => {
        report += `• ${item.type}: ${item.name}\n`;
      });
      if (discrepancies.missingChannels.length > 10) {
        report += `  ... and ${
          discrepancies.missingChannels.length - 10
        } more\n`;
      }
      report += '\n';
    }

    // Orphaned in Discord (exist in Discord but not DB)
    if (discrepancies.orphanedRoles.length > 0) {
      report += `**Orphaned Roles** (in Discord but not DB):\n`;
      discrepancies.orphanedRoles.slice(0, 10).forEach((item) => {
        report += `• ${item.name} (${item.memberCount} members)\n`;
      });
      if (discrepancies.orphanedRoles.length > 10) {
        report += `  ... and ${discrepancies.orphanedRoles.length - 10} more\n`;
      }
      report += '\n';
    }

    // Add action buttons
    const hasDbIssues =
      discrepancies.missingRoles.length > 0 ||
      discrepancies.missingChannels.length > 0 ||
      discrepancies.missingCategories.length > 0;

    const hasOrphans = discrepancies.orphanedRoles.length > 0;

    const buttons = [];

    if (hasDbIssues) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('sync-clean-db')
          .setLabel('Clean Database')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
      );
    }

    if (hasOrphans) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('sync-remove-orphans')
          .setLabel('Remove Orphans')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️')
      );
    }

    buttons.push(
      new ButtonBuilder()
        .setCustomId('sync-dismiss')
        .setLabel('Dismiss')
        .setStyle(ButtonStyle.Secondary)
    );

    const row = new ActionRowBuilder().addComponents(buttons);

    await interaction.editReply({
      content: report,
      components: [row],
    });

    logger.info(`Sync report: ${totalIssues} discrepancies found`);
  } catch (error) {
    logger.error('Error in /sync server:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}`,
    });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sync')
    .setDescription('Sync server state with database (Moderator only)')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('server')
        .setDescription(
          'Check and report discrepancies between Discord and database'
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('import')
        .setDescription(
          'Import existing Discord courses/roles into the database'
        )
    ),
  isModeratorOnly: true,

  /**
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    logger.info(`/sync ${subcommand}: ${interaction.user.tag}`);

    if (subcommand === 'server') {
      await handleSyncServer(interaction);
    } else if (subcommand === 'import') {
      await handleSyncImport(interaction);
    }
  },
};
