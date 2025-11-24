const {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require('discord.js');

const roles = [
  {
    label: 'Incoming Student',
    value: 'incoming-student',
    description: 'You do not yet have an RCS ID.',
  },
  {
    label: 'Current Student',
    value: 'current-student',
    description: 'You have an RCS ID.',
  },
  {
    label: 'Alumni',
    value: 'alumni',
    description: 'You were once an RPI student.',
  },
  {
    label: 'RPI Faculty',
    value: 'faculty',
    description: 'You are RPI faculty/administration/staff.',
  },
  {
    label: 'External Guest',
    value: 'external',
    description: 'You are not a student, alum, or RPI-affiliated.',
  },
];

module.exports = {
  name: 'guildMemberAdd',
  once: true,
  disabled: true,
  /**
   * When a new user joins the server, ask what their role is.
   *
   * @param {GuildMember} member
   */
  async execute(member) {
    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('role')
        .setPlaceholder('Select the role that best fits')
        .setOptions(roles)
    );

    const message = await member.send({
      content:
        '**Welcome to the RPI ITWS Discord!**\nIn order to give you access to the server, please choose the role that best describes you below.',
      components: [row],
    });

    // Wait for user to choose a role
    let selectionInteraction;
    try {
      selectionInteraction = await message.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        max: 1,
        time: 20000,
      });
      // selectionInteraction.deferUpdate();
    } catch (error) {
      // User did not choose an option in time.
      message.reply('You failed to choose an option in time.');
      return;
    }

    selectionInteraction.update({
      content: 'Great.',
      components: [],
    });
  },
};
