const { Op } = require("sequelize");
const { Course, CourseEnrollment, CourseTeam } = require("../db");

const DISCORD_SERVER_ID = process.env.DISCORD_SERVER_ID;

module.exports = {
    name: "courses",
    description: "Manage courses with their categories, channels, and roles.",
    serverOnly: true,
    // adminOnly: true,
    usages: {
        "courses list": "List courses",
        "courses add <title> <short title> <number of teams>": "Create a course and a category...",
        "courses reset <title/short title>": "Wipe the course channels\"s messages and remove access from students.",
        "courses remove <title/short title>": "Delete the course category, role, and all channels."
    },
    examples: [
        'courses add "Intro to ITWS" "intro" 10',
        'courses reset "Intro to ITWS"',
        'courses remove "Intro to ITWS"'
    ], 
    async execute(message, args) {
        if (args.length === 0) {
            return;
        }
        
        const server = message.client.guilds.cache.get(DISCORD_SERVER_ID);
        
        // Should be list, add, reset, etc.
        const subcommand = args[0].toLowerCase();

        if (subcommand === "list") {
            const courses = await Course.findAll();
            const messageLines = [
                '**Courses**',
                '__ID\t| Title__',
                ...courses.map(course => `${course.id}\t| ${course.title}`)
            ];
            message.channel.send(messageLines.join("\n"));
        } else if (subcommand === "add") {
            const [title, shortTitle, teamCount] = args.slice(1);
            const newCourse = Course.build({
                title,
                shortTitle
            });
            
            // Create course role
            const courseRole = await server.roles.create({
                data: {
                    name: newCourse.title
                },
                reason: `Role for new course ${newCourse.title}`
            });
            newCourse.discordRoleId = courseRole.id;

            // Create course category
            const courseCategory = await server.channels.create(newCourse.title, {
                type: "category",
                permissionOverwrites: [
                    {
                        id: server.id,
                        deny: ["VIEW_CHANNEL"]
                    },
                    {
                        id: courseRole.id,
                        allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"]
                    }
                ]
            });
            newCourse.discordCategoryId = courseCategory.id;

            // Create category channels
            //  - announcements
            //  - general

            // Teams
            //  - role
            //  - text channel
            //  - voice channel

            await newCourse.save();
        } else if (subcommand === "remove") {
            const identifier = args[1];
            const course = await Course.findOne({
                where: {
                    [Op.or]: [
                        { title: identifier },
                        { shortTitle: identifier }
                    ]
                }
            });

            if (!course) {
                return message.reply("Cannot find course.");
            }

            // Delete course category
            if (course.discordCategoryId) {
                const courseCategory = server.channels.cache.get(course.discordCategoryId);
                await courseCategory.delete("Course being removed");
            }
            //  - All children

            // Delete course role
            if (course.discordRoleId) {
                const courseRole = await server.roles.fetch(course.discordRoleId)
                await courseRole.delete("Course being removed");
            }

            // Delete DB record
            await course.destroy();
        }
    }
};
