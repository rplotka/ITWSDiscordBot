const {
  CommandInteraction,
  MessageActionRow,
  MessageSelectMenu,
} = require('discord.js');
const { CourseTeam, Course } = require('../core/db');
const logger = require('../core/logging');
const { removeMemberFromCourseTeam } = require('../core/utils');

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
      interaction.customId !== 'course-team-leave' ||
      !interaction.values.length
    )
      return;

    // Find course team they want to leave
    const courseTeamId = interaction.values[0];

    logger.info(
      `${interaction.user} selected course team ID ${courseTeamId} to leave`
    );

    const courseTeam = await CourseTeam.findByPk(courseTeamId, {
      include: [{ model: Course, as: 'Course' }],
    });

    // Check if course exists
    if (!courseTeam) {
      await interaction.update({
        components: [],
        content: '❌ Course team not found.',
        ephemeral: true,
      });
      return;
    }

    // Attempt to add course team role (also tries to send welcome message)
    try {
      await removeMemberFromCourseTeam(interaction.member, courseTeam);
    } catch (error) {
      await interaction.update({
        content:
          '❌ Failed to remove course team role. Please contact a Moderator on the server!',
        components: [],
        ephemeral: true,
      });
      logger.error(
        `Failed to remove ${interaction.member} from course team '${courseTeam.title}' (${courseTeam.Course.title})`
      );
      logger.error(error);
      return;
    }

    await interaction.update({
      content: `❎ You no longer have access to the team channels for **${courseTeam.title}** in course **${courseTeam.Course.title}**.`,
      components: [],
      ephemeral: true,
    });
  },
};
