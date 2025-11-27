const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { coursePermissions, courseChannelTopics } = require('../core/constants');
const { Course } = require('../core/db');
const logger = require('../core/logging');

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

  // General channel
  await guild.channels.create({
    name: 'general',
    type: ChannelType.GuildText,
    topic: courseChannelTopics.general(course),
    parent: courseCategory.id,
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

    // Check permissions here since we skipped it in command handler
    if (interaction.member?.permissions) {
      const hasAdmin = interaction.member.permissions.has(
        PermissionFlagsBits.Administrator
      );
      const hasManageGuild = interaction.member.permissions.has(
        PermissionFlagsBits.ManageGuild
      );
      if (!hasAdmin && !hasManageGuild) {
        await interaction.reply({
          content: '❌ Only moderators can create courses!',
          ephemeral: true,
        });
        return;
      }
    }

    await interaction.deferReply({ ephemeral: true });

    logger.info(`${interaction.member} submitted the new course modal`);

    const val = (fieldName) => interaction.fields.getTextInputValue(fieldName);

    const title = val('add-course-modal-title');
    const shortTitle = val('add-course-modal-short-title');
    const instructors = val('add-course-modal-instructors')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value);

    // const courseIsPublicField = interaction.fields.getField(
    //   'add-course-modal-is-public'
    // );
    const isPublic = true; // = courseIsPublicField.value === 'yes';

    const newCourse = Course.build({
      title,
      shortTitle,
      isPublic,
      instructors,
    });

    // Attempt to create course, role, and channels

    try {
      await createCourseRoles(interaction.guild, newCourse);
    } catch (error) {
      logger.error(
        `Failed to create course roles for new course '${newCourse.title}'`
      );
      logger.error(error);
      await interaction.editReply({
        ephemeral: true,
        content: `❌ Something went wrong... Please contact a Moderator!`,
      });
      return;
    }

    try {
      await createCourseChannels(interaction.guild, newCourse);
    } catch (error) {
      logger.error(
        `Failed to create course channels for new course '${newCourse.title}'`
      );
      logger.error(error);
      await interaction.editReply({
        ephemeral: true,
        content: `❌ Something went wrong... Please contact a Moderator!`,
      });
      return;
    }

    try {
      await newCourse.save();
    } catch (error) {
      logger.error(
        'Created course Discord roles and channels but failed to save Course in DB...'
      );
      logger.error(error);
      await interaction.editReply({
        ephemeral: true,
        content: `❌ Something went wrong... Please contact a Moderator!`,
      });
      return;
    }

    await interaction.editReply({
      content: `🎉 **Created course, roles, and channels!** Now assign the <@&${newCourse.discordInstructorRoleId}> role to all instructors. You will see the course category and channels in the sidebar.`,
    });
  },
};
