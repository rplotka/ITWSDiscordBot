/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
// eslint-disable-next-line import/no-unresolved
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const path = require('node:path');
const fs = require('node:fs');

const dotenv = require('dotenv');

// Load environment variables from .env file.
// This should take place before other imports so that process.env is properly set before other files are run.
dotenv.config();

const { DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_SERVER_ID } = process.env;

const commands = [];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith('.js'));

commandFiles.forEach((file) => {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  commands.push(command.data.toJSON());
  // logger.info(
  // `Set up handler for slash command '${command.data.name}' in file 'commands/${file}'`
  // );
});

const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

rest
  .put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_SERVER_ID), {
    body: commands,
  })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('Successfully registered application commands.');
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
  });
