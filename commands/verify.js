const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { PendingVerification, VerifiedUser } = require('../core/db');
const logger = require('../core/logging');

/**
 * Store pending moderator verifications (moderatorId -> target info)
 * Exported so event handlers can access it
 */
const pendingModVerifications = new Map();

/**
 * User type options for verification
 */
const USER_TYPES = {
  student: {
    label: 'Current Student',
    description: 'Currently enrolled at RPI',
    emoji: '🎓',
    requiresEmail: true,
    emailDomain: '@rpi.edu',
    requiresCohort: true,
    cohortLabel: 'Graduation Year (e.g., 2027)',
  },
  faculty: {
    label: 'Faculty',
    description: 'Professor, lecturer, or staff at RPI',
    emoji: '👨‍🏫',
    requiresEmail: true,
    emailDomain: '@rpi.edu',
    requiresCourses: true,
  },
  accepted_student: {
    label: 'Accepted Student',
    description: 'Accepted to RPI but not yet enrolled',
    emoji: '📬',
    requiresEmail: true,
    emailDomain: null, // Any email
    requiresCohort: true,
    cohortLabel: 'Expected Start Term (e.g., Fall 2026)',
  },
  alumni: {
    label: 'Alumni',
    description: 'Former RPI student',
    emoji: '🎓',
    requiresEmail: true,
    emailDomain: null, // Any email (alumni may not have @rpi.edu)
    requiresCohort: true,
    cohortLabel: 'Graduation Year (e.g., 2020)',
  },
  external: {
    label: 'External Guest',
    description: 'Industry partner, guest speaker, or other',
    emoji: '🌐',
    requiresEmail: true,
    emailDomain: null,
    requiresAffiliation: true,
  },
};

/**
 * Generate a random verification code
 */
function generateVerificationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const codeLength = 8;
  Array.from({ length: codeLength }).forEach(() => {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  });
  return code;
}

/**
 * Build the user type selection menu
 */
function buildUserTypeMenu(customIdPrefix = 'verify') {
  const options = Object.entries(USER_TYPES).map(([value, config]) => ({
    label: config.label,
    description: config.description,
    value,
    emoji: config.emoji,
  }));

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`${customIdPrefix}-select-type`)
      .setPlaceholder('Select your user type...')
      .addOptions(options)
  );
}

/**
 * Build the verification modal for a specific user type
 */
function buildVerificationModal(userType, customIdPrefix = 'verify') {
  const config = USER_TYPES[userType];
  if (!config) return null;

  const modal = new ModalBuilder()
    .setCustomId(`${customIdPrefix}-modal-${userType}`)
    .setTitle(`Verify as ${config.label}`);

  const components = [];

  // Real name input (always required)
  const nameInput = new TextInputBuilder()
    .setCustomId('real_name')
    .setLabel('Your Full Name')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('John Smith')
    .setRequired(true)
    .setMaxLength(100);
  components.push(new ActionRowBuilder().addComponents(nameInput));

  // Email input
  if (config.requiresEmail) {
    const emailPlaceholder = config.emailDomain
      ? `yourname${config.emailDomain}`
      : 'your@email.com';
    const emailLabel = config.emailDomain
      ? `Email Address (must be ${config.emailDomain})`
      : 'Email Address';

    const emailInput = new TextInputBuilder()
      .setCustomId('email')
      .setLabel(emailLabel)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(emailPlaceholder)
      .setRequired(true)
      .setMaxLength(100);
    components.push(new ActionRowBuilder().addComponents(emailInput));
  }

  // Cohort input (for students, accepted students, alumni)
  if (config.requiresCohort) {
    const cohortInput = new TextInputBuilder()
      .setCustomId('cohort')
      .setLabel(config.cohortLabel)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder(userType === 'accepted_student' ? 'Fall 2026' : '2027')
      .setRequired(true)
      .setMaxLength(20);
    components.push(new ActionRowBuilder().addComponents(cohortInput));
  }

  // Courses input (for faculty)
  if (config.requiresCourses) {
    const coursesInput = new TextInputBuilder()
      .setCustomId('courses')
      .setLabel('Courses You Teach (comma-separated)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('ITWS-1100, ITWS-4500')
      .setRequired(true)
      .setMaxLength(500);
    components.push(new ActionRowBuilder().addComponents(coursesInput));
  }

  // Affiliation input (for external)
  if (config.requiresAffiliation) {
    const affiliationInput = new TextInputBuilder()
      .setCustomId('affiliation')
      .setLabel('Your Affiliation/Reason for Joining')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Company name, reason for visit, etc.')
      .setRequired(true)
      .setMaxLength(500);
    components.push(new ActionRowBuilder().addComponents(affiliationInput));
  }

  modal.addComponents(components);
  return modal;
}

/**
 * Validate email address format and domain
 */
function validateEmail(email, requiredDomain) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (
    requiredDomain &&
    !email.toLowerCase().endsWith(requiredDomain.toLowerCase())
  ) {
    return { valid: false, error: `Email must end with ${requiredDomain}` };
  }

  return { valid: true };
}

