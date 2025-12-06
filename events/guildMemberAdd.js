const logger = require('../core/logging');
const { VerifiedUser } = require('../core/db');

/**
 * Find the appropriate role for a user type
 */
function findRoleForUserType(guild, userType) {
  const roleNameMap = {
    student: 'Student',
    faculty: 'Faculty',
    accepted_student: 'Accepted Students',
    alumni: 'Alumni',
    external: 'Guest',
  };

  const roleName = roleNameMap[userType];
  if (!roleName) return null;

  return guild.roles.cache.find(
    (r) => r.name.toLowerCase() === roleName.toLowerCase()
  );
}

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  /**
   * When a new user joins the server, assign Unverified role and prompt them to verify.
   *
   * @param {import('discord.js').GuildMember} member
   */
  async execute(member) {
    // Skip bots
    if (member.user.bot) return;

    logger.info(`New member joined: ${member.user.tag} (${member.user.id})`);

    // Check if user is already verified (in case they left and rejoined)
    if (VerifiedUser) {
      const existingVerification = await VerifiedUser.findOne({
        where: {
          discordUserId: member.user.id,
          discordGuildId: member.guild.id,
        },
      });

      if (existingVerification) {
        logger.info(
          `${member.user.tag} is already verified, skipping Unverified role`
        );

        // Assign appropriate role based on their verified type
        try {
          const roleToAssign = await findRoleForUserType(
            member.guild,
            existingVerification.userType
          );
          if (roleToAssign) {
            await member.roles.add(roleToAssign);
            logger.info(
              `Reassigned ${existingVerification.userType} role to returning verified member ${member.user.tag}`
            );
          }
        } catch (err) {
          logger.error(
            `Error assigning role to returning member: ${err.message}`
          );
        }

        // Send welcome back message
        try {
          await member.send(
            `Welcome back to **${member.guild.name}**! ` +
              `You're still verified as **${existingVerification.realName}**. ` +
              `Your previous roles have been restored.`
          );
        } catch (err) {
          // DMs might be disabled
          logger.info(`Could not DM returning member ${member.user.tag}`);
        }

        return;
      }
    }

    // Find the Unverified role
    const unverifiedRole = member.guild.roles.cache.find(
      (r) => r.name.toLowerCase() === 'unverified'
    );

    if (unverifiedRole) {
      try {
        await member.roles.add(unverifiedRole);
        logger.info(`Assigned Unverified role to ${member.user.tag}`);
      } catch (err) {
        logger.error(`Error assigning Unverified role: ${err.message}`);
      }
    } else {
      logger.warn('Unverified role not found in guild');
    }

    // Send welcome message with verification instructions
    try {
      await member.send(
        `**Welcome to ${member.guild.name}!** 🎉\n\n` +
          `To gain full access to the server, you'll need to verify your identity.\n\n` +
          `Please use the \`/verify me\` command in the server to get started.\n\n` +
          `**Verification types:**\n` +
          `• 🎓 **Current Student** - RPI students with an @rpi.edu email\n` +
          `• 📬 **Accepted Student** - Accepted to RPI but not yet enrolled\n` +
          `• 👨‍🏫 **Faculty** - Professors, lecturers, or staff\n` +
          `• 🎓 **Alumni** - Former RPI students\n` +
          `• 🌐 **External Guest** - Industry partners or guests\n\n` +
          `If you have any questions, contact a moderator in the server.`
      );
      logger.info(`Sent welcome DM to ${member.user.tag}`);
    } catch (err) {
      // DMs might be disabled, that's okay
      logger.info(
        `Could not DM new member ${member.user.tag} (DMs may be disabled)`
      );
    }
  },
};
