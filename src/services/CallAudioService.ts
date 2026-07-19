import * as FileSystem from 'expo-file-system/legacy';
import { Audio, AVPlaybackStatus, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { CallTone } from '../native/CallTone';

// A full ringback cadence baked into the file so looping reproduces the real
// "waiting for the other side to pick up" pattern (US: 2s tone, 4s silence).
const RINGBACK_FILE_PATH = `${FileSystem.cacheDirectory || FileSystem.documentDirectory || ''}call-ringback.wav`;

let sound: Audio.Sound | null = null;
let audioModeReady = false;
// We drive the loop manually (see handlePlaybackStatus) because expo-av's built-in
// isLooping stops re-arming after the first pass when a mic recording is active.
let shouldLoop = false;

function encodeBase64(bytes: Uint8Array): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let output = '';

    for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i];
        const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
        const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
        const triple = (a << 16) | (b << 8) | c;

        output += chars[(triple >> 18) & 63];
        output += chars[(triple >> 12) & 63];
        output += i + 1 < bytes.length ? chars[(triple >> 6) & 63] : '=';
        output += i + 2 < bytes.length ? chars[triple & 63] : '=';
    }

    return output;
}

/**
 * Builds a 16-bit PCM WAV of one full US ringback cadence: a dual-tone (440 Hz + 480 Hz)
 * for 2 seconds followed by 4 seconds of silence. Looping this file mimics a real phone
 * ringing on the other end.
 */
function buildRingbackWavBase64(): string {
    const sampleRate = 16000;
    const toneSeconds = 2;
    const silenceSeconds = 4;
    const totalSeconds = toneSeconds + silenceSeconds;
    const sampleCount = sampleRate * totalSeconds;
    const toneSamples = sampleRate * toneSeconds;
    const fadeSamples = Math.floor(sampleRate * 0.02); // 20ms fade to avoid clicks

    const bytesPerSample = 2;
    const dataSize = sampleCount * bytesPerSample;
    const buffer = new Uint8Array(44 + dataSize);
    const view = new DataView(buffer.buffer);

    const writeString = (offset: number, value: string) => {
        for (let i = 0; i < value.length; i += 1) {
            view.setUint8(offset + i, value.charCodeAt(i));
        }
    };

    // WAV header (16-bit mono PCM)
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // PCM header size
    view.setUint16(20, 1, true); // audio format = PCM
    view.setUint16(22, 1, true); // channels = 1
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
    view.setUint16(32, bytesPerSample, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const twoPi = 2 * Math.PI;
    for (let i = 0; i < sampleCount; i += 1) {
        let sample = 0;

        if (i < toneSamples) {
            const t = i / sampleRate;
            let envelope = 1;
            if (i < fadeSamples) envelope = i / fadeSamples;
            else if (i > toneSamples - fadeSamples) envelope = (toneSamples - i) / fadeSamples;

            const dual = Math.sin(twoPi * 440 * t) + Math.sin(twoPi * 480 * t);
            sample = dual * 0.32 * envelope; // scaled to keep the sum within range
        }

        const clamped = Math.max(-1, Math.min(1, sample));
        view.setInt16(44 + i * bytesPerSample, Math.round(clamped * 32767), true);
    }

    return encodeBase64(buffer);
}

async function ensureRingbackFile(): Promise<string> {
    const info = await FileSystem.getInfoAsync(RINGBACK_FILE_PATH);
    if (!info.exists) {
        await FileSystem.writeAsStringAsync(RINGBACK_FILE_PATH, buildRingbackWavBase64(), {
            encoding: FileSystem.EncodingType.Base64,
        });
    }
    return RINGBACK_FILE_PATH;
}

async function ensureAudioMode(): Promise<void> {
    if (audioModeReady) return;
    await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
    });
    audioModeReady = true;
}

// Manual loop: when a pass finishes, immediately replay if the tone is still enabled.
function handlePlaybackStatus(status: AVPlaybackStatus): void {
    if (!status.isLoaded) return;
    if (shouldLoop && status.didJustFinish) {
        sound?.replayAsync().catch(() => undefined);
    }
}

async function ensureSound(): Promise<Audio.Sound> {
    await ensureAudioMode();

    if (!sound) {
        const uri = await ensureRingbackFile();
        const created = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: false, isLooping: false, volume: 1.0 },
            handlePlaybackStatus
        );
        sound = created.sound;
    }

    return sound;
}

/** Start/stop the looping ringback tone (driven by the Speaker button). */
export async function setCallBeepLoop(enabled: boolean): Promise<void> {
    // Prefer the native ToneGenerator on Android — reliable while the mic is recording.
    if (CallTone.isAvailable()) {
        if (enabled) {
            await CallTone.start();
        } else {
            await CallTone.stop();
        }
        return;
    }

    try {
        if (enabled) {
            const current = await ensureSound();
            shouldLoop = true;
            await current.setIsLoopingAsync(false);
            await current.replayAsync(); // plays from the start
        } else {
            await stopCallBeep();
        }
    } catch (error) {
        console.warn('Failed to update call ringback loop:', error);
    }
}

export async function stopCallBeep(): Promise<void> {
    if (CallTone.isAvailable()) {
        await CallTone.stop();
        return;
    }
    shouldLoop = false;
    if (sound) {
        await sound.stopAsync().catch(() => undefined);
        await sound.setPositionAsync(0).catch(() => undefined);
    }
}

export async function unloadCallBeep(): Promise<void> {
    if (CallTone.isAvailable()) {
        await CallTone.stop();
        return;
    }
    shouldLoop = false;
    if (sound) {
        await sound.unloadAsync().catch(() => undefined);
        sound = null;
    }
}
