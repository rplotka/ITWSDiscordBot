const logger = require('../core/logging');

module.exports = {
  name: 'ready',
  once: true,
  /**
   *
   * @param {import('discord.js').Client} client
   */
  execute(client) {
    logger.info(
      `Bot is ready! Invite URL is https://discord.com/api/oauth2/authorize?client_id=${client.application.id}&permissions=8&scope=bot%20applications.commands`
    );
  },
};
