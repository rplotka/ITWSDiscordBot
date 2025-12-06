const logger = require('../core/logging');
const { PendingVerification } = require('../core/db');
const {
  USER_TYPES,
  pendingModVerifications,
  validateEmail,
  generateVerificationCode,
} = require('../commands/verify');

/**
 * Parse courses from user input
 */
function parseCourses(coursesInput) {
  if (!coursesInput) return [];

  return coursesInput
    .split(/[,;\n]+/)
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c.length > 0)
    .map((c) => {
      // Normalize format: "ITWS 1100" -> "ITWS-1100"
      const match = c.match(/^([A-Z]+)\s*[-_]?\s*(\d+)$/);
      if (match) {
        return `${match[1]}-${match[2]}`;
      }
      return c;
    });
}

/**
 * Process verification modal submission
 */
async function processVerification(
  interaction,
  userType,
  targetUserId,
  initiatedBy,
  moderatorId
) {
  const config = USER_TYPES[userType];
  if (!config) {
    await interaction.reply({
      content: '❌ Invalid user type.',
      ephemeral: true,
    });
    return;
  }

  // Extract form values
  const realName = interaction.fields.getTextInputValue('real_name');
  const email = config.requiresEmail
    ? interaction.fields.getTextInputValue('email')
    : null;
  const cohort = config.requiresCohort
    ? interaction.fields.getTextInputValue('cohort')
    : null;
  const coursesRaw = config.requiresCourses
    ? interaction.fields.getTextInputValue('courses')
    : null;
  const affiliation = config.requiresAffiliation
    ? interaction.fields.getTextInputValue('affiliation')
    : null;

  // Validate email
  if (email) {
    const emailValidation = validateEmail(email, config.emailDomain);
    if (!emailValidation.valid) {
      await interaction.reply({
        content: `❌ ${emailValidation.error}`,
        ephemeral: true,
      });
      return;
    }
  }

  // Parse courses
  const courses = parseCourses(coursesRaw);

  // Generate verification code
  const verificationCode = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Check for existing pending verification
  if (PendingVerification) {
    const existing = await PendingVerification.findOne({
      where: {
        discordUserId: targetUserId,
        discordGuildId: interaction.guild.id,
      },
    });

    if (existing) {
      await existing.destroy();
    }
  }

  // Create pending verification record
  if (PendingVerification) {
    await PendingVerification.create({
      discordUserId: targetUserId,
      discordGuildId: interaction.guild.id,
      userType,
      email,
      realName,
      cohort,
      courses: courses.length > 0 ? courses : null,
      affiliation,
      verificationCode,
      expiresAt,
      initiatedBy,
      moderatorId,
    });

    logger.info(
      `Created pending verification for ${targetUserId} (${userType}): ${verificationCode}`
    );
  }

  // Build verification URL
  const verificationUrl = `https://plotka.dev/verify/${verificationCode}`;

  // Build response
  let response = `📧 **Verification Email Required**\n\n`;
  response += `We need to verify your email address: **${email}**\n\n`;
  response += `Click the link below to verify:\n${verificationUrl}\n\n`;
  response += `Or enter this code on the verification page:\n\`${verificationCode}\`\n\n`;
  response += `⏳ This link expires <t:${Math.floor(
    expiresAt.getTime() / 1000
  )}:R>`;

  await interaction.reply({
    content: response,
    ephemeral: true,
  });

  // TODO: Actually send the verification email
  // For now, we'll just log the verification code and URL
  logger.info(`Verification URL for ${email}: ${verificationUrl}`);
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    if (!interaction.isModalSubmit()) return;

    // Handle self-verification modal
    if (interaction.customId.startsWith('verify-modal-')) {
      const userType = interaction.customId.replace('verify-modal-', '');

      await processVerification(
        interaction,
        userType,
        interaction.user.id,
        'self',
        null
      );
    }

    // Handle moderator-initiated verification modal
    if (interaction.customId.startsWith('mod-verify-modal-')) {
      const userType = interaction.customId.replace('mod-verify-modal-', '');

      // Get the stored target user info
      const pendingInfo = pendingModVerifications.get(interaction.user.id);

      if (!pendingInfo) {
        await interaction.reply({
          content:
            '❌ Verification session expired. Please start again with `/verify user`.',
          ephemeral: true,
        });
        return;
      }

      await processVerification(
        interaction,
        userType,
        pendingInfo.targetUserId,
        'moderator',
        interaction.user.id
      );

      // Clean up pending info
      pendingModVerifications.delete(interaction.user.id);

      // Also notify the target user
      try {
        const targetMember = await interaction.guild.members.fetch(
          pendingInfo.targetUserId
        );
        if (targetMember) {
          const email = interaction.fields.getTextInputValue('email');
          await targetMember
            .send(
              `📧 **Verification Required**\n\n` +
                `A moderator has initiated your verification for the **${interaction.guild.name}** server.\n\n` +
                `Please check your email (${email}) for a verification link.\n\n` +
                `If you didn't request this, please contact a server moderator.`
            )
            .catch(() => {
              // DMs might be disabled, that's okay
              logger.info(
                `Could not DM ${targetMember.user.tag} about verification`
              );
            });
        }
      } catch (err) {
        logger.error('Error notifying target user:', err);
      }
    }
  },
};
