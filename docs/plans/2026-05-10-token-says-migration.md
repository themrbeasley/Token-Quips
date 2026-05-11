# Token Says Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a data migration feature that detects old Token Says data and offers a guided, phased migration to Token Quips with backup, progress feedback, and cleanup prompts.

**Architecture:** A self-contained `TokenSaysMigration` class in `scripts/apps/migration.js` handles all migration logic. It is wired into the existing `index.js` via new settings registrations and a `ready` hook gate. Dialogs use Foundry's native `Dialog` API. Progress uses `SceneNavigation.displayProgressBar`.

**Tech Stack:** Foundry VTT V12-14 APIs (game.settings, flags, Dialog, FormApplication, SceneNavigation)

**Spec:** `docs/specs/2026-05-10-token-says-migration-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `scripts/apps/migration.js` | Migration class: detection, backup, data copy, dialogs, settings menu app |
| Modify | `scripts/index.js` | Register migration settings + conditional menu, wire `ready` hook |
| Modify | `languages/en.json` | All migration localization strings |
| Modify | `README.md` | "Migrating from Token Says" section |
| Modify | `module.json` | Version bump to 2.0.1 |

---

### Task 1: Add localization strings

**Files:**
- Modify: `languages/en.json`

All subsequent tasks depend on these i18n keys existing.

- [ ] **Step 1: Add migration entries to en.json**

Add a `migration` block inside the existing `TOKENSAYS` object, after the `"warning"` block (before the final closing braces). Insert immediately before the last `}` of the `TOKENSAYS` object:

```json
    "migration": {
      "prompt": {
        "title": "Token Says Data Detected",
        "body": "An installation of Token Says was detected. Would you like to migrate your Token Says data (sayings, configuration, and per-token data) to Token Quips?",
        "migrate": "Migrate",
        "notNow": "Not Now",
        "dontAskAgain": "Don't Ask Again"
      },
      "summary": {
        "title": "Migration Complete",
        "body": "Migrated {rules} world sayings, {players} player sayings, and token data across {scenes} scenes. A backup has been saved to module settings.",
        "download": "Download Backup",
        "close": "Close"
      },
      "deactivate": {
        "title": "Deactivate Token Says?",
        "body": "Token Says is still active. Having both modules active may cause duplicate behavior. Deactivate Token Says and reload the world?",
        "confirm": "Confirm",
        "close": "Close"
      },
      "progress": "Migrating token data: scene {current} of {total}",
      "error": "Token Says migration failed. A backup was saved to module settings before the error occurred. Check the console for details.",
      "dualActiveWarning": "Token Says is also active — this may cause duplicate behavior. Please disable Token Says.",
      "settingsMenu": {
        "name": "Migrate Token Says Data",
        "label": "Migrate"
      }
    }
```

- [ ] **Step 2: Commit**

```
git add languages/en.json
git commit -m "feat: add migration localization strings"
```

---

### Task 2: Create migration class — detection and data collection

**Files:**
- Create: `scripts/apps/migration.js`

This task creates the migration class with static methods for detecting the old module and reading its data from the world database.

- [ ] **Step 1: Create migration.js with detection and data-reading methods**

```js
import { tokenSays } from '../token-quips.js';

export class TokenSaysMigration {

    static OLD_MODULE_ID = 'token-says';

    static WORLD_SETTINGS_KEYS = [
        'rules', 'isActive', 'separator', 'tokenHeader', 'pan',
        'audioDuration', 'conditions', 'suppressPrivateGMRoles',
        'suppressImage',
        'worldAudioInd', 'defaultAudioCompendium',
        'worldRollableTableInd', 'defaultRollableTableCompendium'
    ];

    static isTokenSaysInstalled() {
        return !!game.modules.get(this.OLD_MODULE_ID);
    }

    static isTokenSaysActive() {
        return game.modules.get(this.OLD_MODULE_ID)?.active ?? false;
    }

    static _getOldWorldSetting(key) {
        const store = game.settings.storage.get("world");
        return store.find(s => s.key === `${this.OLD_MODULE_ID}.${key}`)?.value;
    }

