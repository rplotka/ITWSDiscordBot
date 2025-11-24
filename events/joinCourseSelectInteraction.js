// JSDoc types: CommandInteraction
const { Course } = require('../core/db');
const logger = require('../core/logging');
const { addMemberToCourse } = require('../core/utils');

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
      interaction.customId !== 'course-join' ||
      !interaction.values.length
    )
      return;

    await interaction.deferUpdate({ ephemeral: true });

    const courseId = interaction.values[0];

    logger.info(`${interaction.user} selected course ID ${courseId} to join`);

    // Find course they want to join
    const course = await Course.findByPk(courseId);

    // Check if course exists
    if (!course) {
      await interaction.editReply({
        components: [],
        content: '❌ Course not found.',
        ephemeral: true,
      });
      return;
    }

    // Check if course is publicly joinable
    if (!course.isPublic) {
      await interaction.editReply({
        content: '❌ You can only be added to that course by the instructor.',
        components: [],
        ephemeral: true,
      });
      return;
    }

    // Attemptto add them to course (also tries to send welcome message)
    try {
      await addMemberToCourse(interaction.member, course);
      logger.info(
        `${interaction.member} joined course '${course.title}' (${course.id})`
      );
    } catch (error) {
      await interaction.editReply({
        content: '❌ Something went wrong... Please contact a Moderator!',
        components: [],
      });
      logger.error(
        `Failed to add ${interaction.member} to course '${course.title}' (${course.id})`
      );
      logger.error(error);
      return;
    }

    // Update status
    await interaction.editReply({
      content: `🔓 You now have access to the private **${course.title}** channels.\n\nℹ️ If you want to join a course team now, use the \`/join team\` command!`,
      components: [],
      ephemeral: true,
    });
  },
};
