/**
 * Command structure validation tests
 */
const test = require('ava');
const { readdirSync } = require('fs');
const path = require('path');

// Load all command files
const commandsPath = path.join(__dirname, '../commands');
const commandFiles = readdirSync(commandsPath).filter((file) =>
  file.endsWith('.js')
);

test('all command files export required structure', (t) => {
  commandFiles.forEach((file) => {
    const command = require(path.join(commandsPath, file));

    t.truthy(command.data, `${file} should export 'data' property`);
    t.truthy(command.execute, `${file} should export 'execute' function`);
    t.is(
      typeof command.execute,
      'function',
      `${file} execute should be a function`
    );

    // Check SlashCommandBuilder structure
    t.truthy(command.data.name, `${file} should have command name`);
    t.truthy(
      command.data.description,
      `${file} should have command description`
    );
  });
});

test('commands have valid names', (t) => {
  commandFiles.forEach((file) => {
    const command = require(path.join(commandsPath, file));
    const name = command.data.name;

    // Discord command names must be lowercase and match pattern
    t.is(name.toLowerCase(), name, `${file} command name should be lowercase`);
    t.true(
      /^[\w-]{1,32}$/.test(name),
      `${file} command name should match Discord naming rules`
    );
  });
});

test('commands have non-empty descriptions', (t) => {
  commandFiles.forEach((file) => {
    const command = require(path.join(commandsPath, file));
    const description = command.data.description;

    t.truthy(description, `${file} should have a description`);
    t.true(description.length > 0, `${file} description should not be empty`);
    t.true(
      description.length <= 100,
      `${file} description should be 100 characters or less`
    );
  });
});