    static _collectOldWorldSettings() {
        const settings = {};
        for (const key of this.WORLD_SETTINGS_KEYS) {
            const value = this._getOldWorldSetting(key);
            if (value !== undefined) settings[key] = value;
        }
        return settings;
    }

    static _collectOldUserFlags() {
        const userFlags = {};
        for (const user of game.users) {
            const rules = user.getFlag(this.OLD_MODULE_ID, 'rules');
            if (rules && Object.keys(rules).length > 0) {
                userFlags[user.id] = { rules };
            }
        }
        return userFlags;
    }

    static _collectOldTokenFlags() {
        const tokenFlags = {};
        for (const scene of game.scenes) {
            const sceneTokens = {};
            for (const token of scene.tokens) {
                const sayingFlags = token.getFlag(this.OLD_MODULE_ID, tokenSays.FLAGS.SAYING);
                if (sayingFlags && Object.keys(sayingFlags).length > 0) {
                    sceneTokens[token.id] = { [tokenSays.FLAGS.SAYING]: sayingFlags };
                }
            }
            if (Object.keys(sceneTokens).length > 0) {
                tokenFlags[scene.id] = sceneTokens;
            }
        }
        return tokenFlags;
    }
}
```

- [ ] **Step 2: Commit**

```
git add scripts/apps/migration.js
git commit -m "feat: add migration class with detection and data collection"
```

---

### Task 3: Add backup and download methods

**Files:**
- Modify: `scripts/apps/migration.js`

Adds the ability to snapshot all old data into a backup setting and download it as JSON.

- [ ] **Step 1: Add backup and download methods to TokenSaysMigration**

Add these methods at the end of the `TokenSaysMigration` class body, after `_collectOldTokenFlags()`:

```js
    static async backup() {
        const backupData = {
            timestamp: new Date().toISOString(),
            worldSettings: this._collectOldWorldSettings(),
            userFlags: this._collectOldUserFlags(),
            tokenFlags: this._collectOldTokenFlags()
        };
        await game.settings.set(tokenSays.ID, 'migration-backup', backupData);
        tokenSays.log(false, 'Migration backup saved', backupData);
        return backupData;
    }

    static downloadBackup() {
        const backupData = game.settings.get(tokenSays.ID, 'migration-backup');
        const date = new Date().toISOString().split('T')[0];
        saveDataToFile(
            JSON.stringify(backupData, null, 2),
            "application/json",
            `token-says-backup-${date}.json`
        );
    }
```

- [ ] **Step 2: Commit**

```
git add scripts/apps/migration.js
git commit -m "feat: add migration backup and download methods"
```

---

### Task 4: Add migration phase methods

**Files:**
- Modify: `scripts/apps/migration.js`

Adds the three data migration methods (world settings, user flags, token flags) and the orchestrating `migrate()` method.

- [ ] **Step 1: Add migrateWorldSettings method**

Add after `downloadBackup()`:

```js
    static async migrateWorldSettings(oldSettings) {
        let rulesCount = 0;

        if (oldSettings.rules) {
            const existingRules = game.settings.get(tokenSays.ID, 'rules');
            const merged = Object.assign({}, oldSettings.rules, existingRules);
            await game.settings.set(tokenSays.ID, 'rules', merged);
            rulesCount = Object.keys(oldSettings.rules).length;
        }

        for (const key of this.WORLD_SETTINGS_KEYS) {
            if (key === 'rules' || !(key in oldSettings)) continue;
            try {
                await game.settings.set(tokenSays.ID, key, oldSettings[key]);
            } catch (e) {
                tokenSays.log(true, `Migration: failed to set '${key}':`, e);
            }
        }

        return { rulesCount };
    }
```

- [ ] **Step 2: Add migrateUserFlags method**

Add after `migrateWorldSettings()`:

```js
    static async migrateUserFlags(oldUserFlags) {
        let playerSayingsCount = 0;

        for (const [userId, data] of Object.entries(oldUserFlags)) {
            const user = game.users.get(userId);
            if (!user || !data.rules) continue;

            const existingRules = user.getFlag(tokenSays.ID, 'rules') ?? {};
            const merged = Object.assign({}, data.rules, existingRules);
            await user.setFlag(tokenSays.ID, 'rules', merged);
            playerSayingsCount += Object.keys(data.rules).length;
        }

        return { playerSayingsCount };
    }
