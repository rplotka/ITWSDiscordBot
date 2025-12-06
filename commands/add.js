const { SlashCommandBuilder, ChannelType } = require('discord.js');
const {
  addCourseModalFactory,
  addTeamsModalFactory,
  courseSelectorActionRowFactory,
  generateSequentialTeamNames,
  createTeamsForCourse,
  findMemberByIdentifier,
} = require('../core/utils');
const { Course, CourseTeam } = require('../core/db');
const logger = require('../core/logging');
const { parseFile } = require('../core/fileParser');

/**
 * Handle /add course command
 */
async function handleAddCourse(interaction) {
  const name = interaction.options.getString('name');
  const short = interaction.options.getString('short');
  const instructor = interaction.options.getString('instructor');
  const teams = interaction.options.getInteger('teams');

  // If all required params provided, we could process directly
  // But since we need to create roles/channels, always show modal for confirmation
  // Pre-fill with any provided values
  const prefill = {};
  if (name) prefill.name = name;
  if (short) prefill.short = short;
  if (instructor) {
    // If instructor is a Discord ID (from autocomplete), resolve to username
    const member = interaction.guild.members.cache.get(instructor);
    prefill.instructor = member
      ? member.nickname || member.user.username
      : instructor;
  }
  if (teams !== null) prefill.teams = teams;

  try {
    await interaction.showModal(addCourseModalFactory(prefill));
    logger.info('Add course modal shown');
  } catch (error) {
    logger.error('Error showing add course modal:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
  }
}

/**
 * Handle /add team command
 */
async function handleAddTeam(interaction) {
  const courseId = interaction.options.getString('course');
  const count = interaction.options.getInteger('count');

  if (!Course) {
    await interaction.reply({
      content: '❌ Database is not available. Please contact a Moderator!',
      ephemeral: true,
    });
    return;
  }

  // If both course and count provided, create teams directly
  if (courseId && count) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const course = await Course.findByPk(courseId);
      if (!course) {
        await interaction.editReply({ content: '❌ Course not found.' });
        return;
      }

      // Get existing team count
      const existingTeams = await CourseTeam.findAll({
        where: { CourseId: course.id },
      });
      const startFrom = existingTeams.length + 1;

      // Generate team names
      const teamNames = generateSequentialTeamNames(
        course.shortTitle,
        count,
        startFrom
      );

      await interaction.editReply({
        content: `⏳ Creating ${count} team(s) for **${course.title}**...`,
      });

      // Create teams
      const createdTeams = await createTeamsForCourse(
        interaction.guild,
        course,
        teamNames
      );

      const teamList = createdTeams.map((t) => `• ${t.title}`).join('\n');
      await interaction.editReply({
        content:
          `✅ **Created ${createdTeams.length} team(s) for ${course.title}!**\n\n` +
          `${teamList}\n\n` +
          `Students can join teams using \`/join team\`.`,
      });

      logger.info(`Created ${createdTeams.length} teams for ${course.title}`);
    } catch (error) {
      logger.error('Error creating teams:', error);
      await interaction.editReply({
        content: `❌ Error: ${error.message}`,
      });
    }
    return;
  }

  // If only course provided, show modal for count
  if (courseId) {
    try {
      const course = await Course.findByPk(courseId);
      if (!course) {
        await interaction.reply({
          content: '❌ Course not found.',
          ephemeral: true,
        });
        return;
      }

      const existingTeams = await CourseTeam.findAll({
        where: { CourseId: course.id },
      });

      await interaction.showModal(
        addTeamsModalFactory(courseId, course.title, existingTeams.length)
      );
    } catch (error) {
      logger.error('Error showing add teams modal:', error);
      await interaction.reply({
        content: `❌ Error: ${error.message}`,
        ephemeral: true,
      });
    }
    return;
  }

  // No params - show course selector
  await interaction.deferReply({ ephemeral: true });

  try {
    const courses = await Course.findAll();

    if (courses.length === 0) {
      await interaction.editReply({
        content:
          'ℹ️ No courses available. Create a course first with `/add course`.',
      });
      return;
    }

    const row = courseSelectorActionRowFactory('add-teams', courses);
    await interaction.editReply({
      content: '❔ Choose a course to **add teams** to:',
      components: [row],
    });
  } catch (error) {
    logger.error('Error in /add team command:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}. Please contact a Moderator!`,
    });
  }
}

/**
 * Handle /add channel command
 */
