# Token Says to Token Quips Data Migration

**Version**: 2.0.1  
**Date**: 2026-05-10  
**Status**: Approved

## Overview

Token Quips is a successor module forked from a V13-compatible patch of Token Says. Users upgrading from Token Says need a way to migrate their existing sayings, configuration, and per-token data to Token Quips. This feature provides a guided, phased migration with backup, progress feedback, and optional cleanup.

## Goals

- Detect old Token Says data on first Token Quips load and offer migration
- Migrate all three data layers: world settings, user flags, and token flags
- Provide backup before any writes
- Show progress for large worlds
- Allow manual re-trigger from module settings
- Support "don't ask again" dismissal
- Prompt to deactivate Token Says after migration

## Non-Goals

- Deleting old Token Says data (left in place for safety)
- Uninstalling the Token Says module (user's responsibility)
- Transforming data schema (the data shape is identical between modules)

## Architecture

### New File

`scripts/apps/migration.js` — self-contained migration class with methods for each phase. Isolated from core module logic.

### Detection & Gating

**Module detection**: `game.modules.get('token-says')` returns the module object whether active or not. Returns `undefined` if Token Says is not installed.

**Gating logic** (evaluated on `Hooks.once('ready')`, GM only):
1. If `!game.user.isGM` → skip entirely (only GMs can perform migration)
2. If `game.modules.get('token-says')` is `undefined` → skip everything, hide migration button in settings
3. If Token Says is detected AND `migrationDismissed` client setting is `false` → show migration prompt
4. If Token Says is detected AND `migrationDismissed` is `true` → no auto-prompt, but manual button is available in settings

**Dual-active warning**: If `game.modules.get('token-says')?.active` is `true`, show a warning notification: "Token Says is also active — this may cause duplicate behavior. Please disable it."

### New Settings

Registered in the `init` hook:

| Setting | Type | Scope | Config | Default | Purpose |
|---------|------|-------|--------|---------|---------|
| `migrationDismissed` | Boolean | client | false | `false` | Suppresses auto-prompt when `true` |
| `migration-backup` | Object | world | false | `{}` | Stores pre-migration backup data |

### Settings Menu Entry

Registered conditionally in `init`, only when Token Says is detected:

```js
if (game.modules.get('token-says')) {
    game.settings.registerMenu(module, "migrateTool", {
        name: /* localized */,
        label: /* localized */,
        icon: "fas fa-file-import",
        type: TokenSaysMigration,  // minimal FormApplication that invokes the migration prompt on render
        restricted: true
    });
}
```

When Token Says is not installed, this menu entry does not appear.

### Data Access

**World settings** — Token Says may be installed but not active, so its settings are not registered. Read from raw settings storage:

```js
const worldSettings = game.settings.storage.get("world");
const oldRules = worldSettings.find(s => s.key === "token-says.rules");
```

All config settings are read the same way: `token-says.separator`, `token-says.isActive`, `token-says.pan`, `token-says.audioDuration`, `token-says.conditions`, `token-says.suppressPrivateGMRoles`, `token-says.suppressImage`, `token-says.tokenHeader`, `token-says.worldAudioInd`, `token-says.defaultAudioCompendium`, `token-says.worldRollableTableInd`, `token-says.defaultRollableTableCompendium`.

**User flags** — `user.getFlag('token-says', 'rules')` works directly on the document regardless of module activation status. Iterate all `game.users`.

**Token flags** — `token.getFlag('token-says', 'saying')` reads directly from the token document. Iterate all `game.scenes`, then all `scene.tokens` per scene.

### Merge Strategy

For all three data layers, merge old data into existing Token Quips data with **Token Quips taking precedence**:

```js
Object.assign({}, oldTokenSaysData, existingTokenQuipsData)
```

Old data goes first so existing Token Quips entries overwrite any conflicts. In practice, this is a first-install scenario so Token Quips data should be empty.

### Backup

**Before any writes**, snapshot all old Token Says data:

```js
{
    timestamp: "2026-05-10T...",
    worldSettings: {
        rules: { /* all sayings */ },
        isActive: true,
        separator: "|",
        /* ...all config keys... */
    },
    userFlags: {
        [userId]: { rules: { /* player sayings */ } },
        /* ...per user... */
    },
    tokenFlags: {
        [sceneId]: {
            [tokenId]: { saying: { /* play counts, limits */ } },
            /* ...per token... */
        },
        /* ...per scene... */
    }
}
```

**Automatic storage**: Saved to `game.settings.set('token-quips', 'migration-backup', backupObj)`.

**Manual download**: Summary dialog includes a "Download Backup" button using Foundry's `saveDataToFile()` utility. Filename: `token-says-backup-YYYY-MM-DD.json`.

## Migration Flow

### Trigger Points

1. **Auto-prompt on `ready` hook** — if Token Says is detected and `migrationDismissed` is `false`
2. **Manual trigger** — "Migrate Token Says Data" button in Token Quips module settings (visible only when Token Says is detected)

### Migration Dialog (Initial Prompt)

- **Title**: "Token Says Data Detected"
- **Body**: Explains that old Token Says data was found and can be migrated
- **Buttons**:
  - "Migrate" — starts the migration process
  - "Not Now" — closes dialog, will prompt again next load
  - "Don't Ask Again" — sets `migrationDismissed` to `true`, closes dialog

### Execution Phases

After user clicks "Migrate", phases execute sequentially:

**Phase 1 — Backup**
- Collect all old Token Says data (world settings, user flags, token flags)
- Save backup to `migration-backup` setting
- If backup save fails, abort migration with error notification

**Phase 2 — World Settings**
- Read all old config settings from raw storage
- Read old `rules` object
- Merge into Token Quips settings via `game.settings.set()`
- Track count of migrated sayings

**Phase 3 — User Flags**
- Iterate `game.users`
- For each user with `token-says` rules flags, merge into `token-quips` rules flags
- Track count of migrated player sayings

**Phase 4 — Token Flags**
- Iterate `game.scenes`
- For each scene, iterate `scene.tokens`
- For each token with `token-says` saying flags, copy to `token-quips` namespace
- Update Foundry V13 progress bar per scene ("Migrating scene 3 of 7...")
- Track count of migrated tokens and scenes

### Summary Dialog (After Completion)

- **Title**: "Migration Complete"
- **Body**: "Migrated X world sayings, Y player sayings, and token data across N scenes. A backup has been saved to module settings."
- **Buttons**:
  - "Download Backup" — triggers JSON file save
  - "Close"

### Deactivation Prompt

Shown immediately after closing the summary dialog, only if `game.modules.get('token-says')?.active` is `true`:

- **Title**: "Deactivate Token Says?"
- **Body**: "Token Says is still active. Having both modules active may cause duplicate behavior. Deactivate Token Says and reload?"
- **Buttons**:
  - "Confirm" — sets `token-says` to `false` in core module configuration, calls `window.location.reload()`
  - "Close" — dismisses, user handles manually

## Localization

New entries in `languages/en.json` under `TOKENSAYS.migration`:

- Dialog titles, body text, and button labels for all three dialogs (prompt, summary, deactivation)
- Progress bar messages
- Warning notification for dual-active state
- Settings menu name and label for the migration button

## README Update

Add a "Migrating from Token Says" section to README.md covering:

- What gets migrated (sayings, configuration, per-token data)
- The automatic prompt on first load
- The manual migration button in settings
- Backup and recovery information
- Recommendation to uninstall Token Says after migration

## Error Handling

- If backup save fails → abort with error notification, no data is modified
- If any migration phase fails → the backup is already saved, show error with note that partial migration occurred and backup is available
- If progress bar API is unavailable (older Foundry version) → degrade gracefully, skip progress updates