/**
 * Extract RCS ID from @rpi.edu email
 */
function extractRcsId(email) {
  if (!email.toLowerCase().endsWith('@rpi.edu')) return null;
  return email.split('@')[0].toLowerCase();
}

/**
 * Handle /verify command - show type selection
 */
async function handleVerify(interaction) {
  // Check if user is already verified
  if (VerifiedUser) {
    const existingVerification = await VerifiedUser.findOne({
      where: {
        discordUserId: interaction.user.id,
        discordGuildId: interaction.guild.id,
      },
    });

    if (existingVerification) {
      await interaction.reply({
        content: `✅ You are already verified as **${
          USER_TYPES[existingVerification.userType]?.label ||
          existingVerification.userType
        }** (${
          existingVerification.realName
        }).\n\nIf you need to update your verification, please contact a moderator.`,
        ephemeral: true,
      });
      return;
    }
  }

  // Check if user has a pending verification
  if (PendingVerification) {
    const pending = await PendingVerification.findOne({
      where: {
        discordUserId: interaction.user.id,
        discordGuildId: interaction.guild.id,
      },
    });

    if (pending && new Date(pending.expiresAt) > new Date()) {
      await interaction.reply({
        content: `⏳ You already have a pending verification.\n\n**Email:** ${
          pending.email
        }\n**Expires:** <t:${Math.floor(
          new Date(pending.expiresAt).getTime() / 1000
        )}:R>\n\nPlease check your email for the verification link. If you need a new code, wait for this one to expire or contact a moderator.`,
        ephemeral: true,
      });
      return;
    }

    // Delete expired pending verification
    if (pending) {
      await pending.destroy();
    }
  }

  const row = buildUserTypeMenu('verify');

  await interaction.reply({
    content:
      '**Welcome to ITWS Discord!**\n\nTo get verified and access the server, please select your user type below:',
    components: [row],
    ephemeral: true,
  });

  logger.info(`/verify: ${interaction.user.tag}`);
}

/**
 * Handle /verify user command - moderator initiates verification
 */
async function handleVerifyUser(interaction) {
  const targetUser = interaction.options.getUser('user');
  const member = await interaction.guild.members.fetch(targetUser.id);

  if (!member) {
    await interaction.reply({
      content: '❌ User not found in this server.',
      ephemeral: true,
    });
    return;
  }

  // Check if user is already verified
  if (VerifiedUser) {
    const existingVerification = await VerifiedUser.findOne({
      where: {
        discordUserId: targetUser.id,
        discordGuildId: interaction.guild.id,
      },
    });

    if (existingVerification) {
      await interaction.reply({
        content: `✅ ${targetUser} is already verified as **${
          USER_TYPES[existingVerification.userType]?.label ||
          existingVerification.userType
        }** (${existingVerification.realName}).`,
        ephemeral: true,
      });
      return;
    }
  }

  const row = buildUserTypeMenu('mod-verify');

  await interaction.reply({
    content: `**Verifying ${targetUser}**\n\nSelect the user type for this member:`,
    components: [row],
    ephemeral: true,
  });

  // Store target user ID for the modal handler
  pendingModVerifications.set(interaction.user.id, {
    targetUserId: targetUser.id,
    moderatorId: interaction.user.id,
    guildId: interaction.guild.id,
    timestamp: Date.now(),
  });

  logger.info(
    `/verify user: ${interaction.user.tag} initiating verification for ${targetUser.tag}`
  );
}

