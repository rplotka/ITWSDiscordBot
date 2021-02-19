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
function parseCommandAndArgs(line) {
    line = line.trim();
    const regex = new RegExp('"[^"]+"|[\\S]+', 'g');
    const arguments = [];
    line.match(regex).forEach(element => {
        if (!element) return;
        return arguments.push(element.replace(/"/g, ''));
    });
    return [arguments[0].toLowerCase(), arguments.slice(1)];
}

module.exports = {
    parseCommandAndArgs
};