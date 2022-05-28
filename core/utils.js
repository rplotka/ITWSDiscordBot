// eslint-disable-next-line no-unused-vars
const Discord = require('discord.js');
const { Op } = require('sequelize');
const { Course, CourseTeam } = require('./db');
const logger = require('./logging');

const addCourseModalFactory = () => {
  const modal = new Discord.Modal()
    .setCustomId('add-course-modal')
    .setTitle('Add Course');

  // Add inputs for DB fields
  // - title
  // - shortTitle
  // - isPublic
  // - instructors

  const titleInput = new Discord.TextInputComponent()
    .setCustomId('add-course-modal-title')
    .setLabel("What's the FULL name of the course?")
    .setRequired(true)
    .setStyle('SHORT');

  const shortTitleInput = new Discord.TextInputComponent()
    .setCustomId('add-course-modal-short-title')
    .setLabel("What's the SHORT name of the course?")
    .setPlaceholder('e.g. intro, mitr, capstone')
    .setRequired(true)
    .setStyle('SHORT');

  // Discord does not yet appear to support select menus in modals

  // const isPublicInput = new Discord.MessageSelectMenu()
  //   .setCustomId('add-course-modal-is-public')
  //   .setPlaceholder('Can students freely join?')
  //   .setOptions([
  //     {
  //       label: 'Publicly Joinable',
  //       value: 'yes',
  //       description: 'Students can join via `/join course`',
  //       emoji: '🔓',
  //     },
  //     {
  //       label: 'Locked',
  //       value: 'no',
  //       description: 'Students can only be added by instructors',
  //       emoji: '🔒',
  //     },
  //   ]);

  const instructorsInput = new Discord.TextInputComponent()
    .setCustomId('add-course-modal-instructors')
    .setLabel('Who is instructing the course?')
    .setPlaceholder('Comma-separated list of instructor RCS IDs')
    .setRequired(true)
    .setStyle('SHORT');

  const row1 = new Discord.MessageActionRow().addComponents(titleInput);
  const row2 = new Discord.MessageActionRow().addComponents(shortTitleInput);
  const row3 = new Discord.MessageActionRow().addComponents(instructorsInput);
  // const row4 = new Discord.MessageActionRow().addComponents(isPublicInput);

  modal.addComponents(row1, row2, row3);

  return modal;
};

/**
 * @param {"join" | "leave" | "remove"} courseAction
 * @param {Course[]} courses
 */
const courseSelectorActionRowFactory = (courseAction, courses) =>
  new Discord.MessageActionRow().addComponents(
    new Discord.MessageSelectMenu()
      .setCustomId(`course-${courseAction}`)
      .setPlaceholder('Select a course')
      .setOptions(
        courses.map((course) => ({
          label: course.title,
          description: `Instructed by ${course.instructors.join(', ')}`,
          value: course.id.toString(),
        }))
      )
  );

/**
 * @param {"join" | "leave"} courseTeamAction
 * @param {CourseTeam[]} courseTeamsWithCourse
 */
const courseTeamSelectorActionRowFactory = (
  courseTeamAction,
  courseTeamsWithCourse
) =>
  new Discord.MessageActionRow().addComponents(
    new Discord.MessageSelectMenu()
      .setCustomId(`course-team-${courseTeamAction}`)
      .setPlaceholder(`Select a team to ${courseTeamAction}`)
      .setOptions(
        courseTeamsWithCourse.map((courseTeam) => ({
          label: `${courseTeam.title} (${courseTeam.Course.title})`,
          value: courseTeam.id.toString(),
        }))
      )
  );

/**
 * Finds the #general text channel for a particular course on a server (guild).
 *
 * @param {Discord.Guild} guild
 * @param {Course} course
 * @returns {Discord.GuildTextBasedChannel}
 */
function findCourseGeneralChannel(guild, course) {
  const courseCategory = guild.channels.cache.get(course.discordCategoryId);
  return courseCategory.children.find(
    (child) => child.type === 'GUILD_TEXT' && child.name === 'general'
  );
}

/**
 *
 * @param {Discord.GuildMember} member
 * @param {Course} course
 */
async function addMemberToCourse(member, course) {
  const alreadyHasCourseRole = member.roles.cache.some(
    (role) => role.id === course.discordRoleId
  );
  // Attempt to add course roles
  await member.roles.add(course.discordRoleId);

  if (!alreadyHasCourseRole) {
    try {
      const courseGeneralChannel = findCourseGeneralChannel(
        member.guild,
        course
      );

      await courseGeneralChannel.send(`👋 Welcome ${member}!`);
    } catch (error) {
      logger.error('Failed to send welcome message to course #general channel');
      logger.error(error);
    }
  }
}

/**
 *
 * @param {Discord.GuildMember} member
 * @param {CourseTeam} courseTeam
 */
async function addMemberToCourseTeam(member, courseTeam) {
  const alreadyHasCourseTeamRole = member.roles.cache.some(
    (role) => role.id === courseTeam.discordRoleId
  );

  await member.roles.add(courseTeam.discordRoleId);

  if (!alreadyHasCourseTeamRole) {
    try {
      const channel = member.guild.channels.cache.get(
        courseTeam.discordTextChannelId
      );
      await channel.send(`👋 Welcome team member ${member}!`);
    } catch (error) {
      logger.error('Failed to send welcome message to course team channel');
      logger.error(error);
    }
  }
}

