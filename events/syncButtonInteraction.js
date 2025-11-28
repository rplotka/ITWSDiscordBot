const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Course } = require('../core/db');
const logger = require('../core/logging');

// Store pending deletions temporarily (role IDs to delete after confirmation)
const pendingDeletions = new Map();

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

      // Legacy import orphans - redirect to delete
      if (action === 'sync-import-orphans') {
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

        await interaction.editReply({
          content:
            '**Clean Database** - This feature is not yet implemented.\n\n' +
            'This would remove database entries for roles/channels that no longer exist in Discord.\n\n' +
            'For now, you can manually remove courses using `/remove course`.',
          components: [],
        });
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
