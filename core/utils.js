const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
} = require('discord.js');
const { Op } = require('sequelize');
const { CourseTeam } = require('./db');
const logger = require('./logging');
const { coursePermissions, courseChannelTopics } = require('./constants');

/**
 * Creates a modal for adding teams to a course
 * @param {string} courseId - The ID of the course to add teams to
 */
const addTeamsModalFactory = (courseId) => {
  const modal = new ModalBuilder()
    .setCustomId(`add-teams-modal-${courseId}`)
    .setTitle('Add Teams to Course');

  const teamNamesInput = new TextInputBuilder()
    .setCustomId('add-teams-modal-names')
    .setLabel('Team names (comma-separated)')
    .setPlaceholder('e.g. Alpha, Beta, Gamma or Team 1, Team 2, Team 3')
    .setRequired(true)
    .setStyle(TextInputStyle.Paragraph);

  const row1 = new ActionRowBuilder().addComponents(teamNamesInput);
  modal.addComponents(row1);

  return modal;
};

const addCourseModalFactory = () => {
  const modal = new ModalBuilder()
    .setCustomId('add-course-modal')
    .setTitle('Add Course');

  // Add inputs for DB fields
  // - title
  // - shortTitle
  // - isPublic
  // - instructors

  const titleInput = new TextInputBuilder()
    .setCustomId('add-course-modal-title')
    .setLabel("What's the FULL name of the course?")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const shortTitleInput = new TextInputBuilder()
    .setCustomId('add-course-modal-short-title')
    .setLabel("What's the SHORT name of the course?")
    .setPlaceholder('e.g. intro, mitr, capstone')
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  // Discord does not yet appear to support select menus in modals

  // const isPublicInput = new StringSelectMenuBuilder()
  //   .setCustomId('add-course-modal-is-public')
  //   .setPlaceholder('Can students freely join?')
  //   .setOptions([
  //     {
  //       label: 'Publicly Joinable',
  //       value: 'yes',
  //       description: 'Students can join via `/join course`',
  //       emoji: '🔓',
  //     },
  //     {
  //       label: 'Locked',
  //       value: 'no',
  //       description: 'Students can only be added by instructors',
  //       emoji: '🔒',
  //     },
  //   ]);

  const instructorsInput = new TextInputBuilder()
    .setCustomId('add-course-modal-instructors')
    .setLabel('Who is instructing the course?')
    .setPlaceholder('Comma-separated list of instructor RCS IDs')
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  const row1 = new ActionRowBuilder().addComponents(titleInput);
  const row2 = new ActionRowBuilder().addComponents(shortTitleInput);
  const row3 = new ActionRowBuilder().addComponents(instructorsInput);
  // const row4 = new ActionRowBuilder().addComponents(isPublicInput);

  modal.addComponents(row1, row2, row3);

  return modal;
};

/**
 * @param {"join" | "leave" | "remove"} courseAction
 * @param {Course[]} courses
 */
const courseSelectorActionRowFactory = (courseAction, courses) =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
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

/**
 * @param {"join" | "leave"} courseTeamAction
 * @param {CourseTeam[]} courseTeamsWithCourse
 */
const courseTeamSelectorActionRowFactory = (
  courseTeamAction,
  courseTeamsWithCourse
) =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`course-team-${courseTeamAction}`)
      .setPlaceholder(`Select a team to ${courseTeamAction}`)
      .setOptions(
        courseTeamsWithCourse.map((courseTeam) => ({
          label: `${courseTeam.title} (${courseTeam.Course.title})`,
          value: courseTeam.id.toString(),
        }))
      )
  );

/**
 * Creates a multi-select dropdown for removing teams from a course
 * @param {string} courseId - The course ID
 * @param {CourseTeam[]} teams - Teams in the course
 */
const removeTeamsSelectorActionRowFactory = (courseId, teams) =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`teams-remove-${courseId}`)
      .setPlaceholder('Select teams to remove')
      .setMinValues(1)
      .setMaxValues(teams.length)
      .setOptions(
        teams.map((team) => ({
          label: team.title,
          value: team.id.toString(),
        }))
      )
  );

/**
 * Finds the #general text channel for a particular course on a server (guild).
 *
 * @param {Discord.Guild} guild
 * @param {Course} course
 * @returns {Discord.GuildTextBasedChannel}
 */
function findCourseGeneralChannel(guild, course) {
  const courseCategory = guild.channels.cache.get(course.discordCategoryId);
  return courseCategory.children.find(
    (child) => child.type === ChannelType.GuildText && child.name === 'general'
  );
}

/**
 *
 * @param {Discord.GuildMember} member
 * @param {Course} course
 */
