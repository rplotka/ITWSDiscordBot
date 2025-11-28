const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * Handles course selection for clear command
   * Shows confirmation with options
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    if (
      !interaction.isStringSelectMenu() ||
      interaction.customId !== 'course-clear' ||
      !interaction.values.length
    )
      return;

    const courseId = interaction.values[0];
    logger.info(
      `clearCourseSelect: ${interaction.user.tag} selected course ID ${courseId}`
    );

    try {
      await interaction.deferUpdate();

      // Show loading
      await interaction.editReply({
        content: '⏳ Loading course info...',
        components: [],
      });

      // Get the course with teams
      const course = await Course.findByPk(courseId, {
        include: [{ model: CourseTeam, as: 'CourseTeams' }],
      });

      if (!course) {
        await interaction.editReply({
          content: '❌ Course not found.',
          components: [],
        });
        return;
      }

      // Count students with this role
      const role = interaction.guild.roles.cache.get(course.discordRoleId);
      const studentCount = role ? role.members.size : 0;
      const teamCount = course.CourseTeams ? course.CourseTeams.length : 0;

      // Show confirmation with buttons
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`clear-confirm-${courseId}`)
          .setLabel('Clear Course')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🗑️'),
        new ButtonBuilder()
          .setCustomId(`clear-confirm-teams-${courseId}`)
          .setLabel('Clear Course + Remove Teams')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('💥')
          .setDisabled(teamCount === 0),
        new ButtonBuilder()
          .setCustomId('clear-cancel')
          .setLabel('Cancel')
          .setStyle(ButtonStyle.Secondary)
      );

      const teamMessage =
        teamCount > 0
          ? `The course has **${teamCount}** team(s). You can optionally remove them too.\n\n`
          : '';

      await interaction.editReply({
        content:
          `⚠️ **Are you sure you want to clear "${course.title}"?**\n\n` +
          `This will:\n` +
          `• Remove **${studentCount}** student(s) from the course\n` +
          `• Delete all messages in course channels\n\n` +
          `${teamMessage}` +
          `**This action cannot be undone!**`,
        components: [confirmRow],
      });

      logger.info(
        `clearCourseSelect: Showed confirmation for ${course.title} (${studentCount} students, ${teamCount} teams)`
      );
    } catch (error) {
      logger.error('Error in clear course selection:', error);
      try {
        await interaction.editReply({
          content: `❌ Error: ${error.message}`,
          components: [],
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};
