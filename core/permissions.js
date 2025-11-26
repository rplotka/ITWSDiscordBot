const { PermissionFlagsBits } = require('discord.js');

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
 * @param {GuildMember} member
 */
module.exports.isModeratorOrAbove = async function isModeratorOrAbove(member) {
  // Check if member exists and has permissions
  if (!member) {
    throw new NotAuthorized('Only Moderators and above can run that command.');
  }

  // If member is a GuildMember with cached permissions, check directly
  if (member.guild && member.permissions) {
    if (
      member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      member.permissions.has(PermissionFlagsBits.Administrator)
    )
      return;
    throw new NotAuthorized('Only Moderators and above can run that command.');
  }

  // Fallback: member might not have permissions cached, but this is rare
  // For command interactions, member should always have permissions
  throw new NotAuthorized('Only Moderators and above can run that command.');
};

module.exports.NotAuthorized = NotAuthorized;
