// eslint-disable-next-line no-unused-vars
const Discord = require('discord.js');
const { Course } = require('./db');

/**
 *
 * @param {Course} course
 */
function createCourseMessageEmbed(course) {
  const embed = new Discord.MessageEmbed()
    .setColor('GREEN')
    .setTitle(course.title)
    .setDescription(`AKA ${course.shortTitle}`)
    .addField('Instructors', course.instructors.join(', '));

  return embed;
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
  createCourseMessageEmbed,
  parseCommandAndArgs,
  fetchMemberById,
  toggleMemberRole,
};
