# Discord Bot Breaking Changes Report

## Summary

Your bot is using **Discord.js v13.7.0**, but the current stable version is **v14.25.1**. Discord.js v14 introduced major breaking changes that prevent your bot from working with the current Discord API.

## Major Breaking Changes

### 1. **Intents API Changed** ❌

**Location:** `index.js:14`

**Current Code:**

```javascript
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });
```

**Issue:** `Intents.FLAGS` no longer exists in v14. It's been replaced with `GatewayIntentBits`.

**Fix Required:**

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
```

---

### 2. **MessageButton and MessageActionRow Deprecated** ❌

**Locations:**

- `commands/test.js:4-5`
- `commands/admin.js:4-5`
- `events/guildMemberAdd.js:3`
- `events/joinCourseSelectInteraction.js:4`
- `events/joinCourseTeamSelectInteraction.js:3`
- `events/leaveCourseSelectInteraction.js:3`
- `events/leaveCourseTeamSelectInteraction.js:3`
- `core/utils.js:58-60, 73, 94`

**Issue:** `MessageButton` and `MessageActionRow` were removed. They're now `ButtonBuilder` and `ActionRowBuilder` from `@discordjs/builders`.

**Fix Required:**

```javascript
// OLD (v13)
const { MessageButton, MessageActionRow } = require('discord.js');
const button = new MessageButton()...
const row = new MessageActionRow()...

// NEW (v14)
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const button = new ButtonBuilder()...
const row = new ActionRowBuilder()...
```

**Additional Changes:**

- Button styles changed from strings (`'PRIMARY'`) to enum (`ButtonStyle.Primary`)
- URL buttons use `ButtonBuilder.setURL()` instead of `setStyle('LINK')`

---

### 3. **MessageSelectMenu Deprecated** ❌

**Locations:**

- `events/guildMemberAdd.js:4, 47`
- `events/joinCourseSelectInteraction.js:5`
- `events/joinCourseTeamSelectInteraction.js:4`
- `events/leaveCourseSelectInteraction.js:4`
- `events/leaveCourseTeamSelectInteraction.js:4`
- `commands/join.js:5`
- `commands/leave.js:5`
- `core/utils.js:74, 95`

**Issue:** `MessageSelectMenu` was replaced with `StringSelectMenuBuilder` (or `SelectMenuBuilder`).

**Fix Required:**

```javascript
// OLD (v13)
const { MessageSelectMenu } = require('discord.js');
const menu = new MessageSelectMenu()...

// NEW (v14)
const { StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const menu = new StringSelectMenuBuilder()...
```

---

### 4. **Modal and TextInputComponent Deprecated** ❌

**Location:** `core/utils.js:8, 18, 24, 51`

**Issue:** `Modal` and `TextInputComponent` were replaced with builders.

**Fix Required:**

```javascript
// OLD (v13)
const modal = new Discord.Modal()...
const input = new Discord.TextInputComponent()...

// NEW (v14)
const { ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const modal = new ModalBuilder()...
const input = new TextInputBuilder()...
```

**Additional Changes:**

- Text input styles changed from strings (`'SHORT'`) to enum (`TextInputStyle.Short`)

---

### 5. **Channel Type Constants Changed** ❌

**Locations:**

- `core/utils.js:116`
- `events/addCourseModalInteraction.js:59, 67`

**Current Code:**

```javascript
child.type === 'GUILD_TEXT'
type: 'GUILD_TEXT',
```

**Issue:** Channel type strings were replaced with `ChannelType` enum.

**Fix Required:**

```javascript
// OLD (v13)
channel.type === 'GUILD_TEXT'
type: 'GUILD_TEXT',

// NEW (v14)
const { ChannelType } = require('discord.js');
channel.type === ChannelType.GuildText
type: ChannelType.GuildText,
```

---

### 6. **Interaction Methods Changed** ⚠️

**Location:** `events/commandInteraction.js:13`

**Current Code:**

```javascript
if (!interaction.isCommand()) return;
```

**Issue:** In v14, this should be `isChatInputCommand()` for slash commands.

**Fix Required:**

```javascript
// OLD (v13)
if (!interaction.isCommand()) return;

// NEW (v14)
if (!interaction.isChatInputCommand()) return;
```

---

### 7. **Component Type Constants Changed** ⚠️

**Location:** `events/guildMemberAdd.js:63`

**Current Code:**

```javascript
componentType: 'SELECT_MENU',
```

**Issue:** Component types changed to enum values.

**Fix Required:**

```javascript
// OLD (v13)
componentType: 'SELECT_MENU',

// NEW (v14)
const { ComponentType } = require('discord.js');
componentType: ComponentType.StringSelect,
```

---

### 8. **API Route Version** ⚠️

**Location:** `deploy-commands.js:4, 33`

**Current Code:**

```javascript
const { Routes } = require('discord-api-types/v9');
const rest = new REST({ version: '9' })...
```

**Issue:** Discord API v9 is outdated. Should use v10.

**Fix Required:**

```javascript
const { Routes } = require('discord-api-types/v10');
const rest = new REST({ version: '10' })...
```

---

## Files That Need Updates

### High Priority (Core Functionality)

1. ✅ `index.js` - Intents
2. ✅ `commands/test.js` - Buttons
3. ✅ `commands/admin.js` - Buttons
4. ✅ `core/utils.js` - Modals, TextInputs, SelectMenus, ChannelTypes
5. ✅ `events/commandInteraction.js` - Interaction checks
6. ✅ `deploy-commands.js` - API version

### Medium Priority (Event Handlers)

7. ✅ `events/guildMemberAdd.js` - SelectMenus, ActionRows, ComponentType
8. ✅ `events/joinCourseSelectInteraction.js` - SelectMenus
9. ✅ `events/joinCourseTeamSelectInteraction.js` - SelectMenus
10. ✅ `events/leaveCourseSelectInteraction.js` - SelectMenus
11. ✅ `events/leaveCourseTeamSelectInteraction.js` - SelectMenus
12. ✅ `events/addCourseModalInteraction.js` - ChannelType
13. ✅ `commands/join.js` - SelectMenus
14. ✅ `commands/leave.js` - SelectMenus

---

## Recommended Migration Steps

1. **Update package.json dependencies:**

   ```json
   "discord.js": "^14.25.1",
   "@discordjs/builders": "^1.7.0",
   "@discordjs/rest": "^2.2.0",
   "discord-api-types": "^0.37.0"
   ```

2. **Run `npm install` to update dependencies**

3. **Update all imports** to use new v14 classes

4. **Replace all deprecated classes** with their v14 equivalents

5. **Update all enum/constant usages** (Intents, ChannelTypes, ButtonStyles, etc.)

6. **Test thoroughly** - v14 has many subtle changes beyond what's listed here

---

## Additional Notes

- Discord.js v14 requires **Node.js 16.9.0 or higher**
- Some methods may have changed signatures
- Error handling and event names may have changed
- Consider reviewing the [Discord.js v14 Guide](https://discordjs.guide/) for complete migration details

---

## Quick Fix Summary

The bot fails because:

1. **Intents.FLAGS** doesn't exist → Use **GatewayIntentBits**
2. **MessageButton/MessageActionRow** don't exist → Use **ButtonBuilder/ActionRowBuilder**
3. **MessageSelectMenu** doesn't exist → Use **StringSelectMenuBuilder**
4. **Modal/TextInputComponent** don't exist → Use **ModalBuilder/TextInputBuilder**
5. **Channel type strings** don't work → Use **ChannelType** enum
6. **isCommand()** changed → Use **isChatInputCommand()**

All of these will cause runtime errors when the bot tries to start or handle interactions.
