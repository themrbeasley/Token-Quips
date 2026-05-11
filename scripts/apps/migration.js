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
}
