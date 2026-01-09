import { Preferences } from '@capacitor/preferences';

export const storageService = {
    async set(key: string, value: any): Promise<void> {
        await Preferences.set({
            key,
            value: JSON.stringify(value),
        });
    },

    async get(key: string): Promise<any> {
        const { value } = await Preferences.get({ key });
        return value ? JSON.parse(value) : null;
    },

    async remove(key: string): Promise<void> {
        await Preferences.remove({ key });
    },

    async clear(): Promise<void> {
        await Preferences.clear();
    },

    async keys(): Promise<string[]> {
        const { keys } = await Preferences.keys();
        return keys;
    }
};
