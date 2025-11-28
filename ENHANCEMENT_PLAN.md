# Command Enhancement Plan

## Overview

Enhance the bot commands to be more robust, efficient, and flexible by:

1. Standardizing custom ID naming conventions
2. Allowing full command-line entry OR interactive prompts
3. Auto-assigning roles during creation
4. Simplifying team management with sequential naming
5. Adding team switching capability (same course only)
6. Adding server sync to reconcile Discord state with database
7. Adding channel management commands
8. Supporting bulk student imports via CSV

---

## Design Decisions

| Decision                 | Choice                                                            |
| ------------------------ | ----------------------------------------------------------------- |
| Instructor lookup        | Match by Discord username/nickname + selectable from faculty list |
| Team number padding      | Two digits (01-99)                                                |
| Backward compatibility   | Sync command to read server and reconcile with DB                 |
| Partial failure handling | Rollback all (atomic operations)                                  |
| Bulk operations          | Yes - CSV import for students                                     |
| Team switching scope     | Same course only                                                  |

---

## Custom ID Naming Convention

**Format:** `[action]-[entity]-[context]`

| Action | Entity  | Context                                | Example                     |
| ------ | ------- | -------------------------------------- | --------------------------- |
| add    | course  | `{shortName}-{instructor}-{teamCount}` | `add-course-intro-smithj-5` |
| add    | team    | `{courseId}-{count}`                   | `add-team-123-5`            |
| add    | channel | `{name}`                               | `add-channel-general`       |
| remove | course  | `{courseId}`                           | `remove-course-123`         |
| remove | team    | `{courseId}-{teamIds}`                 | `remove-team-123-1,2,3`     |
| remove | channel | `{channelId}`                          | `remove-channel-456`        |
| join   | course  | `{courseId}`                           | `join-course-123`           |
| join   | team    | `{courseId}-{teamSeq}`                 | `join-team-123-05`          |
| leave  | course  | `{courseId}`                           | `leave-course-123`          |
| leave  | team    | `{courseId}-{teamSeq}`                 | `leave-team-123-05`         |
| switch | team    | `{courseId}-{from}-{to}`               | `switch-team-123-03-05`     |
| clear  | course  | `{courseId}`                           | `clear-course-123`          |
| clear  | channel | `{channelId}`                          | `clear-channel-456`         |
| sync   | server  | -                                      | `sync-server`               |

---

## Team Naming Convention

**Format:** `{courseShortName}-Team-{seq}`

Examples:

- `intro-Team-01`
- `intro-Team-02`
- `capstone-Team-15`

This allows:

- Consistent, predictable naming
- Easy sorting and identification
- No naming decisions required
- Sequential numbering with zero-padding (01-99)

---

## Complete Command Reference

### Moderator Commands

| Command           | Description                 | Parameters                            |
| ----------------- | --------------------------- | ------------------------------------- |
| `/add course`     | Create a new course         | `[name] [short] [instructor] [teams]` |
| `/add team`       | Add teams to a course       | `[course] [count]`                    |
| `/add channel`    | Add a standalone channel    | `[name] [type] [category]`            |
| `/add students`   | Bulk add students from CSV  | `[course] [file]`                     |
| `/remove course`  | Remove a course             | `[course]`                            |
| `/remove team`    | Remove teams from a course  | `[course] [teams]`                    |
| `/remove channel` | Remove a channel            | `[channel]`                           |
| `/clear course`   | Reset a course              | `[course] [teams]`                    |
| `/clear channel`  | Clear messages in a channel | `[channel]`                           |
| `/list course`    | List courses                | `[name\|*]`                           |
| `/list channel`   | List channels               | `[pattern]`                           |
| `/sync server`    | Sync Discord state with DB  | -                                     |

### User Commands

| Command         | Description          | Parameters      |
| --------------- | -------------------- | --------------- |
| `/join course`  | Join a public course | `[course]`      |
| `/join team`    | Join or switch teams | `[team] [from]` |
| `/leave course` | Leave a course       | `[course]`      |
| `/leave team`   | Leave a team         | `[team]`        |
| `/help`         | List all commands    | -               |

### Utility Commands

| Command | Description       | Parameters |
| ------- | ----------------- | ---------- |
| `/test` | Send role buttons | `[item]`   |

---

## Enhanced Commands - Detailed

### `/add course` - Create Course with Full Setup

**Command-line options (all optional - prompts if missing):**

```
/add course [name] [short] [instructor] [teams]
```

