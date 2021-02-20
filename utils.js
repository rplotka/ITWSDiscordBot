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

function fetchMember(server, user) {
  return server.members.fetch(user.id);
}

module.exports = {
  parseCommandAndArgs,
  fetchMember,
};
