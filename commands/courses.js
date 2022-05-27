const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  CommandInteraction,
  MessageActionRow,
  MessageSelectMenu,
} = require('discord.js');
const { Course } = require('../core/db');

/**
 * @param {"join" | "leave"} courseAction
 * @param {Course[]} courses
 */
const courseSelectorActionRowFactory = (courseAction, courses) =>
  new MessageActionRow().addComponents(
    new MessageSelectMenu()
      .setCustomId(`course-${courseAction}`)
      .setPlaceholder('Select a course')
      .setOptions(
        courses.map((course) => ({
          label: course.title,
          description: `Instructed by ${course.instructors.join(', ')}`,
          value: course.id.toString(),
        }))
      )
  );

module.exports = {
  data: new SlashCommandBuilder()
    .setName('courses')
    .setDescription('Join/leave courses.')
    .addSubcommand((sc) => sc.setName('join').setDescription('Join a course'))
    .addSubcommand((sc) =>
      sc.setName('leave').setDescription('Leave a course')
    ),
  /**
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    let courses = await Course.findAll();

    const courseAction = interaction.options.getSubcommand(); // "join" or "leave"

    const memberRoleIds = interaction.member.roles.cache.map((role) => role.id);

    if (courseAction === 'join') {
      // Filter to only show courses not joined
      courses = courses.filter(
        (course) => !memberRoleIds.includes(course.discordRoleId)
      );
    } else {
      // Filter to only show courses currently joined
      courses = courses.filter((course) =>
        memberRoleIds.includes(course.discordRoleId)
      );
    }

    const row = courseSelectorActionRowFactory(courseAction, courses);

    // Discord gets mad if we send a select menu with no options so we check for that
    if (courses.length === 0) {
      await interaction.reply({
        content:
          courseAction === 'join'
            ? 'There are no other courses to join.'
            : 'You are not in any courses currently.',
        ephemeral: true,
      });
      return;
    }

    // Send a message with a select menu of courses
    // When selected, a new interaction will be fired with the custom ID specified
    // Another event handler can pick this up and complete the joining or leaving of the course
    await interaction.reply({
      content: `Choose a course to **${courseAction}**.`,
      components: [row],
      ephemeral: true,
    });
  },
};
