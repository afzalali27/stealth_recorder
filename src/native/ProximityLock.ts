import { NativeModules, Platform } from 'react-native';

const Native = NativeModules.ProximityLock as
    | {
          isAvailable: () => Promise<boolean>;
          activate: () => Promise<boolean>;
          deactivate: () => Promise<boolean>;
      }
    | undefined;

/**
 * Turns the screen off when the phone is held to the ear (like a real dialer) using the
 * hardware proximity sensor via PROXIMITY_SCREEN_OFF_WAKE_LOCK. Android-only.
 */
export const ProximityLock = {
    async isAvailable(): Promise<boolean> {
        if (Platform.OS !== 'android' || !Native) return false;
        try {
            return await Native.isAvailable();
        } catch {
            return false;
        }
    },

    async activate(): Promise<boolean> {
        if (Platform.OS !== 'android' || !Native) return false;
        try {
            return await Native.activate();
        } catch {
            return false;
        }
    },

    async deactivate(): Promise<void> {
        if (Platform.OS !== 'android' || !Native) return;
        try {
            await Native.deactivate();
        } catch {
            // ignore
        }
    },
};
