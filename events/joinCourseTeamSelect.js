const {
  Client,
  CommandInteraction,
  MessageActionRow,
  MessageSelectMenu,
} = require('discord.js');
const { CourseTeam } = require('../core/db');
const logger = require('../core/logging');
const { addMemberToCourseTeam } = require('../core/utils');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   *
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    if (
      !interaction.isSelectMenu() ||
      interaction.customId !== 'course-team-join' ||
      !interaction.values.length
    )
      return;

    const courseTeamId = interaction.values[0];

    logger.info(
      `${interaction.user} selected course team ID ${courseTeamId} to join`
    );

    const courseTeam = await CourseTeam.findByPk(courseTeamId);

    // Check if course exists
    if (!courseTeam) {
      await interaction.update({
        components: [],
        content: '❌ Course team not found.',
        ephemeral: true,
      });
      return;
    }

    // Attempt to add course team role
    try {
      await addMemberToCourseTeam(interaction.member, courseTeam);
    } catch (e) {
      await interaction.update({
        content:
          '❌ Failed to add course team role. Please contact a Moderator on the server!',
        components: [],
        ephemeral: true,
      });
      return;
    }

    await interaction.update({
      content: `👥 You now have access to your team channels for **${courseTeam.title}**.`,
      components: [],
      ephemeral: true,
    });
  },
};
