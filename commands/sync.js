const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');

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
          .setCustomId('sync-import-orphans')
          .setLabel('Import Orphans')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('📥')
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
        .setDescription('Check and reconcile Discord with database')
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
    }
  },
};
