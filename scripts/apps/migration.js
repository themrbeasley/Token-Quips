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
            const rules = user.flags?.[this.OLD_MODULE_ID]?.rules;
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
                const sayingFlags = token.flags?.[this.OLD_MODULE_ID]?.[tokenSays.FLAGS.SAYING];
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
}

export class TokenSaysMigrationApp extends FormApplication {
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "token-quips-migration"
        });
    }

    async _updateObject() {}

    render(force, options) {
        if (!TokenSaysMigration.isTokenSaysInstalled()) {
            ui.notifications.info(game.i18n.localize("TOKENSAYS.migration.notInstalled"));
            return this;
        }
        TokenSaysMigration.promptMigration();
        return this;
    }
}
