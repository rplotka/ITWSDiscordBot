/**
 * Rollback utilities for atomic Discord operations
 * Ensures that if any step fails, all previous steps are undone
 */

const logger = require('./logging');

/**
 * Tracks created Discord entities for potential rollback
 */
class RollbackTracker {
  constructor() {
    this.roles = [];
    this.channels = [];
    this.category = null;
    this.dbRecords = [];
  }

  addRole(role) {
    this.roles.push(role);
  }

  addChannel(channel) {
    this.channels.push(channel);
  }

  setCategory(category) {
    this.category = category;
  }

  addDbRecord(record) {
    this.dbRecords.push(record);
  }

  /**
   * Rollback all tracked entities in reverse order
   * @param {string} reason - Reason for rollback (for logging)
   */
  async rollback(reason = 'Operation failed') {
    logger.warn(`Rolling back: ${reason}`);
    const errors = [];

    // Delete DB records first (sequential to avoid race conditions)
    const dbRecordsReversed = [...this.dbRecords].reverse();
    await dbRecordsReversed.reduce(async (promise, record) => {
      await promise;
      try {
        await record.destroy();
        logger.info(`Rolled back DB record: ${record.constructor.name}`);
      } catch (error) {
        errors.push(`DB record: ${error.message}`);
        logger.error(`Failed to rollback DB record: ${error.message}`);
      }
    }, Promise.resolve());

    // Delete channels (in reverse order)
    const channelsReversed = [...this.channels].reverse();
    await channelsReversed.reduce(async (promise, channel) => {
      await promise;
      try {
        await channel.delete('Rollback: operation failed');
        logger.info(`Rolled back channel: ${channel.name}`);
      } catch (error) {
        errors.push(`Channel ${channel.name}: ${error.message}`);
        logger.error(
          `Failed to rollback channel ${channel.name}: ${error.message}`
        );
      }
    }, Promise.resolve());

    // Delete category
    if (this.category) {
      try {
        await this.category.delete('Rollback: operation failed');
        logger.info(`Rolled back category: ${this.category.name}`);
      } catch (error) {
        errors.push(`Category ${this.category.name}: ${error.message}`);
        logger.error(`Failed to rollback category: ${error.message}`);
      }
    }

    // Delete roles (in reverse order)
    const rolesReversed = [...this.roles].reverse();
    await rolesReversed.reduce(async (promise, role) => {
      await promise;
      try {
        await role.delete('Rollback: operation failed');
        logger.info(`Rolled back role: ${role.name}`);
      } catch (error) {
        errors.push(`Role ${role.name}: ${error.message}`);
        logger.error(`Failed to rollback role ${role.name}: ${error.message}`);
      }
    }, Promise.resolve());

    if (errors.length > 0) {
      logger.error(`Rollback completed with ${errors.length} errors`);
    } else {
      logger.info('Rollback completed successfully');
    }

    return errors;
  }
}

/**
 * Execute an operation with automatic rollback on failure
 * @param {Function} operation - Async function that receives a RollbackTracker
 * @returns {Promise<{success: boolean, result?: any, error?: string}>}
 */
async function withRollback(operation) {
  const tracker = new RollbackTracker();

  try {
    const result = await operation(tracker);
    return { success: true, result };
  } catch (error) {
    logger.error(`Operation failed, initiating rollback: ${error.message}`);
    const rollbackErrors = await tracker.rollback(error.message);

    return {
      success: false,
      error: error.message,
      rollbackErrors: rollbackErrors.length > 0 ? rollbackErrors : undefined,
    };
  }
}

module.exports = {
  RollbackTracker,
  withRollback,
};
