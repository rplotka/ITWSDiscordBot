const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');
const { createTeamsForCourse } = require('../core/utils');

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
      !interaction.customId.startsWith('add-teams-modal-')
    )
      return;

    // Extract course ID from customId (format: add-teams-modal-{courseId})
    const courseId = interaction.customId.replace('add-teams-modal-', '');

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

      // Get team names from modal
      const teamNamesInput = interaction.fields.getTextInputValue(
        'add-teams-modal-names'
      );
      const teamNames = teamNamesInput
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0);

      if (teamNames.length === 0) {
        await interaction.editReply({
          content:
            '❌ No valid team names provided. Please enter team names separated by commas.',
        });
        return;
      }

      // Check for duplicate team names in this course
      const existingTeams = await CourseTeam.findAll({
        where: { CourseId: course.id },
      });
      const existingNames = existingTeams.map((t) => t.title.toLowerCase());
      const duplicates = teamNames.filter((name) =>
        existingNames.includes(name.toLowerCase())
      );

      if (duplicates.length > 0) {
        await interaction.editReply({
          content: `❌ These team names already exist in this course: ${duplicates.join(
            ', '
          )}`,
        });
        return;
      }

      // Create the teams
      await interaction.editReply({
        content: `⏳ Creating ${teamNames.length} team(s) for **${course.title}**...`,
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
