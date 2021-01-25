const { Course } = require("../db");
const { findCourse } = require('./courses');

module.exports = {
    name: "join",
    description: "Join courses",
    serverOnly: true,
    usages: {
        "join <course title/short title>": "Join a course",
    },
    examples: [
        "join Intro",
        "join Capstone",
        "join MITRe",
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
            // await message.guild.channels.cache.get(course.)
        } catch (e) {
            await message.reply('Failed to add role...');
        }
    }
};