```

- [ ] **Step 3: Add migrateTokenFlags method**

Add after `migrateUserFlags()`. Uses `SceneNavigation.displayProgressBar` for progress with a graceful fallback.

```js
    static async migrateTokenFlags(oldTokenFlags) {
        let tokenCount = 0;
        const sceneIds = Object.keys(oldTokenFlags);
        const totalScenes = sceneIds.length;

        for (let i = 0; i < sceneIds.length; i++) {
            const sceneId = sceneIds[i];
            const scene = game.scenes.get(sceneId);
            if (!scene) continue;

            try {
                SceneNavigation.displayProgressBar({
                    label: game.i18n.format("TOKENSAYS.migration.progress", {
                        current: i + 1,
                        total: totalScenes
                    }),
                    pct: Math.round(((i + 1) / totalScenes) * 100)
                });
            } catch (e) {
                // Progress bar API may not exist on older Foundry versions
            }

            const updates = [];
            for (const [tokenId, flagData] of Object.entries(oldTokenFlags[sceneId])) {
                const token = scene.tokens.get(tokenId);
                if (!token) continue;

                const existingFlags = token.getFlag(tokenSays.ID, tokenSays.FLAGS.SAYING) ?? {};
                const merged = foundry.utils.mergeObject(
                    flagData[tokenSays.FLAGS.SAYING],
                    existingFlags,
                    { inplace: false }
                );
                updates.push({
                    _id: tokenId,
                    [`flags.${tokenSays.ID}.${tokenSays.FLAGS.SAYING}`]: merged
                });
                tokenCount++;
            }

            if (updates.length > 0) {
                await scene.updateEmbeddedDocuments("Token", updates);
            }
        }

        return { tokenCount, sceneCount: totalScenes };
    }
```

Note on merge order: `mergeObject(oldData, existingQuipsData)` means existing Token Quips values overwrite old Token Says values, matching the spec's "Token Quips takes precedence" rule.

- [ ] **Step 4: Add orchestrating migrate() method**

Add after `migrateTokenFlags()`:

```js
    static async migrate() {
        try {
            const backupData = await this.backup();

            const worldResult = await this.migrateWorldSettings(backupData.worldSettings);
            const userResult = await this.migrateUserFlags(backupData.userFlags);
            const tokenResult = await this.migrateTokenFlags(backupData.tokenFlags);

            tokenSays.log(false, 'Migration complete', { worldResult, userResult, tokenResult });

            this.showSummary({
                rulesCount: worldResult.rulesCount,
                playerSayingsCount: userResult.playerSayingsCount,
                tokenCount: tokenResult.tokenCount,
                sceneCount: tokenResult.sceneCount
            });
        } catch (e) {
            console.error(`${tokenSays.ID} | Migration failed:`, e);
            ui.notifications.error(game.i18n.localize("TOKENSAYS.migration.error"));
        }
    }
```

- [ ] **Step 5: Commit**

```
git add scripts/apps/migration.js
git commit -m "feat: add migration phase methods with progress bar"
```

---

### Task 5: Add dialog methods and settings menu app

**Files:**
- Modify: `scripts/apps/migration.js`

Adds the three dialogs (prompt, summary, deactivation), the `checkAndPrompt` entry point, and the minimal `FormApplication` subclass for the settings menu button.

- [ ] **Step 1: Add promptMigration dialog**

Add after `migrate()`:

```js
    static promptMigration() {
        new Dialog({
            title: game.i18n.localize("TOKENSAYS.migration.prompt.title"),
            content: `<p>${game.i18n.localize("TOKENSAYS.migration.prompt.body")}</p>`,
            buttons: {
                migrate: {
                    icon: '<i class="fas fa-file-import"></i>',
                    label: game.i18n.localize("TOKENSAYS.migration.prompt.migrate"),
                    callback: () => this.migrate()
                },
                later: {
                    icon: '<i class="fas fa-clock"></i>',
                    label: game.i18n.localize("TOKENSAYS.migration.prompt.notNow")
                },
                never: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("TOKENSAYS.migration.prompt.dontAskAgain"),
                    callback: () => game.settings.set(tokenSays.ID, 'migrationDismissed', true)
                }
            },
            default: "migrate"
        }).render(true);
    }
