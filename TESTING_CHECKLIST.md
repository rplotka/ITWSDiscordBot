# Command Testing Checklist

Use this checklist to systematically test all bot commands. Test each command and note any issues.

## Basic Commands (No Database Required)

### ✅ `/help`

- [ ] Command appears in Discord
- [ ] Shows list of all available commands
- [ ] Shows which commands are moderator-only
- [ ] Response appears quickly (within 1-2 seconds)

### ✅ `/test`

- [ ] Command appears in Discord (moderator only)
- [ ] Requires "Send Role Button" option
- [ ] Sends role selection buttons to channel
- [ ] Shows success message
- [ ] Role buttons work when clicked

## Join Commands (Database Required)

### ✅ `/join course`

- [ ] Command appears in Discord
- [ ] Shows "itws-bot is thinking..." immediately
- [ ] If no courses available: Shows "There are no other courses to join"
- [ ] If courses available: Shows dropdown menu of courses
- [ ] Selecting a course adds you to the course role
- [ ] Shows success message after joining
- [ ] No timeout errors

### ✅ `/join team`

- [ ] Command appears in Discord
- [ ] Shows "itws-bot is thinking..." immediately
- [ ] If no teams available: Shows appropriate message
- [ ] If teams available: Shows dropdown menu of teams
- [ ] Selecting a team adds you to the team role
- [ ] Shows success message after joining
- [ ] No timeout errors

## Leave Commands (Database Required)

### ✅ `/leave course`

- [ ] Command appears in Discord
- [ ] Shows "itws-bot is thinking..." immediately
- [ ] If not in any courses: Shows "You are not in any courses"
- [ ] If in courses: Shows dropdown menu of courses you're in
- [ ] Selecting a course removes you from the course role
- [ ] Shows success message after leaving
- [ ] No timeout errors

### ✅ `/leave team`

- [ ] Command appears in Discord
- [ ] Shows "itws-bot is thinking..." immediately
- [ ] If not in any teams: Shows "You are not in any course teams"
- [ ] If in teams: Shows dropdown menu of teams you're in
- [ ] Selecting a team removes you from the team role
- [ ] Shows success message after leaving
- [ ] No timeout errors

## Admin Commands (Moderator Only, Database Required)

### ✅ `/admin courses add`

- [ ] Command appears in Discord (moderator only)
- [ ] Shows modal popup immediately
- [ ] Modal has fields for course title, short title, instructors, etc.
- [ ] Submitting modal creates course
- [ ] Course role and channels are created
- [ ] Shows success message
- [ ] Course appears in `/join course` dropdown

### ✅ `/admin courses remove`

- [ ] Command appears in Discord (moderator only)
- [ ] Shows "itws-bot is thinking..." immediately
- [ ] If no courses: Shows "There are no courses to remove"
- [ ] If courses exist: Shows dropdown menu of courses
- [ ] Selecting a course removes it
- [ ] Course role and channels are deleted
- [ ] Shows success message
- [ ] Course no longer appears in `/join course` dropdown
- [ ] No timeout errors

### ⏳ `/admin courses add-teams`

- [ ] Command appears in Discord (moderator only)
- [ ] Shows "Coming soon!" message (not yet implemented)

### ⏳ `/admin courses remove-teams`

- [ ] Command appears in Discord (moderator only)
- [ ] Shows "Coming soon!" message (not yet implemented)

### ⏳ `/admin courses clear`

- [ ] Command appears in Discord (moderator only)
- [ ] Shows "Coming soon!" message (not yet implemented)

## Testing Notes

### Expected Behaviors:

- All database commands should show "itws-bot is thinking..." within 1-2 seconds
- Commands should complete within 5-10 seconds maximum
- Error messages should be clear and helpful
- Timeout errors should not occur

### Common Issues to Watch For:

- ❌ "The application did not respond" - indicates timeout issue
- ❌ "Database is not available" - database connection issue
- ❌ "Database query timed out" - slow database query
- ❌ Commands not appearing - command deployment issue
- ❌ Permission errors - role/permission configuration issue

### Test Order:

1. Test `/help` first to see all commands
2. Test `/admin courses add` to create a test course
3. Test `/join course` to join the test course
4. Test `/join team` (if teams exist)
5. Test `/leave team` (if you joined a team)
6. Test `/leave course` to leave the test course
7. Test `/admin courses remove` to clean up

## Results

Date: ******\_\_\_******
Tester: ******\_\_\_******

| Command                 | Status            | Notes |
| ----------------------- | ----------------- | ----- |
| `/help`                 | ⬜ Pass / ⬜ Fail |       |
| `/test`                 | ⬜ Pass / ⬜ Fail |       |
| `/join course`          | ⬜ Pass / ⬜ Fail |       |
| `/join team`            | ⬜ Pass / ⬜ Fail |       |
| `/leave course`         | ⬜ Pass / ⬜ Fail |       |
| `/leave team`           | ⬜ Pass / ⬜ Fail |       |
| `/admin courses add`    | ⬜ Pass / ⬜ Fail |       |
| `/admin courses remove` | ⬜ Pass / ⬜ Fail |       |
