# ITWS Discord Bot - Development Plan

This document outlines the planned improvements and features for the ITWS Discord Bot.

## Overview

The plan includes:
1. Completing remaining admin commands
2. Fixing any broken functionality
3. Implementing role-based permissions
4. Standardizing course templates
5. Adding modal popups for all parameters
6. Creating detailed help system

---

## Phase 1: Fix Existing Commands

### 1.1 Verify All Commands Work
- [ ] Test `/help` command
- [ ] Test `/test` command
- [ ] Test `/join course` command
- [ ] Test `/join team` command
- [ ] Test `/leave course` command
- [ ] Test `/leave team` command
- [ ] Test `/admin courses add` command
- [ ] Test `/admin courses remove` command
- [ ] Fix any broken functionality

**Status:** Most commands working, need final verification

---

## Phase 2: Complete Remaining Admin Commands

### 2.1 Implement `/admin courses add-teams`
**Goal:** Add teams to an existing course

**Requirements:**
- Select course from dropdown
- Modal popup for team configuration:
  - Number of teams (or team names)
  - Team naming pattern (e.g., "Team 1", "Team Alpha", etc.)
- Create team roles
- Create team channels (text + voice)
- Save teams to database

**Implementation Steps:**
1. Add handler in `commands/admin.js` for `add-teams` subcommand
2. Create course selector dropdown
3. Create modal for team configuration
4. Create event handler for team modal submission
5. Implement team creation logic in `core/utils.js`
6. Test team creation

---

### 2.2 Implement `/admin courses remove-teams`
**Goal:** Remove teams from a course

**Requirements:**
- Select course from dropdown
- Show teams in that course
- Select teams to remove (multi-select)
- Delete team roles and channels
- Remove from database

**Implementation Steps:**
1. Add handler in `commands/admin.js` for `remove-teams` subcommand
2. Create course selector dropdown
3. Create team selector (multi-select) for selected course
4. Create event handler for team removal
5. Implement team removal logic
6. Test team removal

---

### 2.3 Implement `/admin courses clear`
**Goal:** Reset a course without deleting it

**Requirements:**
- Select course from dropdown
- Confirmation prompt (this is destructive)
- Remove all students from course (remove roles)
- Clear all channel messages (or archive)
- Keep course structure intact
- Option to remove teams or keep them

**Implementation Steps:**
1. Add handler in `commands/admin.js` for `clear` subcommand
2. Create course selector dropdown
3. Create confirmation modal
4. Implement student removal logic
5. Implement channel clearing logic
6. Test course clearing

---

## Phase 3: Role-Based Permission System

### 3.1 Create Course Management Role
**Goal:** Separate permission for course/team management (not just moderator)

**Requirements:**
- New permission check: `isCourseManagerOrAbove()`
- Check for specific role (e.g., "Course Manager" or "Faculty")
- Or check for specific permission flag
- Update admin commands to use new permission check

**Implementation Steps:**
1. Add environment variable: `DISCORD_COURSE_MANAGER_ROLE_ID` (optional)
2. Create `isCourseManagerOrAbove()` function in `core/permissions.js`
3. Update `commands/admin.js` to use new permission check
4. Update permission checks in command handler
5. Document the role requirement

**Permission Options:**
- Option A: Check for specific Discord role ID
- Option B: Check for `MANAGE_ROLES` permission
- Option C: Check for custom permission flag

---

## Phase 4: Standard Course Template

### 4.1 Update Course Creation Template
**Goal:** Standardize course structure with Announcements, Discussion, and configurable teams

**Current Structure:**
- Category
- Announcements channel
- General channel

**New Standard Structure:**
- Category
- Announcements channel (instructor-only posting)
- Discussion channel (all students can post)
- X number of team channels (configurable)

**Implementation Steps:**
1. Update `createCourseChannels()` in `events/addCourseModalInteraction.js`
2. Add "Discussion" channel creation
3. Remove or keep "General" channel (decide based on preference)
4. Add team creation during course creation (if number of teams specified)
5. Update course template documentation

**Channel Structure:**
```
[Course Category]
├── 📢 course-announcements (instructor posts only)
├── 💬 course-discussion (all students)
└── [Teams] (if teams are created)
    ├── 🔒 team-1-text
    ├── 🔊 team-1-voice
    └── ...
```

---

## Phase 5: Modal Popups for Parameters

### 5.1 Update Add Course Modal
**Goal:** Add all parameters as modal fields

**Current Fields:**
- Full course name
- Short course name
- Instructors

