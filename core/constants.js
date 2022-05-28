/**
 * Used in displaying the possible roles to users, as well as determining what roles to assign/remove to users.
 */
module.exports.userRoles = [
  {
    label: 'Prospective Students',
    customId: 'prospective',
    discordRoleId: process.env.DISCORD_PROSPECTIVE_STUDENTS_ROLE_ID,
  },
  {
    label: 'Accepted Students',
    customId: 'accepted',
    discordRoleId: '812420665487392818',
  },
  {
    label: 'Current Students',
    url: 'https://itws-discord.herokuapp.com/',
  },
  {
    label: 'Alumni',
    url: 'https://forms.gle/DisKuZy4AJf17pk69',
  },
];
