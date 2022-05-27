const { Op } = require('sequelize');
const logger = require('../core/logging').child({ from: 'groups' });
const { Group } = require('../core/db');
const { isModeratorOrAbove } = require('../core/permissions');
const { toggleMemberRole } = require('../core/utils');

const commandPrefix = process.env.DISCORD_COMMAND_PREFIX;

async function findGroup(groupIdentifer) {
  const group = await Group.findOne({
    where: {
      [Op.or]: [
        {
          title: {
            [Op.iLike]: groupIdentifer,
          },
        },
        {
          shortTitle: {
            [Op.iLike]: groupIdentifer,
          },
        },
      ],
    },
  });
  return group;
}

module.exports = {
  name: 'groups',
  alias: 'role',
  description: 'User groups.',
  usages: {
    'groups "<group title>"': 'Join/leave a group',
    // "groups leave <group name/short name/id>": "Leave a group",
    'groups add <group name> <short name> [public?]':
      '(Mods) Create a group in a specific category',
    // "groups reset <group name/short name/id>": "(Admin) Remove all members from a group",
    // "groups remove <group name/short name/id>": "(Admin) Delete a group and its channels",
  },
  examples: [
    'groups DnD',
    // 'groups leave "Among Us"',
    'groups add "Jackbox Party Pack" Jackbox yes',
    'groups add "Secret Club" secret no',
  ],
  async execute(message, member, args) {
    const server = member.guild;

    if (args.length === 0) {
      // List groups
      const groups = await Group.findAll({
        where: {
          isPublic: true,
        },
        order: [['shortTitle', 'ASC']],
      });
      const messageLines = [
        '**Public Groups**',
        ...groups.map((group) => `(${group.shortTitle}) ${group.title}`),
        `\nJoin a group with \`${commandPrefix}group "group name"\``,
      ];
      await message.channel.send(messageLines.join('\n'));
      return;
    }
    if (args.length === 1) {
      // Join/leave group
      const group = await findGroup(args[0]);
      if (!group || !group.isPublic) {
        await message.reply('Group not found.');
        return;
      }

      try {
        const added = await toggleMemberRole(member, group.discordRoleId);
        await message.reply(
          added ? 'Added group role!' : 'Removed group role!'
        );
      } catch (error) {
        logger.error(error);
        await message.reply(
          'Failed to toggle group role. Please notify a Moderator.'
        );
        return;
      }
    }

    // Should be add, remove, etc.
    const subcommand = args[0].toLowerCase();

    if (subcommand === 'add') {
      // Check permissions
      await isModeratorOrAbove(message.author);

      const groups = await Group.findAll();
      let [groupTitle, groupShortTitle, isPublicRaw] = args.slice(1);

      groupTitle = groupTitle.trim().replace(/\s\s+/g, ' ');
      groupShortTitle = groupShortTitle.trim().replace(/\s\s+/g, ' ');

      // Check if invalid group name
      const invalidGroupTitles = ['add', 'remove'];
      if (
        [groupShortTitle, groupTitle].some((t) =>
          invalidGroupTitles.includes(t)
        )
      ) {
        await message.channel.send("That's an invalid group title.");
        return;
      }

      // Check if group already exists
      if (
        groups.find(
          (g) => g.title === groupTitle || g.shortTitle === groupShortTitle
        )
      ) {
        await message.channel.send('A group with that title already exists!');
        return;
      }

      // Attempt to create Discord role for group
      let groupDiscordRole;
      try {
        groupDiscordRole = await server.roles.create({
          data: {
            name: groupShortTitle,
          },
          reason: 'New group',
        });
      } catch (error) {
        logger.error(
          `Failed to create group role for new group ${groupShortTitle}: ${error}`
        );
        await message.channel.send(
          'Failed to create group role. Check bot logs for more information.'
        );
        return;
      }

      try {
        // Attempt to build and save new group DB record
        const newGroup = await Group.create({
          shortTitle: groupShortTitle,
          title: groupTitle,
          isPublic:
            isPublicRaw.trim() === 'yes' || isPublicRaw.trim() === 'true',
          discordRoleId: groupDiscordRole.id,
        });
        logger.info(
          `Created new ${
            newGroup.isPublic ? 'public' : 'private'
          } group ${groupTitle} (${groupShortTitle})`
        );
        await message.channel.send(
          `Created group ${groupDiscordRole}. You can now create channels for the group. Be sure to grant ${groupDiscordRole} permssions.`
        );
        return;
      } catch (error) {
        logger.info(`Failed to create new group ${groupShortTitle}: ${error}`);
        await message.channel.send(
          'Failed to create group. Check bot logs for more information.'
        );
      }
    }

    // TODO: remove group subcommand
  },
};
