const { Group } = require("../db");
const { isModeratorOrAbove } = require("../permissions");
const SERVER_ID = process.env.DISCORD_SERVER_ID;
const commandPrefix = process.env.DISCORD_COMMAND_PREFIX;

module.exports = {
    name: "groups",
    description: "User groups.",
    serverOnly: false,
    usages: {
        "groups join <group name/short name/id>": "Join a group",
        "groups leave <group name/short name/id>": "Leave a group",
        "groups add <group name> <short name> [category name] [public?]": "(Admin) Create a group in a specific category",
        "groups reset <group name/short name/id>": "(Admin) Remove all members from a group",
        "groups remove <group name/short name/id>": "(Admin) Delete a group and its channels",
    },
    examples: [
        "groups join DnD",
        'groups leave "Among Us"',
        'groups add "Jackbox Party Pack" "Jackbox" "Games" yes',
        'groups add "Secret Club" "secret" "Custom Category" no',
    ],
    async execute(message, args) {
        const server = message.client.guilds.cache.get(SERVER_ID);

        // Should be list, add, reset, etc.
        const subcommand = args[0].toLowerCase();

        if (args.length === 0) {
            const groups = await Group.findAll();
            const messageLines = [
                '**Public Groups**',
                ...groups.map(group => `(${group.shortTitle}) ${group.title}`),
                `\nJoin a group with \`${commandPrefix}group "group name"\``
            ];
            return await message.channel.send(messageLines.join("\n"));
        }

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