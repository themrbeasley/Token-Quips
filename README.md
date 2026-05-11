# Token Quips

![Version](https://img.shields.io/badge/version-2.0.2-blue)
![Foundry](https://img.shields.io/badge/Foundry-v12--v14-orange)
![License](https://img.shields.io/badge/license-GPL--3.0-green)

Make your worlds louder, funnier, more dramatic, and more alive.
**Token Quips** gives tokens the ability to speak, quip, hiss, roar, mutter, or make any other sound automatically based on in-game actions.

Use playlists, roll tables, or custom text to define what a token "says."
Give characters personality. Give monsters flavor. Give your players a little chaos.

> **Lineage:** Token Quips is a continuation of the original *Token Says* module by napolitanod, later maintained by Hanna. That project is no longer actively maintained. Token Quips carries forward full compatibility with Foundry V12+ under a new module ID (`token-quips`) and is licensed under [GPL-3.0](./LICENSE).

---

## Table of Contents

- [Video Overview](#video-overview)
- [Installation](#installation)
- [Why Use Token Quips?](#why-use-token-quips)
- [How It Works](#how-it-works)
- [Configuring Sayings](#configuring-sayings)
- [Token Form Access](#token-form-access)
- [API / Macro Usage](#api--macro-usage)
- [Migrating from Token Says](#migrating-from-token-says)
- [System & Module Compatibility](#system--module-compatibility)
- [Enhancements & Suggestions](#enhancements--suggestions)
- [Acknowledgements](#acknowledgements)

---

## Video Overview

https://youtu.be/6_nBcyni0xs

---

## Installation

1. Open Foundry VTT and navigate to **Add-on Modules**
2. Click **Install Module**
3. Paste the following manifest URL:
   ```
   https://github.com/themrbeasley/Token-Quips/releases/latest/download/module.json
   ```
4. Click **Install** and enable the module in your world

---

## Why Use Token Quips?

| Use Case | Example |
|----------|---------|
| Combat quips | Characters taunt on attack rolls |
| Monster reactions | Dragons roar when taking damage |
| Ambient flavor | NPCs mutter when they move |
| Environmental sounds | Torches crackle, doors creak |
| Dramatic moments | Critical hit one-liners |

### What can sayings be?

- **Text** displayed as chat messages or chat bubbles
- **Audio** from playlists or compendiums
- **Results** from rollable tables
- Any combination of the above

### How can sayings trigger?

- On specific actions (attacks, damage, skill checks, saves)
- On token movement (start or end)
- On combat turns or initiative rolls
- On conditions/effects being added or removed
- Via keyboard prompt (P or Shift+P while hovering a token)
- Via macro/API calls
- In response to another token's actions

### How can sayings be customized?

- Randomized via playlists or rollable tables
- Restricted to specific scenes, actor types, or languages (Polyglot)
- Limited by chance (likelihood percentage) or number of uses
- Prioritized by specificity (action name > generic, token name > wildcard)
- Whispered to specific recipients (GM, owner, players, etc.)

---

## How It Works

Token Quips uses a set of **sayings** that you create for your world. When a token performs an action that matches a saying's trigger, Token Quips automatically generates chat messages, chat bubbles, and/or audio.

Key behaviors:

- Sayings can be **fixed text** or **randomized** using a playlist or rollable table
- **Compendium support** lets you store rollable tables and playlists outside your world data (note: compendium playback can be slow)
- Sayings can be **generic** (any attack roll) or **specific** (attack roll with a Warhammer)
- **Likelihood** controls how often a saying fires (e.g. 10% = only 10% of matching actions)
- When **multiple sayings** qualify, priority follows this order:
   1. Critical hit over damage; critical miss/fumble over attack
   2. Sayings with an action name over those without
   3. Sayings specifying a token name over wildcard matches
   4. Sayings with a language over those without (requires Polyglot)

---

## Configuring Sayings

Each saying is configured on a specific token or actor by name, for a given action type. The saying triggers when that token or actor performs the matching action.

### Basic Fields

| Field | Description |
|-------|-------------|
| **Title** | Display name shown in the sayings list |
| **Token Names** | Case-sensitive token name(s). Supports multiple names delimited by your separator (e.g. `Goblin\|Witch\|Werewolf`). Check **Wildcard** for `*` pattern matching |
| **Use Actor Name** | Match on the actor name instead of the token name |
| **Not Listed Names** | Invert the token names list (trigger for everyone *except* listed names) |
| **Actor Type** | Optionally restrict to a specific actor type |
| **Language** | Output in a specific language (requires Polyglot) |

### Action Types

| Action Type | Trigger | Action Name |
|-------------|---------|-------------|
| Ability Check | Ability check roll | Select ability (dnd5e) |
| Attack Roll | Attack roll | Item name (e.g. Longbow) |
| Condition/Effect Added | Effect added or toggled on | Effect/condition name |
| Condition/Effect Removed | Effect removed or toggled off | Effect/condition name |
| Critical Hit | Critical hit on damage | Item name |
| Critical Miss/Fumble | Natural 1 on attack | Item name |
| Damage Roll | Damage roll | Item name |
| Initiative Roll | Initiative roll | Leave blank |
| Item Name | Item rolled | Item name (e.g. Action Surge) |
| Macro (API) | Triggered by macro | See [API section](#api--macro-usage) |
| Prompt | P key on token | Scene name(s) (optional) |
| Prompt Other | Shift+P on token | Scene name(s) (optional) |
| Responds to | Another token's action | See Responds To section |
| Saving Throw | Save roll | Select ability (dnd5e) |
| Skill | Skill roll | Select/enter skill |
| Takes Damage | Token takes damage | Minor (<20% HP), Average (20-49%), Major (50%+) |
| Token Movement Start | Token begins moving | Scene name(s) (optional) |
| Token Movement End | Token stops moving | Scene name(s) (optional) |
| Turn in Combat | Start of combat turn | Leave blank |

### Source Fields

| Field | Description |
|-------|-------------|
| **Token Quips** | Fixed text the token says. For audio: track name or file path. Bypasses randomization |
| **Playlist / Rollable Table Name** | Name of the source. Plays a random entry unless Token Quips field is filled |
| **Compendium** | Override the default compendium for this saying |

### Behavior Fields

| Field | Description |
|-------|-------------|
| **Whisper to** | GM, Token Owner, GM and Token Owner, GM and Non-Token Owner Players, non-GM Players, or Everybody |
| **Play** | Sequential (once or looped) or Random. For rollable tables, also supports honoring draw-with-replacement |
| **Delay** | Milliseconds to wait before the saying fires |
| **Volume** | Audio volume for this saying |
| **Activation Conditions** | Active effects/conditions the token must have for the saying to trigger. Supports wildcards |
| **Likelihood** | Percentage chance (1-100) the saying fires when triggered |
| **Limit** | Maximum number of times a token instance will trigger this saying |
| **Macro** | World macro to execute when the saying triggers |

### Movement-Specific Fields (Token Movement Start + Audio)

| Field | Description |
|-------|-------------|
| **Only While Moving** | Audio plays only during movement animation |
| **Minimum Movement Time** | Skip audio if estimated movement time is below this (ms) |
| **Alternate Audio Track** | Play this track instead when minimum time isn't met |

### Suppress Options

| Field | Description |
|-------|-------------|
| **Suppress Chat Bubble** | No chat bubble for this saying |
| **Suppress Chat Message** | No chat message for this saying |
| **Suppress Quotes** | Don't wrap the chat message in quotes |
| **Suppress Pan** | Don't pan to speaker |

### Responds To Section

Available when Action Type is set to "Responds to":

| Field | Description |
|-------|-------------|
| **Action Type** | The action being responded to |
| **Action Name** | Name of the action being responded to |
| **Token Names** | Token(s) being responded to (supports multiple, wildcards) |
| **Use Actor Name** | Match on actor name of the token being responded to |
| **Not Listed Names** | Invert the list |
| **Only If In Sight** | Requires line of sight (center-based, walls block) |
| **Distance** | Maximum distance to the other token (0 = infinite) |

---

## Token Form Access

To access Token Quips for a specific token or actor:

1. Open the Token or Prototype Token configuration
2. Click the **three-dot menu** beside the "X"
3. Choose **Token Quips**

This opens the sayings editor filtered to that token's name.

---

## API / Macro Usage

### `tokenSays.says()` - Trigger a saying by name

```javascript
await tokenSays.says(tokenId, actorId, actionName);
```

Triggers a saying with Action Type = "Macro (API)" that matches the token/actor and action name.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `tokenId` | One of tokenId/actorId | `token.id` |
| `actorId` | One of tokenId/actorId | `actor.id` (derived from token if omitted) |
| `actionName` | Yes | Must match the saying's Action Name. If the saying's Action Name is blank, it matches any `actionName` |

**Returns:** The Token Quips saying data for the matched saying.

### `tokenSays.saysDirect()` - Speak without a pre-configured saying

```javascript
await tokenSays.saysDirect(tokenId, actorId, sceneId, options);
```

Generates a Token Quips message directly from parameters, without referencing existing sayings.

| Parameter | Required | Description |
|-----------|----------|-------------|
| `tokenId` | One of tokenId/actorId | `token.id` |
| `actorId` | One of tokenId/actorId | `actor.id` |
| `sceneId` | No | `scene.id` (defaults to current scene) |
| `options` | Yes | Configuration object (see below) |

**Returns:** The Token Quips workflow class that generated the saying.

#### Options Object

```javascript
const options = {
    audio: {
        compendium: '',     // Compendium ID (e.g. 'token-quips.token-quips')
        source: '',         // Playlist name (random track if quote is blank)
        quote: ''           // Track name in playlist, or direct file path
    },
    chat: {
        compendium: '',     // Compendium ID for rollable table
        source: '',         // Rollable table name
        quote: 'Hello!'     // Direct text to say
    },
    delay: 0,               // Delay in ms before saying fires
    lang: '',               // Language code (requires Polyglot)
    likelihood: 100,        // Percent chance (0-100)
    suppress: {
        bubble: false,      // Suppress chat bubble
        message: false,     // Suppress chat message
        quotes: false       // Don't wrap in quotes
    },
    volume: 0.50            // Audio volume (0.01 - 1.00)
}
```

---

## Migrating from Token Says

If you previously used **Token Says**, Token Quips can automatically migrate your data.

### What gets migrated

- All world sayings (rules)
- All configuration settings (separator, pan, audio duration, conditions, etc.)
- Player-created sayings (per-user flags)
- Per-token data (play counts, limits) across all scenes

### How it works

1. Install and activate Token Quips
2. On the first world load, a dialog will ask if you want to migrate your Token Says data
3. Choose **Migrate** to start the process -- a backup is created automatically before any data is modified
4. A summary shows what was migrated and offers a backup download
5. If Token Says is still active, you will be prompted to deactivate it

### Manual migration

You can trigger migration at any time from module settings:

1. Open **Game Settings** > **Module Settings**
2. Find the **Token Quips** section
3. Click the **Migrate** button

> The Migrate button is always visible in module settings. If Token Says is not installed, it will let you know there is nothing to migrate.

### Backup and recovery

A backup of your original Token Says data is automatically saved to Token Quips module settings before migration begins. You can also download this backup as a JSON file from the migration summary dialog.

### After migration

Once migration is complete, you can safely uninstall Token Says from your module list. Your original Token Says data is left untouched in the world database -- uninstalling the module will clean it up.

---

## System & Module Compatibility

### Supported Game Systems

| System | Notes |
|--------|-------|
| **D&D 5e** | Full support including ability checks, saves, skills, attack/damage rolls |
| **PF2e** | Full support including conditions, effects, skills |
| **PF1** | Base support |
| **Crooked Falls** | Full support including agility, intellect, willpower, fog defense, interference, equipment, powers |

### Compatible Modules

| Module | Integration |
|--------|-------------|
| **Midi-QOL** | Expanded attack and damage roll triggers (not required for base functionality) |
| **Polyglot** | Language-specific chat output |

---

## Enhancements & Suggestions

Have an idea to improve Token Quips?
Submit feature requests or bug reports:

**[GitHub Issues](https://github.com/themrbeasley/Token-Quips/issues)**

Community feedback drives development.

---

## Maintenance

This module is actively maintained with the assistance of [Claude Code](https://claude.com/claude-code), Anthropic's AI coding tool.
Claude Code assists with code review, refactoring, bug fixes, and compatibility updates.
All changes are reviewed and approved by the module maintainer before being merged.

---

## Acknowledgements

Token Quips is a GPL-3.0 fork of *Token Says*, originally created by **napolitanod** and later maintained by **Hanna** and **DianeOfTheMoon**. Their work made this possible.

This fork was created because the upstream project was abandoned and no longer compatible with modern Foundry versions. Token Quips carries forward the full feature set with V12+ compatibility, bug fixes, and new capabilities.
