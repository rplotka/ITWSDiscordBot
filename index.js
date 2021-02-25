/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

// Load environment variables from .env file
const dotenv = require('dotenv');

dotenv.config();

const fs = require('fs');

// Import Discord Node Module
const Discord = require('discord.js');

const logger = require('./core/logging').child({ from: 'index' });
const { parseCommandAndArgs, fetchMemberById } = require('./core/utils');
const { NotAuthorized } = require('./core/permissions');

/** The prefix that commands use. */
const COMMAND_PREFIX = process.env.DISCORD_COMMAND_PREFIX;
const SERVER_ID = process.env.DISCORD_SERVER_ID;

/** Bot object */
const bot = new Discord.Client();

// Load commands from commands folder
bot.commands = new Discord.Collection();
bot.commandAliases = new Discord.Collection();
const commandFiles = fs
  .readdirSync('./commands')
  .filter((file) => file.endsWith('.js'));
commandFiles.forEach((file) => {
  const command = require(`./commands/${file}`);
  bot.commands.set(command.name, command);
  if (command.alias) bot.commandAliases.set(command.alias, command);
});

bot.once('ready', async () => {
  logger.info(`Bot is ready with command prefix ${COMMAND_PREFIX}`);
});

bot.on('message', async (message) => {
  // Ignore non-commands and bot messages
  if (!message.content.startsWith(COMMAND_PREFIX) || message.author.bot) return;

  // Divide input into parts
  // Command will be the first part and args will be the arguments
  // e.g. "role ITWS" -> command="role", args=["ITWS"]
  const [commandName, args] = parseCommandAndArgs(
    message.content.slice(COMMAND_PREFIX.length)
  );

  // Not a command
  if (!bot.commands.has(commandName) && !bot.commandAliases.has(commandName)) {
    // Message looks like a command but is not recognized!
    if (message.content.startsWith(COMMAND_PREFIX)) {
      await message.reply(
        `Command not found. Use \`${COMMAND_PREFIX}help\` for a list of commands.`
      );
    }
    return;
  }

  // Attempt to run command
  try {
    const command =
      bot.commands.get(commandName) ?? bot.commandAliases.get(commandName);
    const guild = bot.guilds.cache.get(SERVER_ID);
    const member = await fetchMemberById(guild, message.author.id);

    await command.execute(message, member, args);
  } catch (error) {
    logger.error(`Command error occurred: ${error}`);
    if (error instanceof NotAuthorized) {
      await message.reply(
        error.message || 'You do not have permission to run that command.'
      );
    } else {
      await message.reply(
        'Oops! Something went wrong running that command... Please let a Moderator know.'
      );
    }
  }
});

// Bot login using key
bot.login(process.env.DISCORD_BOT_TOKEN);
