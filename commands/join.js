const { Course, CourseTeam } = require("../db");
const { findCourse, findCourseGeneralChannel } = require('./courses');
const { Op } = require("sequelize");

module.exports = {
    name: "join",
    description: "Join courses",
    serverOnly: true,
    usages: {
        "join <course title/short title>": "Join a course",
        "join <course title/short title> <team name/number>": "Join a course and team",
    },
    examples: [
        "join Intro",
        "join Intro 2",
        "join intro \"Team 3\"",
        "join Capstone",
        "join MITRe 7",
    ],
    async execute(message, args) {
        if (args.length === 0) {
            const courses = await Course.findAll();
            const messageLines = [
                "**Available Courses**",
                ...courses.map(c => `${c.title} \`(${c.shortTitle})\``)
            ];
            message.channel.send(messageLines.join("\n"), { split: true });
            return;
        }
        const courseIdentifier = args[0];

        const course = await findCourse(courseIdentifier);
        if (!course) {
            return message.reply("Course not found.");
        }

        try {
            await message.member.roles.add(course.discordRoleId);
            await message.reply('Added role!');
            
        } catch (e) {
            await message.reply('Failed to add role...');
            return;
        }

        try {
            const courseGeneralChannel = await findCourseGeneralChannel(message.guild, course)
            await courseGeneralChannel.send(`Welcome <@${message.author.id}>!`);
        } catch (e) {
            console.error("Failed to send welcome message.");
            console.error(e);
        }

        if (args.length === 2) {
            // Join team as well
            // Find team
            const teamIdentifier = args[1].toLowerCase().replace("team", "").trim();
            const courseTeam = await CourseTeam.findOne({
                where: {
                    CourseId: course.id,
                    title: {
                        [Op.iLike]: teamIdentifier
                    }
                }
            });

            if (!courseTeam) {
                return await message.reply("No such team!");
            }

            try {
                if (message.member.roles.cache.has(courseTeam.discordRoleId)) {
                    await message.reply("You're already in that team!");
                } else {
                    await message.member.roles.add(courseTeam.discordRoleId);
                    // Send welcome message
                    const channel = message.guild.channels.cache.get(courseTeam.discordTextChannelId);
                    await channel.send(`Welcome <@${message.author.id}>!`);
                }
            } catch (error) {
                await message.reply("Failed to add team role...");
            }
        }
    }
};