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
            return message.reply("Please provide a course title or short title.");
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
        }
    }
};