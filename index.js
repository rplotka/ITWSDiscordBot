// Load environment variables from .env file
const dotenv = require("dotenv")
dotenv.config()

// Import Discord Node Module
const Discord = require("discord.js");

/** The prefix that commands use. */
const commandPrefix = "!";

const itwsServerId = "735867785879748709";

/** ID of the Intro to ITWS category channel */
const itwsCategoryId = "749708689212047490";

// Define Roles with id's
/** Role names matched to role IDs */
const roles = {};

/** Message to send for the help command */
const helpMessage = [
    "**List of commands:**",
    "-----------------",
    `\`${commandPrefix}help\` - bring up this prompt`,
    `\`${commandPrefix}role roleName\` - add yourself to a role (use \`${commandPrefix}role list\` to recive a direct message with a list of all of the roles`
].join("\n")

/** Bot object */
const bot = new Discord.Client();

function getRoleByName(roleName) {
    return bot.guilds.cache.get(itwsServerId).roles.cache.find(role => role.name === roleName)
}

bot.once("ready", async () => {
    console.log(`Bot is ready with command prefix ${commandPrefix}`);

    // Setup roles by name
    roles['Intro'] = getRoleByName('Intro to ITWS').id;

    for (let gradYear = 21; gradYear <= 24; gradYear++) {
        roles['Class' + gradYear] = getRoleByName('Class of 20' + gradYear).id;
    }

    roles['Graduate'] = getRoleByName('Graduate').id;

    for (let team = 1; team <= 19; team++) {
        roles['Team' + team] = getRoleByName('Intro Team ' + team).id;
    }

    roles['Capstone'] = getRoleByName('Capstone').id;
    for (let team = 1; team <= 6; team++) {
	    roles['Capstone' + team] = getRoleByName('Capstone Team ' + team).id;
    }

    roles['AmongUs'] = getRoleByName('Among Us').id;
    roles['DnD'] = getRoleByName('DnD').id;
    // console.log(roles);
});

bot.on("message", (message) => {
    // Ignore non-commands
    if (!message.content.startsWith(commandPrefix)) return;

    // Divide input into parts
    // Command will be the first part and args will be the arguments
    // e.g. "!role ITWS" -> command="!role", args=["ITWS"]
    let [command, ...args] = message.content.split(" ");

    // Remove command prefix
    command = command.replace(commandPrefix, "");

    // Help command
    if (command === "help") {
        message.channel.send(helpMessage);
    }

    // Role command
    else if (command === "role") {
        const desiredRoleName = args[0]

        if (desiredRoleName == "list") {
            // List all roles
            message.member.send("**Roles**\n" + Object.keys(roles).join("\n"));
        } else if (desiredRoleName in roles) {
            // User chose a valid role
            message.member.roles.add(roles[desiredRoleName])
	    message.member.send("Added " + desiredRoleName);
        } else {
            // User chose an invalid role
            message.channel.send("That's not a valid role!");
        }
    } /*else if (command == "teamrolegenerate") {
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