async function addMemberToCourse(member, course) {
  const alreadyHasCourseRole = member.roles.cache.some(
    (role) => role.id === course.discordRoleId
  );
  // Attempt to add course roles
  await member.roles.add(course.discordRoleId);

  if (!alreadyHasCourseRole) {
    try {
      const courseGeneralChannel = findCourseGeneralChannel(
        member.guild,
        course
      );

      await courseGeneralChannel.send(`👋 Welcome ${member}!`);
    } catch (error) {
      logger.error('Failed to send welcome message to course #general channel');
      logger.error(error);
    }
  }
}

/**
 *
 * @param {Discord.GuildMember} member
 * @param {CourseTeam} courseTeam
 */
async function addMemberToCourseTeam(member, courseTeam) {
  const alreadyHasCourseTeamRole = member.roles.cache.some(
    (role) => role.id === courseTeam.discordRoleId
  );

  await member.roles.add(courseTeam.discordRoleId);

  if (!alreadyHasCourseTeamRole) {
    try {
      const channel = member.guild.channels.cache.get(
        courseTeam.discordTextChannelId
      );
      await channel.send(`👋 Welcome team member ${member}!`);
    } catch (error) {
      logger.error('Failed to send welcome message to course team channel');
      logger.error(error);
    }
  }
}

/**
 *
 * @param {Discord.GuildMember} member
 * @param {CourseTeam} courseTeam
 */
async function removeMemberFromCourseTeam(member, courseTeam) {
  const alreadyHasCourseTeamRole = member.roles.cache.some(
    (role) => role.id === courseTeam.discordRoleId
  );

  await member.roles.remove(courseTeam.discordRoleId);

  if (alreadyHasCourseTeamRole) {
    try {
      const channel = member.guild.channels.cache.get(
        courseTeam.discordTextChannelId
      );
      await channel.send(`👋 Goodbye ${member}!`);
    } catch (error) {
      logger.error('Failed to send goodbye message to course team channel');
      logger.error(error);
    }
  }
}

/**
 *
 * @param {Discord.GuildMember} member
 * @param {Course} course
 */
async function removeMemberFromCourse(member, course) {
  const memberDiscordRoleIds = member.roles.cache.map((role) => role.id);

  // Attempt to add remove role
  await member.roles.remove(course.discordRoleId);

  // Leave all teams
  const courseTeams = await CourseTeam.findAll({
    where: {
      discordRoleId: {
        [Op.in]: memberDiscordRoleIds,
      },
    },
  });

  await Promise.allSettled(
    courseTeams.map((courseTeam) =>
      removeMemberFromCourseTeam(member, courseTeam)
    )
  );
}

/**
 *
 * @param {Discord.Guild} guild
 * @param {Course} course
 */
async function removeCourse(guild, course) {
  // Delete team roles and channels
  const courseTeams = await CourseTeam.findAll({
    where: {
      CourseId: course.id,
    },
  });

  await Promise.all(
    courseTeams.map((courseTeam) =>
      Promise.allSettled([
        // Delete role
        guild.roles.delete(courseTeam.discordRoleId, 'Course being removed'),
        // Delete text channel
        guild.channels.delete(
          courseTeam.discordTextChannelId,
          'Course being removed'
        ),
        // Delete voice channel
        guild.channels.delete(
          courseTeam.discordVoiceChannelId,
          'Course being removed'
        ),
        courseTeam.destroy(),
      ])
    )
  );

  // Delete course category and children
  if (course.discordCategoryId) {
    try {
      // Delete children first!!!!
      await Promise.all(
        guild.channels.cache
          .filter(
            (channel) =>
              channel.parent && channel.parent.id === course.discordCategoryId
          )
          .map((childChannel) => childChannel.delete('Course being removed'))
      );

      await guild.channels.delete(
        course.discordCategoryId,
        'Course being removed'
      );
    } catch (error) {
      logger.warn(
        `Failed to delete Discord category and/or children channels for course '${course.title}' (${course.id})`
      );
      logger.warn(error);
    }
  }

  // Delete course role
  if (course.discordRoleId) {
    try {
      await guild.roles.delete(course.discordRoleId, 'Course being removed');
    } catch (error) {
      logger.warn(
        `Failed to delete Discord role for course '${course.title}' (${course.id})`
      );
      logger.warn(error);
    }
  }

  // Delete course instructor role
  if (course.discordInstructorRoleId) {
    try {
      await guild.roles.delete(
        course.discordInstructorRoleId,
        'Course being removed'
      );
    } catch (error) {
      logger.warn(
        `Failed to delete Discord instructor role for course '${course.title}' (${course.id})`
      );
      logger.warn(error);
    }
  }

  // Finally, delete the DB record
  await course.destroy();
}

/**
 * Creates a single team for a course
 * @param {Discord.Guild} guild
 * @param {Course} course
 * @param {string} teamName - Team name to create
 * @param {Discord.CategoryChannel} courseCategory - The course category channel
 * @returns {Promise<CourseTeam>} Created CourseTeam record
 */
