const { Sequelize, DataTypes } = require('sequelize');
const logger = require('./logging').child({ from: 'db' });

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  logging: false,
  dialect: 'postgres',
  protocol: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

const Course = sequelize.define('Course', {
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
});

const CourseTeam = sequelize.define('CourseTeam', {
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
});

const Group = sequelize.define('Group', {
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
    comment: 'ID of Discord role that this group owns and grants to members',
  },
});

// Associations
// https://sequelize.org/master/manual/assocs.html
Course.hasMany(CourseTeam, {
  foreignKey: {
    allowNull: false,
  },
});
CourseTeam.belongsTo(Course);

// Check the database connection, and then ensure the database and tables exist
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
    logger.error(err);
    process.exit(1);
  });

module.exports = {
  Course,
  CourseTeam,
  Group,
};
