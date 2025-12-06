const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require('discord.js');
const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');

// Store pending deletions temporarily (role IDs to delete after confirmation)
const pendingDeletions = new Map();

/**
 * Find potential courses in Discord that could be imported to DB
 * Looks at Faculty members' roles to identify course roles
 */
function findImportableCourses(guild, existingCourses) {
  const existingRoleIds = new Set();
  existingCourses.forEach((c) => {
    if (c.discordRoleId) existingRoleIds.add(c.discordRoleId);
    if (c.discordInstructorRoleId)
      existingRoleIds.add(c.discordInstructorRoleId);
  });

  // Roles to exclude from course detection
  const excludedRoleNames = new Set([
    '@everyone',
    'everyone',
    'Faculty',
    'Instructor',
    'Instructors',
    'Staff',
    'Admin',
    'Administrator',
    'Moderator',
    'Bot',
    'Bots',
    'Student',
    'Students',
    'Alumni',
    'Prospective Students',
    'Accepted Students',
    'Server Booster',
  ]);

  // Find the Faculty role
  const facultyRole = guild.roles.cache.find((r) => r.name === 'Faculty');

  const importable = new Map();

  if (facultyRole) {
    facultyRole.members.forEach((member) => {
      member.roles.cache.forEach((role) => {
        if (existingRoleIds.has(role.id)) return;
        if (excludedRoleNames.has(role.name)) return;
        if (role.name.endsWith(' Instructor')) return;
        if (role.name === facultyRole.name) return;
        if (role.managed) return;

        if (!importable.has(role.id)) {
          const instructorRole = guild.roles.cache.find(
            (r) => r.name === `${role.name} Instructor`
          );

          const category = guild.channels.cache.find(
            (c) =>
              c.type === ChannelType.GuildCategory &&
              (c.name === role.name ||
                c.name.toLowerCase() === role.name.toLowerCase())
          );

          importable.set(role.id, {
            name: role.name,
            courseRole: role,
            instructorRole: instructorRole || null,
            category: category || null,
          });
        }
      });
    });
  }

  // Also find any "X Instructor" roles
  const instructorRoles = guild.roles.cache.filter(
    (r) =>
      r.name.endsWith(' Instructor') &&
      !existingRoleIds.has(r.id) &&
      !excludedRoleNames.has(r.name.replace(/ Instructor$/, ''))
  );

  instructorRoles.forEach((instructorRole) => {
    const courseName = instructorRole.name.replace(/ Instructor$/, '');

    const existingEntry = Array.from(importable.values()).find(
      (item) => item.name === courseName
    );
    if (existingEntry) return;

    const courseRole = guild.roles.cache.find(
      (r) => r.name === courseName && !existingRoleIds.has(r.id)
    );

    const category = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildCategory &&
        (c.name === courseName ||
          c.name.toLowerCase() === courseName.toLowerCase())
    );

    importable.set(instructorRole.id, {
      name: courseName,
      courseRole: courseRole || null,
      instructorRole,
      category: category || null,
    });
  });

  return Array.from(importable.values());
}

/**
 * Find orphaned roles that match course/instructor patterns but aren't in DB
 */
