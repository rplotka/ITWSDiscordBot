/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const dotenv = require('dotenv');
const { readdirSync } = require('fs');
const path = require('path');
const http = require('http');
const logger = require('./core/logging');

// Load environment variables from .env file.
// This should take place before other imports so that process.env is properly set before other files are run.
dotenv.config();

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Find event listeners
const eventsPath = path.join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter((file) =>
  file.endsWith('.js')
);

// Hook up event listeners
eventFiles.forEach((file) => {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.disabled) {
    logger.warn(
      `Skipping disabled event lister for event '${event.name}' in file 'events/${file}`
    );
  }

  client[event.once ? 'once' : 'on'](event.name, async (...args) => {
    try {
      await event.execute(...args);
    } catch (error) {
      logger.error(
        `An error occurred when the event lister for event '${event.name}' in file 'events/${file}'`
      );
      logger.error(error);
    }
  });

  logger.info(
    `Added listener for event '${event.name}' in file 'events/${file}'`
  );
});

// Collect slash commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter((file) =>
  file.endsWith('.js')
);

logger.info(`Found ${commandFiles.length} command files: ${commandFiles.join(', ')}`);

// Hook up command handlers
commandFiles.forEach((file) => {
  const filePath = path.join(commandsPath, file);
  try {
    logger.info(`Attempting to load command from 'commands/${file}'`);
    const command = require(filePath);
    if (!command.data) {
      logger.error(`Command from 'commands/${file}' has no data property`);
      return;
    }
    client.commands.set(command.data.name, command);
    logger.info(
      `Set up handler for slash command '${command.data.name}' in file 'commands/${file}'`
    );
  } catch (error) {
    logger.error(`Failed to load command from 'commands/${file}':`, error);
    logger.error(`Error stack: ${error.stack}`);
  }
});

// Start HTTP server for Cloud Run health checks
const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', bot: 'online' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  logger.info(`HTTP server listening on port ${PORT}`);
});

// Login to Discord with the bot token
client.login(process.env.DISCORD_BOT_TOKEN);
