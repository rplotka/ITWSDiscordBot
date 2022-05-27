const { ButtonInteraction } = require('discord.js');
const { userRoles } = require('../core/constants');
const logger = require('../core/logging');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * @param {ButtonInteraction} interaction
   */
  async execute(interaction) {
    const roleCustomIds = userRoles.map(
      (userRole) => `set-role-${userRole.customId}`
    );
    if (
      !interaction.isButton() ||
      !roleCustomIds.includes(interaction.customId)
    )
      return;

    logger.info(
      `${interaction.member} selected role '${interaction.customId}'`
    );

    interaction.reply({
      content: `You've been marked as a **${interaction.customId}**`,
      ephemeral: true,
    });

    // Add desired role and remove others
    userRoles.forEach((userRole) => {
      if (interaction.customId === `set-role-${userRole.customId}`) {
        interaction.member.roles.add(userRole.discordRoleId);
      } else {
        interaction.member.roles.remove(userRole.discordRoleId);
      }
    });
  },
};
