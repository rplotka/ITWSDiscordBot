// JSDoc types: CommandInteraction
const { CourseTeam, Course } = require('../core/db');
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
      !interaction.isStringSelectMenu() ||
      interaction.customId !== 'course-team-join' ||
      !interaction.values.length
    )
      return;

    await interaction.deferUpdate({ ephemeral: true });

    // Find course team they want to join
    const courseTeamId = interaction.values[0];

    logger.info(
      `${interaction.user} selected course team ID ${courseTeamId} to join`
    );

    const courseTeam = await CourseTeam.findByPk(courseTeamId, {
      include: [
        {
          model: Course,
          as: 'Course',
        },
      ],
    });

    // Check if course exists
    if (!courseTeam) {
      await interaction.editReply({
        components: [],
        content: '❌ Course team not found.',
        ephemeral: true,
      });
      return;
    }

    // Attempt to add course team role (also tries to send welcome message)
    try {
      await addMemberToCourseTeam(interaction.member, courseTeam);
    } catch (error) {
      await interaction.editReply({
        content:
          '❌ Failed to add course team role. Please contact a Moderator on the server!',
        components: [],
        ephemeral: true,
      });
      logger.error(
        `Failed to add ${interaction.member} to course team '${courseTeam.title}' (${courseTeam.Course.title})`
      );
      logger.error(error);
      return;
    }

    await interaction.editReply({
      content: `👥 You now have access to your team channels for **${courseTeam.title}** in course **${courseTeam.Course.title}**.`,
      components: [],
      ephemeral: true,
    });
  },
};
