const { Group } = require("../db");

module.exports = {
    name: "groups",
    description: "User groups.",
    serverOnly: true,
    usages: {
        "groups join <group name/short name/id>": "Join a group",
        "groups leave <group name/short name/id>": "Leave a group",
        "groups add <group name> <short name> [category name] [public?]": "(Admin) Create a group in a specific category",
        "groups reset <group name/short name/id>": "(Admin) Remove all members from a group",
        "groups remove <group name/short name/id>": "(Admin) Delete a group and its channels",
    },
    examples: [
        "groups join DnD",
        'groups leave "Among Us"',
        'groups add "Jackbox Part Pack" "jackbox" "Games" yes',
        'groups add "Secret Club" "secret" "Custom Category" no',
    ],
    execute(message, args) {
        message.channel.send(args);
    }
};