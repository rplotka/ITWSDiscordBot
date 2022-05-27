const {
  Client,
  CommandInteraction,
  MessageActionRow,
  MessageSelectMenu,
} = require('discord.js');
const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');
const {
  findCourseGeneralChannel,
  addMemberToCourse,
} = require('../core/utils');

/**
 * @param {Course} course
 * @param {CourseTeam[]} courseTeams
 */
const courseTeamSelectorActionRowFactory = (course, courseTeams) =>
  new MessageActionRow().addComponents(
    new MessageSelectMenu()
      .setCustomId(`course-team-join`)
      .setPlaceholder(`Select a team to join for ${course.title}`)
      .setOptions([
        {
          label: 'No Team',
          description: 'Do not join a team for now.',
          value: 'no team',
        },
        ...courseTeams.map((courseTeam) => ({
          label: courseTeam.title,
          value: courseTeam.id.toString(),
        })),
      ])
  );

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
        content: '❌ Course not found.',
        ephemeral: true,
      });
      return;
    }

    // Check if course is publicly joinable
    if (!course.isPublic) {
      await interaction.update({
        content: '❌ You can only be added to that course by the instructor.',
        components: [],
        ephemeral: true,
      });
      return;
    }

    try {
      await addMemberToCourse(interaction.member, course);
    } catch (error) {
      await interaction.update({
        content: '❌ Something went wrong... Please contact a Moderator!',
        components: [],
      });
      logger.error('Failed to add member to course');
      logger.error(error);
      return;
    }

    await interaction.update({
      content: `🔓 You now have access to the private **${course.title}** channels.`,
      components: [],
      ephemeral: true,
    });

    await interaction.followUp({
      content:
        'ℹ️ If you want to join a course team now, use the `/join team` command!',
    });
  },
};
