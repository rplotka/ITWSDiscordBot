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
const {
  coursePermissions,
  courseChannelTopics,
  customIds,
} = require('./constants');
const { withRollback } = require('./rollback');

/**
 * Generates sequential team names in format: {courseShort}-Team-{seq}
 * @param {string} courseShortTitle - Short title of the course
 * @param {number} count - Number of teams to generate
 * @param {number} startFrom - Starting sequence number (default 1)
 * @returns {string[]} Array of team names
 */
function generateSequentialTeamNames(courseShortTitle, count, startFrom = 1) {
  const names = [];
  for (let i = 0; i < count; i += 1) {
    const seq = String(startFrom + i).padStart(2, '0');
    names.push(`${courseShortTitle}-Team-${seq}`);
  }
  return names;
}

/**
 * Looks up a guild member by username or nickname
 * @param {Discord.Guild} guild - The Discord guild
 * @param {string} identifier - Username or nickname to search for
 * @returns {Promise<Discord.GuildMember|null>} The member if found
 */
async function findMemberByIdentifier(guild, identifier) {
  const searchTerm = identifier.toLowerCase().trim();

  // First try to fetch all members to ensure cache is populated
  try {
    await guild.members.fetch();
  } catch (error) {
    logger.warn(`Could not fetch all members: ${error.message}`);
  }

  // Search by username or nickname
  const member = guild.members.cache.find(
    (m) =>
      m.user.username.toLowerCase() === searchTerm ||
      m.nickname?.toLowerCase() === searchTerm ||
      m.user.tag.toLowerCase().startsWith(searchTerm)
  );

  return member || null;
}

/**
 * Gets members with a specific role (e.g., Faculty)
 * @param {Discord.Guild} guild - The Discord guild
 * @param {string} roleName - Name of the role to filter by
 * @returns {Discord.Collection<string, Discord.GuildMember>} Members with the role
 */
function getMembersWithRole(guild, roleName) {
  const role = guild.roles.cache.find(
    (r) => r.name.toLowerCase() === roleName.toLowerCase()
  );
  if (!role) return new Map();
  return role.members;
}

/**
 * Creates a modal for adding teams to a course (count-based)
 * @param {string} courseId - The ID of the course to add teams to
 * @param {string} courseTitle - Title of the course (for display)
 * @param {number} existingTeamCount - Number of existing teams
 */
const addTeamsModalFactory = (
  courseId,
  courseTitle = '',
  existingTeamCount = 0
) => {
  const modal = new ModalBuilder()
    .setCustomId(customIds.team.addModal(courseId))
    .setTitle(
      courseTitle ? `Add Teams: ${courseTitle.substring(0, 30)}` : 'Add Teams'
    );

  const nextNum = existingTeamCount + 1;
  const placeholder =
    existingTeamCount > 0
      ? `Will create Team-${String(nextNum).padStart(2, '0')}, Team-${String(
          nextNum + 1
        ).padStart(2, '0')}, etc.`
      : 'Will create Team-01, Team-02, etc.';

  const teamCountInput = new TextInputBuilder()
    .setCustomId('add-teams-count')
    .setLabel('How many teams to create?')
    .setPlaceholder(placeholder)
    .setRequired(true)
    .setMaxLength(2)
    .setStyle(TextInputStyle.Short);

  const row1 = new ActionRowBuilder().addComponents(teamCountInput);
  modal.addComponents(row1);

  return modal;
};

/**
 * Creates a modal for adding a course with optional pre-filled values
 * @param {Object} prefill - Optional pre-filled values
 * @param {string} prefill.name - Course full name
 * @param {string} prefill.short - Course short name
 * @param {string} prefill.instructor - Instructor identifier
 * @param {number} prefill.teams - Number of teams
 */
