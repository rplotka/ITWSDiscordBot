# ITWS Discord Bot - User Guide

This guide explains how to use all available commands in the ITWS Discord Bot.

## Table of Contents

- [General Commands](#general-commands)
  - [Help](#help)
  - [Test](#test)
- [User Commands](#user-commands)
  - [Join Course](#join-course)
  - [Leave Course](#leave-course)
  - [Join Team](#join-team)
  - [Leave Team](#leave-team)
- [Moderator Commands](#moderator-commands)
  - [Add Course](#add-course)
  - [Add Team](#add-team)
  - [Remove Course](#remove-course)
  - [Remove Team](#remove-team)
  - [Clear Course](#clear-course)
  - [List Course](#list-course)
  - [List Channel](#list-channel)

---

## General Commands

### Help

**Command:** `/help`

**Description:** Lists all available commands and their descriptions.

**Who can use:** Everyone

**Example:**

```
/help
```

**What happens:**

- The bot displays an embed with all available commands
- Commands are grouped by category (Moderator, User, Other)
- Shows a brief description of each command

---

### Test

**Command:** `/test item:Send Role Button`

**Description:** Sends a message with role selection buttons to the current channel.

**Who can use:** Moderators and Administrators only

**Example:**

```
/test item:Send Role Button
```

**What happens:**

1. The bot sends a message to the channel with role selection buttons
2. Users can click buttons to assign themselves roles

---

## User Commands

### Join Course

**Command:** `/join course`

**Description:** Join a publicly available course. This gives you access to the course's channels and role.

**Who can use:** Everyone (for public courses)

**What happens:**

1. A dropdown menu appears with available courses you're not already in
2. Select a course from the dropdown
3. The bot assigns you the course role and grants access to course channels
4. You'll receive a confirmation message

---

### Leave Course

**Command:** `/leave course`

**Description:** Leave a course you're currently enrolled in.

**Who can use:** Everyone

**What happens:**

1. A dropdown menu appears with courses you're currently in
2. Select a course from the dropdown
3. The bot removes your course role and revokes access to course channels

---

### Join Team

**Command:** `/join team`

**Description:** Join a team within a course you're enrolled in.

**Who can use:** Everyone (must be enrolled in the course first)

**What happens:**

1. A dropdown menu appears with available teams from courses you're enrolled in
2. Select a team from the dropdown
3. The bot assigns you the team role and grants access to team channels

---

### Leave Team

**Command:** `/leave team`

**Description:** Leave a course team you're currently in.

**Who can use:** Everyone

**What happens:**

1. A dropdown menu appears with teams you're currently in
2. Select a team from the dropdown
3. The bot removes your team role and revokes access to team channels

---

## Moderator Commands

> **Note:** All moderator commands require Moderator or Administrator permissions.

### Add Course

**Command:** `/add course`

**Description:** Create a new course with roles and channels.

**Who can use:** Moderators and Administrators only

**What happens:**

1. A modal form appears with three fields:
   - **Full Course Name:** The complete course title
   - **Short Course Name:** Abbreviated name for channels (e.g., "intro")
   - **Instructors:** Comma-separated list of instructor RCS IDs
2. Fill out the form and submit
3. The bot creates:
   - A course category in Discord
   - Course role for students
   - Instructor role for instructors
   - Course channels (announcements, general, discussion)

---

### Add Team

**Command:** `/add team`

**Description:** Add teams to an existing course. Teams have their own private text and voice channels.

**Who can use:** Moderators and Administrators only

**What happens:**

1. A dropdown menu appears with all courses
2. Select a course to add teams to
3. A modal form appears asking for team names
4. Enter team names separated by commas (e.g., "Alpha, Beta, Gamma")
5. The bot creates for each team:
   - A team role (e.g., "intro - Alpha")
   - A private text channel
   - A private voice channel

---

### Remove Course

**Command:** `/remove course`

**Description:** Remove a course and all its associated roles and channels.

**Who can use:** Moderators and Administrators only

**Warning:** ⚠️ This action is **irreversible** and will delete all message history!

**What happens:**

1. A dropdown menu appears with all existing courses
2. Select a course from the dropdown
3. The bot removes:
   - The course from the database
   - All course roles
   - All course channels and category
   - All team roles and channels (if any)

---

### Remove Team

**Command:** `/remove team`

**Description:** Remove teams from a course and delete their associated roles and channels.

**Who can use:** Moderators and Administrators only

**Warning:** ⚠️ Removing teams permanently deletes all message history in those channels.

**What happens:**

1. A dropdown menu appears with courses that have teams
2. Select a course to remove teams from
3. A multi-select dropdown appears with all teams in that course
4. Select one or more teams to remove
5. The bot deletes the selected teams' roles, channels, and database records

---

### Clear Course

**Command:** `/course clear`

**Description:** Reset a course by removing all students and clearing channel messages, while keeping the course structure intact.

**Who can use:** Moderators and Administrators only

**What happens:**

1. A dropdown menu appears with all courses
2. Select a course to clear
3. A confirmation dialog appears with options:
   - **Clear Course** - Removes students and clears messages
   - **Clear Course + Remove Teams** - Also removes all teams
   - **Cancel** - Abort the operation
4. The bot:
   - Removes all students from the course role
   - Deletes and recreates text channels to clear message history
   - Optionally removes all teams

---

### List Course

**Command:** `/list course <name|*>`

**Description:** List course(s) and their details.

**Who can use:** Moderators and Administrators only

**Parameters:**

- `name` - Course name to search for, or `*` for all courses

**Examples:**

```
/list course *           # List all courses
/list course intro       # List courses matching "intro"
```

**What happens:**

- Shows course details: title, short title, public status, student count, team count, instructors

---

### List Channel

**Command:** `/list channel <pattern>`

**Description:** List channels matching a wildcard pattern.

**Who can use:** Moderators and Administrators only

**Parameters:**

- `pattern` - Channel name pattern using `*` as wildcard

**Examples:**

```
/list channel *           # List all channels
/list channel intro*      # List channels starting with "intro"
/list channel *voice*     # List channels containing "voice"
```

**What happens:**

- Shows channels grouped by type: categories, text channels, voice channels
- Shows parent category for each channel

---

## Command Summary

| Command          | Who Can Use | Purpose                          |
| ---------------- | ----------- | -------------------------------- |
| `/help`          | Everyone    | List all commands                |
| `/test`          | Moderators  | Post role selection buttons      |
| `/join course`   | Everyone    | Join a public course             |
| `/join team`     | Everyone    | Join a course team               |
| `/leave course`  | Everyone    | Leave a course                   |
| `/leave team`    | Everyone    | Leave a course team              |
| `/add course`    | Moderators  | Create a new course              |
| `/add team`      | Moderators  | Add teams to a course            |
| `/remove course` | Moderators  | Remove a course                  |
| `/remove team`   | Moderators  | Remove teams from a course       |
| `/course clear`  | Moderators  | Reset a course                   |
| `/list course`   | Moderators  | List course(s) with details      |
| `/list channel`  | Moderators  | List channels matching a pattern |

---

## Tips and Best Practices

1. **Use `/help` first** - If you're unsure what commands are available, start with `/help`

2. **Course Enrollment** - You must join a course before you can join its teams

3. **Course Management** - When creating courses, use clear and consistent naming:

   - Full name: "Introduction to Information Technology and Web Science"
   - Short name: "intro" (used in channel names)

4. **Private Messages** - Most bot responses are "ephemeral" (only visible to you) to keep channels clean

---

## Troubleshooting

**Q: I can't see a command in Discord**

- Make sure the bot is online (check member list)
- Try typing `/` to see all available commands
- Commands may take a few minutes to appear after deployment

**Q: "Only moderators can run that command!"**

- You need Administrator or Manage Server permissions
- Contact a server administrator if you believe you should have access

**Q: "There are no courses to join"**

- All courses may be set as private (instructor-only)
- You may already be in all available courses
- Contact an instructor or moderator to be added manually

**Q: Command says "Application did not respond"**

- The bot may be experiencing issues
- Wait a moment and try again
- Check if the bot is online in the member list

---

## Need Help?

If you encounter issues or have questions:

1. Check this guide first
2. Use `/help` to see available commands
3. Contact a server moderator or administrator
