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
}
