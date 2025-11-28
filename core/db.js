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
if (isUnixSocket && !databaseUrl.includes('sslmode=')) {
  // Add sslmode=disable to the connection string if not already present
  const separator = databaseUrl.includes('?') ? '&' : '?';
  finalDatabaseUrl = `${databaseUrl}${separator}sslmode=disable`;
  logger.info(
    'Added sslmode=disable to Cloud SQL Unix socket connection string'
  );
}

// Build Sequelize configuration
const sequelizeConfig = {
  logging: false,
  dialect: 'postgres',
  protocol: 'postgres',
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  query: {
    timeout: 10000, // 10 second timeout for queries
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
  sequelizeConfig.dialectOptions = {
    ssl: false,
  };
  logger.info(
    'Detected Cloud SQL Unix socket connection - SSL explicitly disabled'
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
  sequelize,
};
