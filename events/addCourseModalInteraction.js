const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { coursePermissions, courseChannelTopics } = require('../core/constants');
const { Course } = require('../core/db');
const logger = require('../core/logging');
const {
  generateSequentialTeamNames,
  createTeamsForCourse,
} = require('../core/utils');

/**
 * Attempts to create a new instructor Discord role named after the given course,
 * and then assigns the role's ID to the course object. (DOES NOT SAVE COURSE OBJECT)
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('../core/db').Course} course
 */
async function createCourseRoles(guild, course) {
  // Course role
  const courseRole = await guild.roles.create({
    name: course.title,
    mentionable: true,
    hoist: true,
    reason: `Role for new course ${course.title}`,
  });
  // eslint-disable-next-line no-param-reassign
  course.discordRoleId = courseRole.id;

  // Instructor role
  const courseInstructorRole = await guild.roles.create({
    name: `${course.title} Instructor`,
    mentionable: true,
    reason: `Instructor role for new course ${course.title}`,
  });
  // eslint-disable-next-line no-param-reassign
  course.discordInstructorRoleId = courseInstructorRole.id;
}

/**
 * Attempts to create a new Discord category named after the given course,
 * as well as an announcements channel and general channel. (DOES NOT SAVE COURSE OBJECT)
 *
 * @param {import('discord.js').Guild} guild
 * @param {import('../core/db').Course} course
 */
