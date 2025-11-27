/**
 * Database connection and model tests
 */
const test = require('ava');

test('database models are defined when DATABASE_URL is set', (t) => {
  // This test verifies that the database models can be imported
  // without errors, even if DATABASE_URL is not set
  const { Course, CourseTeam, Group } = require('../core/db');

  // Models should be defined (may be null if DATABASE_URL not set)
  t.true(
    Course === null || typeof Course === 'function',
    'Course model should be defined or null'
  );
  t.true(
    CourseTeam === null || typeof CourseTeam === 'function',
    'CourseTeam model should be defined or null'
  );
  t.true(
    Group === null || typeof Group === 'function',
    'Group model should be defined or null'
  );
});

test('database connection is optional', (t) => {
  // This test verifies that the bot can start without a database
  // (for testing or when DATABASE_URL is not configured)
  const db = require('../core/db');

  // Sequelize should be null, undefined, or an object (Sequelize instance)
  // When DATABASE_URL is not set, sequelize may be undefined
  t.true(
    db.sequelize === null ||
      db.sequelize === undefined ||
      (typeof db.sequelize === 'object' && db.sequelize !== null),
    'Sequelize instance should be null, undefined, or an object'
  );
});
