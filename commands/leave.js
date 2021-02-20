const { Course } = require("../db");
const { findCourse } = require('./courses');

module.exports = {
    name: "leave",
    description: "Leave courses",
    usages: {
        "leave <course title/short title>": "Leave a course",
    },
    examples: [
        "leave Intro",
        "leave Capstone",
        "leave MITR",
    ],
    async execute(message, member, args) {
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
            await message.member.roles.remove(course.discordRoleId);
            await message.reply('Removed role!');
        } catch (e) {
            await message.reply('Failed to remove role...');
        }
    }
};