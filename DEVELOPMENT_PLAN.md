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
7. Advanced tooling and documentation (DeepSource, TypeDoc, CodeAnt AI, Docusaurus)

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

## Phase 7: Advanced Tooling & Documentation

### 7.1 DeepSource - AI Code Quality

**Goal:** Automated code quality platform with static analysis and security vulnerability detection

**Purpose:**

- Static code analysis for JavaScript
- Security vulnerability detection
- Test coverage tracking
- Metrics tracking over time
- Auto-fix PRs (optional)

**Implementation Steps:**

1. Sign up at [DeepSource.com](https://deepsource.com) with GitHub account
2. Install DeepSource GitHub App
3. Enable for ITWSDiscordBot repository
4. Create `.deepsource.toml` configuration file
5. Configure analysis settings:
   - Enable JavaScript analyzer
   - Set up test coverage tracking
   - Configure auto-fix (optional, can be disabled)
6. Verify DeepSource analyzes PRs automatically

**Configuration:**

- Exclude: `node_modules/`, `build/`, `dist/`, `coverage/`, `*.test.js`
- Enable: Static analysis, security scanning, test coverage
- Cost: FREE for open source repositories

**Expected Benefits:**

- Automated code quality checks on every PR
- Security vulnerability detection beyond npm audit
- Test coverage metrics
- Code quality trends over time

---

### 7.2 TypeDoc - API Documentation Generator

**Goal:** Auto-generate API documentation from JSDoc comments in code

**Purpose:**

- Generate HTML documentation from JSDoc comments
- Create searchable API reference
- Improve code documentation quality
- Standardize documentation format

**Implementation Steps:**

1. Install TypeDoc as dev dependency: `npm install --save-dev typedoc`
2. Create `typedoc.json` configuration file
3. Add npm script: `"docs": "typedoc --out docs/api ."`
4. Update JSDoc comments in code:
   - Add JSDoc to all exported functions
   - Include parameter types and descriptions
   - Add return types and examples
   - Document error cases
5. Generate initial documentation: `npm run docs`
6. Add documentation generation to CI (optional)
7. Configure output directory (e.g., `docs/api/`)

**JSDoc Example:**

```javascript
/**
 * Creates a new course in the Discord server
 *
 * @param {import('discord.js').Guild} guild - The Discord guild/server
 * @param {string} courseName - Full course name
 * @param {string} shortName - Short course identifier
 * @param {string[]} instructorIds - Array of instructor Discord user IDs
 * @returns {Promise<Object>} The created course object with roles and channels
 * @throws {Error} If course creation fails
 *
 * @example
 * const course = await createCourse(guild, 'Intro to ITWS', 'intro', ['123456789']);
 */
async function createCourse(guild, courseName, shortName, instructorIds) {
  // implementation
}
```

**Configuration:**

- Output: `docs/api/`
- Entry points: `commands/`, `core/`, `events/`
- Exclude: `node_modules/`, `test.js`, `deploy-commands.js`
- Theme: Default or custom
- Cost: FREE

**Expected Benefits:**

- Centralized API documentation
- Easier onboarding for new developers
- Better code maintainability
- Searchable documentation

---

### 7.3 CodeAnt AI - AI Code Review (Optional)

**Goal:** AI-powered code review with natural language explanations

**Purpose:**

- AI reviews PRs automatically
- Detects bugs, security issues, performance problems
- Natural language explanations
- Learning from codebase patterns
- Auto-fix suggestions (manual approval required)

**Implementation Steps:**

1. Install [CodeAnt AI GitHub App](https://github.com/apps/codeant)
2. Enable for ITWSDiscordBot repository
3. Create `.codeant.yml` configuration file
4. Configure settings:
   - Mode: Advisory (non-blocking) or Required (blocking)
   - Severity threshold: Medium or High
   - Auto-fix: Enabled with manual merge approval
5. Test with a sample PR
6. Adjust configuration based on results

**Configuration Options:**

```yaml
# .codeant.yml
mode: advisory # or 'required'
severity: medium # or 'high'
auto_fix: true
require_approval: true # Manual merge required for auto-fixes
```

**Expected Benefits:**

- Additional code review layer
- Natural language explanations
- Catches issues ESLint/DeepSource might miss
- Learning from codebase patterns

**Cost:** Custom pricing (trial available)

**Status:** Optional - Evaluate after DeepSource is set up

---

### 7.4 Docusaurus - Documentation Site

**Goal:** Convert existing markdown documentation into searchable website

**Purpose:**

- Create searchable documentation website
- Versioning support for documentation
- Beautiful, responsive UI
- Free hosting options (GitHub Pages, Vercel, Netlify)

**Current Documentation:**

- `README.md`
- `SETUP.md`
- `DEPLOYMENT.md`
- `QUICK_START.md`
- `USER_GUIDE.md`
- `DEVOPS.md`
- `DEVELOPMENT_PLAN.md`

**Implementation Steps:**

1. Install Docusaurus: `npx create-docusaurus@latest docs-site classic --typescript`
2. Configure `docusaurus.config.js`:
   - Set project name and tagline
   - Configure GitHub pages deployment
   - Set up navigation structure
3. Migrate existing documentation:
   - Copy markdown files to `docs-site/docs/`
   - Organize by category (Setup, Deployment, User Guide, etc.)
   - Convert to Docusaurus format if needed
4. Create documentation structure:
   ```
   docs/
   ├── getting-started/
   │   ├── setup.md
   │   └── quick-start.md
   ├── deployment/
   │   ├── deployment.md
   │   └── cloud-run.md
   ├── user-guide/
   │   └── commands.md
   ├── development/
   │   ├── devops.md
   │   └── development-plan.md
   └── api/
       └── (generated from TypeDoc)
   ```
5. Set up deployment:
   - Option A: GitHub Pages (free)
   - Option B: Vercel (free)
   - Option C: Netlify (free)
6. Configure CI/CD to deploy docs on changes
7. Add search functionality
8. Set up versioning (if needed)

**Configuration:**

- Theme: Classic or custom
- Search: Algolia DocSearch (free for open source) or local search
- Deployment: GitHub Actions to GitHub Pages
- Cost: FREE

**Expected Benefits:**

- Searchable documentation
- Better user experience
- Professional documentation site
- Versioning support
- Easy to maintain and update

**Priority:** Lower priority - Evaluate need based on documentation growth

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
8. Implement DeepSource (Phase 7.1)
9. Implement TypeDoc (Phase 7.2)

### Low Priority (Nice to Have)

10. Implement `/admin courses clear`
11. Additional modal improvements
12. Enhanced error messages
13. Implement CodeAnt AI (Phase 7.3) - Optional
14. Implement Docusaurus (Phase 7.4) - Evaluate need

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

### Feature Development

1. **Start with Phase 1** - Verify all commands work
2. **Then Phase 3** - Implement role-based permissions (foundation for other features)
3. **Then Phase 2** - Complete remaining admin commands
4. **Then Phase 4** - Standardize course template
5. **Then Phase 5** - Add modal popups
6. **Finally Phase 6** - Detailed help system

### Tooling & Documentation

7. **Phase 7.1** - Set up DeepSource (High priority, free, high value)
8. **Phase 7.2** - Set up TypeDoc (Medium priority, improves documentation)
9. **Phase 7.3** - Evaluate CodeAnt AI (Optional, after DeepSource)
10. **Phase 7.4** - Evaluate Docusaurus (Low priority, based on need)

---

## Notes

- All new features should maintain backward compatibility
- Database migrations may be needed for new fields
- Consider adding logging for all admin actions
- Add confirmation prompts for destructive actions
- Keep user experience consistent across all commands

### Tooling Notes

- **DeepSource**: Can be set up in parallel with feature development
- **TypeDoc**: Requires adding JSDoc comments to existing code (can be done incrementally)
- **CodeAnt AI**: Optional, evaluate after other tools are in place
- **Docusaurus**: Only implement if documentation becomes extensive or needs better discoverability
- All tooling should exclude: `node_modules/`, `build/`, `dist/`, `coverage/`, test files
- Tooling setup can happen in parallel with feature development phases
