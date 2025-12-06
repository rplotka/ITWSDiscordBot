const logger = require('../core/logging');
const {
  buildVerificationModal,
  pendingModVerifications,
} = require('../commands/verify');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    if (!interaction.isStringSelectMenu()) return;

    // Handle self-verification type selection
    if (interaction.customId === 'verify-select-type') {
      const userType = interaction.values[0];
      const modal = buildVerificationModal(userType, 'verify');

      if (!modal) {
        await interaction.reply({
          content: '❌ Invalid user type selected.',
          ephemeral: true,
        });
        return;
      }

      await interaction.showModal(modal);
      logger.info(
        `${interaction.user.tag} selected verification type: ${userType}`
      );
    }

    // Handle moderator-initiated verification type selection
    if (interaction.customId === 'mod-verify-select-type') {
      const userType = interaction.values[0];

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

      // Store the selected type
      pendingInfo.userType = userType;
      pendingModVerifications.set(interaction.user.id, pendingInfo);

      const modal = buildVerificationModal(userType, 'mod-verify');

      if (!modal) {
        await interaction.reply({
          content: '❌ Invalid user type selected.',
          ephemeral: true,
        });
        return;
      }

      await interaction.showModal(modal);
      logger.info(
        `Moderator ${interaction.user.tag} selected verification type ${userType} for user ${pendingInfo.targetUserId}`
      );
    }
  },
};
