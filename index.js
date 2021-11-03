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

/** The unique ID of the ITWS server. */
const SERVER_ID = process.env.DISCORD_SERVER_ID;

/** Bot object */
const bot = new Discord.Client({
  partials: ['MESSAGE', 'CHANNEL', 'REACTION']
});

// Load commands from commands folder
bot.commands = new Discord.Collection();
bot.commandAliases = new Discord.Collection();
const commandFiles = fs
  .readdirSync('./commands')
  .filter((file) => file.endsWith('.js'));

// Register each command with an optional alias
commandFiles.forEach((file) => {
  const command = require(`./commands/${file}`);
  bot.commands.set(command.name, command);
  if (command.alias) bot.commandAliases.set(command.alias, command);
});

/** Event handler for ready event. Called once bot has connected to Discord. */
bot.once('ready', async () => {
  logger.info(`Bot is ready with command prefix ${COMMAND_PREFIX}`);
});

bot.on('messageReactionAdd', async (reaction, user) => {
	// When a reaction is received, check if the structure is partial
	if (reaction.partial) {
		try {
      // Get full
			await reaction.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message:', error);
			// Return as `reaction.message.author` may be undefined/null
			return;
		}
	}

  // Check for bot, emoji, and message id
  if(!user.bot && reaction.emoji.name === '🟠' && reaction.message.id == '905337910973325362') {
    const { guild } = reaction.message;
    const member = guild.members.cache.find(member => member.id === user.id); 
    member.roles.add('902669004081074237');
  }
});

bot.on('messageReactionRemove', async (reaction, user) => {
	// When a reaction is received, check if the structure is partial
	if (reaction.partial) {
		try {
      // Get full
			await reaction.fetch();
		} catch (error) {
			console.error('Something went wrong when fetching the message:', error);
			// Return as `reaction.message.author` may be undefined/null
			return;
		}
	}

  // Check for bot, emoji, and message id
  if(!user.bot && reaction.emoji.name === '🟠' && reaction.message.id == '905337910973325362') {
    const { guild } = reaction.message;
    const member = guild.members.cache.find(member => member.id === user.id); 
    member.roles.remove('902669004081074237');
  }
});

/** Event handler for messages. Called when ANY message is sent. */
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

    // Get the context that the command was called in
    const guild = bot.guilds.cache.get(SERVER_ID);
    const member = await fetchMemberById(guild, message.author.id);

    // Actually execute the command
    await command.execute(message, member, args);
  } catch (error) {
    logger.error(`Command error occurred: ${error}`);

    // In the event of an error, it might be expected or unexpected
    // Check the type of error and determine the proper reply
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

// Bot login using token
bot.login(process.env.DISCORD_BOT_TOKEN);