| Parameter    | Description                            | Example                |
| ------------ | -------------------------------------- | ---------------------- |
| `name`       | Full course name                       | "Introduction to ITWS" |
| `short`      | Short name for channels                | "intro"                |
| `instructor` | Instructor (autocomplete from faculty) | "smithj"               |
| `teams`      | Number of teams to create (0 = none)   | 5                      |

**Behavior:**

1. If all params provided: Create everything in one go
2. If some params missing: Show modal with pre-filled values
3. If no params: Show full modal

**Auto-assignment:**

- Creates course role
- Creates instructor role
- Looks up instructor by username/nickname OR select from faculty dropdown
- Automatically assigns instructor role to matched user
- Creates team roles and channels if `teams` > 0
- **Rollback on failure** - if any step fails, undo all previous steps

**Example flows:**

```
# Full command - creates course with 5 teams, assigns instructor role
/add course name:"Intro to ITWS" short:intro instructor:smithj teams:5

# Partial - shows modal pre-filled with name, prompts for rest
/add course name:"Intro to ITWS"

# No args - shows empty modal
/add course
```

---

### `/add team` - Add Teams to Existing Course

**Command-line options:**

```
/add team [course] [count]
```

| Parameter | Description                | Example |
| --------- | -------------------------- | ------- |
| `course`  | Course name (autocomplete) | "intro" |
| `count`   | Number of teams to add     | 3       |

**Behavior:**

1. If course + count provided: Create teams immediately
2. If only course: Prompt for count via modal
3. If neither: Show course dropdown, then prompt for count

**Naming:**

- Automatically continues from existing team numbers
- If course has Team-01 through Team-05, adding 3 creates Team-06, Team-07, Team-08
- **Rollback on failure** - if team 07 fails, delete team 06 too

---

### `/add channel` - Add Standalone Channel

**Command-line options:**

```
/add channel [name] [type] [category]
```

| Parameter  | Description                              | Example        |
| ---------- | ---------------------------------------- | -------------- |
| `name`     | Channel name                             | "general-chat" |
| `type`     | Channel type (text/voice)                | "text"         |
| `category` | Parent category (optional, autocomplete) | "General"      |

**Behavior:**

1. If all params provided: Create channel immediately
2. If missing params: Show modal

---

### `/add students` - Bulk Add Students from CSV

**Command-line options:**

```
/add students [course] [file]
```

| Parameter | Description           | Example    |
| --------- | --------------------- | ---------- |
| `course`  | Course (autocomplete) | "intro"    |
| `file`    | CSV file attachment   | roster.csv |

**CSV Format:**

```csv
username,team
smithj,01
jonesm,02
brownk,01
```

**Behavior:**

1. Parse CSV file
2. Look up each user by username/nickname
3. Add course role to each user
4. Optionally assign team roles
5. Report: X added, Y not found, Z already enrolled

---

### `/remove course` - Remove Course

**Command-line options:**

```
/remove course [course]
```

| Parameter | Description                     | Example |
| --------- | ------------------------------- | ------- |
| `course`  | Course to remove (autocomplete) | "intro" |

**Behavior:**

1. If course provided: Show confirmation with details, then remove
2. If not provided: Show course dropdown
3. **Atomic** - removes all teams, channels, roles, DB record

---

### `/remove team` - Remove Teams

**Command-line options:**

```
/remove team [course] [teams]
```

| Parameter | Description                             | Example |
| --------- | --------------------------------------- | ------- |
| `course`  | Course (autocomplete)                   | "intro" |
| `teams`   | Team numbers (comma-separated) or "all" | "1,2,3" |

**Behavior:**

1. If both provided: Confirm and remove specified teams
2. If only course: Show multi-select of teams
3. If neither: Show course dropdown, then team multi-select

---

### `/remove channel` - Remove Channel

**Command-line options:**

```
/remove channel [channel]
```

| Parameter | Description                      | Example             |
| --------- | -------------------------------- | ------------------- |
| `channel` | Channel to remove (autocomplete) | "old-announcements" |

**Behavior:**

1. If channel provided: Show confirmation, then remove
2. If not provided: Show channel dropdown

---

### `/clear course` - Clear/Reset Course

**Command-line options:**

```
/clear course [course] [teams]
```

| Parameter | Description                    | Example |
| --------- | ------------------------------ | ------- |
| `course`  | Course to clear (autocomplete) | "intro" |
| `teams`   | Also remove teams? (yes/no)    | "yes"   |

**Actions:**

- Remove all students from course role
- Clear all messages in course channels (recreate channels)
- Optionally remove all teams

---

### `/clear channel` - Clear Channel Messages

**Command-line options:**

```
/clear channel [channel]
```

| Parameter | Description                     | Example   |
| --------- | ------------------------------- | --------- |
| `channel` | Channel to clear (autocomplete) | "general" |

