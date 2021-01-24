// Load environment variables from .env file
const dotenv = require("dotenv")
dotenv.config()

const fs = require("fs");

// Import Discord Node Module
const Discord = require("discord.js");

/** The prefix that commands use. */
const commandPrefix = process.env.DISCORD_COMMAND_PREFIX;

const itwsServerId = process.env.DISCORD_SERVER_ID;

// Define Roles with id's
/** Role names matched to role IDs */
const roles = {};

/** Bot object */
const bot = new Discord.Client();

// Load commands from commands folder
bot.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    bot.commands.set(command.name, command);
}

function getRoleByName(roleName) {
    return bot.guilds.cache.get(itwsServerId).roles.cache.find(role => role.name === roleName)
}

bot.once("ready", async () => {
    console.log(`Bot is ready with command prefix ${commandPrefix}`);

    // // Setup roles by name
    // roles['Intro'] = getRoleByName('Intro to ITWS').id;

    // for (let gradYear = 21; gradYear <= 24; gradYear++) {
    //     roles['Class' + gradYear] = getRoleByName('Class of 20' + gradYear).id;
    // }

    // roles['Graduate'] = getRoleByName('Graduate').id;

    // for (let team = 1; team <= 19; team++) {
    //     roles['Team' + team] = getRoleByName('Intro Team ' + team).id;
    // }

    // roles['Capstone'] = getRoleByName('Capstone').id;
    // for (let team = 1; team <= 6; team++) {
    //     roles['Capstone' + team] = getRoleByName('Capstone Team ' + team).id;
    // }

    // roles['AmongUs'] = getRoleByName('Among Us').id;
    // roles['DnD'] = getRoleByName('DnD').id;
    // roles['test_role'] = getRoleByName('test_role').id;
    // // console.log(roles);
});

bot.on("message", (message) => {
    // Ignore non-commands and bot messages
    if (!message.content.startsWith(commandPrefix) || message.author.bot) return;

    // Divide input into parts
    // Command will be the first part and args will be the arguments
    // e.g. "!role ITWS" -> command="!role", args=["ITWS"]
    const args = message.content.slice(commandPrefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

    if (!bot.commands.has(commandName)) return;

    // Attempt to run command
    try {
        const command = bot.commands.get(commandName);
        if (command.serverOnly && message.channel.type === 'dm') {
            return message.reply('Must use the command in a server!');
        }
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('Oops! Something went wrong running that command... Please let a Moderator know.');
    }
    
    // // Role command
    // else if (command === "role") {
    //     const desiredRoleName = args[0]

    //     if (desiredRoleName == "list") {
    //         // List all roles
    //         message.member.send("**Roles**\n" + Object.keys(roles).join("\n"));
    //     } else if (desiredRoleName in roles) {
    //         // User chose a valid role
    //         message.member.roles.add(roles[desiredRoleName])
    //         message.member.send("Added " + desiredRoleName);
    //     } else {
    //         // User chose an invalid role
    //         message.channel.send("That's not a valid role!");
    //     }
    // }

    // else if (command === "remove") {
    //     let desiredRoleName = args[0];

    //     // !remove range <role> <start> <end>
    //     if (desiredRoleName === "range") {
    //         desiredRoleName = args[1]
    //         for (var team = args[2]; team <= args[3]; team++) {
    //             message.guild.members.fetch().then((member) => member.map((user, v) => {
    //                 user.roles.cache.forEach((r) => {
    //                     if (r.id == roles[desiredRoleName.toString() + team.toString()]) {
    //                         user.roles.remove(roles[desiredRoleName.toString() + team.toString()]);
    //                     }
    //                 })
    //             }));
    //         }
    //     }
    //     else {
    //         if (desiredRoleName in roles) {
    //             message.guild.members.fetch().then((member) => member.map((user, v) => {
    //                 user.roles.cache.forEach((r) => {
    //                     if (r.id == roles[desiredRoleName]) {
    //                         user.roles.remove(roles[desiredRoleName]);
    //                     }
    //                 })
    //             }));
    //         }

    //         else {
    //             message.channel.send("That's not a valid role!");
    //         }
    //     }
    // }


    /*else if (command == "teamrolegenerate") {
        for (let team = 1; team <= 6; team++) {
            message.guild.roles.create({
                data: {
                    name: "Capstone Team " + team,
                    mentionable: true
                }
            })
        }
    } /*else if (command == "team") {
        const team = parseInt(args[0])

        // Validate team input
        if (team == NaN) {
            message.channel.send("That's not a valid team number!");
            return;
        }

        // Find the team channels
        const categoryChannels = message.guild.channels.cache.get(itwsCategoryId).children;
        const teamTextChannel = categoryChannels.find(channel => channel.name === "team-" + team && channel.type == "text");
        const teamVoiceChannel = categoryChannels.find(channel => channel.name === "Team " + team && channel.type == "voice");

        // If either doesn't exist, quit
        if (!teamTextChannel || !teamVoiceChannel) {
            message.channel.send("Your team channels haven't been created yet. We'll add them shortly.");
            return;
        }

        // Wait for both channel overrides to complete
        Promise.all([
            teamTextChannel.updateOverwrite(message.author.id, {
                VIEW_CHANNEL: true
            }, "Added to team text channel"),
            teamVoiceChannel.updateOverwrite(message.author.id, {
                VIEW_CHANNEL: true,
                CONNECT: true
            }, "Added to team voice channel")
        ])
            .then(() => {
                // Send success DM with link to text channel
                message.member.send("Added you to your team channels! " + teamTextChannel.toString() + " Let a moderator know if you put the wrong team.");
            })
            .catch(error => {
                console.error(error);
                message.channel.send("Failed to add you to that team... We'll look into the issue!")
            })
    }*/
});

// Bot login using key
bot.login(process.env.DISCORD_BOT_TOKEN);
