/**
 * MSW request handlers for mocking Discord API
 * These intercept HTTP requests to Discord's API and return mock responses
 */
import { http, HttpResponse } from 'msw';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

// Store for dynamic mock data
export const mockStore = {
  guilds: new Map(),
  channels: new Map(),
  roles: new Map(),
  members: new Map(),
  users: new Map(),

  reset() {
    this.guilds.clear();
    this.channels.clear();
    this.roles.clear();
    this.members.clear();
    this.users.clear();
  },

  addGuild(guild) {
    this.guilds.set(guild.id, guild);
  },

  addChannel(channel) {
    this.channels.set(channel.id, channel);
  },

  addRole(guildId, role) {
    if (!this.roles.has(guildId)) {
      this.roles.set(guildId, new Map());
    }
    this.roles.get(guildId).set(role.id, role);
  },

  addMember(guildId, member) {
    if (!this.members.has(guildId)) {
      this.members.set(guildId, new Map());
    }
    this.members.get(guildId).set(member.user.id, member);
  },
};

/**
 * Discord API request handlers
 */
export const handlers = [
  // Get current user (bot)
  http.get(`${DISCORD_API_BASE}/users/@me`, () => {
    return HttpResponse.json({
      id: 'bot-user-id',
      username: 'TestBot',
      discriminator: '0000',
      bot: true,
    });
  }),

  // Get gateway
  http.get(`${DISCORD_API_BASE}/gateway`, () => {
    return HttpResponse.json({
      url: 'wss://gateway.discord.gg',
    });
  }),

  // Get gateway bot
  http.get(`${DISCORD_API_BASE}/gateway/bot`, () => {
    return HttpResponse.json({
      url: 'wss://gateway.discord.gg',
      shards: 1,
      session_start_limit: {
        total: 1000,
        remaining: 999,
        reset_after: 14400000,
        max_concurrency: 1,
      },
    });
  }),

  // Get guild
  http.get(`${DISCORD_API_BASE}/guilds/:guildId`, ({ params }) => {
    const guild = mockStore.guilds.get(params.guildId);
    if (!guild) {
      return HttpResponse.json({ message: 'Unknown Guild' }, { status: 404 });
    }
    return HttpResponse.json(guild);
  }),

  // Get guild channels
  http.get(`${DISCORD_API_BASE}/guilds/:guildId/channels`, ({ params }) => {
    const channels = Array.from(mockStore.channels.values()).filter(
      (c) => c.guild_id === params.guildId
    );
    return HttpResponse.json(channels);
  }),

  // Create guild channel
  http.post(
    `${DISCORD_API_BASE}/guilds/:guildId/channels`,
    async ({ params, request }) => {
      const body = await request.json();
      const channel = {
        id: `channel-${Date.now()}`,
        guild_id: params.guildId,
        name: body.name,
        type: body.type || 0,
        parent_id: body.parent_id || null,
        permission_overwrites: body.permission_overwrites || [],
        ...body,
      };
      mockStore.channels.set(channel.id, channel);
      return HttpResponse.json(channel, { status: 201 });
    }
  ),

  // Delete channel
  http.delete(`${DISCORD_API_BASE}/channels/:channelId`, ({ params }) => {
    const channel = mockStore.channels.get(params.channelId);
    if (!channel) {
      return HttpResponse.json({ message: 'Unknown Channel' }, { status: 404 });
    }
    mockStore.channels.delete(params.channelId);
    return HttpResponse.json(channel);
  }),

  // Get guild roles
  http.get(`${DISCORD_API_BASE}/guilds/:guildId/roles`, ({ params }) => {
    const guildRoles = mockStore.roles.get(params.guildId);
    if (!guildRoles) {
      return HttpResponse.json([]);
    }
    return HttpResponse.json(Array.from(guildRoles.values()));
  }),

  // Create guild role
  http.post(
    `${DISCORD_API_BASE}/guilds/:guildId/roles`,
    async ({ params, request }) => {
      const body = await request.json();
      const role = {
        id: `role-${Date.now()}`,
        name: body.name || 'new role',
        color: body.color || 0,
        hoist: body.hoist || false,
        position: body.position || 0,
        permissions: body.permissions || '0',
        mentionable: body.mentionable || false,
        ...body,
      };
      mockStore.addRole(params.guildId, role);
      return HttpResponse.json(role, { status: 201 });
    }
  ),

  // Delete guild role
  http.delete(
    `${DISCORD_API_BASE}/guilds/:guildId/roles/:roleId`,
    ({ params }) => {
      const guildRoles = mockStore.roles.get(params.guildId);
      if (!guildRoles || !guildRoles.has(params.roleId)) {
        return HttpResponse.json({ message: 'Unknown Role' }, { status: 404 });
      }
      guildRoles.delete(params.roleId);
      return new HttpResponse(null, { status: 204 });
    }
  ),

  // Get guild members
  http.get(
    `${DISCORD_API_BASE}/guilds/:guildId/members`,
    ({ params, request }) => {
      const url = new URL(request.url);
      const limit = parseInt(url.searchParams.get('limit') || '1000', 10);
      const guildMembers = mockStore.members.get(params.guildId);
      if (!guildMembers) {
        return HttpResponse.json([]);
      }
      return HttpResponse.json(
        Array.from(guildMembers.values()).slice(0, limit)
      );
    }
  ),

  // Get guild member
  http.get(
    `${DISCORD_API_BASE}/guilds/:guildId/members/:userId`,
    ({ params }) => {
      const guildMembers = mockStore.members.get(params.guildId);
      if (!guildMembers) {
        return HttpResponse.json(
          { message: 'Unknown Member' },
          { status: 404 }
        );
      }
      const member = guildMembers.get(params.userId);
      if (!member) {
        return HttpResponse.json(
          { message: 'Unknown Member' },
          { status: 404 }
        );
      }
      return HttpResponse.json(member);
    }
  ),

  // Add role to member
  http.put(
    `${DISCORD_API_BASE}/guilds/:guildId/members/:userId/roles/:roleId`,
    ({ params }) => {
      const guildMembers = mockStore.members.get(params.guildId);
      if (guildMembers) {
        const member = guildMembers.get(params.userId);
        if (member && !member.roles.includes(params.roleId)) {
          member.roles.push(params.roleId);
        }
      }
      return new HttpResponse(null, { status: 204 });
    }
  ),

  // Remove role from member
  http.delete(
    `${DISCORD_API_BASE}/guilds/:guildId/members/:userId/roles/:roleId`,
    ({ params }) => {
      const guildMembers = mockStore.members.get(params.guildId);
      if (guildMembers) {
        const member = guildMembers.get(params.userId);
        if (member) {
          member.roles = member.roles.filter((r) => r !== params.roleId);
        }
      }
      return new HttpResponse(null, { status: 204 });
    }
  ),

  // Interaction response
  http.post(
    `${DISCORD_API_BASE}/interactions/:interactionId/:interactionToken/callback`,
    async () => {
      // Just acknowledge the interaction
      return new HttpResponse(null, { status: 204 });
    }
  ),

  // Edit interaction response
  http.patch(
    `${DISCORD_API_BASE}/webhooks/:applicationId/:interactionToken/messages/@original`,
    async () => {
      return HttpResponse.json({ id: 'message-id' });
    }
  ),

  // Send channel message
  http.post(
    `${DISCORD_API_BASE}/channels/:channelId/messages`,
    async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({
        id: `message-${Date.now()}`,
        content: body.content || '',
        embeds: body.embeds || [],
        components: body.components || [],
      });
    }
  ),

  // Bulk delete messages
  http.post(
    `${DISCORD_API_BASE}/channels/:channelId/messages/bulk-delete`,
    async () => {
      return new HttpResponse(null, { status: 204 });
    }
  ),

  // Application commands
  http.get(
    `${DISCORD_API_BASE}/applications/:applicationId/guilds/:guildId/commands`,
    () => {
      return HttpResponse.json([]);
    }
  ),

  http.put(
    `${DISCORD_API_BASE}/applications/:applicationId/guilds/:guildId/commands`,
    async ({ request }) => {
      const commands = await request.json();
      return HttpResponse.json(commands);
    }
  ),
];

/**
 * Helper to set up a test guild with roles, channels, and members
 */
export function setupTestGuild(options = {}) {
  const guildId = options.guildId || 'test-guild';

  const guild = {
    id: guildId,
    name: options.name || 'Test Guild',
    owner_id: options.ownerId || 'owner-id',
    ...options.guild,
  };

  mockStore.addGuild(guild);

  // Add default roles
  const everyoneRole = {
    id: guildId, // @everyone role has same ID as guild
    name: '@everyone',
    position: 0,
  };
  mockStore.addRole(guildId, everyoneRole);

  // Add any additional roles
  if (options.roles) {
    options.roles.forEach((role) => mockStore.addRole(guildId, role));
  }

  // Add channels
  if (options.channels) {
    options.channels.forEach((channel) => {
      mockStore.addChannel({ ...channel, guild_id: guildId });
    });
  }

  // Add members
  if (options.members) {
    options.members.forEach((member) => {
      mockStore.addMember(guildId, member);
    });
  }

  return { guildId, guild };
}
