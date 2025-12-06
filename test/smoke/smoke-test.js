#!/usr/bin/env node
/**
 * Smoke Test Script for ITWS Discord Bot
 *
 * This script tests the bot against a real Discord server.
 * It requires a test Discord server and bot credentials.
 *
 * Usage:
 *   DISCORD_BOT_TOKEN=xxx DISCORD_SERVER_ID=xxx node test/smoke/smoke-test.js
 *
 * Or with Doppler:
 *   doppler run -- node test/smoke/smoke-test.js
 *
 * Requirements:
 *   - A test Discord server
 *   - Bot added to the server with appropriate permissions
 *   - Environment variables: DISCORD_BOT_TOKEN, DISCORD_SERVER_ID
 */

const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');

// Configuration
const TIMEOUT_MS = 30000; // 30 second timeout for operations
const TEST_PREFIX = 'SMOKE-TEST-';

// Test state
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

/**
 * Log a test result
 */
function logTest(name, passed, error = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (error) {
    console.log(`   Error: ${error.message || error}`);
  }
  testResults.tests.push({ name, passed, error: error?.message });
  if (passed) {
    testResults.passed += 1;
  } else {
    testResults.failed += 1;
  }
}

/**
 * Skip a test
 */
function skipTest(name, reason) {
  console.log(`⏭️ SKIP: ${name} - ${reason}`);
  testResults.skipped += 1;
  testResults.tests.push({ name, skipped: true, reason });
}

/**
 * Wait for a condition with timeout
 */
async function waitFor(conditionFn, timeoutMs = 5000, intervalMs = 100) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    if (await conditionFn()) {
      return true;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, intervalMs);
    });
  }
  return false;
}

/**
 * Clean up test artifacts from previous runs
 */
async function cleanup(guild) {
  console.log('\n🧹 Cleaning up previous test artifacts...');

  // Delete test roles
  const testRoles = guild.roles.cache.filter((r) =>
    r.name.startsWith(TEST_PREFIX)
  );
  for (const [, role] of testRoles) {
    try {
      await role.delete();
      console.log(`   Deleted role: ${role.name}`);
    } catch (e) {
      console.log(`   Failed to delete role ${role.name}: ${e.message}`);
    }
  }

  // Delete test channels
  const testChannels = guild.channels.cache.filter(
    (c) =>
      c.name.startsWith(TEST_PREFIX.toLowerCase()) ||
      c.name.startsWith('smoke-test-')
  );
  for (const [, channel] of testChannels) {
    try {
      await channel.delete();
      console.log(`   Deleted channel: ${channel.name}`);
    } catch (e) {
      console.log(`   Failed to delete channel ${channel.name}: ${e.message}`);
    }
  }

  // Delete test categories
  const testCategories = guild.channels.cache.filter(
    (c) => c.type === 4 && c.name.startsWith(TEST_PREFIX)
  );
  for (const [, category] of testCategories) {
    try {
      // Delete children first
      for (const [, child] of category.children.cache) {
        await child.delete();
      }
      await category.delete();
      console.log(`   Deleted category: ${category.name}`);
    } catch (e) {
      console.log(
        `   Failed to delete category ${category.name}: ${e.message}`
      );
    }
  }
}

/**
 * Test: Bot can connect and is ready
 */
async function testBotConnection(client) {
  try {
    const ready = await waitFor(() => client.isReady(), 10000);
    logTest('Bot connects and is ready', ready);
    return ready;
  } catch (error) {
    logTest('Bot connects and is ready', false, error);
    return false;
  }
}

/**
 * Test: Bot can access the test guild
 */
async function testGuildAccess(client, guildId) {
  try {
    const guild = await client.guilds.fetch(guildId);
    const hasAccess = !!guild;
    logTest('Bot can access test guild', hasAccess);
    return guild;
  } catch (error) {
    logTest('Bot can access test guild', false, error);
    return null;
  }
}

/**
 * Test: Bot can fetch guild members
 */
async function testFetchMembers(guild) {
  try {
    const members = await guild.members.fetch();
    const canFetch = members.size > 0;
    logTest(`Bot can fetch guild members (found ${members.size})`, canFetch);
    return canFetch;
  } catch (error) {
    logTest('Bot can fetch guild members', false, error);
    return false;
  }
}

/**
 * Test: Bot can fetch guild roles
 */
async function testFetchRoles(guild) {
  try {
    const roles = await guild.roles.fetch();
    const canFetch = roles.size > 0;
    logTest(`Bot can fetch guild roles (found ${roles.size})`, canFetch);
    return canFetch;
  } catch (error) {
    logTest('Bot can fetch guild roles', false, error);
    return false;
  }
}

/**
 * Test: Bot can create a role
 */
async function testCreateRole(guild) {
  try {
    const roleName = `${TEST_PREFIX}Role-${Date.now()}`;
    const role = await guild.roles.create({
      name: roleName,
      color: 0x00ff00,
      reason: 'Smoke test',
    });
    const created = !!role && role.name === roleName;
    logTest('Bot can create a role', created);

    // Clean up
    if (role) {
      await role.delete();
    }
    return created;
  } catch (error) {
    logTest('Bot can create a role', false, error);
    return false;
  }
}

/**
 * Test: Bot can create a channel
 */
