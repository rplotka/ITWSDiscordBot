const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const logger = require('../core/logging');

/**
 * Detailed command documentation
 * Each entry provides usage examples and detailed descriptions
 */
const commandDocs = {
  add: {
    description:
      'Create and manage courses, teams, channels, and bulk import students',
    category: 'Moderator',
    subcommands: {
      course: {
        description: 'Create a new course with roles and channels',
        usage: '/add course [name] [short] [instructor] [teams]',
        examples: [
          '/add course',
          '/add course name:"Web Science" short:"ITWS-4500" instructor:@professor teams:5',
        ],
        details:
          'Opens a modal to create a new course. Optionally pre-fill values with parameters. Creates a course role, instructor role, category, and default channels (general, announcements).',
      },
      team: {
        description: 'Add teams to an existing course',
        usage: '/add team [course] [count]',
        examples: ['/add team', '/add team course:"ITWS-4500" count:3'],
        details:
          'Creates numbered teams (Team-01, Team-02, etc.) for a course. Each team gets a role, text channel, and voice channel. If course/count not specified, shows a selector.',
      },
      channel: {
        description: 'Create a standalone text or voice channel',
        usage: '/add channel <name> [type] [category]',
        examples: [
          '/add channel name:"project-discussion"',
          '/add channel name:"Study Room" type:voice category:"Study Spaces"',
        ],
        details:
          'Creates a new channel. Type defaults to text. Optionally place it under an existing category.',
      },
      students: {
        description: 'Bulk import students from a CSV file',
        usage: '/add students <file> [course] [team]',
        examples: [
          '/add students file:roster.csv',
          '/add students file:roster.csv course:"ITWS-4500" team:"Team-01"',
        ],
        details:
          'Import students from CSV with columns: discord_username (or discord_id), and optionally team. Assigns course role and optionally team assignments.',
      },
    },
  },
  clear: {
    description: 'Remove students from courses or delete channel messages',
    category: 'Moderator',
    subcommands: {
      course: {
        description: 'Remove all students from a course',
        usage: '/clear course [course]',
        examples: ['/clear course', '/clear course course:"ITWS-4500"'],
        details:
          'Removes the course role from all members. Also removes any team roles for that course. Shows a confirmation before proceeding.',
      },
      channel: {
        description: 'Delete messages from a channel',
        usage: '/clear channel [count]',
        examples: ['/clear channel', '/clear channel count:50'],
        details:
          'Deletes messages from the current channel. Count defaults to 100. Discord limits bulk deletion to messages less than 14 days old.',
      },
    },
  },
  join: {
    description: 'Join courses and course teams',
    category: 'User',
    subcommands: {
      course: {
        description: 'Join an available course',
        usage: '/join course [course]',
        examples: ['/join course', '/join course course:"ITWS-4500"'],
        details:
          'Shows a list of courses you can join. Only public courses are shown. Joining a course gives you access to its private channels.',
      },
      team: {
        description: 'Join a team within a course you are enrolled in',
        usage: '/join team [course] [team]',
        examples: [
          '/join team',
          '/join team course:"ITWS-4500"',
          '/join team course:"ITWS-4500" team:"Team-01"',
        ],
        details:
          'Join a team in a course. You must be enrolled in the course first. If already on a team, you can switch to a different team in the same course.',
      },
    },
  },
  leave: {
    description: 'Leave courses and course teams',
    category: 'User',
    subcommands: {
      course: {
        description: 'Leave a course you are enrolled in',
        usage: '/leave course [course]',
        examples: ['/leave course', '/leave course course:"ITWS-4500"'],
        details:
          'Shows a list of courses you are enrolled in. Leaving a course also removes you from any teams in that course.',
      },
      team: {
        description: 'Leave your current team in a course',
        usage: '/leave team [course]',
        examples: ['/leave team', '/leave team course:"ITWS-4500"'],
        details:
          'Leave your team in a course while staying enrolled in the course. Shows teams you are currently a member of.',
      },
    },
  },
  list: {
    description: 'Search and list courses or channels',
    category: 'Moderator',
    subcommands: {
      course: {
        description: 'Search for courses and view details',
        usage: '/list course [search]',
        examples: [
          '/list course',
          '/list course search:"web"',
          '/list course search:"ITWS"',
        ],
        details:
          'Search courses by name or course number. Shows course details including enrolled students, teams, and linked Discord roles/channels.',
      },
      channel: {
        description: 'List channels matching a pattern',
        usage: '/list channel [pattern]',
        examples: [
          '/list channel',
          '/list channel pattern:"itws*"',
          '/list channel pattern:"*voice*"',
        ],
        details:
          'List channels matching a wildcard pattern. Use * as wildcard. Groups results by channel type (categories, text, voice).',
      },
    },
  },
  remove: {
    description: 'Delete courses, teams, or channels',
    category: 'Moderator',
    subcommands: {
      course: {
        description: 'Delete a course and all its resources',
        usage: '/remove course [course]',
        examples: ['/remove course', '/remove course course:"ITWS-4500"'],
        details:
          'Permanently deletes a course including its roles, category, channels, and all teams. Requires confirmation. This action cannot be undone.',
      },
      team: {
        description: 'Delete teams from a course',
        usage: '/remove team [course]',
        examples: ['/remove team', '/remove team course:"ITWS-4500"'],
        details:
          'Select and delete specific teams from a course. Removes the team role, text channel, and voice channel.',
      },
      channel: {
        description: 'Delete a channel',
        usage: '/remove channel [channel]',
        examples: ['/remove channel', '/remove channel channel:#old-channel'],
        details:
          'Delete a specific channel. Cannot delete categories that still contain channels.',
      },
    },
  },
  sync: {
    description: 'Sync course data from external sources',
    category: 'Moderator',
    subcommands: {
      course: {
        description: 'Sync a course roster from SIS or external file',
        usage: '/sync course <course>',
        examples: ['/sync course course:"ITWS-4500"'],
        details:
          'Synchronize course enrollment from an external source. Updates team assignments and removes students no longer on the roster.',
      },
    },
  },
  help: {
    description: 'Get help with bot commands',
    category: 'Info',
    usage: '/help [command]',
    examples: ['/help', '/help add', '/help join'],
    details:
      'Without arguments, lists all available commands. With a command name, shows detailed usage information for that command.',
  },
  test: {
    description: 'Test bot functionality (development)',
    category: 'Other',
    usage: '/test <type>',
    examples: ['/test role-button'],
    details: 'Development command for testing bot features.',
  },
};

