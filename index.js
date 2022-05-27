/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
const { Client, Intents, Collection } = require('discord.js');
const dotenv = require('dotenv');
const { readdirSync } = require('fs');
const path = require('path');
const logger = require('./core/logging');

// Load environment variables from .env file.
// This should take place before other imports so that process.env is properly set before other files are run.
dotenv.config();

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// Setup event listeners
const eventsPath = path.join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter((file) =>
  file.endsWith('.js')
);

eventFiles.forEach((file) => {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
  logger.info(
    `Set up event listener for event '${event.name}' in file 'events/${file}'`
  );
});

// Setup slash commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter((file) =>
  file.endsWith('.js')
);

commandFiles.forEach((file) => {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  client.commands.set(command.data.name, command);
  logger.info(
    `Set up handler for slash command '${command.data.name}' in file 'commands/${file}'`
  );
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_BOT_TOKEN);