const addCourseModalFactory = (prefill = {}) => {
  const modal = new ModalBuilder()
    .setCustomId(customIds.course.addModal)
    .setTitle('Add Course');

  const titleInput = new TextInputBuilder()
    .setCustomId('add-course-title')
    .setLabel("What's the FULL name of the course?")
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  if (prefill.name) {
    titleInput.setValue(prefill.name);
  }

  const shortTitleInput = new TextInputBuilder()
    .setCustomId('add-course-short')
    .setLabel("What's the SHORT name of the course?")
    .setPlaceholder('e.g. intro, mitr, capstone (used in channel names)')
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  if (prefill.short) {
    shortTitleInput.setValue(prefill.short);
  }

  const instructorsInput = new TextInputBuilder()
    .setCustomId('add-course-instructor')
    .setLabel('Instructor username/nickname')
    .setPlaceholder('Discord username of instructor (will auto-assign role)')
    .setRequired(true)
    .setStyle(TextInputStyle.Short);

  if (prefill.instructor) {
    instructorsInput.setValue(prefill.instructor);
  }

  const teamsInput = new TextInputBuilder()
    .setCustomId('add-course-teams')
    .setLabel('Number of teams (0 for none)')
    .setPlaceholder('Enter 0 to skip team creation, or a number like 5')
    .setRequired(true)
    .setValue(prefill.teams !== undefined ? String(prefill.teams) : '0')
    .setMaxLength(2)
    .setStyle(TextInputStyle.Short);

  const row1 = new ActionRowBuilder().addComponents(titleInput);
  const row2 = new ActionRowBuilder().addComponents(shortTitleInput);
  const row3 = new ActionRowBuilder().addComponents(instructorsInput);
  const row4 = new ActionRowBuilder().addComponents(teamsInput);

  modal.addComponents(row1, row2, row3, row4);

  return modal;
};

/**
 * Creates a course selector dropdown
 * @param {"join" | "leave" | "remove" | "clear" | "add-teams" | "remove-teams" | "add-students"} action
 * @param {Course[]} courses
 */
const courseSelectorActionRowFactory = (action, courses) => {
  // Map actions to custom IDs
  const customIdMap = {
    join: customIds.course.join,
    leave: customIds.course.leave,
    remove: customIds.course.remove,
    clear: customIds.course.clear,
    'add-teams': 'add-team-select',
    'remove-teams': 'remove-team-select',
    'add-students': customIds.students.selectCourse,
  };

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customIdMap[action] || `${action}-course`)
      .setPlaceholder('Select a course')
      .setOptions(
        courses.map((course) => ({
          label: course.title,
          description: course.instructors?.length
            ? `Instructed by ${course.instructors.join(', ')}`
            : course.shortTitle,
          value: course.id.toString(),
        }))
      )
  );
};

/**
 * Creates a team selector dropdown
 * @param {"join" | "leave"} action
 * @param {CourseTeam[]} courseTeamsWithCourse - Teams with Course included
 */
const courseTeamSelectorActionRowFactory = (action, courseTeamsWithCourse) => {
  const customIdMap = {
    join: customIds.team.join,
    leave: customIds.team.leave,
  };

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customIdMap[action] || `${action}-team`)
      .setPlaceholder(`Select a team to ${action}`)
      .setOptions(
        courseTeamsWithCourse.map((courseTeam) => ({
          label: courseTeam.title,
          description: courseTeam.Course?.title || 'Unknown course',
          value: courseTeam.id.toString(),
        }))
      )
  );
};

/**
 * Creates a multi-select dropdown for removing teams from a course
 * @param {string} courseId - The course ID
 * @param {CourseTeam[]} teams - Teams in the course
 */
const removeTeamsSelectorActionRowFactory = (courseId, teams) =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customIds.team.remove(courseId))
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
 * Creates a channel selector dropdown
 * @param {Discord.Guild} guild - The Discord guild
 * @param {"remove" | "clear"} action - Action to perform
 * @param {string} [filterPattern] - Optional pattern to filter channels
 */
