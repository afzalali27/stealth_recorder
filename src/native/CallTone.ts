import { NativeModules, Platform } from 'react-native';

const Native = NativeModules.CallTone as
    | {
          start: () => Promise<boolean>;
          stop: () => Promise<boolean>;
      }
    | undefined;

/**
 * Native ringback tone (Android ToneGenerator TONE_SUP_RINGTONE). Repeats until stopped.
 */
export const CallTone = {
    isAvailable(): boolean {
        return Platform.OS === 'android' && !!Native;
    },
    async start(): Promise<void> {
        if (!Native) return;
        try {
            await Native.start();
        } catch {
            // ignore
        }
    },
    async stop(): Promise<void> {
        if (!Native) return;
        try {
            await Native.stop();
        } catch {
            // ignore
        }
    },
};