/**
 * Handle /verify status command - check verification status
 */
async function handleVerifyStatus(interaction) {
  const targetUser = interaction.options.getUser('user') || interaction.user;

  if (!VerifiedUser) {
    await interaction.reply({
      content: '❌ Database is not available.',
      ephemeral: true,
    });
    return;
  }

  const verification = await VerifiedUser.findOne({
    where: {
      discordUserId: targetUser.id,
      discordGuildId: interaction.guild.id,
    },
  });

  if (!verification) {
    // Check for pending
    if (PendingVerification) {
      const pending = await PendingVerification.findOne({
        where: {
          discordUserId: targetUser.id,
          discordGuildId: interaction.guild.id,
        },
      });

      if (pending && new Date(pending.expiresAt) > new Date()) {
        await interaction.reply({
          content: `⏳ **${targetUser}** has a pending verification:\n\n**Type:** ${
            USER_TYPES[pending.userType]?.label || pending.userType
          }\n**Email:** ${pending.email}\n**Expires:** <t:${Math.floor(
            new Date(pending.expiresAt).getTime() / 1000
          )}:R>`,
          ephemeral: true,
        });
        return;
      }
    }

    await interaction.reply({
      content: `❌ **${targetUser}** is not verified.`,
      ephemeral: true,
    });
    return;
  }

  let status = `✅ **${targetUser}** is verified:\n\n`;
  status += `**Type:** ${
    USER_TYPES[verification.userType]?.label || verification.userType
  }\n`;
  status += `**Name:** ${verification.realName}\n`;
  status += `**Email:** ${verification.email}\n`;

  if (verification.rcsId) {
    status += `**RCS ID:** ${verification.rcsId}\n`;
  }
  if (verification.cohort) {
    status += `**Cohort:** ${verification.cohort}\n`;
  }
  if (verification.courses && verification.courses.length > 0) {
    status += `**Courses:** ${verification.courses.join(', ')}\n`;
  }
  if (verification.affiliation) {
    status += `**Affiliation:** ${verification.affiliation}\n`;
  }

  status += `\n**Verified:** <t:${Math.floor(
    new Date(verification.verifiedAt).getTime() / 1000
  )}:F>`;

  await interaction.reply({
    content: status,
    ephemeral: true,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verify your identity to access the server')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('me')
        .setDescription('Verify yourself to gain access to the server')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('user')
        .setDescription('(Moderator) Initiate verification for a user')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('The user to verify')
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('Check verification status')
        .addUserOption((option) =>
          option
            .setName('user')
            .setDescription('The user to check (defaults to yourself)')
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'me') {
      await handleVerify(interaction);
    } else if (subcommand === 'user') {
      // Moderator-only command
      const member = await interaction.guild.members.fetch(interaction.user.id);
      const isModerator = member.permissions.has('ManageRoles');

      if (!isModerator) {
        await interaction.reply({
          content: '❌ This command is only available to moderators.',
          ephemeral: true,
        });
        return;
      }

      await handleVerifyUser(interaction);
    } else if (subcommand === 'status') {
      await handleVerifyStatus(interaction);
    }
  },

  // Export helpers for use in interaction handlers
  USER_TYPES,
  pendingModVerifications,
  buildUserTypeMenu,
  buildVerificationModal,
  validateEmail,
  extractRcsId,
  generateVerificationCode,
};
