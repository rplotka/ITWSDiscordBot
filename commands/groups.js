const { Op } = require("sequelize");
const { Group } = require("../db");
const { isModeratorOrAbove } = require("../permissions");
const SERVER_ID = process.env.DISCORD_SERVER_ID;
const commandPrefix = process.env.DISCORD_COMMAND_PREFIX;

module.exports = {
    name: "groups",
    alias: "role",
    description: "User groups.",
    usages: {
        "groups \"<group title>\"": "Join/leave a group",
        // "groups leave <group name/short name/id>": "Leave a group",
        "groups add <group name> <short name> [public?]": "(Mods) Create a group in a specific category",
        // "groups reset <group name/short name/id>": "(Admin) Remove all members from a group",
        // "groups remove <group name/short name/id>": "(Admin) Delete a group and its channels",
    },
    examples: [
        "groups DnD",
        // 'groups leave "Among Us"',
        'groups add "Jackbox Party Pack" Jackbox yes',
        'groups add "Secret Club" secret no',
    ],
    async execute(message, member, args) {
        const server = message.client.guilds.cache.get(SERVER_ID);
        const member = await server.members.fetch(message.author.id);

        if (args.length === 0) {
            // List groups
            const groups = await Group.findAll();
            const messageLines = [
                '**Public Groups**',
                ...groups.map(group => `(${group.shortTitle}) ${group.title}`),
                `\nJoin a group with \`${commandPrefix}group "group name"\``
            ];
            return await message.channel.send(messageLines.join("\n"));
        } else if (args.length === 1) {
            // Join/leave group
            const group = await findGroup(args[0]);
            if (!group || !group.isPublic) {
                return await message.reply("Group not found.");
            }

            if (!member.roles.cache.has(group.discordRoleId)) {
                // Add group role
                try {
                    await member.roles.add(group.discordRoleId);
                    await message.reply('Added group role!');
                } catch (e) {
                    return await message.reply('Failed to add group role. Please notify a Moderator.');
                }
            } else {
                // Remove group role
                try {
                    await member.roles.remove(group.discordRoleId);
                    await message.reply('Removed group role!');
                } catch (e) {
                    return await message.reply('Failed to remove group role. Please notify a Moderator.');
                }
            }
        }

        // Should be add, remove, etc.
        const subcommand = args[0].toLowerCase();

        if (subcommand === "add") {
            // Check permissions
            await isModeratorOrAbove(message.author);

            const groups = await Group.findAll();
            let [groupTitle, groupShortTitle, isPublicRaw] = args.slice(1);
            
            groupTitle = groupTitle.trim().replace(/\s\s+/g, ' ');
            groupShortTitle = groupShortTitle.trim().replace(/\s\s+/g, ' ');
            
            // Check if invalid group name
            const invalidGroupTitles = ["add", "remove"];
            if ([groupShortTitle, groupTitle].some(t => invalidGroupTitles.includes(t))) {
                return await message.channel.send("That's an invalid group title.");
            }

            // Check if group already exists
            if (groups.find(g => g.title === groupTitle || g.shortTitle === groupShortTitle)) {
                return await message.channel.send("A group with that title already exists!");
            }

            // Attempt to create Discord role for group
            let groupDiscordRole;
            try {
                groupDiscordRole = await server.roles.create({
                    data: {
                        name: groupShortTitle
                    },
                    reason: "New group"
                });
            } catch (error) {
                console.error(`Failed to create group role for new group ${shortGroupTitle}: ${error}`)
                return await message.channel.send("Failed to create group role. Check bot logs for more information.");
            }
            
            try {
                // Attempt to build and save new group DB record
                const newGroup = await Group.create({
                    shortTitle: groupShortTitle,
                    title: groupTitle,
                    isPublic: isPublicRaw.trim() === "yes" || isPublicRaw.trim() === "true",
                    discordRoleId: groupDiscordRole.id
                });
                console.log(`Created new ${newGroup.isPublic ? "public" : "private"} group ${groupTitle} (${groupShortTitle})`);
                return await message.channel.send(`Created group ${groupDiscordRole}. You can now create channels for the group. Be sure to grant ${groupDiscordRole} permssions.`)
            } catch (error) {
                console.log(`Failed to create new group ${groupShortTitle}: ${error}`);   
                return await message.channel.send("Failed to create group. Check bot logs for more information.");
            }
        }

        // TODO: remove group subcommand
    }
};

async function findGroup(groupIdentifer) {
    const group = await Group.findOne({
        where: {
            [Op.or]: [
                {
                    title: {
                        [Op.iLike]: groupIdentifer
                    }
                },
                {
                    shortTitle: {
                        [Op.iLike]: groupIdentifer
                    }
                }
            ]
        }
    });
    return group;
}