# ITWS Discord Bot - User Guide

This guide explains how to use all available commands in the ITWS Discord Bot.

## Table of Contents

- [General Commands](#general-commands)
  - [Help](#help)
  - [Test](#test)
- [Course Management Commands](#course-management-commands)
  - [Join Course](#join-course)
  - [Leave Course](#leave-course)
  - [Join Course Team](#join-course-team)
  - [Leave Course Team](#leave-course-team)
- [Administrator Commands](#administrator-commands)
  - [Add Course](#add-course)
  - [Remove Course](#remove-course)

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
- Shows which commands are moderator-only
- Displays a brief description of each command

**Output:**

```
🤖 Available Commands

`/admin` - Test something (Moderator only)
`/help` - List all available commands and their descriptions
`/join` - Join a course or a course team
`/leave` - Leave a course or a course team
`/test` - Test something (Moderator only)
```

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
2. Users can click buttons to assign themselves roles:
   - **Prospective Students** - Button to assign role
   - **Accepted Students** - Button to assign role
   - **Current Students** - Link button (external)
   - **Alumni** - Link button (external)

**Use case:** Use this command to post role selection buttons in a welcome channel or role assignment channel.

---

## Course Management Commands

### Join Course

**Command:** `/join course`

**Description:** Join a publicly available course. This gives you access to the course's channels and role.

**Who can use:** Everyone (for public courses)

**Example:**

```
/join course
```

**What happens:**

1. The bot displays a dropdown menu with available courses you're not already in
2. Select a course from the dropdown
3. The bot assigns you the course role and grants access to course channels
4. You'll receive a confirmation message

**Note:**

- You can only join courses that are set as "public"
- You cannot join courses you're already enrolled in
- If there are no available courses, you'll see: "ℹ️ There are no other courses to join."

**Example interaction:**

```
You: /join course
Bot: ❔ Choose a course to join.
     [Dropdown menu appears with courses]
You: [Select "Introduction to ITWS" from dropdown]
Bot: ✅ You've been added to Introduction to ITWS!
```

---

### Leave Course

**Command:** `/leave course`

**Description:** Leave a course you're currently enrolled in. This removes your access to the course's channels and role.

**Who can use:** Everyone

**Example:**

```
/leave course
```

**What happens:**

1. The bot displays a dropdown menu with courses you're currently in
2. Select a course from the dropdown
3. The bot removes your course role and revokes access to course channels
4. You'll receive a confirmation message

**Note:**

- You can only leave courses you're currently enrolled in
- If you're not in any courses, you'll see: "ℹ️ You are not in any courses."

**Example interaction:**

```
You: /leave course
Bot: ❔ Choose a course to leave.
     [Dropdown menu appears with your enrolled courses]
You: [Select "Introduction to ITWS" from dropdown]
Bot: ✅ You've been removed from Introduction to ITWS.
```

---

### Join Course Team

**Command:** `/join team`

**Description:** Join a team within a course you're enrolled in. Teams have their own private channels for collaboration.

**Who can use:** Everyone (must be enrolled in the course first)

**Example:**

```
/join team
```

**What happens:**

1. The bot displays a dropdown menu with available teams from courses you're enrolled in
2. Select a team from the dropdown
3. The bot assigns you the team role and grants access to team channels
4. You'll receive a confirmation message

**Note:**

- You must be enrolled in the course first before you can join its teams
- You cannot join teams you're already in
- If there are no available teams, you'll see a message listing your current courses

**Example interaction:**

```
You: /join team
Bot: ❔ Choose a course team to join.
     [Dropdown menu appears with teams from your courses]
You: [Select "Team Alpha - Introduction to ITWS" from dropdown]
Bot: 👥 You now have access to your team channels for Team Alpha in course Introduction to ITWS.
```

---

### Leave Course Team

**Command:** `/leave team`

**Description:** Leave a course team you're currently in. This removes your access to the team's private channels.

**Who can use:** Everyone

**Example:**

```
/leave team
```

**What happens:**

1. The bot displays a dropdown menu with teams you're currently in
2. Select a team from the dropdown
3. The bot removes your team role and revokes access to team channels
4. You'll receive a confirmation message

**Note:**

- You can only leave teams you're currently in
- If you're not in any teams, you'll see: "ℹ️ You are not in any course teams."

**Example interaction:**

```
You: /leave team
Bot: ❔ Choose a course team to leave.
     [Dropdown menu appears with your teams]
You: [Select "Team Alpha - Introduction to ITWS" from dropdown]
Bot: ✅ You've been removed from Team Alpha.
```

---

## Administrator Commands

> **Note:** All admin commands require Moderator or Administrator permissions.

### Available Admin Commands

The following admin commands are currently implemented:

- `/admin courses add` - Create a new course
- `/admin courses remove` - Remove a course

**Coming Soon:**

- `/admin courses add-teams` - Add teams to an existing course
- `/admin courses remove-teams` - Remove teams from a course
- `/admin courses clear` - Reset a course (remove students, clear channels)

---

### Add Course

**Command:** `/admin courses add`

**Description:** Create a new course with roles and channels. This sets up a complete course structure in Discord.

**Who can use:** Moderators and Administrators only

**Example:**

```
/admin courses add
```

**What happens:**

1. A modal form appears with three fields:
   - **Full Course Name:** The complete course title (e.g., "Introduction to Information Technology and Web Science")
   - **Short Course Name:** Abbreviated name for channels (e.g., "intro", "mitr", "capstone")
   - **Instructors:** Comma-separated list of instructor RCS IDs (e.g., "smithj, jonesm")
2. Fill out the form and submit
3. The bot creates:
   - A course category in Discord
   - Course role for students
   - Instructor role for instructors
   - Course channels (announcements, general, discussion)
4. You'll receive a confirmation message with instructions to assign the instructor role

**Example interaction:**

```
You: /admin courses add
Bot: [Modal form appears]

Modal Fields:
┌─────────────────────────────────────────┐
│ Add Course                               │
├─────────────────────────────────────────┤
│ What's the FULL name of the course?     │
│ Introduction to ITWS                    │
│                                         │
│ What's the SHORT name of the course?    │
│ intro                                   │
│                                         │
│ Who is instructing the course?          │
│ smithj, jonesm                          │
└─────────────────────────────────────────┘

You: [Fill form and click Submit]
Bot: 🎉 Created course, roles, and channels!
     Now assign the @Instructor role to all instructors.
     You will see the course category and channels in the sidebar.
```

**Important Notes:**

- The course will be created as "public" by default (students can join via `/join course`)
- Make sure to assign the instructor role to all instructors after creation
- The short name is used in channel names, so keep it concise

---

### Remove Course

**Command:** `/admin courses remove`

**Description:** Remove a course and all its associated roles and channels. **Warning:** This will delete message history!

**Who can use:** Moderators and Administrators only

**Example:**

```
/admin courses remove
```

**What happens:**

1. The bot displays a dropdown menu with all existing courses
2. Select a course from the dropdown
3. The bot removes:
   - The course from the database
   - All course roles
   - All course channels and category
   - All team roles and channels (if any)
4. You'll receive a confirmation message

**Warning:** ⚠️ This action is **irreversible** and will delete all message history in the course channels!

**Example interaction:**

```
You: /admin courses remove
Bot: ❔ Choose a course to remove. Note that this will lose message history.
     [Dropdown menu appears with all courses]
You: [Select "Introduction to ITWS" from dropdown]
Bot: ✅ Course "Introduction to ITWS" has been removed along with all roles and channels.
```

---

## Command Summary

| Command                       | Who Can Use | Purpose                     |
| ----------------------------- | ----------- | --------------------------- |
| `/help`                       | Everyone    | List all commands           |
| `/test item:Send Role Button` | Moderators  | Post role selection buttons |
| `/join course`                | Everyone    | Join a public course        |
| `/join team`                  | Everyone    | Join a course team          |
| `/leave course`               | Everyone    | Leave a course              |
| `/leave team`                 | Everyone    | Leave a course team         |
| `/admin courses add`          | Moderators  | Create a new course         |
| `/admin courses remove`       | Moderators  | Remove a course             |

**Note:** Additional admin commands (`add-teams`, `remove-teams`, `clear`) are planned but not yet implemented.

---

## Tips and Best Practices

1. **Use `/help` first** - If you're unsure what commands are available, start with `/help`

2. **Course Enrollment** - You must join a course before you can join its teams

3. **Role Selection** - Use `/test` command to post role buttons in a dedicated channel for new members

4. **Course Management** - When creating courses, use clear and consistent naming:

   - Full name: "Introduction to Information Technology and Web Science"
   - Short name: "intro" (used in channel names)

5. **Instructor IDs** - When adding courses, use RCS IDs (RPI Computing System IDs) for instructors, separated by commas

6. **Private Messages** - Most bot responses are "ephemeral" (only visible to you) to keep channels clean

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