async function createCourseChannels(guild, course) {
  const basePermissions = coursePermissions.base(
    course.discordInstructorRoleId,
    course.discordRoleId
  );

  // Create course category
  const courseCategory = await guild.channels.create({
    name: course.title,
    type: ChannelType.GuildCategory,
    permissionOverwrites: basePermissions,
  });
  // eslint-disable-next-line no-param-reassign
  course.discordCategoryId = courseCategory.id;

  // Create announcement channel
  const announcementPermissions = coursePermissions.announcements(
    course.discordInstructorRoleId,
    course.discordRoleId
  );

  await guild.channels.create({
    name: `${course.shortTitle}-announcements`,
    type: ChannelType.GuildText,
    topic: courseChannelTopics.announcements(course),
    parent: courseCategory.id,
    permissionOverwrites: announcementPermissions,
  });

  // General channel - use base permissions
  await guild.channels.create({
    name: 'general',
    type: ChannelType.GuildText,
    topic: courseChannelTopics.general(course),
    parent: courseCategory.id,
    permissionOverwrites: basePermissions,
  });
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * @param {import('discord.js').ModalSubmitInteraction} interaction
   */
  async execute(interaction) {
    if (
      !interaction.isModalSubmit() ||
      interaction.customId !== 'add-course-modal'
    )
      return;

    // Wrap everything in try-catch to catch any unhandled errors
    try {
      // CRITICAL: Defer reply IMMEDIATELY to prevent "Application did not respond" error
      // Discord gives us only 3 seconds to acknowledge the interaction
      await interaction.deferReply({ ephemeral: true });

      // Check permissions here since we skipped it in command handler
      if (interaction.member?.permissions) {
        const hasAdmin = interaction.member.permissions.has(
          PermissionFlagsBits.Administrator
        );
        const hasManageGuild = interaction.member.permissions.has(
          PermissionFlagsBits.ManageGuild
        );
        if (!hasAdmin && !hasManageGuild) {
          await interaction.editReply({
            content: '❌ Only moderators can create courses!',
          });
          return;
        }
      }

      logger.info(`${interaction.member} submitted the new course modal`);

      // Check if database is available
      if (!Course) {
        logger.error('Course model not available - database not connected');
        await interaction.editReply({
          ephemeral: true,
          content:
            '❌ Database is not available. Channels were created but course was not saved. Please contact a Moderator!',
        });
        return;
      }

      const val = (fieldName) =>
        interaction.fields.getTextInputValue(fieldName);

      const courseNumber = val('add-course-number').trim().toUpperCase();
      const title = val('add-course-title');
      const instructors = val('add-course-instructor')
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value);
      const teamsCount = parseInt(val('add-course-teams'), 10) || 0;

      // Validate course number format (should be like ITWS-4500, CSCI-1100)
      const courseNumberPattern = /^[A-Z]{2,6}-?\d{3,5}$/;
      if (!courseNumberPattern.test(courseNumber)) {
        await interaction.editReply({
          content:
            '❌ Invalid course number format. Please use format like ITWS-4500 or CSCI1100.',
        });
        return;
      }

      // Check if course number already exists
      const existingCourse = await Course.findOne({
        where: { shortTitle: courseNumber },
      });
      if (existingCourse) {
        await interaction.editReply({
          content: `❌ Course number **${courseNumber}** already exists for "${existingCourse.title}". Please use a unique course number.`,
        });
        return;
      }

      const isPublic = true;

      const newCourse = Course.build({
        title,
        shortTitle: courseNumber, // Use course number as shortTitle for lookups
        isPublic,
        instructors,
      });

      // Attempt to create course, role, and channels

      try {
        await createCourseRoles(interaction.guild, newCourse);
        logger.info(
          `Successfully created roles for course '${newCourse.title}'`
        );
      } catch (error) {
        logger.error(
          `Failed to create course roles for new course '${newCourse.title}'`
        );
        logger.error(`Error message: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
        await interaction.editReply({
          ephemeral: true,
          content: `❌ Failed to create roles: ${error.message}. Please contact a Moderator!`,
        });
        return;
      }

      try {
        await createCourseChannels(interaction.guild, newCourse);
        logger.info(
          `Successfully created channels for course '${newCourse.title}'`
        );
      } catch (error) {
        logger.error(
          `Failed to create course channels for new course '${newCourse.title}'`
        );
        logger.error(`Error message: ${error.message}`);
        logger.error(`Error stack: ${error.stack}`);
        await interaction.editReply({
          ephemeral: true,
          content: `❌ Failed to create channels: ${error.message}. Please contact a Moderator!`,
        });
        return;
      }

      try {
        await newCourse.save();
        logger.info(
          `Successfully saved course '${newCourse.title}' to database`
        );
      } catch (error) {
        logger.error(
          'Created course Discord roles and channels but failed to save Course in DB...'
        );
        logger.error(`Error message: ${error.message}`);
        logger.error(`Error name: ${error.name}`);
        logger.error(`Error stack: ${error.stack}`);

        // Try to provide more helpful error message
        let errorMsg = error.message;
        if (error.name === 'SequelizeValidationError') {
          errorMsg = `Validation error: ${
            error.errors?.map((e) => e.message).join(', ') || error.message
          }`;
        } else if (error.name === 'SequelizeDatabaseError') {
          errorMsg = `Database error: ${error.message}`;
        }

        await interaction.editReply({
          ephemeral: true,
          content: `❌ Created roles and channels but failed to save to database: ${errorMsg}. Please contact a Moderator!`,
        });
        return;
      }

      // Create teams if requested
      let teamsMessage = '';
      if (teamsCount > 0) {
        try {
          await interaction.editReply({
            content: `⏳ Creating ${teamsCount} team(s)...`,
          });

          const teamNames = generateSequentialTeamNames(
            courseNumber,
            teamsCount,
            1
          );
          const createdTeams = await createTeamsForCourse(
            interaction.guild,
            newCourse,
            teamNames
          );

          teamsMessage = `• ${createdTeams.length} team(s) created\n`;
          logger.info(
            `Created ${createdTeams.length} teams for ${newCourse.title}`
          );
        } catch (error) {
          logger.error('Error creating teams:', error);
          teamsMessage = `• ⚠️ Team creation failed: ${error.message}\n`;
        }
      }

      // Send success message
      const successMessage =
        `🎉 **Course created successfully!**\n\n` +
        `**${newCourse.title}** is now set up with:\n` +
        `• Course category and channels\n` +
        `• Student role: **${newCourse.title}**\n` +
        `• Instructor role: **${newCourse.title} Instructor**\n${teamsMessage}\n**Next step:** Assign the instructor role to the course instructors.`;

      try {
        await interaction.editReply({
          content: successMessage,
        });
        logger.info(
          `✅ Successfully completed course creation for '${newCourse.title}'`
        );
      } catch (error) {
        logger.error(
          `Failed to send success message for course '${newCourse.title}'`
        );
        logger.error(`Error message: ${error.message}`);
        logger.error(`Error name: ${error.name}`);
        logger.error(`Error stack: ${error.stack}`);
        // Try to send a simpler message
        try {
          await interaction.followUp({
            content: `✅ Course '${newCourse.title}' created successfully!`,
            ephemeral: true,
          });
        } catch (followUpError) {
          logger.error('Failed to send follow-up message:', followUpError);
          logger.error(`Follow-up error: ${followUpError.message}`);
        }
      }
    } catch (error) {
      // Catch any unhandled errors in the entire function
      logger.error('Unhandled error in addCourseModalInteraction:', error);
      logger.error(`Error message: ${error.message || 'No error message'}`);
      logger.error(`Error name: ${error.name || 'Unknown'}`);
      logger.error(`Error stack: ${error.stack || 'No stack trace'}`);

      // Try to send error message if interaction is still valid
      try {
        const errorMessage = error.message || 'Unknown error occurred';
        const errorContent = `❌ An unexpected error occurred: ${errorMessage}. Please contact a Moderator!`;

        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({
            content: errorContent,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: errorContent,
            ephemeral: true,
          });
        }
      } catch (replyError) {
        logger.error('Failed to send error message:', replyError);
        logger.error(`Reply error: ${replyError.message}`);
      }
    }
  },
};