async function createSingleTeam(guild, course, teamName, courseCategory) {
  // Create team role
  const teamRole = await guild.roles.create({
    name: `${course.shortTitle} - ${teamName}`,
    mentionable: true,
    reason: `Team role for ${teamName} in course ${course.title}`,
  });

  // Get permissions for team channels
  const teamPermissions = coursePermissions.team(
    course.discordInstructorRoleId,
    course.discordRoleId,
    teamRole.id
  );

  // Create team text channel
  const textChannel = await guild.channels.create({
    name: `${course.shortTitle}-${teamName.toLowerCase().replace(/\s+/g, '-')}`,
    type: ChannelType.GuildText,
    topic: courseChannelTopics.team(teamName, course),
    parent: courseCategory.id,
    permissionOverwrites: teamPermissions,
  });

  // Create team voice channel
  const voiceChannel = await guild.channels.create({
    name: `${course.shortTitle} ${teamName} Voice`,
    type: ChannelType.GuildVoice,
    parent: courseCategory.id,
    permissionOverwrites: teamPermissions,
  });

  // Save team to database
  const courseTeam = await CourseTeam.create({
    title: teamName,
    discordTextChannelId: textChannel.id,
    discordVoiceChannelId: voiceChannel.id,
    discordRoleId: teamRole.id,
    CourseId: course.id,
  });

  logger.info(`Created team "${teamName}" for course "${course.title}"`);
  return courseTeam;
}

/**
 * Creates teams for a course including roles and channels
 * @param {Discord.Guild} guild
 * @param {Course} course
 * @param {string[]} teamNames - Array of team names to create
 * @returns {Promise<CourseTeam[]>} Array of created CourseTeam records
 */
async function createTeamsForCourse(guild, course, teamNames) {
  // Get the course category
  const courseCategory = guild.channels.cache.get(course.discordCategoryId);
  if (!courseCategory) {
    throw new Error(`Course category not found for ${course.title}`);
  }

  // Filter out empty names and create teams sequentially
  // We use sequential creation to avoid Discord rate limits
  const validNames = teamNames.map((n) => n.trim()).filter((n) => n.length > 0);

  const createdTeams = [];
  await validNames.reduce(async (promise, teamName) => {
    await promise;
    const team = await createSingleTeam(
      guild,
      course,
      teamName,
      courseCategory
    );
    createdTeams.push(team);
  }, Promise.resolve());

  return createdTeams;
}

/**
 * Removes a single team including its role and channels
 * @param {Discord.Guild} guild
 * @param {CourseTeam} team - CourseTeam record to remove
 */
async function removeSingleTeam(guild, team) {
  // Delete role
  if (team.discordRoleId) {
    try {
      await guild.roles.delete(team.discordRoleId, 'Team being removed');
    } catch (error) {
      logger.warn(
        `Failed to delete role for team ${team.title}: ${error.message}`
      );
    }
  }

  // Delete text channel
  if (team.discordTextChannelId) {
    try {
      await guild.channels.delete(
        team.discordTextChannelId,
        'Team being removed'
      );
    } catch (error) {
      logger.warn(
        `Failed to delete text channel for team ${team.title}: ${error.message}`
      );
    }
  }

  // Delete voice channel
  if (team.discordVoiceChannelId) {
    try {
      await guild.channels.delete(
        team.discordVoiceChannelId,
        'Team being removed'
      );
    } catch (error) {
      logger.warn(
        `Failed to delete voice channel for team ${team.title}: ${error.message}`
      );
    }
  }

  // Delete from database
  await team.destroy();
  logger.info(`Removed team "${team.title}"`);
}

/**
 * Removes teams from a course including their roles and channels
 * @param {Discord.Guild} guild
 * @param {CourseTeam[]} teams - Array of CourseTeam records to remove
 */
async function removeTeams(guild, teams) {
  // Remove teams sequentially to avoid rate limits
  await teams.reduce(async (promise, team) => {
    await promise;
    await removeSingleTeam(guild, team);
  }, Promise.resolve());
}

/**
 * Attempts to toggle a specific role on a server member.
 *
 * @param {Discord.GuildMember} member Discord server member
 * @param {Discord.Role | string} roleOrRoleId Role ID or object
 * @returns {Promise<boolean>} Whether the role was added (true) or removed (false)
 */
async function toggleMemberRole(member, roleOrRoleId) {
  // Remove
  if (member.roles.cache.has(roleOrRoleId)) {
    await member.roles.remove(roleOrRoleId);
    return false;
  }
  // Add
  await member.roles.add(roleOrRoleId);
  return true;
}

module.exports = {
  removeCourse,
  addCourseModalFactory,
  addTeamsModalFactory,
  courseSelectorActionRowFactory,
  courseTeamSelectorActionRowFactory,
  removeTeamsSelectorActionRowFactory,
  addMemberToCourse,
  removeMemberFromCourse,
  addMemberToCourseTeam,
  removeMemberFromCourseTeam,
  findCourseGeneralChannel,
  toggleMemberRole,
  createTeamsForCourse,
  removeTeams,
};