async function testCreateChannel(guild) {
  try {
    const channelName = `${TEST_PREFIX.toLowerCase()}channel-${Date.now()}`;
    const channel = await guild.channels.create({
      name: channelName,
      type: 0, // GuildText
      reason: 'Smoke test',
    });
    const created = !!channel && channel.name === channelName;
    logTest('Bot can create a text channel', created);

    // Clean up
    if (channel) {
      await channel.delete();
    }
    return created;
  } catch (error) {
    logTest('Bot can create a text channel', false, error);
    return false;
  }
}

/**
 * Test: Bot can create a category
 */
async function testCreateCategory(guild) {
  try {
    const categoryName = `${TEST_PREFIX}Category-${Date.now()}`;
    const category = await guild.channels.create({
      name: categoryName,
      type: 4, // GuildCategory
      reason: 'Smoke test',
    });
    const created = !!category && category.name === categoryName;
    logTest('Bot can create a category', created);

    // Clean up
    if (category) {
      await category.delete();
    }
    return created;
  } catch (error) {
    logTest('Bot can create a category', false, error);
    return false;
  }
}

/**
 * Test: Bot can assign a role to a member
 */
async function testAssignRole(guild, client) {
  try {
    // Create a test role
    const roleName = `${TEST_PREFIX}AssignTest-${Date.now()}`;
    const role = await guild.roles.create({
      name: roleName,
      reason: 'Smoke test role assignment',
    });

    // Get the bot's member object
    const botMember = await guild.members.fetch(client.user.id);

    // Try to assign the role to the bot
    await botMember.roles.add(role);

    // Verify
    const hasRole = botMember.roles.cache.has(role.id);
    logTest('Bot can assign a role to a member', hasRole);

    // Clean up
    await botMember.roles.remove(role);
    await role.delete();

    return hasRole;
  } catch (error) {
    logTest('Bot can assign a role to a member', false, error);
    return false;
  }
}

/**
 * Test: Bot can send a message
 */
async function testSendMessage(guild) {
  try {
    // Create a test channel
    const channelName = `${TEST_PREFIX.toLowerCase()}message-test`;
    const channel = await guild.channels.create({
      name: channelName,
      type: 0,
      reason: 'Smoke test message',
    });

    // Send a message
    const message = await channel.send('🧪 Smoke test message - please ignore');
    const sent = !!message && message.content.includes('Smoke test');
    logTest('Bot can send a message', sent);

    // Clean up
    await channel.delete();

    return sent;
  } catch (error) {
    logTest('Bot can send a message', false, error);
    return false;
  }
}

/**
 * Test: Slash commands are registered
 */
async function testSlashCommands(client, guildId) {
  try {
    const rest = new REST({ version: '10' }).setToken(
      process.env.DISCORD_BOT_TOKEN
    );
    const commands = await rest.get(
      Routes.applicationGuildCommands(client.user.id, guildId)
    );

    const hasCommands = commands.length > 0;
    const commandNames = commands.map((c) => c.name).join(', ');
    logTest(
      `Slash commands are registered (${commands.length}: ${commandNames})`,
      hasCommands
    );

    // Check for expected commands
    const expectedCommands = ['join', 'leave', 'add', 'remove', 'help', 'list'];
    const missingCommands = expectedCommands.filter(
      (name) => !commands.find((c) => c.name === name)
    );

    if (missingCommands.length > 0) {
      console.log(`   ⚠️  Missing commands: ${missingCommands.join(', ')}`);
    }

    return hasCommands;
  } catch (error) {
    logTest('Slash commands are registered', false, error);
    return false;
  }
}

/**
 * Main smoke test runner
 */
async function runSmokeTests() {
  console.log('🔥 ITWS Discord Bot Smoke Tests');
  console.log('================================\n');

  // Check environment
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_SERVER_ID;

  if (!token) {
    console.error('❌ DISCORD_BOT_TOKEN environment variable is required');
    process.exit(1);
  }

  if (!guildId) {
    console.error('❌ DISCORD_SERVER_ID environment variable is required');
    process.exit(1);
  }

  console.log(`Server ID: ${guildId}`);
  console.log(`Bot Token: ${token.substring(0, 10)}...`);
  console.log('');

  // Create client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
    ],
  });

  try {
    // Login
    console.log('📡 Connecting to Discord...\n');
    await client.login(token);

    // Run tests
    console.log('🧪 Running tests...\n');

    // Connection tests
    const connected = await testBotConnection(client);
    if (!connected) {
      throw new Error('Bot failed to connect');
    }

    const guild = await testGuildAccess(client, guildId);
    if (!guild) {
      throw new Error('Cannot access test guild');
    }

    // Clean up from previous runs
    await cleanup(guild);

    console.log('\n📋 Permission Tests\n');

    // Permission tests
    await testFetchMembers(guild);
    await testFetchRoles(guild);
    await testCreateRole(guild);
    await testCreateChannel(guild);
    await testCreateCategory(guild);
    await testAssignRole(guild, client);
    await testSendMessage(guild);

    console.log('\n📋 Command Tests\n');

    // Command tests
    await testSlashCommands(client, guildId);

    // Final cleanup
    await cleanup(guild);
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    testResults.failed += 1;
  } finally {
    // Disconnect
    client.destroy();
  }

  // Print summary
  console.log('\n================================');
  console.log('📊 Test Summary');
  console.log('================================');
  console.log(`✅ Passed:  ${testResults.passed}`);
  console.log(`❌ Failed:  ${testResults.failed}`);
  console.log(`⏭️  Skipped: ${testResults.skipped}`);
  console.log(
    `📝 Total:   ${
      testResults.passed + testResults.failed + testResults.skipped
    }`
  );

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runSmokeTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