/**
 * Build the command list embed (when no command specified)
 */
function buildCommandListEmbed() {
  const categories = {
    Moderator: [],
    User: [],
    Info: [],
    Other: [],
  };

  // Organize commands by category
  Object.entries(commandDocs).forEach(([cmdName, doc]) => {
    const category = doc.category || 'Other';
    if (!categories[category]) categories[category] = [];

    if (doc.subcommands) {
      Object.keys(doc.subcommands).forEach((sub) => {
        categories[category].push(`\`/${cmdName} ${sub}\``);
      });
    } else {
      categories[category].push(`\`/${cmdName}\``);
    }
  });

  const sections = [];

  if (categories.Moderator.length > 0) {
    sections.push(`**Moderator Commands**\n${categories.Moderator.join(', ')}`);
  }
  if (categories.User.length > 0) {
    sections.push(`**User Commands**\n${categories.User.join(', ')}`);
  }
  if (categories.Info.length > 0) {
    sections.push(`**Info**\n${categories.Info.join(', ')}`);
  }
  if (categories.Other.length > 0) {
    sections.push(`**Other**\n${categories.Other.join(', ')}`);
  }

  return new EmbedBuilder()
    .setTitle('ITWS Discord Bot Commands')
    .setDescription(
      `${sections.join(
        '\n\n'
      )}\n\n*Use \`/help <command>\` for detailed info on a specific command.*`
    )
    .setColor(0x5865f2)
    .setFooter({ text: 'ITWS Discord Bot' });
}

/**
 * Build detailed help embed for a specific command
 */
function buildCommandDetailEmbed(commandName) {
  const doc = commandDocs[commandName];
  if (!doc) return null;

  const embed = new EmbedBuilder()
    .setTitle(`/${commandName}`)
    .setDescription(doc.description)
    .setColor(0x5865f2)
    .setFooter({ text: `Category: ${doc.category}` });

  if (doc.subcommands) {
    // Command with subcommands
    Object.entries(doc.subcommands).forEach(([subName, subDoc]) => {
      const fieldValue = [
        `${subDoc.description}`,
        '',
        `**Usage:** \`${subDoc.usage}\``,
        '',
        `**Examples:**`,
        ...subDoc.examples.map((ex) => `\`${ex}\``),
        '',
        subDoc.details,
      ].join('\n');

      embed.addFields({
        name: `/${commandName} ${subName}`,
        value:
          fieldValue.length > 1024
            ? `${fieldValue.substring(0, 1021)}...`
            : fieldValue,
      });
    });
  } else {
    // Simple command
    const fieldValue = [
      `**Usage:** \`${doc.usage}\``,
      '',
      `**Examples:**`,
      ...doc.examples.map((ex) => `\`${ex}\``),
      '',
      doc.details,
    ].join('\n');

    embed.addFields({
      name: 'Usage',
      value:
        fieldValue.length > 1024
          ? `${fieldValue.substring(0, 1021)}...`
          : fieldValue,
    });
  }

  return embed;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help with bot commands')
    .addStringOption((option) =>
      option
        .setName('command')
        .setDescription('Command to get help for (e.g., add, join, clear)')
        .setRequired(false)
        .setAutocomplete(true)
    ),
  /**
   * @param {import('discord.js').CommandInteraction} interaction
   */
  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const commandName = interaction.options.getString('command');

      let embed;
      if (commandName) {
        // Show detailed help for specific command
        embed = buildCommandDetailEmbed(commandName);
        if (!embed) {
          await interaction.editReply({
            content: `❌ Unknown command: \`${commandName}\`. Use \`/help\` to see all commands.`,
          });
          return;
        }
        logger.info(`${interaction.user.tag} used /help ${commandName}`);
      } else {
        // Show command list
        embed = buildCommandListEmbed();
        logger.info(`${interaction.user.tag} used /help`);
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error('Error in help command:', error);
      try {
        const content = `❌ Error: ${error.message}`;
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content });
        } else {
          await interaction.reply({ content, ephemeral: true });
        }
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};
