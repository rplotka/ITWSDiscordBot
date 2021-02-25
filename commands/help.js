module.exports = {
  name: 'help',
  description: 'General command help.',
  usages: {
    help: 'List all available commands',
    'help <command name>': 'Show detailed usage of specific command',
  },
  examples: ['help', 'help courses'],
  execute(message, member, args) {
    const { commands } = message.client;

    if (args.length === 0) {
      // General help command

      const messageLines = [
        '**Commands**',
        ...commands
          .mapValues(
            (command) => `\`${command.name}\` ${command.alias ? 'or `' + command.alias + '` ' : '' }- ${command.description}`
          )
          .array(),
      ];
      message.channel.send(messageLines.join('\n'));
    } else {
      // Specific command help

      if (!commands.has(args[0])) {
        message.channel.send('Command not found.');
        return;
      }

      const helpCommand = commands.get(args[0]);

      // List each usage and its description
      const usageLines = Object.entries(helpCommand.usages).map(
        ([usage, description]) => `\`${usage}\` - ${description}`
      );

      const capitalizedCommandName =
        helpCommand.name.charAt(0).toUpperCase() + helpCommand.name.slice(1);

      const messageLines = [
        `**${capitalizedCommandName} Command**`,
        `> ${helpCommand.description}`,
        helpCommand.serverOnly ? '*Can only be used on a server.*\n' : '',
        '__Usages__',
        ...usageLines,
        '',
        '__Examples__',
        ...helpCommand.examples.map((ex) => `\`${ex}\``),
      ];
      message.channel.send(messageLines.join('\n'));
    }
  },
};
