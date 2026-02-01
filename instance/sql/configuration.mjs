import { ConfigManager } from './index.mjs';

export class Configuration {
    constructor(sessionId) {
        this.sessionId = sessionId;
    }

    async get(key) {
        const record = await ConfigManager.get(this.sessionId, key);
        return record ? record.configValue : null;
    }

    async set(key, value) {
        await ConfigManager.set({
            sessionId: this.sessionId,
            configKey: key,
            configValue: value,
        });
    }

    /**
     * Prefix: string or null
     * Returns: array of characters
     */
    async getPrefix() {
        const val = await this.get('prefix');
        // Default is null (or whatever implies no prefix? User said string or null)
        if (!val) return [];
        return val.split('');
    }

    async setPrefix(val) {
        if (val === null) {
            // Assuming we can store null or header to delete? 
            // Upsert might fail with null if text is expected? Model says configValue is TEXT (nullable by default).
            // But let's store empty string or delete? User said "takes string or null".
            // Let's store null as null (Db) or empty string.
            await this.set('prefix', null);
        } else {
            await this.set('prefix', String(val));
        }
    }

    /**
     * Sudo: array of ids
     * Returns: array of ids
     */
    async getSudo() {
        const val = await this.get('sudo');
        if (!val) return [];
        try {
            return JSON.parse(val);
        } catch {
            // If not valid JSON, maybe it's a comma separated string? User said "takes string".
            // Let's assume it might be simple string
            return [val];
        }
    }

    async setSudo(val) {
        let toStore;
        if (Array.isArray(val)) {
            toStore = JSON.stringify(val);
        } else {
            // If string, wrap in array or parse? User said "takes string... return array of ids"
            // Maybe user means comma separated input?
            // Or just a single ID?
            // Verification: "sudo takes array, and return array of ids"
            // User *also* said "sudo, it takes string" earlier.
            // I'll assume if string is passed, it's one ID, or comma split.
            // Let's being robust:
            if (typeof val === 'string') {
                // Check if it looks like JSON array
                if (val.startsWith('[')) {
                    toStore = val; // TRUST
                } else {
                    toStore = JSON.stringify([val]);
                }
            } else {
                toStore = JSON.stringify([]);
            }
        }
        await this.set('sudo', toStore);
    }

    async addSudo(id) {
        const current = await this.getSudo();
        if (!current.includes(id)) {
            current.push(id);
            await this.setSudo(current);
        }
    }

    /**
     * Mode: public | private
     * Default: public?
     */
    async getMode() {
        const val = await this.get('mode');
        return val || 'public'; // Default
    }

    async setMode(val) {
        if (val !== 'public' && val !== 'private') {
            throw new Error('Invalid mode. Must be public or private');
        }
        await this.set('mode', val);
    }
}
