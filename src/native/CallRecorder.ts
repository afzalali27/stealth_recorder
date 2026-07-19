import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const Native = NativeModules.CallRecorder as
    | {
          start: (facing: 'front' | 'back', torch: boolean) => Promise<void>;
          stop: () => Promise<{ uri: string; durationMs: number } | null>;
          setTorch: (on: boolean) => void;
          setZoom: (zoom: number) => void;
          addListener: (event: string) => void;
          removeListeners: (count: number) => void;
      }
    | undefined;

export interface CallRecorderEvent {
    event: 'started' | 'finalized' | 'error';
    uri?: string;
    durationMs?: number;
    message?: string;
}

const emitter =
    Native && Platform.OS === 'android' ? new NativeEventEmitter(NativeModules.CallRecorder) : null;

/**
 * JS wrapper for the native background call-recording foreground service.
 * Only available on Android; `isAvailable()` is false everywhere else.
 */
export const CallRecorder = {
    isAvailable(): boolean {
        return Platform.OS === 'android' && !!Native;
    },

    start(facing: 'front' | 'back', torch: boolean): Promise<void> {
        if (!Native) return Promise.reject(new Error('CallRecorder native module unavailable'));
        return Native.start(facing, torch);
    },

    stop(): Promise<{ uri: string; durationMs: number } | null> {
        if (!Native) return Promise.resolve(null);
        return Native.stop();
    },

    setTorch(on: boolean): void {
        Native?.setTorch(on);
    },

    setZoom(zoom: number): void {
        Native?.setZoom(zoom);
    },

    addListener(callback: (event: CallRecorderEvent) => void): { remove: () => void } {
        if (!emitter) return { remove: () => undefined };
        const sub = emitter.addListener('CallRecorderEvent', callback);
        return { remove: () => sub.remove() };
    },
};
