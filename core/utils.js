// eslint-disable-next-line no-unused-vars
const Discord = require('discord.js');
const { Course, CourseTeam } = require('./db');
const logger = require('./logging');

/**
 * @param {"join" | "leave"} courseAction
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
 * @param {CourseTeam[]} courseTeams
 */
const courseTeamSelectorActionRowFactory = (courseTeamAction, courseTeams) =>
  new Discord.MessageActionRow().addComponents(
    new Discord.MessageSelectMenu()
      .setCustomId(`course-team-${courseTeamAction}`)
      .setPlaceholder(`Select a team to ${courseTeamAction}`)
      .setOptions(
        courseTeams.map((courseTeam) => ({
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
 * @param {Course} course
 */
function removeMemberFromCourse(member, course) {}

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
function removeMemberFromCourseTeam(member, courseTeam) {}

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
