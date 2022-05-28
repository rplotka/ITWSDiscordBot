const SERVER_ID = process.env.DISCORD_SERVER_ID;
const { Permissions, User } = require('discord.js');

/**
 * Error representing a failed attempt to do something
 * without the proper authorization. For example,
 * this might be thrown when a non-admin attempts to run an admin command.
 */
class NotAuthorized extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Throws a NotAuthorized error unless the author has the Moderator, Faculty, or Administrator role.
 * @param {User} author
 */
module.exports.isModeratorOrAbove = async function isModeratorOrAbove(author) {
  const server = author.client.guilds.cache.get(SERVER_ID);
  const member = await server.members.fetch(author.id);
  if (member.permissions.has(Permissions.FLAGS.MANAGE_GUILD)) return;
  throw new NotAuthorized('Only Moderators and above can run that command.');
};

module.exports.NotAuthorized = NotAuthorized;
