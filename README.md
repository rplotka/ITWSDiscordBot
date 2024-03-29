# ITWS Discord Bot

The ITWS Discord bot manages the ITWS Discord server by managing courses' roles, channels, and permissions.

## Maintainers

- [Simar S '24](https://github.com/simar-singh)
- [Frank M '22](https://github.com/Apexal)

## Commands

Check out the `commands/` folder for all of the available commands. In the object that each exports is a name, description, and details of subcommands with descriptions.

- /join course
- /join team
- /leave course
- /leave team
- /test
- /admin courses add
- /admin courses add-teams
- /admin courses remove
- /admin courses remove-teams
- /admin courses clear

## Development

### Environment Variables

Copy over `.env.example` to `.env` and populate all of the values. You'll probably have to ask a previous/current developer for a copy.

**Hints:**

- `DISCORD_BOT_TOKEN` the *secret* bot token found on the Discord developer page for the bot

### Running Locally

```bash
npm run dev
```

#### Deploying Slash Commands

Anytime the name, descriptions, subcommands, etc. of any commands change, the changes must be deployed to Discord to be reflected in the Discord UI.

```bash
npm run deploy-commands
```

---

### Course Discord Layout

#### Terminology

- `<title>` refers to a course's full title in the database, e.g. `"Intro to ITWS"`
- `<short title>` refers to a course's short title in the database, e.g. `"intro"`

#### Roles

- `@<title>`: Role for every student, TA, and instructor in the course.
- `@<title> Instructor`: Role for every instructor in the course.
- `@<title> Team <team>`: Role for Team `<team>` members (students only, not faculty).

#### Channels

All of these channels are hidden by default to those without the general course role detailed above.

- `#<short title>-announcements`: Text channel for course faculty to make read-only announcements about the course.
- `#general`: Text channel for students and faculty to generally discuss the course.
- `#discussion`: Text channel for students and faculty to facilitate discussions on inclass topics or general topics.
- `#team-<team>`: Private text channel for team members and course faculty.
- `Team <team>`: Private voice channel for team members and course faculty.

### Database Schema

![ITWS Discord](https://user-images.githubusercontent.com/8422699/134196542-b3677e9f-297f-4e10-bdda-ec04ff0c7b19.png)
