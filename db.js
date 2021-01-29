const { Sequelize, DataTypes } = require("sequelize");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    logging: false
});

const Course = sequelize.define("Course", {
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Full course title'
    },
    shortTitle: {
        type: DataTypes.STRING,
        comment: 'Abbreviated course title to use in Discord channel names'
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        comment: 'Whether students can join on their own',
        allowNull: false,
        defaultValue: true
    },
    instructors: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        comment: 'RCS IDs of instructors'
    },
    discordCategoryId: {
        type: DataTypes.STRING
    },
    discordRoleId: {
        type: DataTypes.STRING
    }
});

const CourseTeam = sequelize.define("CourseTeam", {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    discordTextChannelId: {
        type: DataTypes.STRING
    },
    discordVoiceChannelId: {
        type: DataTypes.STRING
    },
    discordRoleId: {
        type: DataTypes.STRING
    }
});

const CourseEnrollment = sequelize.define("CourseEnrollment", {
    studentRcsId: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

const Group = sequelize.define("Group", {
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Full title of group like Dungeons & Dragons"
    },
    shortTitle: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Shorthand title like DnD for channel and role names"
    },
    isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    discordOwnerUserId: {
        type: DataTypes.STRING,
        comment: 'ID of user that can manage this group'
    },
    discordRoleId: {
        type: DataTypes.STRING
    },
    discordTextChannelId: {
        type: DataTypes.STRING
    },
    discordVoiceChannelId: {
        type: DataTypes.STRING
    }
});

// Associations
// https://sequelize.org/master/manual/assocs.html
Course.hasMany(CourseEnrollment, {
    foreignKey: {
        allowNull: false
    }
});
CourseEnrollment.belongsTo(Course);
CourseEnrollment.belongsTo(CourseTeam);
Course.hasMany(CourseTeam, {
    foreignKey: {
        allowNull: false
    }
});
CourseTeam.belongsTo(Course);

// Check the database connection, and then ensure the database and tables exist
sequelize.authenticate()
    .then(() => {
        console.log("Connected to Database.");
        return sequelize.sync({ alter: true });
    })
    .then(() => {
        console.log("Synced Database.");
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });

module.exports = {
    Course,
    CourseEnrollment,
    CourseTeam,
    Group
};