**Behavior:**

- Clone channel with same settings
- Delete original channel
- This effectively clears all messages

---

### `/join team` - Join or Switch Teams (Same Course Only)

**Command-line options:**

```
/join team [team] [from]
```

| Parameter | Description                      | Example         |
| --------- | -------------------------------- | --------------- |
| `team`    | Team to join (autocomplete)      | "intro-Team-03" |
| `from`    | (Optional) Current team to leave | "intro-Team-01" |

**Behavior:**

1. If `team` only: Join the team (must be in course, not in another team)
2. If `team` + `from`: Atomic switch (same course only)
3. If neither: Show dropdown of available teams in courses user is enrolled in

**Validation:**

- `from` and `team` must be in the same course
- User must have the course role
- Atomic: if join fails, don't leave old team

---

### `/sync server` - Sync Discord with Database

**Command:**

```
/sync server
```

**Behavior:**

1. Scan all Discord categories, channels, and roles
2. Compare with database records
3. Report discrepancies:
   - Courses in DB but not Discord
   - Courses in Discord but not DB
   - Teams in DB but not Discord
   - Orphaned roles/channels
4. Offer to:
   - Add missing DB records for Discord entities
   - Remove DB records for deleted Discord entities
   - Create missing Discord entities from DB

**Output:**

```
Sync Report:
- Courses in DB: 5
- Categories in Discord: 7
- Matched: 4
- DB only (missing in Discord): 1 [intro]
- Discord only (not in DB): 2 [test-category, archive]

Actions available:
[Add to DB] [Remove from DB] [Create in Discord] [Skip]
```

---

## Autocomplete Implementation

Add autocomplete to all course/team/channel parameters:

```javascript
// In command definition
.addStringOption(option =>
  option
    .setName('course')
    .setDescription('Course name')
    .setAutocomplete(true)
)

.addStringOption(option =>
  option
    .setName('instructor')
    .setDescription('Instructor')
    .setAutocomplete(true) // Shows faculty list
)

// In autocomplete handler
async autocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  const query = focused.value.toLowerCase();

  if (focused.name === 'course') {
    const courses = await Course.findAll();
    const filtered = courses
      .filter(c => c.title.toLowerCase().includes(query) ||
                   c.shortTitle.toLowerCase().includes(query))
      .slice(0, 25);
    await interaction.respond(
      filtered.map(c => ({ name: c.title, value: c.id.toString() }))
    );
  }

  if (focused.name === 'instructor') {
    // Get members with faculty/instructor roles
    const facultyRole = interaction.guild.roles.cache.find(r => r.name === 'Faculty');
    const faculty = facultyRole?.members || [];
    const filtered = Array.from(faculty.values())
      .filter(m => m.user.username.toLowerCase().includes(query) ||
                   m.nickname?.toLowerCase().includes(query))
      .slice(0, 25);
    await interaction.respond(
      filtered.map(m => ({
        name: m.nickname || m.user.username,
        value: m.id
      }))
    );
  }

  if (focused.name === 'channel') {
    const channels = interaction.guild.channels.cache
      .filter(c => c.name.toLowerCase().includes(query))
      .first(25);
    await interaction.respond(
      channels.map(c => ({ name: c.name, value: c.id }))
    );
  }
}
```

---

## Modal Designs

### Add Course Modal (Enhanced)

```
┌─────────────────────────────────────────┐
│ Add Course                              │
├─────────────────────────────────────────┤
│ Full Course Name*                       │
│ ┌─────────────────────────────────────┐ │
│ │ Introduction to ITWS                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Short Name (for channels)*              │
│ ┌─────────────────────────────────────┐ │
│ │ intro                               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Instructor (username or select)*        │
│ ┌─────────────────────────────────────┐ │
│ │ smithj                              │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Number of Teams (0 for none)            │
│ ┌─────────────────────────────────────┐ │
│ │ 5                                   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│              [Cancel] [Create]          │
└─────────────────────────────────────────┘
```

### Add Teams Modal