```

- [ ] **Step 2: Add showSummary and deactivation dialogs**

Add after `promptMigration()`:

```js
    static showSummary(results) {
        const body = game.i18n.format("TOKENSAYS.migration.summary.body", {
            rules: results.rulesCount,
            players: results.playerSayingsCount,
            scenes: results.sceneCount
        });

        new Dialog({
            title: game.i18n.localize("TOKENSAYS.migration.summary.title"),
            content: `<p>${body}</p>`,
            buttons: {
                download: {
                    icon: '<i class="fas fa-download"></i>',
                    label: game.i18n.localize("TOKENSAYS.migration.summary.download"),
                    callback: () => {
                        this.downloadBackup();
                        this._afterSummary();
                    }
                },
                close: {
                    icon: '<i class="fas fa-check"></i>',
                    label: game.i18n.localize("TOKENSAYS.migration.summary.close"),
                    callback: () => this._afterSummary()
                }
            },
            default: "close"
        }).render(true);
    }

    static _afterSummary() {
        if (this.isTokenSaysActive()) {
            this.promptDeactivation();
        }
    }

    static promptDeactivation() {
        new Dialog({
            title: game.i18n.localize("TOKENSAYS.migration.deactivate.title"),
            content: `<p>${game.i18n.localize("TOKENSAYS.migration.deactivate.body")}</p>`,
            buttons: {
                confirm: {
                    icon: '<i class="fas fa-power-off"></i>',
                    label: game.i18n.localize("TOKENSAYS.migration.deactivate.confirm"),
                    callback: async () => {
                        const config = game.settings.get("core", "moduleConfiguration");
                        config[this.OLD_MODULE_ID] = false;
                        await game.settings.set("core", "moduleConfiguration", config);
                        window.location.reload();
                    }
                },
                close: {
                    icon: '<i class="fas fa-times"></i>',
                    label: game.i18n.localize("TOKENSAYS.migration.deactivate.close")
                }
            },
            default: "confirm"
        }).render(true);
    }
```

- [ ] **Step 3: Add checkAndPrompt entry point**

Add after `promptDeactivation()`:

```js
    static checkAndPrompt() {
        if (!game.user.isGM) return;
        if (!this.isTokenSaysInstalled()) return;

        if (this.isTokenSaysActive()) {
            ui.notifications.warn(game.i18n.localize("TOKENSAYS.migration.dualActiveWarning"));
        }

        if (!game.settings.get(tokenSays.ID, 'migrationDismissed')) {
            this.promptMigration();
        }
    }
```

- [ ] **Step 4: Add TokenSaysMigrationApp for settings menu**

Add after the `TokenSaysMigration` class closing brace, still in the same file:

```js
export class TokenSaysMigrationApp extends FormApplication {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "token-quips-migration"
        });
    }

    async _updateObject() {}

    render(force, options) {
        TokenSaysMigration.promptMigration();
        return this;
    }
}
```

- [ ] **Step 5: Commit**

```
git add scripts/apps/migration.js
git commit -m "feat: add migration dialogs and settings menu app"
```

---

### Task 6: Wire migration into index.js

**Files:**
- Modify: `scripts/index.js`

Register the two new settings, the conditional menu entry, and call the migration check on `ready`.

- [ ] **Step 1: Add import**

At the top of `scripts/index.js`, after the existing import of `says` (line 8), add:

```js
import { TokenSaysMigration, TokenSaysMigrationApp } from "./apps/migration.js";
```

- [ ] **Step 2: Register migration settings in the init hook**

Inside the `Hooks.once('init')` handler, after the `rules` setting registration (line 152-159) and before the keybinding registration (line 161), add:

```js
    game.settings.register(module, 'migrationDismissed', {
        scope: 'client',
        config: false,
        default: false,
        type: Boolean
    });

    game.settings.register(module, 'migration-backup', {
        scope: 'world',
        config: false,
        default: {},
        type: Object
    });

    if (game.modules.get('token-says')) {
        game.settings.registerMenu(module, "migrateTool", {
            name: game.i18n.localize("TOKENSAYS.migration.settingsMenu.name"),
            label: game.i18n.localize("TOKENSAYS.migration.settingsMenu.label"),
            icon: "fas fa-file-import",
            type: TokenSaysMigrationApp,
            restricted: true
        });
    }