const channelSelectorActionRowFactory = (
  guild,
  action,
  filterPattern = null
) => {
  let channels = Array.from(guild.channels.cache.values()).filter(
    (c) => c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice
  );

  if (filterPattern) {
    const regex = new RegExp(filterPattern.replace(/\*/g, '.*'), 'i');
    channels = channels.filter((c) => regex.test(c.name));
  }

  // Limit to 25 options (Discord limit)
  channels = channels.slice(0, 25);

  const customIdMap = {
    remove: customIds.channel.remove,
    clear: customIds.channel.clear,
  };

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customIdMap[action] || `${action}-channel`)
      .setPlaceholder(`Select a channel to ${action}`)
      .setOptions(
        channels.map((channel) => ({
          label: channel.name,
          description: channel.parent?.name || 'No category',
          value: channel.id,
        }))
      )
  );
};

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

/**
 * Clears a course by removing all students, clearing channel messages,
 * and optionally removing teams
 * @param {Discord.Guild} guild
 * @param {Course} course
 * @param {Object} options
 * @param {boolean} options.removeStudents - Remove all students from course
 * @param {boolean} options.clearMessages - Clear messages in course channels
 * @param {boolean} options.removeTeams - Remove all teams from course
 * @returns {Promise<{studentsRemoved: number, messagesCleared: number, teamsRemoved: number}>}
 */
async function clearCourse(guild, course, options = {}) {
  const {
    removeStudents = true,
    clearMessages = true,
    removeTeams: shouldRemoveTeams = false,
  } = options;
  const results = { studentsRemoved: 0, messagesCleared: 0, teamsRemoved: 0 };

  // Get course teams
  const courseTeams = await CourseTeam.findAll({
    where: { CourseId: course.id },
  });

  // Remove students from course (remove course role from all members)
  if (removeStudents && course.discordRoleId) {
    const role = guild.roles.cache.get(course.discordRoleId);
    if (role) {
      const { members } = role;
      // Remove role from each member sequentially to avoid rate limits
      const memberArray = Array.from(members.values());
      await memberArray.reduce(async (promise, member) => {
        await promise;
        try {
          // Also remove team roles
          const teamRoleIds = courseTeams
            .map((t) => t.discordRoleId)
            .filter((id) => id && member.roles.cache.has(id));
          if (teamRoleIds.length > 0) {
            await member.roles.remove(teamRoleIds);
          }
          // Remove course role
          await member.roles.remove(course.discordRoleId);
          results.studentsRemoved += 1;
        } catch (error) {
          logger.warn(
            `Failed to remove role from ${member.user.tag}: ${error.message}`
          );
        }
      }, Promise.resolve());
    }
  }

  // Clear messages in course channels
  if (clearMessages && course.discordCategoryId) {
    const category = guild.channels.cache.get(course.discordCategoryId);
    if (category) {
      const textChannels = guild.channels.cache.filter(
        (channel) =>
          channel.parentId === course.discordCategoryId &&
          channel.type === ChannelType.GuildText
      );

      // Clone and recreate each text channel to clear messages
      const channelArray = Array.from(textChannels.values());
      await channelArray.reduce(async (promise, channel) => {
        await promise;
        try {
          // Store channel properties
          const {
            name,
            topic,
            position,
            permissionOverwrites,
            rateLimitPerUser,
          } = channel;

          // Delete the channel
          await channel.delete('Course clear - recreating channel');

          // Recreate with same properties
          await guild.channels.create({
            name,
            type: ChannelType.GuildText,
            topic,
            parent: course.discordCategoryId,
            position,
            permissionOverwrites: Array.from(
              permissionOverwrites.cache.values()
            ),
            rateLimitPerUser,
          });

          results.messagesCleared += 1;
        } catch (error) {
          logger.warn(
            `Failed to clear channel ${channel.name}: ${error.message}`
          );
        }
      }, Promise.resolve());
    }
  }

  // Remove teams if requested
  if (shouldRemoveTeams && courseTeams.length > 0) {
    await removeTeams(guild, courseTeams);
    results.teamsRemoved = courseTeams.length;
  }

  return results;
}

