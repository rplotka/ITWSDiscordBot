const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

const dotenv = require('dotenv');

// Load environment variables from .env file.
// This should take place before other imports so that process.env is properly set before other files are run.
dotenv.config();

const { DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_SERVER_ID } = process.env;

console.log({ DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID, DISCORD_SERVER_ID });

const commands = [];

const rest = new REST({ version: '9' }).setToken(DISCORD_BOT_TOKEN);

rest
  .put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_SERVER_ID), {
    body: commands,
  })
  .then(() => console.log('Successfully registered application commands.'))
  .catch(console.error);