```
┌─────────────────────────────────────────┐
│ Add Teams to: Intro to ITWS             │
├─────────────────────────────────────────┤
│ Number of Teams*                        │
│ ┌─────────────────────────────────────┐ │
│ │ 5                                   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Teams will be named:                    │
│ intro-Team-01, intro-Team-02, etc.      │
│                                         │
│              [Cancel] [Create]          │
└─────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Core Infrastructure

- [ ] Add `customIds` constants with new naming convention
- [ ] Add `generateSequentialTeamNames()` utility function
- [ ] Add rollback utilities for atomic operations
- [ ] Update team creation to use `{course}-Team-{seq}` naming
- [ ] Create autocomplete event handler

### Phase 2: Command Refactoring

- [ ] Update `/add course` with optional params + autocomplete + teams
- [ ] Update `/add team` with count-based creation
- [ ] Add `/add channel` command
- [ ] Update `/remove course` with autocomplete
- [ ] Update `/remove team` with autocomplete
- [ ] Add `/remove channel` command
- [ ] Update `/clear course` (rename from `/course clear`)
- [ ] Add `/clear channel` command

### Phase 3: User Commands

- [ ] Add team switching to `/join team` (same course validation)
- [ ] Update `/join course` with autocomplete
- [ ] Update `/leave` commands with autocomplete

### Phase 4: Advanced Features

- [ ] Add `/sync server` command
- [ ] Add `/add students` bulk import
- [ ] Implement faculty lookup for instructor autocomplete

### Phase 5: Testing & Documentation

- [ ] Update unit tests for all new functionality
- [ ] Update USER_GUIDE.md
- [ ] Update README.md
- [ ] End-to-end testing

---

## Files to Create/Modify

### New Files

- `events/autocompleteInteraction.js` - Handle all autocomplete requests
- `events/syncServerInteraction.js` - Handle sync confirmations
- `commands/clear.js` - New clear command (course, channel)
- `commands/sync.js` - New sync command
- `core/rollback.js` - Rollback utilities for atomic operations

### Modified Commands

- `commands/add.js` - Add channel subcommand, optional params
- `commands/remove.js` - Add channel subcommand, autocomplete
- `commands/join.js` - Team switching with `from` param
- `commands/leave.js` - Autocomplete
- `commands/list.js` - Minor updates

### Modified Events

- `events/addCourseModalInteraction.js` - Team creation, instructor assignment, rollback
- `events/addTeamsModalInteraction.js` - Sequential naming, rollback
- `events/addTeamsCourseSelectInteraction.js` - Pass existing count to modal
- `events/joinCourseTeamSelectInteraction.js` - Team switching support

### Modified Core

- `core/constants.js` - Add customIds object
- `core/utils.js` - Team name generator, instructor lookup, rollback helpers

---

## Rollback Strategy

For atomic operations, implement a transaction-like pattern:

```javascript
async function createCourseAtomic(guild, courseData) {
  const created = {
    role: null,
    instructorRole: null,
    category: null,
    channels: [],
    teams: [],
  };

  try {
    // Step 1: Create course role
    created.role = await guild.roles.create({ name: courseData.title });

    // Step 2: Create instructor role
    created.instructorRole = await guild.roles.create({
      name: `${courseData.title} Instructor`,
    });

    // Step 3: Create category
    created.category = await guild.channels.create({
      name: courseData.title,
      type: 'GUILD_CATEGORY',
    });

    // Step 4: Create channels
    for (const channelDef of channelDefinitions) {
      const channel = await guild.channels.create(channelDef);
      created.channels.push(channel);
    }

    // Step 5: Create teams
    for (let i = 1; i <= courseData.teamCount; i++) {
      const team = await createTeam(guild, courseData, i);
      created.teams.push(team);
    }

    // Step 6: Save to DB
    const course = await Course.create(courseData);

    return { success: true, course, created };
  } catch (error) {
    // ROLLBACK
    await rollbackCreated(guild, created);
    return { success: false, error: error.message };
  }
}

async function rollbackCreated(guild, created) {
  // Delete in reverse order
  for (const team of created.teams) {
    await team.role?.delete().catch(() => {});
    await team.textChannel?.delete().catch(() => {});
    await team.voiceChannel?.delete().catch(() => {});
  }
  for (const channel of created.channels) {
    await channel.delete().catch(() => {});
  }
  await created.category?.delete().catch(() => {});
  await created.instructorRole?.delete().catch(() => {});
  await created.role?.delete().catch(() => {});
}
```

---

## Summary of All Commands

### Moderator Commands (12)

1. `/add course [name] [short] [instructor] [teams]`
2. `/add team [course] [count]`
3. `/add channel [name] [type] [category]`
4. `/add students [course] [file]`
5. `/remove course [course]`
6. `/remove team [course] [teams]`
7. `/remove channel [channel]`
8. `/clear course [course] [teams]`
9. `/clear channel [channel]`
10. `/list course [name|*]`
11. `/list channel [pattern]`
12. `/sync server`

### User Commands (5)

1. `/join course [course]`
2. `/join team [team] [from]`
3. `/leave course [course]`
4. `/leave team [team]`
5. `/help`

### Utility Commands (1)

1. `/test [item]`

**Total: 18 commands**
