/**
 * Splits a message into a command name and its arguments.
 * Assumes that the command prefix has already been removed.
 * The command name is lowercased. It treats arguments in
 * quotation marks as single arguments.
 *
 * ### Examples
 * - ECHO hello world -> ["echo", "hello", "world"]
 * - echo "hello world" -> ["echo", "hello world"]
 * - eCHo goodbye "hello world" -> ["echo", "goodbye", "hello world"]
 *
 * ### Returns
 * An array with the comamnd name followed by optional arguments.
 * Can be used in destructuring like `const [command, args] = parseCommandAndArgs(line);`
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
 * @param {*} server
 * @param {*} userId
 */
function fetchMemberById(server, userId) {
  return server.members.fetch(userId);
}

/**
 * Attempts to toggle a specific role on a server member.
 *
 * @param member Discord server member
 * @param role Role ID or object
 * @returns boolean Whether the role was added (true) or removed (false)
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
  parseCommandAndArgs,
  fetchMemberById,
  toggleMemberRole,
};