**New Fields to Add:**
- Number of teams (integer input)
- Course visibility (public/private) - dropdown or text
- Team naming pattern (optional)

**Implementation Steps:**
1. Update `addCourseModalFactory()` in `core/utils.js`
2. Add team count field
3. Add visibility field (if Discord supports dropdowns in modals, otherwise text)
4. Update modal submission handler
5. Pass team count to course creation
6. Create teams during course creation if count > 0

---

### 5.2 Create Add Teams Modal
**Goal:** Modal popup for adding teams to existing course

**Modal Fields:**
- Team names (comma-separated list)
  OR
- Number of teams + naming pattern

**Implementation Steps:**
1. Create `addTeamsModalFactory()` in `core/utils.js`
2. Add handler in `commands/admin.js` to show modal after course selection
3. Create event handler for team modal submission
4. Implement team creation logic
5. Test team creation

---

### 5.3 Update Other Commands with Modals
**Goal:** Use modals for any command that needs user input

**Commands to Consider:**
- Any command that currently uses text input could use modals
- Review all commands for modal opportunities

---

## Phase 6: Detailed Help System

### 6.1 Implement Command-Specific Help
**Goal:** `/help <command>` shows detailed help for that command

**Examples:**
- `/help admin` - Shows detailed admin command help
- `/help join` - Shows detailed join command help
- `/help` - Shows general help (current behavior)

**Implementation Steps:**
1. Update `commands/help.js` to accept optional command parameter
2. Create help content for each command
3. Create detailed help embeds with:
   - Command syntax
   - All subcommands/options
   - Examples
   - Use cases
   - Permission requirements
4. Test help system

**Help Content Structure:**
```javascript
const commandHelp = {
  admin: {
    description: "Manage courses and teams",
    subcommands: {
      "courses add": { ... },
      "courses remove": { ... },
      // etc.
    },
    examples: [ ... ],
    permissions: "Course Manager or Moderator"
  },
  // ... other commands
}
```

---

## Implementation Priority

### High Priority (Core Functionality)
1. ✅ Fix existing commands
2. Implement `/admin courses add-teams`
3. Implement `/admin courses remove-teams`
4. Create role-based permission system

### Medium Priority (User Experience)
5. Standardize course template
6. Update add course modal with all parameters
7. Implement detailed help system

### Low Priority (Nice to Have)
8. Implement `/admin courses clear`
9. Additional modal improvements
10. Enhanced error messages

---

## Technical Details

### Permission System Design

**Current:**
- `isModeratorOnly` flag on commands
- Checks for `ADMINISTRATOR` or `MANAGE_GUILD` permissions

**Proposed:**
```javascript
// New permission flags
isModeratorOnly: true,        // Requires moderator/admin
isCourseManagerOnly: true,    // Requires course manager role or moderator
isInstructorOnly: true,       // Requires instructor role for specific course
```

**Permission Hierarchy:**
1. Administrator (highest)
2. Moderator
3. Course Manager (new)
4. Instructor (course-specific)
5. Student (lowest)

### Course Template Structure

**Standard Template:**
```
[Course Title Category]
├── 📢 {shortTitle}-announcements
│   └── Instructor posts only
├── 💬 {shortTitle}-discussion
│   └── All students can post
└── [Teams] (if teams created)
    ├── 🔒 {shortTitle}-team-{name}-text
    ├── 🔊 {shortTitle}-team-{name}-voice
    └── ...
```

### Modal Design Pattern

**All modals should:**
- Use clear labels
- Include placeholders/examples
- Validate input
- Show helpful error messages
- Support all required fields

---

## Testing Checklist

For each new feature:
- [ ] Test with valid inputs
- [ ] Test with invalid inputs
- [ ] Test permission checks
- [ ] Test error handling
- [ ] Test edge cases
- [ ] Verify database changes
- [ ] Verify Discord changes (roles, channels)
- [ ] Test with multiple users
- [ ] Document in USER_GUIDE.md

---

## Next Steps

1. **Start with Phase 1** - Verify all commands work
2. **Then Phase 3** - Implement role-based permissions (foundation for other features)
3. **Then Phase 2** - Complete remaining admin commands
4. **Then Phase 4** - Standardize course template
5. **Then Phase 5** - Add modal popups
6. **Finally Phase 6** - Detailed help system

---

## Notes

- All new features should maintain backward compatibility
- Database migrations may be needed for new fields
- Consider adding logging for all admin actions
- Add confirmation prompts for destructive actions
- Keep user experience consistent across all commands