```

- [ ] **Step 3: Add migration check to the ready hook**

Inside the `Hooks.once('ready')` handler, after the `tokenSays.initialize()` call (line 328) and before `setModsAvailable()` (line 329), add:

```js
    TokenSaysMigration.checkAndPrompt();
```

- [ ] **Step 4: Commit**

```
git add scripts/index.js
git commit -m "feat: register migration settings and wire up ready hook"
```

---

### Task 7: Update README

**Files:**
- Modify: `README.md`

Add a "Migrating from Token Says" section.

- [ ] **Step 1: Add migration section to README**

Insert a new section after the "Lineage" blockquote in the intro (after line 9, before the `---` on line 11) — or, more naturally, add it as a new top-level section before "Enhancements & Suggestions" (before line 231). Place it after the "Token Form Access" section (after line 163). Insert between the `---` separators:

```markdown
---

# Migrating from Token Says

If you previously used **Token Says**, Token Quips can automatically migrate your data.

### What gets migrated

- All world sayings (rules)
- All configuration settings (separator, pan, audio duration, conditions, etc.)
- Player-created sayings (per-user flags)
- Per-token data (play counts, limits) across all scenes

### How it works

1. Install and activate Token Quips
2. On the first world load, a dialog will ask if you want to migrate your Token Says data
3. Choose **Migrate** to start the process — a backup is created automatically before any data is modified
4. A summary shows what was migrated and offers a backup download
5. If Token Says is still active, you will be prompted to deactivate it

### Manual migration

If you dismissed the prompt, you can trigger migration manually:

1. Open **Game Settings** > **Module Settings**
2. Find the **Token Quips** section
3. Click **Migrate** (only visible when Token Says is installed)

### Backup and recovery

A backup of your original Token Says data is automatically saved to Token Quips module settings before migration begins. You can also download this backup as a JSON file from the migration summary dialog.

### After migration

Once migration is complete, you can safely uninstall Token Says from your module list. Your original Token Says data is left untouched in the world database — uninstalling the module will clean it up.
```

- [ ] **Step 2: Commit**

```
git add README.md
git commit -m "docs: add Token Says migration section to README"
```

---

### Task 8: Version bump

**Files:**
- Modify: `module.json`

- [ ] **Step 1: Bump version to 2.0.1**

In `module.json`, change line 58:

```json
  "version": "2.0.1",
```

And update the download URL on line 61:

```json
  "download": "https://github.com/themrbeasley/Token-Quips/releases/download/v2.0.1/module.zip"
```

- [ ] **Step 2: Commit**

```
git add module.json
git commit -m "chore: bump version to 2.0.1"
```

---

## Verification

After all tasks are complete, verify by manually testing in a Foundry VTT world:

1. **Setup:** Have a world with Token Says installed and some sayings configured
2. **Install Token Quips** and activate it (Token Says can be active or inactive)
3. **Load the world** — the migration prompt should appear
4. **Click "Not Now"** — dialog closes, no migration occurs
5. **Reload** — prompt appears again
6. **Click "Don't Ask Again"** — dialog closes, reload, prompt does NOT appear
7. **Go to settings** — "Migrate" button should be visible under Token Quips
8. **Click "Migrate" in settings** — migration runs, summary dialog appears with correct counts
9. **Click "Download Backup"** — JSON file downloads
10. **If Token Says was active** — deactivation prompt appears after summary
11. **Click "Confirm"** — Token Says is deactivated, world reloads
12. **Verify sayings** — open Token Quips settings, confirm all old sayings are present
13. **Uninstall Token Says** — verify the migration button disappears from settings