async function handleAddChannel(interaction) {
  const name = interaction.options.getString('name');
  const type = interaction.options.getString('type') || 'text';
  const categoryId = interaction.options.getString('category');

  await interaction.deferReply({ ephemeral: true });

  try {
    const channelType =
      type === 'voice' ? ChannelType.GuildVoice : ChannelType.GuildText;

    const channelOptions = {
      name,
      type: channelType,
    };

    if (categoryId) {
      const category = interaction.guild.channels.cache.get(categoryId);
      if (category && category.type === ChannelType.GuildCategory) {
        channelOptions.parent = categoryId;
      }
    }

    const channel = await interaction.guild.channels.create(channelOptions);

    await interaction.editReply({
      content: `✅ Created ${type} channel: ${channel}`,
    });

    logger.info(`Created channel: ${channel.name}`);
  } catch (error) {
    logger.error('Error creating channel:', error);
    await interaction.editReply({
      content: `❌ Error creating channel: ${error.message}`,
    });
  }
}

/**
 * Handle /add students command (bulk import from CSV/XLSX)
 * Supports: SIS class lists, LMS group members, generic CSV
 */
async function handleAddStudents(interaction) {
  const courseId = interaction.options.getString('course');
  const file = interaction.options.getAttachment('file');

  await interaction.deferReply({ ephemeral: true });

  try {
    // Validate file extension
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const hasValidExtension = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      await interaction.editReply({
        content: '❌ Please upload a CSV or Excel (.xlsx) file.',
      });
      return;
    }

    await interaction.editReply({
      content: `⏳ Analyzing file: **${file.name}**...`,
    });

    // Fetch file content
    const response = await fetch(file.url);
    const fileBuffer = await response.arrayBuffer();
    const content = Buffer.from(fileBuffer);

    // Parse the file
    const parsed = await parseFile(file.name, content);

    // Build preview based on file type
    let preview = '';
    let courseCode = null;
    let students = [];
    let groups = [];
    let needsCourse = false;

    switch (parsed.type) {
      case 'sis_classlist': {
        const { courseInfo, students: sisStudents } = parsed.data;
        courseCode = courseInfo.courseCode;
        students = sisStudents.map((s) => ({
          identifier: s.studentId,
          name: s.fullName,
          firstName: s.firstName,
          lastName: s.lastName,
        }));

        preview = `**📄 SIS Class List Detected**\n\n`;
        preview += `**Course:** ${courseInfo.fullTitle || 'Unknown'}\n`;
        preview += `**Code:** ${courseInfo.courseCode || 'Unknown'}\n`;
        preview += `**Term:** ${courseInfo.termDisplay || 'Unknown'}\n`;
        preview += `**CRN:** ${courseInfo.crn || 'Unknown'}\n`;
        preview += `**Students:** ${students.length}\n`;
        break;
      }

      case 'lms_groupmembers': {
        courseCode = parsed.metadata.courseCode;
        const { students: lmsStudents } = parsed.data;

        // Group students by their group code
        const groupCounts = {};
        lmsStudents.forEach((s) => {
          groupCounts[s.groupCode] = (groupCounts[s.groupCode] || 0) + 1;
        });

        students = lmsStudents.map((s) => ({
          identifier: s.rcsId,
          name: s.fullName,
          firstName: s.firstName,
          lastName: s.lastName,
          groupCode: s.groupCode,
          studentId: s.studentId,
        }));

        preview = `**📄 LMS Group Members Detected**\n\n`;
        preview += `**Course:** ${parsed.metadata.courseCode}\n`;
        preview += `**Term:** ${parsed.metadata.term?.display || 'Unknown'}\n`;
        preview += `**Section:** ${parsed.metadata.section}\n`;
        preview += `**Students:** ${students.length}\n`;
        preview += `**Groups:** ${Object.keys(groupCounts).length}\n`;
        break;
      }

      case 'lms_groups': {
        courseCode = parsed.metadata.courseCode;
        groups = parsed.data.groups;

        preview = `**📄 LMS Groups File Detected**\n\n`;
        preview += `**Course:** ${parsed.metadata.courseCode}\n`;
        preview += `**Term:** ${parsed.metadata.term?.display || 'Unknown'}\n`;
        preview += `**Groups:** ${groups.length}\n\n`;
        preview += `⚠️ This file only contains group definitions, not student data.\n`;
        preview += `Upload a **groupmembers.csv** file to import students with team assignments.`;

        await interaction.editReply({ content: preview });
        return;
      }

      case 'generic_csv': {
        const { students: csvStudents, detectedColumns } = parsed.data;
        students = csvStudents.map((s) => ({
          identifier: s.rcsId || s.email || s.discordUsername || s.studentId,
          name: s.fullName,
          firstName: s.firstName,
          lastName: s.lastName,
          team: s.team,
        }));

        preview = `**📄 Generic CSV Detected**\n\n`;
        preview += `**Students:** ${students.length}\n`;
        preview += `**Detected columns:**\n`;
        if (detectedColumns.username >= 0) preview += `• Username/RCS ID\n`;
        if (detectedColumns.email >= 0) preview += `• Email\n`;
        if (detectedColumns.firstName >= 0) preview += `• First Name\n`;
        if (detectedColumns.lastName >= 0) preview += `• Last Name\n`;
        if (detectedColumns.team >= 0) preview += `• Team/Group\n`;
        if (detectedColumns.discordUsername >= 0)
          preview += `• Discord Username\n`;
        break;
      }

      default:
        await interaction.editReply({
          content: `❌ Could not parse file: ${file.name}\n\nSupported formats:\n• SIS class list (XXXXXX_CRN_classlist.xlsx)\n• LMS group members (timestamp_term_DEPT_XXXX_XX_groupmembers.csv)\n• Generic CSV with headers`,
        });
        return;
    }

    // Check if we have a course to work with
    let course = null;
    if (courseId) {
      course = await Course.findByPk(courseId);
    } else if (courseCode && Course) {
      // Try to find course by code
      const courses = await Course.findAll();
      course = courses.find(
        (c) =>
          c.shortTitle === courseCode ||
          c.title.includes(courseCode) ||
          c.shortTitle?.toUpperCase() === courseCode?.toUpperCase()
      );
    }

    if (!course) {
      needsCourse = true;
      preview += `\n⚠️ **No matching course found in database.**\n`;
      if (courseCode) {
        preview += `Looking for: ${courseCode}\n`;
      }
      preview += `Please select a course to import students to.`;
    } else {
      preview += `\n✅ **Matched to course:** ${course.title} (${course.shortTitle})\n`;
    }

    if (needsCourse && !courseId) {
      // Need to select a course first
      const courses = Course ? await Course.findAll() : [];
      if (courses.length === 0) {
        preview += `\n❌ No courses exist. Create a course first with \`/add course\`.`;
        await interaction.editReply({ content: preview });
        return;
      }

      const row = courseSelectorActionRowFactory(
        'add-students-select',
        courses
      );

      // Store parsed data in a temporary way for the button handler
      // We'll use interaction.message editing to pass data
      preview += `\n\n**Select a course to import ${students.length} students:**`;

      await interaction.editReply({
        content: preview,
        components: [row],
      });
      return;
    }

    // We have a course - proceed with import preview
    await interaction.editReply({
      content: `${preview}\n\n⏳ Checking Discord members...`,
    });

    // Check which students are in Discord
    await interaction.guild.members.fetch();

    // Find members for each student
    const memberPromises = students.map(async (student) => {
      const member = await findMemberByIdentifier(
        interaction.guild,
        student.identifier
      );
      return { student, member };
    });

    const memberResults = await Promise.all(memberPromises);

    const results = {
      found: [],
      notFound: [],
      alreadyEnrolled: [],
    };

    memberResults.forEach(({ student, member }) => {
      if (!member) {
        results.notFound.push(student);
      } else if (course && member.roles.cache.has(course.discordRoleId)) {
        results.alreadyEnrolled.push({ ...student, member });
      } else {
        results.found.push({ ...student, member });
      }
    });

    // Build final preview
    let finalPreview = `${preview}\n\n**📊 Import Preview:**\n`;
    finalPreview += `• Ready to add: ${results.found.length}\n`;
    finalPreview += `• Already enrolled: ${results.alreadyEnrolled.length}\n`;
    finalPreview += `• Not in Discord: ${results.notFound.length}\n`;

    if (results.notFound.length > 0 && results.notFound.length <= 10) {
      finalPreview += `\n**Not found:**\n`;
      results.notFound.forEach((s) => {
        finalPreview += `• ${s.name || s.identifier}\n`;
      });
    } else if (results.notFound.length > 10) {
      finalPreview += `\n**Not found (first 10):**\n`;
      results.notFound.slice(0, 10).forEach((s) => {
        finalPreview += `• ${s.name || s.identifier}\n`;
      });
      finalPreview += `• ... and ${results.notFound.length - 10} more\n`;
    }

    if (results.found.length === 0) {
      finalPreview += `\n⚠️ No students to import (all already enrolled or not in Discord).`;
      await interaction.editReply({ content: finalPreview });
      return;
    }

    // Proceed with import
    finalPreview += `\n⏳ **Importing ${results.found.length} students...**`;
    await interaction.editReply({ content: finalPreview });

    // Add roles to all found students in parallel batches
    const addRoleResults = await Promise.all(
      results.found.map(async (student) => {
        try {
          await student.member.roles.add(course.discordRoleId);
          return { success: true, student };
        } catch (err) {
          return { success: false, student, error: err.message };
        }
      })
    );

    const added = addRoleResults.filter((r) => r.success).length;
    const errors = addRoleResults
      .filter((r) => !r.success)
      .map((r) => `${r.student.name || r.student.identifier}: ${r.error}`);

    // Final report
    let report = `✅ **Import Complete for ${course.title}**\n\n`;
    report += `**File:** ${file.name}\n`;
    report += `**File type:** ${parsed.type.replace(/_/g, ' ')}\n\n`;
    report += `**Results:**\n`;
    report += `• Added to course: ${added}\n`;
    report += `• Already enrolled: ${results.alreadyEnrolled.length}\n`;
    report += `• Not in Discord: ${results.notFound.length}\n`;

    if (errors.length > 0) {
      report += `• Errors: ${errors.length}\n`;
    }

    await interaction.editReply({ content: report });

    logger.info(
      `Student import: ${added} added to ${course.title} from ${file.name}`
    );
  } catch (error) {
    logger.error('Error in student import:', error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}`,
    });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription(
      'Add courses, teams, channels, or students (Moderator only)'
    )
    // /add course [name] [short] [instructor] [teams]
    .addSubcommand((subcommand) =>
      subcommand
        .setName('course')
        .setDescription('Add a new course with roles and channels')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Full course name')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('short')
            .setDescription('Short name for channels (e.g., intro, capstone)')
            .setRequired(false)
        )
        .addStringOption((option) =>
          option
            .setName('instructor')
            .setDescription('Instructor username/nickname')
            .setAutocomplete(true)
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName('teams')
            .setDescription('Number of teams to create (0 for none)')
            .setMinValue(0)
            .setMaxValue(99)
            .setRequired(false)
        )
    )
    // /add team [course] [count]
    .addSubcommand((subcommand) =>
      subcommand
        .setName('team')
        .setDescription('Add team(s) to an existing course')
        .addStringOption((option) =>
          option
            .setName('course')
            .setDescription('Course to add teams to')
            .setAutocomplete(true)
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName('count')
            .setDescription('Number of teams to create')
            .setMinValue(1)
            .setMaxValue(99)
            .setRequired(false)
        )
    )
    // /add channel [name] [type] [category]
    .addSubcommand((subcommand) =>
      subcommand
        .setName('channel')
        .setDescription('Add a standalone channel')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Channel name')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Channel type')
            .setRequired(false)
            .addChoices(
              { name: 'Text', value: 'text' },
              { name: 'Voice', value: 'voice' }
            )
        )
        .addStringOption((option) =>
          option
            .setName('category')
            .setDescription('Parent category')
            .setAutocomplete(true)
            .setRequired(false)
        )
    )
    // /add students <file> [course] - Smart import from CSV/XLSX
    .addSubcommand((subcommand) =>
      subcommand
        .setName('students')
        .setDescription('Import students from SIS/LMS files (CSV or XLSX)')
        .addAttachmentOption((option) =>
          option
            .setName('file')
            .setDescription('SIS class list (.xlsx) or LMS export (.csv)')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('course')
            .setDescription(
              'Course to add students to (auto-detected from file if possible)'
            )
            .setAutocomplete(true)
            .setRequired(false)
        )
    ),
  isModeratorOnly: true,

  /**
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    logger.info(`/add ${subcommand}: ${interaction.user.tag}`);

    if (subcommand === 'course') {
      await handleAddCourse(interaction);
    } else if (subcommand === 'team') {
      await handleAddTeam(interaction);
    } else if (subcommand === 'channel') {
      await handleAddChannel(interaction);
    } else if (subcommand === 'students') {
      await handleAddStudents(interaction);
    }
  },
};
