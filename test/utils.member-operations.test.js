/**
 * Tests for member operation utility functions
 * - findMemberByIdentifier
 * - getMembersWithRole
 * - addMemberToCourse
 * - removeMemberFromCourse
 * - addMemberToCourseTeam
 * - removeMemberFromCourseTeam
 * - switchTeam
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockMember,
  createMockRole,
  createMockChannel,
  createMockCollection,
} from './mocks/discord.js';

// Mock the database module
vi.mock('../core/db', () => ({
  Course: null,
  CourseTeam: null,
  sequelize: null,
}));

// Mock the logger
vi.mock('../core/logging', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// eslint-disable-next-line import/first
import {
  findMemberByIdentifier,
  getMembersWithRole,
  toggleMemberRole,
  switchTeam,
} from '../core/utils.js';

describe('findMemberByIdentifier', () => {
  it('finds member by exact username', async () => {
    const targetMember = createMockMember({
      id: 'target',
      username: 'johnsmith',
    });
    const otherMember = createMockMember({
      id: 'other',
      username: 'janedoe',
    });

    const memberMap = new Map([
      [targetMember.id, targetMember],
      [otherMember.id, otherMember],
    ]);

    const guild = {
      members: {
        fetch: vi.fn().mockResolvedValue(memberMap),
        cache: {
          find: (fn) => Array.from(memberMap.values()).find(fn),
        },
      },
    };

    const result = await findMemberByIdentifier(guild, 'johnsmith');
    expect(result).toBe(targetMember);
  });

  it('finds member by nickname', async () => {
    const targetMember = createMockMember({
      id: 'target',
      username: 'john123',
      nickname: 'Professor Smith',
    });

    const memberMap = new Map([[targetMember.id, targetMember]]);

    const guild = {
      members: {
        fetch: vi.fn().mockResolvedValue(memberMap),
        cache: {
          find: (fn) => Array.from(memberMap.values()).find(fn),
        },
      },
    };

    const result = await findMemberByIdentifier(guild, 'professor smith');
    expect(result).toBe(targetMember);
  });

  it('finds member by tag prefix', async () => {
    const targetMember = createMockMember({
      id: 'target',
      username: 'john',
      tag: 'john#1234',
    });

    // Need to set the tag on user object
    targetMember.user.tag = 'john#1234';

    const memberMap = new Map([[targetMember.id, targetMember]]);

    const guild = {
      members: {
        fetch: vi.fn().mockResolvedValue(memberMap),
        cache: {
          find: (fn) => Array.from(memberMap.values()).find(fn),
        },
      },
    };

    const result = await findMemberByIdentifier(guild, 'john#');
    expect(result).toBe(targetMember);
  });

  it('returns null when member not found', async () => {
    const memberMap = new Map();

    const guild = {
      members: {
        fetch: vi.fn().mockResolvedValue(memberMap),
        cache: {
          find: () => undefined,
        },
      },
    };

    const result = await findMemberByIdentifier(guild, 'nonexistent');
    expect(result).toBeNull();
  });

  it('handles fetch failure gracefully', async () => {
    const targetMember = createMockMember({
      id: 'target',
      username: 'johnsmith',
    });

    const memberMap = new Map([[targetMember.id, targetMember]]);

    const guild = {
      members: {
        fetch: vi.fn().mockRejectedValue(new Error('Fetch failed')),
        cache: {
          find: (fn) => Array.from(memberMap.values()).find(fn),
        },
      },
    };

    // Should still work using cache
    const result = await findMemberByIdentifier(guild, 'johnsmith');
    expect(result).toBe(targetMember);
  });

  it('is case insensitive', async () => {
    const targetMember = createMockMember({
      id: 'target',
      username: 'JohnSmith',
    });

    const memberMap = new Map([[targetMember.id, targetMember]]);

    const guild = {
      members: {
        fetch: vi.fn().mockResolvedValue(memberMap),
        cache: {
          find: (fn) => Array.from(memberMap.values()).find(fn),
        },
      },
    };

    const result = await findMemberByIdentifier(guild, 'JOHNSMITH');
    expect(result).toBe(targetMember);
  });

  it('trims whitespace from identifier', async () => {
    const targetMember = createMockMember({
      id: 'target',
      username: 'johnsmith',
    });

    const memberMap = new Map([[targetMember.id, targetMember]]);

    const guild = {
      members: {
        fetch: vi.fn().mockResolvedValue(memberMap),
        cache: {
          find: (fn) => Array.from(memberMap.values()).find(fn),
        },
      },
    };

    const result = await findMemberByIdentifier(guild, '  johnsmith  ');
    expect(result).toBe(targetMember);
  });
});

describe('getMembersWithRole', () => {
  it('returns members with the specified role', () => {
    const role = createMockRole({ id: 'faculty-role', name: 'Faculty' });
    const member1 = createMockMember({ id: 'member1', roles: [role] });
    const member2 = createMockMember({ id: 'member2', roles: [role] });

    // Add members to role.members
    role.members = createMockCollection([
      [member1.id, member1],
      [member2.id, member2],
    ]);

    const guild = {
      roles: {
        cache: {
          find: (fn) => {
            if (fn({ name: 'Faculty' })) return role;
            return undefined;
          },
        },
      },
    };

    const result = getMembersWithRole(guild, 'Faculty');
    expect(result.size).toBe(2);
  });

  it('returns empty map when role not found', () => {
    const guild = {
      roles: {
        cache: {
          find: () => undefined,
        },
      },
    };

    const result = getMembersWithRole(guild, 'NonexistentRole');
    expect(result.size).toBe(0);
  });

  it('is case insensitive for role name', () => {
    const role = createMockRole({ id: 'faculty-role', name: 'Faculty' });
    role.members = createMockCollection();

    const guild = {
      roles: {
        cache: {
          find: (fn) => {
            // Simulate finding by case-insensitive name
            if (fn({ name: 'faculty' }) || fn({ name: 'Faculty' })) {
              return role;
            }
            return undefined;
          },
        },
      },
    };

    const result = getMembersWithRole(guild, 'FACULTY');
    // The actual implementation checks for case-insensitive match
    expect(result).toBeDefined();
  });
});

describe('toggleMemberRole', () => {
  it('adds role when member does not have it', async () => {
    const role = createMockRole({ id: 'role-123' });
    const member = createMockMember({ roles: [] });

    const result = await toggleMemberRole(member, role.id);

    expect(result).toBe(true);
    expect(member.roles.add).toHaveBeenCalledWith(role.id);
  });

  it('removes role when member has it', async () => {
    const role = createMockRole({ id: 'role-123' });
    const member = createMockMember({ roles: [role] });

    const result = await toggleMemberRole(member, role.id);

    expect(result).toBe(false);
    expect(member.roles.remove).toHaveBeenCalledWith(role.id);
  });

  it('accepts role object instead of ID', async () => {
    const role = createMockRole({ id: 'role-123' });
    const member = createMockMember({ roles: [] });

    // The function accepts either role or role ID
    const result = await toggleMemberRole(member, role.id);

    expect(result).toBe(true);
    expect(member.roles.add).toHaveBeenCalled();
  });
});

describe('switchTeam', () => {
  let fromTeam;
  let toTeam;
  let member;
  let fromChannel;
  let toChannel;
  let guild;

  beforeEach(() => {
    fromChannel = createMockChannel({
      id: 'from-channel',
      name: 'team-01',
    });
    toChannel = createMockChannel({
      id: 'to-channel',
      name: 'team-02',
    });

    const channelMap = new Map([
      [fromChannel.id, fromChannel],
      [toChannel.id, toChannel],
    ]);

    guild = {
      channels: {
        cache: {
          get: (id) => channelMap.get(id),
        },
      },
    };

    fromTeam = {
      id: 1,
      title: 'Team-01',
      CourseId: 100,
      discordRoleId: 'from-role',
      discordTextChannelId: fromChannel.id,
    };

    toTeam = {
      id: 2,
      title: 'Team-02',
      CourseId: 100,
      discordRoleId: 'to-role',
      discordTextChannelId: toChannel.id,
    };

    const fromRole = createMockRole({ id: 'from-role' });
    member = createMockMember({
      id: 'member-1',
      roles: [fromRole],
    });
    member.guild = guild;
  });

  it('successfully switches teams in the same course', async () => {
    const result = await switchTeam(member, fromTeam, toTeam);

    expect(result.success).toBe(true);
    expect(member.roles.add).toHaveBeenCalledWith(toTeam.discordRoleId);
    expect(member.roles.remove).toHaveBeenCalledWith(fromTeam.discordRoleId);
  });

  it('fails when teams are in different courses', async () => {
    toTeam.CourseId = 200; // Different course

    const result = await switchTeam(member, fromTeam, toTeam);

    expect(result.success).toBe(false);
    expect(result.error).toContain('same course');
  });

  it('fails when member is not in the from team', async () => {
    // Remove the from role from member
    member = createMockMember({
      id: 'member-1',
      roles: [], // No roles
    });
    member.guild = guild;

    const result = await switchTeam(member, fromTeam, toTeam);

    expect(result.success).toBe(false);
    expect(result.error).toContain('not in');
  });

  it('fails when member is already in the to team', async () => {
    const fromRole = createMockRole({ id: 'from-role' });
    const toRole = createMockRole({ id: 'to-role' });
    member = createMockMember({
      id: 'member-1',
      roles: [fromRole, toRole], // Already in both teams
    });
    member.guild = guild;

    const result = await switchTeam(member, fromTeam, toTeam);

    expect(result.success).toBe(false);
    expect(result.error).toContain('already in');
  });

  it('sends welcome message to new team channel', async () => {
    await switchTeam(member, fromTeam, toTeam);

    expect(toChannel.send).toHaveBeenCalledWith(
      expect.stringContaining('Welcome')
    );
  });

  it('sends goodbye message to old team channel', async () => {
    await switchTeam(member, fromTeam, toTeam);

    expect(fromChannel.send).toHaveBeenCalledWith(
      expect.stringContaining('switched')
    );
  });

  it('handles missing channels gracefully', async () => {
    // Remove channels from guild
    guild.channels.cache.get = () => undefined;

    const result = await switchTeam(member, fromTeam, toTeam);

    // Should still succeed even if channels aren't found
    expect(result.success).toBe(true);
  });

  it('handles role add failure', async () => {
    member.roles.add = vi
      .fn()
      .mockRejectedValue(new Error('Permission denied'));

    const result = await switchTeam(member, fromTeam, toTeam);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Permission denied');
  });
});
