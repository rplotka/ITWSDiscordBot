const { userRoles } = require('../core/constants');
const logger = require('../core/logging');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * @param {import('discord.js').ButtonInteraction} interaction
   */
  async execute(interaction) {
    const userRole = userRoles.find(
      (uR) => `set-role-${uR.customId}` === interaction.customId
    );

    if (!interaction.isButton() || !userRole) return;

    logger.info(`${interaction.member} selected role '${userRole.customId}'`);

    await interaction.reply({
      content: `You've been added to **${userRole.label}**`,
      ephemeral: true,
    });

    // Add desired role
    await interaction.member.roles.add(userRole.discordRoleId);

    // Remove other roles
    await Promise.allSettled(
      userRoles.map(async (uR) => {
        if (uR.customId !== userRole.customId && uR.discordRoleId) {
          return interaction.member.roles.remove(uR.discordRoleId);
        }
        return null;
      })
    );
  },
};
