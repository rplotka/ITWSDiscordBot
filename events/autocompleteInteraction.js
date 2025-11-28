const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');
const { getMembersWithRole } = require('../core/utils');

/**
 * Handle course autocomplete
 */
async function handleCourseAutocomplete(interaction, query) {
  if (!Course) {
    await interaction.respond([]);
    return;
  }

  const courses = await Course.findAll();
  const filtered = courses
    .filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.shortTitle.toLowerCase().includes(query)
    )
    .slice(0, 25);

  await interaction.respond(
    filtered.map((c) => ({
      name: `${c.title} (${c.shortTitle})`,
      value: c.id.toString(),
    }))
  );
}

/**
 * Handle team autocomplete
 * For 'team' - shows teams user can join
 * For 'from' - shows teams user is currently in
 */
async function handleTeamAutocomplete(interaction, query, fieldName) {
  if (!CourseTeam || !Course) {
    await interaction.respond([]);
    return;
  }

  let teams;

  if (fieldName === 'from') {
    // Show teams the user is currently in
    const memberRoleIds = Array.from(interaction.member.roles.cache.keys());
    teams = await CourseTeam.findAll({
      where: {
        discordRoleId: memberRoleIds,
      },
      include: [{ model: Course, as: 'Course' }],
    });
  } else {
    // Show all teams (filtered by query)
    teams = await CourseTeam.findAll({
      include: [{ model: Course, as: 'Course' }],
    });
  }

  const filtered = teams
    .filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.Course?.title.toLowerCase().includes(query) ||
        t.Course?.shortTitle.toLowerCase().includes(query)
    )
    .slice(0, 25);

  await interaction.respond(
    filtered.map((t) => ({
      name: `${t.title} (${t.Course?.title || 'Unknown'})`,
      value: t.id.toString(),
    }))
  );
}

/**
 * Handle instructor autocomplete (from Faculty role members)
 */
async function handleInstructorAutocomplete(interaction, query) {
  // Try to get members with Faculty role
  const facultyMembers = getMembersWithRole(interaction.guild, 'Faculty');

  let members;
  if (facultyMembers.size > 0) {
    members = Array.from(facultyMembers.values());
  } else {
    // Fallback: get all members if no Faculty role exists
    try {
      await interaction.guild.members.fetch();
      members = Array.from(interaction.guild.members.cache.values()).slice(
        0,
        100
      );
    } catch (error) {
      logger.warn(`Could not fetch members: ${error.message}`);
      members = [];
    }
  }

  const filtered = members
    .filter(
      (m) =>
        m.user.username.toLowerCase().includes(query) ||
        m.nickname?.toLowerCase().includes(query) ||
        m.user.tag.toLowerCase().includes(query)
    )
    .slice(0, 25);

  await interaction.respond(
    filtered.map((m) => ({
      name: m.nickname || m.user.username,
      value: m.id,
    }))
  );
}

/**
 * Handle channel autocomplete
 */
async function handleChannelAutocomplete(interaction, query) {
  const channels = interaction.guild.channels.cache
    .filter(
      (c) =>
        (c.type === 0 || c.type === 2) && // Text or Voice
        c.name.toLowerCase().includes(query)
    )
    .first(25);

  await interaction.respond(
    Array.from(channels.values()).map((c) => ({
      name: `${c.name} (${c.parent?.name || 'No category'})`,
      value: c.id,
    }))
  );
}

/**
 * Handle category autocomplete
 */
async function handleCategoryAutocomplete(interaction, query) {
  const categories = interaction.guild.channels.cache
    .filter(
      (c) =>
        c.type === 4 && // Category
        c.name.toLowerCase().includes(query)
    )
    .first(25);

  await interaction.respond(
    Array.from(categories.values()).map((c) => ({
      name: c.name,
      value: c.id,
    }))
  );
}

module.exports = {
  name: 'interactionCreate',
  once: false,
  /**
   * Handles autocomplete interactions for all commands
   * @param {import('discord.js').AutocompleteInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.isAutocomplete()) return;

    const focused = interaction.options.getFocused(true);
    const { name: focusedName, value: focusedValue } = focused;
    const query = focusedValue.toLowerCase();

    try {
      // Course autocomplete
      if (focusedName === 'course') {
        await handleCourseAutocomplete(interaction, query);
        return;
      }

      // Team autocomplete
      if (focusedName === 'team' || focusedName === 'from') {
        await handleTeamAutocomplete(interaction, query, focusedName);
        return;
      }

      // Instructor autocomplete (from Faculty role)
      if (focusedName === 'instructor') {
        await handleInstructorAutocomplete(interaction, query);
        return;
      }

      // Channel autocomplete
      if (focusedName === 'channel') {
        await handleChannelAutocomplete(interaction, query);
        return;
      }

      // Category autocomplete
      if (focusedName === 'category') {
        await handleCategoryAutocomplete(interaction, query);
        return;
      }

      // Default: empty response
      await interaction.respond([]);
    } catch (error) {
      logger.error(`Autocomplete error for ${focusedName}: ${error.message}`);
      // Respond with empty array on error
      try {
        await interaction.respond([]);
      } catch (respondError) {
        logger.error(
          `Failed to respond to autocomplete: ${respondError.message}`
        );
      }
    }
  },
};
