const { Op } = require('sequelize');
const { Course, CourseTeam } = require('../db');
const { findCourse, findCourseGeneralChannel } = require('./courses');

module.exports = {
  name: 'join',
  description: 'Join courses',
  usages: {
    'join <course title/short title>': 'Join a *public* course.',
    'join <course title/short title> <team name/number>':
      "Join a course and team. If course is not public, you must've been added to it already.",
  },
  examples: [
    'join Intro',
    'join Intro 2',
    'join intro "Team 3"',
    'join Capstone',
    'join MITR 7',
  ],
  async execute(message, member, args) {
    if (args.length === 0) {
      const courses = await Course.findAll({
        where: {
          isPublic: true,
        },
      });
      const messageLines = [
        '**Available Public Courses**',
        ...courses.map((c) => `${c.title} \`(${c.shortTitle})\``),
      ];
      message.channel.send(messageLines.join('\n'), { split: true });
      return;
    }
    const courseIdentifier = args[0];

    const course = await findCourse(courseIdentifier);
    if (!course) {
      await message.reply('Course not found.');
      return;
    }

    if (!course.isPublic) {
      await message.reply(
        'You can only be added to that course by the instructor.'
      );
      return;
    }

    try {
      await message.member.roles.add(course.discordRoleId);
      await message.reply('Added role!');
    } catch (e) {
      await message.reply('Failed to add role...');
      return;
    }

    try {
      const courseGeneralChannel = await findCourseGeneralChannel(
        message.guild,
        course
      );
      await courseGeneralChannel.send(`Welcome <@${message.author.id}>!`);
    } catch (e) {
      console.error('Failed to send welcome message.');
      console.error(e);
    }

    if (args.length === 2) {
      // Join team as well
      // Find team
      const teamIdentifier = args[1].toLowerCase().replace('team', '').trim();
      const courseTeam = await CourseTeam.findOne({
        where: {
          CourseId: course.id,
          title: {
            [Op.iLike]: teamIdentifier,
          },
        },
      });

      if (!courseTeam) {
        await message.reply('No such team!');
        return;
      }

      try {
        if (message.member.roles.cache.has(courseTeam.discordRoleId)) {
          await message.reply("You're already in that team!");
        } else {
          await message.member.roles.add(courseTeam.discordRoleId);
          // Send welcome message
          const channel = message.guild.channels.cache.get(
            courseTeam.discordTextChannelId
          );
          await channel.send(`Welcome <@${message.author.id}>!`);
        }
      } catch (error) {
        await message.reply('Failed to add team role...');
      }
    }
  },
};
