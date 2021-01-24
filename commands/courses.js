const { Course, CourseEnrollment, CourseTeam } = require("../db");

module.exports = {
    name: 'courses',
    description: 'Manage courses with their categories, channels, and roles.',
    serverOnly: true,
    adminOnly: true,
    usages: {
        'courses add <course name> <course short name> <number of teams>': 'Create a course and a category...',
        'courses reset <course name or id>': 'Wipe the course channels\'s messages and remove access from students.',
        'courses remove <course name or id>': 'Delete the course category, role, and all channels.'
    },
    examples: [
        'courses add "Intro to ITWS" "intro" 10',
        'courses reset "Intro to ITWS"',
        'courses remove "Intro to ITWS"'
    ], 
    execute(message, args) {
        message.channel.send('Test');
    }
};