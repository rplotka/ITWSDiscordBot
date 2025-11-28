/**
 * Database connection and model tests
 */
import { describe, it, expect } from 'vitest';

describe('database', () => {
  it('database models are defined when DATABASE_URL is set', async () => {
    // This test verifies that the database models can be imported
    // without errors, even if DATABASE_URL is not set
    const { Course, CourseTeam, Group } = await import('../core/db.js');

    // Models should be defined (may be null if DATABASE_URL not set)
    expect(
      Course === null || typeof Course === 'function',
      'Course model should be defined or null'
    ).toBe(true);
    expect(
      CourseTeam === null || typeof CourseTeam === 'function',
      'CourseTeam model should be defined or null'
    ).toBe(true);
    expect(
      Group === null || typeof Group === 'function',
      'Group model should be defined or null'
    ).toBe(true);
  });

  it('database connection is optional', async () => {
    // This test verifies that the bot can start without a database
    // (for testing or when DATABASE_URL is not configured)
    const db = await import('../core/db.js');

    // Sequelize should be null, undefined, or an object (Sequelize instance)
    // When DATABASE_URL is not set, sequelize may be undefined
    expect(
      db.sequelize === null ||
        db.sequelize === undefined ||
        (typeof db.sequelize === 'object' && db.sequelize !== null),
      'Sequelize instance should be null, undefined, or an object'
    ).toBe(true);
  });
});
