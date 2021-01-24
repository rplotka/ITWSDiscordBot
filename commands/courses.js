const fetch = require("node-fetch");
const { Op } = require("sequelize");
const { Course, CourseEnrollment, CourseTeam } = require("../db");

const SERVER_ID = process.env.DISCORD_SERVER_ID;
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;


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

        const server = message.client.guilds.cache.get(SERVER_ID);

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
        } else if (subcommand === "sync") {
            if (message.attachments.size === 0) {
                return message.reply("Missing the attachment!");
            }
            const attachment = message.attachments.first();
            
            // Download attachment
            const response = await fetch(attachment.url);
            const text = await response.text();
            const emails = text.split(',');

            // Find Discord account of users
            const notFoundRCSIDs = [];
            const foundRCSIDs = [];
            for (const email of emails) {
                const rcsID = email.replace("@rpi.edu", "");
            }

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
                        id: ADMIN_ROLE_ID,
                        allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"]
                    },
                    {
                        id: courseRole.id,
                        allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"]
                    }
                ]
            });
            newCourse.discordCategoryId = courseCategory.id;

            // Create category channels
            // - announcements broadcast
            // - general
            // - discussion

            const courseAnnouncementsChannel = await server.channels.create(newCourse.shortTitle + "-announcements", {
                type: "text",
                topic: `📢 Course announcements for **${newCourse.title}**!`,
                parent: courseCategory.id
            });

            await server.channels.create("general", {
                type: "text",
                topic: `💬 General chat for **${newCourse.title}**.`,
                parent: courseCategory.id
            });

            await server.channels.create("discussion", {
                type: "text",
                topic: `🗣️ Discussion room for **${newCourse.title}**.`,
                parent: courseCategory.id
            });

            await newCourse.save();

            // Teams
            //  - role
            //  - text channel
            //  - voice channel

            for (let teamNumber = 1; teamNumber <= teamCount; teamNumber++) {
                // DB record
                const courseTeam = CourseTeam.build({
                    CourseId: newCourse.id,
                    teamId: teamNumber
                });

                // Role
                const teamRole = await server.roles.create({
                    data: {
                        name: `${newCourse.shortTitle} Team ${teamNumber}`
                    },
                    reason: `Team role for new course ${newCourse.title}, team ${teamNumber}`
                });
                courseTeam.discordRoleId = teamRole.id;

                // Text channel
                const teamTextChannel = await server.channels.create(`team-${teamNumber}`, {
                    type: "text",
                    parent: courseCategory.id,
                    topic: `🔒 Private discussion channel for **Team ${teamNumber}** in **${newCourse.title}**.`,
                    permissionOverwrites: [
                        {
                            id: server.id,
                            deny: ["VIEW_CHANNEL"]
                        },
                        {
                            id: courseRole.id,
                            deny: ["VIEW_CHANNEL"]
                        },
                        {
                            id: teamRole.id,
                            allow: ["VIEW_CHANNEL", "SEND_MESSAGES", "READ_MESSAGE_HISTORY"]
                        }
                    ]
                });
                courseTeam.discordTextChannelId = teamTextChannel.id;

                // Voice channel
                const teamVoiceChannel = await server.channels.create(`Team ${teamNumber}`, {
                    type: "voice",
                    parent: courseCategory.id,
                    permissionOverwrites: [
                        {
                            id: server.id,
                            deny: ["VIEW_CHANNEL"]
                        },
                        {
                            id: courseRole.id,
                            deny: ["VIEW_CHANNEL"]
                        },
                        {
                            id: teamRole.id,
                            allow: ["VIEW_CHANNEL", "CONNECT", "SPEAK"]
                        }
                    ]
                });
                courseTeam.discordVoiceChannelId = teamVoiceChannel.id;

                await courseTeam.save();
            }

            const messageLines = [
                `**Created course ${newCourse.title} (${newCourse.shortTitle})**`,
                `Go into the settings of ${courseAnnouncementsChannel} to turn it into a real Announcements channel.`
            ];
            message.reply(messageLines.join("\n"));
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

            // Delete team roles and channels
            const courseTeams = await CourseTeam.findAll({
                where: {
                    CourseId: course.id
                }
            });
            for (const courseTeam of courseTeams) {
                // Delete role
                const courseRole = await server.roles.fetch(courseTeam.discordRoleId)
                await courseRole.delete("Course being removed");

                // Delete text channel
                const teamTextChannel = server.channels.cache.get(courseTeam.discordTextChannelId);
                await teamTextChannel.delete("Course being removed");

                // Delete voice channel
                const teamVoiceChannel = server.channels.cache.get(courseTeam.discordVoiceChannelId);
                await teamVoiceChannel.delete("Course being removed");

                await courseTeam.destroy();
            }

            // Delete course category and children
            if (course.discordCategoryId) {
                // Delete children first!!!!
                await Promise.all(
                    server.channels.cache
                        .array()
                        .filter(channel => channel.parent && channel.parent == course.discordCategoryId)
                        .map(childChannel => childChannel.delete("Course being removed"))
                );

                const courseCategory = server.channels.cache.get(course.discordCategoryId);
                await courseCategory.delete("Course being removed");
            }

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
