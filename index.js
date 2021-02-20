// Load environment variables from .env file
const dotenv = require("dotenv")
dotenv.config()

const fs = require("fs");

// Import Discord Node Module
const Discord = require("discord.js");

const { parseCommandAndArgs, fetchMember } = require("./utils");
const { NotAuthorized } = require("./permissions");

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
    if (command.alias) bot.commands.set(command.alias, command);
}

function getRoleByName(roleName) {
    return bot.guilds.cache.get(itwsServerId).roles.cache.find(role => role.name === roleName)
}

bot.once("ready", async () => {
    console.log(`Bot is ready with command prefix ${commandPrefix}`);

    // // // Setup roles by name
    // for (let gradYear = 21; gradYear <= 24; gradYear++) {
    //     roles['Class' + gradYear] = getRoleByName('Class of 20' + gradYear).id;
    // }

    // roles['Graduate'] = getRoleByName('Graduate').id;

    // roles['AmongUs'] = getRoleByName('Among Us').id;
    // roles['DnD'] = getRoleByName('DnD').id;
    // roles['test_role'] = getRoleByName('test_role').id;
});

bot.on("message", async (message) => {
    // Ignore non-commands and bot messages
    if (!message.content.startsWith(commandPrefix) || message.author.bot) return;

    // Divide input into parts
    // Command will be the first part and args will be the arguments
    // e.g. "role ITWS" -> command="role", args=["ITWS"]
    const [commandName, args] = parseCommandAndArgs(message.content.slice(commandPrefix.length));


    // Legacy role command
    // Role command
    // if (commandName === "role") {
    //     const desiredRoleName = args[0];
    //     console.log(desiredRoleName);
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
    //     return;
    // }

    if (!bot.commands.has(commandName)) return;

    // Attempt to run command
    try {
        const command = bot.commands.get(commandName);
        const member = await fetchMember(message.guild, message.author.id);

        await command.execute(message, member, args);
    } catch (error) {
        console.error(error);
        if (error instanceof NotAuthorized) {
            await message.reply(error.message || "You do not have permission to run that command.");
        } else {
            await message.reply('Oops! Something went wrong running that command... Please let a Moderator know.');
        }
    }
});

// Bot login using key
bot.login(process.env.DISCORD_BOT_TOKEN);