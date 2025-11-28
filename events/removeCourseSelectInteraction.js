// JSDoc types: CommandInteraction
const { Course } = require('../core/db');
const logger = require('../core/logging');
const { removeCourse } = require('../core/utils');

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
      interaction.customId !== 'remove-course' ||
      !interaction.values.length
    )
      return;

    const courseId = interaction.values[0];

    logger.info(`${interaction.user} selected course ID ${courseId} to REMOVE`);

    // Use deferUpdate for select menu interactions (updates the original message)
    await interaction.deferUpdate();

    // Find course they want to REMOVE
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

    // Attempt to remove course and all data
    try {
      await removeCourse(interaction.guild, course);
      logger.info(
        `Successfully removed course '${course.title}' (${course.id})`
      );
    } catch (error) {
      await interaction.editReply({
        content: '❌ Something went wrong... Please contact a Moderator!',
        components: [],
      });
      logger.error(`Failed to remove course '${course.title}' (${course.id})`);
      logger.error(error);
      return;
    }

    // Update status
    await interaction.editReply({
      content: `❎ You have **removed** **${course.title}** along with its roles and channels.`,
      components: [],
      ephemeral: true,
    });
  },
};
