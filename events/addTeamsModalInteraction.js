const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');
const {
  createTeamsForCourse,
  generateSequentialTeamNames,
} = require('../core/utils');

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * Handles add-teams modal submission
   * Creates team roles and channels for the selected course
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    // Check if this is an add-teams modal submission
    if (
      !interaction.isModalSubmit() ||
      !interaction.customId.startsWith('add-team-modal-')
    )
      return;

    // Extract course ID from customId (format: add-team-modal-{courseId})
    const courseId = interaction.customId.replace('add-team-modal-', '');

    try {
      // Defer reply immediately to prevent timeout
      await interaction.deferReply({ ephemeral: true });

      logger.info(
        `${interaction.user.tag} submitted add-teams modal for course ID ${courseId}`
      );

      // Get the course
      const course = await Course.findByPk(courseId);
      if (!course) {
        await interaction.editReply({
          content: '❌ Course not found. It may have been deleted.',
        });
        return;
      }

      // Get team count from modal
      const teamCountInput = interaction.fields.getTextInputValue(
        'add-team-modal-count'
      );
      const teamCount = parseInt(teamCountInput, 10);

      if (Number.isNaN(teamCount) || teamCount < 1 || teamCount > 99) {
        await interaction.editReply({
          content: '❌ Please enter a valid number of teams (1-99).',
        });
        return;
      }

      // Get existing team count to determine starting number
      const existingTeams = await CourseTeam.findAll({
        where: { CourseId: course.id },
      });
      const startFrom = existingTeams.length + 1;

      // Generate sequential team names
      const teamNames = generateSequentialTeamNames(
        course.shortTitle,
        teamCount,
        startFrom
      );

      // Create the teams
      await interaction.editReply({
        content: `⏳ Creating ${teamCount} team(s) for **${course.title}**...`,
      });

      const createdTeams = await createTeamsForCourse(
        interaction.guild,
        course,
        teamNames
      );

      // Success message
      const teamList = createdTeams.map((t) => `• ${t.title}`).join('\n');
      await interaction.editReply({
        content:
          `✅ **Created ${createdTeams.length} team(s) for ${course.title}!**\n\n` +
          `${teamList}\n\n` +
          `Each team has:\n` +
          `• A private text channel\n` +
          `• A private voice channel\n` +
          `• A team role for access control\n\n` +
          `Students can join teams using \`/join team\`.`,
      });

      logger.info(
        `Successfully created ${createdTeams.length} teams for course ${course.title}`
      );
    } catch (error) {
      logger.error('Error creating teams:', error);
      try {
        await interaction.editReply({
          content: `❌ Failed to create teams: ${error.message}`,
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};