/**
 * Clears a channel by cloning it and deleting the original
 * @param {Discord.TextChannel} channel - The channel to clear
 * @returns {Promise<Discord.TextChannel>} The new channel
 */
async function clearChannel(channel) {
  const {
    name,
    topic,
    position,
    permissionOverwrites,
    rateLimitPerUser,
    parent,
    nsfw,
  } = channel;

  // Clone the channel
  const newChannel = await channel.guild.channels.create({
    name,
    type: ChannelType.GuildText,
    topic,
    parent: parent?.id,
    position,
    permissionOverwrites: Array.from(permissionOverwrites.cache.values()),
    rateLimitPerUser,
    nsfw,
  });

  // Delete the original
  await channel.delete('Channel cleared by bot');

  logger.info(`Cleared channel: ${name}`);
  return newChannel;
}

/**
 * Switches a member from one team to another (atomic operation)
 * @param {Discord.GuildMember} member - The member switching teams
 * @param {CourseTeam} fromTeam - Team to leave
 * @param {CourseTeam} toTeam - Team to join
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function switchTeam(member, fromTeam, toTeam) {
  // Validate same course
  if (fromTeam.CourseId !== toTeam.CourseId) {
    return { success: false, error: 'Teams must be in the same course' };
  }

  // Check member has the from team role
  if (!member.roles.cache.has(fromTeam.discordRoleId)) {
    return { success: false, error: `You are not in ${fromTeam.title}` };
  }

  // Check member doesn't already have the to team role
  if (member.roles.cache.has(toTeam.discordRoleId)) {
    return { success: false, error: `You are already in ${toTeam.title}` };
  }

  try {
    // Add new role first (so if it fails, we don't remove the old one)
    await member.roles.add(toTeam.discordRoleId);

    // Send welcome to new team
    try {
      const toChannel = member.guild.channels.cache.get(
        toTeam.discordTextChannelId
      );
      if (toChannel) {
        await toChannel.send(
          `👋 Welcome ${member}! (switched from ${fromTeam.title})`
        );
      }
    } catch (error) {
      logger.warn(`Failed to send welcome message: ${error.message}`);
    }

    // Remove old role
    await member.roles.remove(fromTeam.discordRoleId);

    // Send goodbye to old team
    try {
      const fromChannel = member.guild.channels.cache.get(
        fromTeam.discordTextChannelId
      );
      if (fromChannel) {
        await fromChannel.send(`👋 ${member} has switched to ${toTeam.title}`);
      }
    } catch (error) {
      logger.warn(`Failed to send goodbye message: ${error.message}`);
    }

    logger.info(
      `${member.user.tag} switched from ${fromTeam.title} to ${toTeam.title}`
    );
    return { success: true };
  } catch (error) {
    logger.error(`Failed to switch teams: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = {
  // Course operations
  removeCourse,
  clearCourse,
  // Team operations
  createTeamsForCourse,
  removeTeams,
  switchTeam,
  generateSequentialTeamNames,
  // Member operations
  addMemberToCourse,
  removeMemberFromCourse,
  addMemberToCourseTeam,
  removeMemberFromCourseTeam,
  toggleMemberRole,
  // Channel operations
  findCourseGeneralChannel,
  clearChannel,
  // Lookup helpers
  findMemberByIdentifier,
  getMembersWithRole,
  // UI Factories
  addCourseModalFactory,
  addTeamsModalFactory,
  courseSelectorActionRowFactory,
  courseTeamSelectorActionRowFactory,
  removeTeamsSelectorActionRowFactory,
  channelSelectorActionRowFactory,
  // Rollback
  withRollback,
};
