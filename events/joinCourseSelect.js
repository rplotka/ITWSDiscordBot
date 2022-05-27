const { Client, CommandInteraction } = require('discord.js');
const { Course } = require('../core/db');
const logger = require('../core/logging');

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
      interaction.customId !== 'course-join' ||
      !interaction.values.length
    )
      return;

    const courseId = interaction.values[0];

    logger.info(`${interaction.user} selected course ID ${courseId} to join`);

    const course = await Course.findByPk(courseId);

    // Check if course exists
    if (!course) {
      await interaction.update({
        components: [],
        content: 'Course not found.',
        ephemeral: true,
      });
      return;
    }

    // Check if course is publicly joinable
    if (!course.isPublic) {
      await interaction.update({
        content: 'You can only be added to that course by the instructor.',
        components: [],
        ephemeral: true,
      });
      return;
    }

    // Attempt to add course roles
    try {
      await interaction.member.roles.add(course.discordRoleId);
    } catch (e) {
      await interaction.update({
        content:
          'Failed to add course role. Please contact a Moderator on the server!',
        components: [],
        ephemeral: true,
      });
      return;
    }

    await interaction.update({
      content: `You now have access to **${course.title}** on this server. Check out #general.`,
      components: [],
      ephemeral: true,
    });
  },
};