async function findOrphanedRoles(guild) {
  const courses = await Course.findAll();

  // Collect all tracked role IDs
  const dbRoleIds = new Set();
  courses.forEach((course) => {
    if (course.discordRoleId) dbRoleIds.add(course.discordRoleId);
    if (course.discordInstructorRoleId)
      dbRoleIds.add(course.discordInstructorRoleId);
  });

  // Patterns for course/instructor roles
  const coursePattern = /^(ITWS|CSCI|ECSE|MGMT|COMM)\s*\d{4}/i;
  const instructorPattern = /Instructor$/;

  const orphanedRoles = [];

  guild.roles.cache.forEach((role) => {
    if (dbRoleIds.has(role.id)) return; // Already tracked

    // Check if it looks like a course or instructor role
    if (
      coursePattern.test(role.name) ||
      (instructorPattern.test(role.name) && role.name.includes(' '))
    ) {
      orphanedRoles.push({
        id: role.id,
        name: role.name,
        memberCount: role.members.size,
      });
    }
  });

  return orphanedRoles;
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * Handles sync button interactions
   * @param {import('discord.js').ButtonInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
    if (!interaction.customId.startsWith('sync-')) return;

    const action = interaction.customId;
    logger.info(`Sync interaction: ${action} by ${interaction.user.tag}`);

    try {
      // Dismiss button
      if (action === 'sync-dismiss') {
        pendingDeletions.delete(interaction.user.id);
        await interaction.update({
          content: 'Sync report dismissed.',
          components: [],
        });
        return;
      }

      // Confirm import - actually create database entries
      if (action === 'sync-confirm-import') {
        await interaction.deferUpdate();

        if (!Course) {
          await interaction.editReply({
            content: '❌ Database is not available.',
            components: [],
          });
          return;
        }

        const existingCourses = await Course.findAll();
        const importable = findImportableCourses(
          interaction.guild,
          existingCourses
        );

        if (importable.length === 0) {
          await interaction.editReply({
            content: '✅ No courses to import.',
            components: [],
          });
          return;
        }

        let imported = 0;
        let failed = 0;
        const importedNames = [];
        const failedNames = [];

        // Import each course
        const importResults = await Promise.allSettled(
          importable.map(async (item) => {
            const courseData = {
              title: item.name,
              shortTitle:
                item.name.length > 20 ? item.name.substring(0, 20) : item.name,
              isPublic: true,
              discordRoleId: item.courseRole?.id || null,
              discordInstructorRoleId: item.instructorRole?.id || null,
              discordCategoryId: item.category?.id || null,
            };

            await Course.create(courseData);
            logger.info(`Imported course to DB: ${item.name}`);
            return { success: true, name: item.name };
          })
        );

        importResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            imported += 1;
            importedNames.push(result.value.name);
          } else {
            failed += 1;
            failedNames.push(importable[index].name);
            if (result.status === 'rejected') {
              logger.error(
                `Failed to import course ${importable[index].name}:`,
                result.reason
              );
            }
          }
        });

        let response = `**📥 Import Complete**\n\n`;
        response += `✅ Imported ${imported} course(s) to database\n`;
        if (importedNames.length > 0 && importedNames.length <= 10) {
          response += `   ${importedNames.join(', ')}\n`;
        }
        if (failed > 0) {
          response += `❌ Failed to import ${failed} course(s): ${failedNames.join(
            ', '
          )}\n`;
        }
        response += `\nYou can now use \`/remove course\` to manage these courses.`;

        await interaction.editReply({
          content: response,
          components: [],
        });

        logger.info(
          `Sync import complete: ${imported} imported, ${failed} failed`
        );
        return;
      }

      // Delete orphaned roles (those with 0 members)
      if (action === 'sync-delete-orphans') {
        await interaction.deferUpdate();

        const orphanedRoles = await findOrphanedRoles(interaction.guild);
        const emptyRoles = orphanedRoles.filter((r) => r.memberCount === 0);
        const rolesWithMembers = orphanedRoles.filter((r) => r.memberCount > 0);

        let deleted = 0;
        let failed = 0;
        const failedNames = [];

        // Delete empty roles
        const deleteResults = await Promise.allSettled(
          emptyRoles.map(async (roleInfo) => {
            const role = interaction.guild.roles.cache.get(roleInfo.id);
            if (role) {
              await role.delete('Orphaned role cleanup via /sync');
              logger.info(`Deleted orphaned role: ${roleInfo.name}`);
              return { success: true, name: roleInfo.name };
            }
            return {
              success: false,
              name: roleInfo.name,
              reason: 'Role not found',
            };
          })
        );

        deleteResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            deleted += 1;
          } else {
            failed += 1;
            failedNames.push(emptyRoles[index].name);
            if (result.status === 'rejected') {
              logger.error(
                `Failed to delete role ${emptyRoles[index].name}:`,
                result.reason
              );
            }
          }
        });

        let response = `**Orphaned Role Cleanup**\n\n`;
        response += `✅ Deleted ${deleted} empty role(s)\n`;
        if (failed > 0) {
          response += `❌ Failed to delete ${failed} role(s): ${failedNames.join(
            ', '
          )}\n`;
        }

        // If there are roles with members, show them and offer to delete
        if (rolesWithMembers.length > 0) {
          response += `\n⚠️ **${rolesWithMembers.length} role(s) have members and were NOT deleted:**\n`;
          rolesWithMembers.slice(0, 10).forEach((r) => {
            response += `• ${r.name} (${r.memberCount} member${
              r.memberCount !== 1 ? 's' : ''
            })\n`;
          });
          if (rolesWithMembers.length > 10) {
            response += `  ... and ${rolesWithMembers.length - 10} more\n`;
          }

          // Store pending deletions for this user
          pendingDeletions.set(
            interaction.user.id,
            rolesWithMembers.map((r) => r.id)
          );

          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('sync-delete-with-members')
              .setLabel('Delete Roles With Members')
              .setStyle(ButtonStyle.Danger)
              .setEmoji('⚠️'),
            new ButtonBuilder()
              .setCustomId('sync-dismiss')
              .setLabel('Done')
              .setStyle(ButtonStyle.Secondary)
          );

          await interaction.editReply({
            content: response,
            components: [row],
          });
        } else {
          await interaction.editReply({
            content: response,
            components: [],
          });
        }
        return;
      }

      // Delete roles that have members (requires confirmation)
      if (action === 'sync-delete-with-members') {
        await interaction.deferUpdate();

        const roleIds = pendingDeletions.get(interaction.user.id);
        if (!roleIds || roleIds.length === 0) {
          await interaction.editReply({
            content: 'No pending roles to delete.',
            components: [],
          });
          return;
        }

        let deleted = 0;
        let failed = 0;
        const failedNames = [];

        const deleteResults = await Promise.allSettled(
          roleIds.map(async (roleId) => {
            const role = interaction.guild.roles.cache.get(roleId);
            if (role) {
              const roleName = role.name;
              await role.delete(
                'Orphaned role cleanup via /sync (with members)'
              );
              logger.info(
                `Deleted orphaned role with members: ${roleName} (${roleId})`
              );
              return { success: true, name: roleName };
            }
            return { success: false, name: roleId, reason: 'Role not found' };
          })
        );

        deleteResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.success) {
            deleted += 1;
          } else {
            failed += 1;
            const role = interaction.guild.roles.cache.get(roleIds[index]);
            failedNames.push(role?.name || roleIds[index]);
            if (result.status === 'rejected') {
              logger.error(
                `Failed to delete role ${roleIds[index]}:`,
                result.reason
              );
            }
          }
        });

        pendingDeletions.delete(interaction.user.id);

        let response = `**Deleted Roles With Members**\n\n`;
        response += `✅ Deleted ${deleted} role(s)\n`;
        if (failed > 0) {
          response += `❌ Failed to delete ${failed} role(s): ${failedNames.join(
            ', '
          )}\n`;
        }

        await interaction.editReply({
          content: response,
          components: [],
        });
        return;
      }

      // Remove orphans button
      if (
        action === 'sync-remove-orphans' ||
        action === 'sync-import-orphans'
      ) {
        await interaction.deferUpdate();

        const orphanedRoles = await findOrphanedRoles(interaction.guild);

        if (orphanedRoles.length === 0) {
          await interaction.editReply({
            content: 'No orphaned roles found.',
            components: [],
          });
          return;
        }

        const emptyCount = orphanedRoles.filter(
          (r) => r.memberCount === 0
        ).length;
        const withMembersCount = orphanedRoles.filter(
          (r) => r.memberCount > 0
        ).length;

        let response = `**Orphaned Roles Found: ${orphanedRoles.length}**\n\n`;
        response += `• ${emptyCount} role(s) with no members (safe to delete)\n`;
        response += `• ${withMembersCount} role(s) with members (will ask for confirmation)\n\n`;
        response += `Click **Delete Orphaned Roles** to remove them from Discord.`;

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('sync-delete-orphans')
            .setLabel('Delete Orphaned Roles')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️'),
          new ButtonBuilder()
            .setCustomId('sync-dismiss')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.editReply({
          content: response,
          components: [row],
        });
        return;
      }

      // Clean database - remove entries for non-existent Discord resources
      if (action === 'sync-clean-db') {
        await interaction.deferUpdate();

        if (!Course) {
          await interaction.editReply({
            content: 'Database is not available.',
            components: [],
          });
          return;
        }

        // Find all database entries that reference non-existent Discord resources
        const courses = await Course.findAll({
          include: [{ model: CourseTeam, as: 'CourseTeams' }],
        });

        const toClean = {
          courses: [],
          teams: [],
        };

        courses.forEach((course) => {
          let courseMissing = false;

          // Check if course role exists
          if (course.discordRoleId) {
            const role = interaction.guild.roles.cache.get(
              course.discordRoleId
            );
            if (!role) courseMissing = true;
          }

          // Check if category exists
          if (course.discordCategoryId) {
            const category = interaction.guild.channels.cache.get(
              course.discordCategoryId
            );
            if (!category) courseMissing = true;
          }

          if (courseMissing) {
            toClean.courses.push({
              id: course.id,
              title: course.title,
            });
          }

          // Check teams
          if (course.CourseTeams) {
            course.CourseTeams.forEach((team) => {
              let teamMissing = false;

              if (team.discordRoleId) {
                const role = interaction.guild.roles.cache.get(
                  team.discordRoleId
                );
                if (!role) teamMissing = true;
              }

              if (team.discordTextChannelId) {
                const channel = interaction.guild.channels.cache.get(
                  team.discordTextChannelId
                );
                if (!channel) teamMissing = true;
              }

              if (teamMissing) {
                toClean.teams.push({
                  id: team.id,
                  title: team.title,
                  courseTitle: course.title,
                });
              }
            });
          }
        });

        const totalToClean = toClean.courses.length + toClean.teams.length;

        if (totalToClean === 0) {
          await interaction.editReply({
            content:
              '✅ **Database is clean!**\n\nNo orphaned entries found. All database entries have matching Discord resources.',
            components: [],
          });
          return;
        }

        // Show confirmation
        let report = `**🗑️ Clean Database**\n\n`;
        report += `Found ${totalToClean} database entries with missing Discord resources:\n\n`;

        if (toClean.courses.length > 0) {
          report += `**Courses to remove (${toClean.courses.length}):**\n`;
          toClean.courses.slice(0, 10).forEach((c) => {
            report += `• ${c.title}\n`;
          });
          if (toClean.courses.length > 10) {
            report += `  ... and ${toClean.courses.length - 10} more\n`;
          }
          report += '\n';
        }

        if (toClean.teams.length > 0) {
          report += `**Teams to remove (${toClean.teams.length}):**\n`;
          toClean.teams.slice(0, 10).forEach((t) => {
            report += `• ${t.title} (${t.courseTitle})\n`;
          });
          if (toClean.teams.length > 10) {
            report += `  ... and ${toClean.teams.length - 10} more\n`;
          }
          report += '\n';
        }

        report +=
          '⚠️ **This will permanently delete these database entries.**\n' +
          'Discord resources are already gone - this just cleans up the database.';

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('sync-confirm-clean-db')
            .setLabel(`Delete ${totalToClean} Entries`)
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🗑️'),
          new ButtonBuilder()
            .setCustomId('sync-dismiss')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.editReply({
          content: report,
          components: [row],
        });
        return;
      }

      // Confirm clean database - actually delete entries
      if (action === 'sync-confirm-clean-db') {
        await interaction.deferUpdate();

        if (!Course) {
          await interaction.editReply({
            content: 'Database is not available.',
            components: [],
          });
          return;
        }

        // Find and delete orphaned entries
        const courses = await Course.findAll({
          include: [{ model: CourseTeam, as: 'CourseTeams' }],
        });

        // Helper to check if course resources are missing
        const isCourseOrphaned = (course) => {
          if (course.discordRoleId) {
            const role = interaction.guild.roles.cache.get(
              course.discordRoleId
            );
            if (!role) return true;
          }
          if (course.discordCategoryId) {
            const category = interaction.guild.channels.cache.get(
              course.discordCategoryId
            );
            if (!category) return true;
          }
          return false;
        };

        // Helper to check if team resources are missing
        const isTeamOrphaned = (team) => {
          if (team.discordRoleId) {
            const role = interaction.guild.roles.cache.get(team.discordRoleId);
            if (!role) return true;
          }
          if (team.discordTextChannelId) {
            const channel = interaction.guild.channels.cache.get(
              team.discordTextChannelId
            );
            if (!channel) return true;
          }
          return false;
        };

        // Collect all orphaned teams across all courses
        const orphanedTeams = courses.flatMap((course) =>
          (course.CourseTeams || []).filter(isTeamOrphaned)
        );

        // Delete orphaned teams in parallel
        const teamDeleteResults = await Promise.all(
          orphanedTeams.map(async (team) => {
            try {
              await team.destroy();
              logger.info(`Cleaned up orphaned team from DB: ${team.title}`);
              return { success: true };
            } catch (err) {
              return {
                success: false,
                error: `Team ${team.title}: ${err.message}`,
              };
            }
          })
        );

        const deletedTeams = teamDeleteResults.filter((r) => r.success).length;
        const teamErrors = teamDeleteResults
          .filter((r) => !r.success)
          .map((r) => r.error);

        // Find orphaned courses
        const orphanedCourses = courses.filter(isCourseOrphaned);

        // Delete orphaned courses in parallel
        const courseDeleteResults = await Promise.all(
          orphanedCourses.map(async (course) => {
            try {
              // Delete remaining teams first
              await CourseTeam.destroy({ where: { CourseId: course.id } });
              await course.destroy();
              logger.info(
                `Cleaned up orphaned course from DB: ${course.title}`
              );
              return { success: true };
            } catch (err) {
              return {
                success: false,
                error: `Course ${course.title}: ${err.message}`,
              };
            }
          })
        );

        const deletedCourses = courseDeleteResults.filter(
          (r) => r.success
        ).length;
        const courseErrors = courseDeleteResults
          .filter((r) => !r.success)
          .map((r) => r.error);

        const errors = [...teamErrors, ...courseErrors];

        let response = `**🗑️ Database Cleanup Complete**\n\n`;
        response += `✅ Deleted ${deletedCourses} course(s)\n`;
        response += `✅ Deleted ${deletedTeams} team(s)\n`;

        if (errors.length > 0) {
          response += `\n❌ Errors (${errors.length}):\n`;
          errors.slice(0, 5).forEach((e) => {
            response += `• ${e}\n`;
          });
        }

        await interaction.editReply({
          content: response,
          components: [],
        });

        logger.info(
          `Database cleanup: ${deletedCourses} courses, ${deletedTeams} teams deleted`
        );
        return;
      }

      // Unknown action
      await interaction.reply({
        content: `Unknown sync action: ${action}`,
        ephemeral: true,
      });
    } catch (error) {
      logger.error(`Error handling sync interaction ${action}:`, error);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: `Error: ${error.message}`,
            components: [],
          });
        } else {
          await interaction.reply({
            content: `Error: ${error.message}`,
            ephemeral: true,
          });
        }
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};