/**
 *
 * @param {Discord.GuildMember} member
 * @param {CourseTeam} courseTeam
 */
async function removeMemberFromCourseTeam(member, courseTeam) {
  const alreadyHasCourseTeamRole = member.roles.cache.some(
    (role) => role.id === courseTeam.discordRoleId
  );

  await member.roles.remove(courseTeam.discordRoleId);

  if (alreadyHasCourseTeamRole) {
    try {
      const channel = member.guild.channels.cache.get(
        courseTeam.discordTextChannelId
      );
      await channel.send(`👋 Goodbye ${member}!`);
    } catch (error) {
      logger.error('Failed to send goodbye message to course team channel');
      logger.error(error);
    }
  }
}

/**
 *
 * @param {Discord.GuildMember} member
 * @param {Course} course
 */
async function removeMemberFromCourse(member, course) {
  const memberDiscordRoleIds = member.roles.cache.map((role) => role.id);

  // Attempt to add remove role
  await member.roles.remove(course.discordRoleId);

  // Leave all teams
  const courseTeams = await CourseTeam.findAll({
    where: {
      discordRoleId: {
        [Op.in]: memberDiscordRoleIds,
      },
    },
  });

  await Promise.allSettled(
    courseTeams.map((courseTeam) =>
      removeMemberFromCourseTeam(member, courseTeam)
    )
  );
}

/**
 *
 * @param {Discord.Guild} guild
 * @param {Course} course
 */
async function removeCourse(guild, course) {
  // Delete team roles and channels
  const courseTeams = await CourseTeam.findAll({
    where: {
      CourseId: course.id,
    },
  });

  await Promise.all(
    courseTeams.map((courseTeam) =>
      Promise.allSettled([
        // Delete role
        guild.roles.delete(courseTeam.discordRoleId, 'Course being removed'),
        // Delete text channel
        guild.channels.delete(
          courseTeam.discordTextChannelId,
          'Course being removed'
        ),
        // Delete voice channel
        guild.channels.delete(
          courseTeam.discordVoiceChannelId,
          'Course being removed'
        ),
        courseTeam.destroy(),
      ])
    )
  );

  // Delete course category and children
  if (course.discordCategoryId) {
    try {
      // Delete children first!!!!
      await Promise.all(
        guild.channels.cache
          .filter(
            (channel) =>
              channel.parent && channel.parent.id === course.discordCategoryId
          )
          .map((childChannel) => childChannel.delete('Course being removed'))
      );

      await guild.channels.delete(
        course.discordCategoryId,
        'Course being removed'
      );
    } catch (error) {
      logger.warn(
        `Failed to delete Discord category and/or children channels for course '${course.title}' (${course.id})`
      );
      logger.warn(error);
    }
  }

  // Delete course role
  if (course.discordRoleId) {
    try {
      await guild.roles.delete(course.discordRoleId, 'Course being removed');
    } catch (error) {
      logger.warn(
        `Failed to delete Discord role for course '${course.title}' (${course.id})`
      );
      logger.warn(error);
    }
  }

  // Finally, delete the DB record
  await course.destroy();
}

/**
 * Splits a message into a command name and its arguments.
 * Assumes that the command prefix has already been removed.
 * The command name is lowercased. It treats arguments in
 * quotation marks as single arguments.
 *
 * @param {string} lineRaw asdasdasdasd
 * @return {[string, string[]]} [command name, arg array]
 *
 * ### Examples
 * - ECHO hello world -> ["echo", ["hello", "world"]]
 * - echo "hello world" -> ["echo", ["hello world"]]
 * - eCHo goodbye "hello world" -> ["echo", ["goodbye", "hello world"]]
 */
function parseCommandAndArgs(lineRaw) {
  const line = lineRaw.trim();
  const regex = new RegExp('"[^"]+"|[\\S]+', 'g');
  const args = [];
  line.match(regex).forEach((element) => {
    if (!element) return;
    args.push(element.replace(/"/g, ''));
  });
  return [args[0].toLowerCase(), args.slice(1)];
}

/**
 * Attempts to fetch a member from a server
 * from their Discord user ID. Will only work if the
 * user is on the server.
 *
 * @param {Discord.Guild} server
 * @param {string} userId
 * @return {Promise<Discord.GuildMember>} The found member (if exists)
 */
function fetchMemberById(server, userId) {
  return server.members.fetch(userId);
}

/**
 * Attempts to toggle a specific role on a server member.
 *
 * @param {Discord.GuildMember} member Discord server member
 * @param {Discord.Role | string} roleOrRoleId Role ID or object
 * @returns {Promise<boolean>} Whether the role was added (true) or removed (false)
 */
async function toggleMemberRole(member, roleOrRoleId) {
  // Remove
  if (member.roles.cache.has(roleOrRoleId)) {
    await member.roles.remove(roleOrRoleId);
    return false;
  }
  // Add
  await member.roles.add(roleOrRoleId);
  return true;
}

module.exports = {
  removeCourse,
  addCourseModalFactory,
  courseSelectorActionRowFactory,
  courseTeamSelectorActionRowFactory,
  addMemberToCourse,
  removeMemberFromCourse,
  addMemberToCourseTeam,
  removeMemberFromCourseTeam,
  findCourseGeneralChannel,
  parseCommandAndArgs,
  fetchMemberById,
  toggleMemberRole,
};
