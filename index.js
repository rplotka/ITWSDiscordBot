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
  partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
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

/**
 * Associations between message reactions and roles.
 *
 * Top-level key is a particular message ID.
 *
 * If setRoles is set, addRoles and removeRoles will be ignored.
 */
const messageReactionAutomations = {
  '929925783454089266': {
    '🟠': {
      onAddReaction: {
        addRoles: ['902669004081074237'], // @Prospective Students
      },
      onRemoveReaction: {
        removeRoles: ['902669004081074237'], // @Prospective Students
      },
    },
  },
  '946803862348660787': {
    '🟠': {
      onAddReaction: {
        addRoles: ['812420665487392818'], // @Accepted Students
      },
      onRemoveReaction: {
        removeRoles: ['812420665487392818'], // @Accepted Students
      },
    },
  },
};

async function handleReaction(reaction, user, added) {
  if (user.bot) return;

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

  const mID = reaction.message.id;
  const member = reaction.message.guild.members.cache.find(
    (m) => m.id === user.id
  );
  const emoji = reaction.emoji.name;

  // We have to be very careful to not access a property of a nested object that does not exist here
  if (
    mID in messageReactionAutomations &&
    emoji in messageReactionAutomations[mID]
  ) {
    const key = added ? 'onAddReaction' : 'onRemoveReaction';
    if (!(key in messageReactionAutomations[mID][emoji])) return;

    // Extract these three arrays, NONE OF WHICH HAVE TO BE SET
    const { addRoles, removeRoles, setRoles } = messageReactionAutomations[mID][
      emoji
    ][key];

    // If the setRoles array is set, ignore add and remove as they could conflict
    if (setRoles) {
      // Filter members roles that aren't in removeRolesExcept
      logger.info(
        `${member} ${
          added ? 'reacted' : 'unreacted'
        } to message ${mID} with ${emoji} and had their roles set to ${setRoles.join(
          ', '
        )}`
      );
      await member.roles.set(setRoles);
    } else {
      if (removeRoles) {
        logger.info(
          `${member} ${
            added ? 'reacted' : 'unreacted'
          } to message ${mID} with ${emoji} and had roles ${removeRoles.join(
            ', '
          )} removed`
        );
        await member.roles.remove(removeRoles);
      }

      if (addRoles) {
        logger.info(
          `${member} ${
            added ? 'reacted' : 'unreacted'
          } to message ${mID} with ${emoji} and was given roles ${addRoles.join(
            ', '
          )}`
        );
        await member.roles.add(addRoles);
      }
    }
  }
}

bot.on('messageReactionAdd', async (reaction, user) =>
  handleReaction(reaction, user, true).catch((err) => {
    reaction.message.reply('There was an error, please message a Moderator.');
    logger.error(`Failed to handle add message reaction`, { err });
  })
);
bot.on('messageReactionRemove', async (reaction, user) =>
  handleReaction(reaction, user, false).catch((err) => {
    reaction.message.reply('There was an error, please message a Moderator.');
    logger.error(`Failed to handle remove message reaction`, {
      emoji: reaction.name,
      user: user.id,
      err,
    });
  })
);

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
