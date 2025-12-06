const { Sequelize, DataTypes } = require('sequelize');
const logger = require('./logging').child({ from: 'db' });

// Only initialize database if DATABASE_URL is provided and valid
const databaseUrl = process.env.DATABASE_URL;
if (
  !databaseUrl ||
  databaseUrl === 'postgresql://user:password@host:port/database'
) {
  logger.warn(
    'DATABASE_URL not set or using placeholder. Database features will be unavailable.'
  );
}

// Detect if this is a Cloud SQL Unix socket connection
// Unix socket connections use host=/cloudsql/... format
const isUnixSocket = databaseUrl && databaseUrl.includes('host=/cloudsql/');

// For Unix socket connections, ensure sslmode=disable is in the connection string
let finalDatabaseUrl = databaseUrl;
if (isUnixSocket) {
  // Always ensure sslmode=disable is present for Unix sockets
  if (!databaseUrl.includes('sslmode=')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    finalDatabaseUrl = `${databaseUrl}${separator}sslmode=disable`;
    logger.info(
      'Added sslmode=disable to Cloud SQL Unix socket connection string'
    );
  } else if (
    databaseUrl.includes('sslmode=require') ||
    databaseUrl.includes('sslmode=prefer')
  ) {
    // Replace any SSL mode with disable
    finalDatabaseUrl = databaseUrl.replace(/sslmode=[^&]*/, 'sslmode=disable');
    logger.info(
      'Replaced SSL mode with sslmode=disable in Cloud SQL Unix socket connection string'
    );
  }
  // Log the final connection string (without password for security)
  const safeUrl = finalDatabaseUrl.replace(/:[^:@]+@/, ':****@');
  logger.info(`Final database URL (Unix socket): ${safeUrl}`);
}

// Build Sequelize configuration
const sequelizeConfig = {
  logging: false,
  dialect: 'postgres',
  protocol: 'postgres',
  pool: {
    max: 5,
    min: 1, // Keep at least 1 connection alive
    acquire: 60000, // Wait up to 60s for a connection
    idle: 10000,
    evict: 1000, // Check for stale connections every second
  },
  retry: {
    max: 3, // Retry failed queries up to 3 times
  },
};

// For Unix socket connections (Cloud SQL), explicitly disable SSL
// For regular connections, enable SSL
if (!isUnixSocket) {
  sequelizeConfig.dialectOptions = {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  };
} else {
  // For Unix sockets, explicitly disable SSL in dialectOptions
  // This tells the pg library directly to not use SSL
  sequelizeConfig.dialectOptions = {
    ssl: false,
    // Also explicitly set native to false to use the JavaScript pg driver
    // which respects the ssl: false setting better
  };
  logger.info(
    'Detected Cloud SQL Unix socket connection - SSL explicitly disabled in dialectOptions'
  );
}

const sequelize =
  finalDatabaseUrl &&
  finalDatabaseUrl !== 'postgresql://user:password@host:port/database'
    ? new Sequelize(finalDatabaseUrl, sequelizeConfig)
    : null;

// Only define models if sequelize is initialized
const Course = sequelize
  ? sequelize.define('Course', {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Full course title',
      },
      shortTitle: {
        type: DataTypes.STRING,
        comment: 'Abbreviated course title to use in Discord channel names',
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        comment: 'Whether students can join on their own',
        allowNull: false,
        defaultValue: true,
      },
      instructors: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        comment: 'RCS IDs of instructors',
      },
      discordCategoryId: {
        type: DataTypes.STRING,
      },
      discordRoleId: {
        type: DataTypes.STRING,
      },
      discordInstructorRoleId: {
        type: DataTypes.STRING,
      },
    })
  : null;

const CourseTeam = sequelize
  ? sequelize.define('CourseTeam', {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      discordTextChannelId: {
        type: DataTypes.STRING,
      },
      discordVoiceChannelId: {
        type: DataTypes.STRING,
      },
      discordRoleId: {
        type: DataTypes.STRING,
      },
    })
  : null;

const Group = sequelize
  ? sequelize.define('Group', {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Full title of group like Dungeons & Dragons',
      },
      shortTitle: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Shorthand title like DnD for channel and role names',
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      discordOwnerUserId: {
        type: DataTypes.STRING,
        comment: 'ID of user that can manage this group',
      },
      discordRoleId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment:
          'ID of Discord role that this group owns and grants to members',
      },
    })
  : null;

/**
 * PendingVerification - Tracks users awaiting email verification
 */
const PendingVerification = sequelize
  ? sequelize.define('PendingVerification', {
      discordUserId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Discord user ID of the person being verified',
      },
      discordGuildId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Discord guild/server ID',
      },
      userType: {
        type: DataTypes.ENUM(
          'student',
          'faculty',
          'accepted_student',
          'alumni',
          'external'
        ),
        allowNull: false,
        comment: 'Type of user being verified',
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Email address to verify',
      },
      realName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'User real name',
      },
      cohort: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Graduation year for students/alumni, start term for accepted',
      },
      courses: {
        type: DataTypes.JSON,
        allowNull: true,
        comment:
          'Array of course codes for faculty (e.g., ["ITWS-1100", "ITWS-4500"])',
      },
      affiliation: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Affiliation/reason for external guests',
      },
      verificationCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Unique verification code sent via email',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'When this verification request expires',
      },
      initiatedBy: {
        type: DataTypes.ENUM('self', 'moderator'),
        allowNull: false,
        defaultValue: 'self',
        comment: 'Whether user self-initiated or moderator initiated',
      },
      moderatorId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Discord ID of moderator who initiated (if applicable)',
      },
    })
  : null;

/**
 * VerifiedUser - Stores information about verified users
 */
const VerifiedUser = sequelize
  ? sequelize.define('VerifiedUser', {
      discordUserId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Discord user ID',
      },
      discordGuildId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Discord guild/server ID',
      },
      userType: {
        type: DataTypes.ENUM(
          'student',
          'faculty',
          'accepted_student',
          'alumni',
          'external'
        ),
        allowNull: false,
        comment: 'Type of verified user',
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Verified email address',
      },
      realName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'User real name',
      },
      rcsId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'RCS ID extracted from @rpi.edu email',
      },
      cohort: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Graduation year or start term',
      },
      courses: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Courses taught (for faculty)',
      },
      affiliation: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Affiliation (for external)',
      },
      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When user was verified',
      },
    })
  : null;

// Associations
// https://sequelize.org/master/manual/assocs.html
if (Course && CourseTeam) {
  Course.hasMany(CourseTeam, {
    foreignKey: {
      allowNull: false,
    },
  });
  CourseTeam.belongsTo(Course);
}

// Check the database connection, and then ensure the database and tables exist
if (sequelize) {
  sequelize
    .authenticate()
    .then(() => {
      logger.info('Connected to Database.');
      return sequelize.sync({ alter: true });
    })
    .then(() => {
      logger.info('Synced Database.');
    })
    .catch((err) => {
      logger.error('Database connection error:', err);
      // Don't exit process - allow bot to run without database for command deployment
      if (process.env.NODE_ENV === 'production') {
        logger.error('Exiting due to database error in production');
        process.exit(1);
      }
    });
} else {
  logger.warn('Database not initialized. Some features may be unavailable.');
}

module.exports = {
  Course,
  CourseTeam,
  Group,
  PendingVerification,
  VerifiedUser,
  sequelize,
};
