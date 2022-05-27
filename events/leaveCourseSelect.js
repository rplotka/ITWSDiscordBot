const {
  CommandInteraction,
  MessageActionRow,
  MessageSelectMenu,
} = require('discord.js');
const { Course } = require('../core/db');
const logger = require('../core/logging');
const { removeMemberFromCourse } = require('../core/utils');

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
      interaction.customId !== 'course-leave' ||
      !interaction.values.length
    )
      return;

    const courseId = interaction.values[0];

    logger.info(`${interaction.user} selected course ID ${courseId} to leave`);

    // Find course they want to leave
    const course = await Course.findByPk(courseId);

    // Check if course exists
    if (!course) {
      await interaction.update({
        components: [],
        content: '❌ Course not found.',
        ephemeral: true,
      });
      return;
    }

    // Attempt to remove them from course
    try {
      await removeMemberFromCourse(interaction.member, course);
      logger.info(
        `${interaction.member} left course '${course.title}' (${course.id}) and any teams`
      );
    } catch (error) {
      await interaction.update({
        content: '❌ Something went wrong... Please contact a Moderator!',
        components: [],
      });
      logger.error(
        `Failed to remove ${interaction.member} from course '${course.title}' (${course.id})`
      );
      logger.error(error);
      return;
    }

    // Update status
    await interaction.update({
      content: `❎ You no longer access to the private **${course.title}** channels.`,
      components: [],
      ephemeral: true,
    });
  },
};
