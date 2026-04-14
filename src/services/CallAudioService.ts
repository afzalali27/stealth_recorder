import * as FileSystem from 'expo-file-system/legacy';
import { Audio } from 'expo-av';

const BEEP_FILE_PATH = `${FileSystem.cacheDirectory || FileSystem.documentDirectory || ''}call-beep.wav`;
let sound: Audio.Sound | null = null;

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

function buildBeepWavBase64(): string {
    const sampleRate = 8000;
    const durationMs = 180;
    const frequency = 880;
    const sampleCount = Math.floor((sampleRate * durationMs) / 1000);
    const pcmBytes = new Uint8Array(sampleCount);

    for (let i = 0; i < sampleCount; i += 1) {
        const envelope = Math.min(1, i / 150, (sampleCount - i) / 150);
        const sample =
            128 +
            Math.round(
                Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 55 * Math.max(envelope, 0.15)
            );
        pcmBytes[i] = Math.max(0, Math.min(255, sample));
    }

    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const byteRate = sampleRate;
    const blockAlign = 1;
    const dataSize = pcmBytes.length;

    const writeString = (offset: number, value: string) => {
        for (let i = 0; i < value.length; i += 1) {
            view.setUint8(offset + i, value.charCodeAt(i));
        }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 8, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    const combined = new Uint8Array(44 + pcmBytes.length);
    combined.set(new Uint8Array(header), 0);
    combined.set(pcmBytes, 44);
    return encodeBase64(combined);
}

async function ensureBeepFile(): Promise<string> {
    const info = await FileSystem.getInfoAsync(BEEP_FILE_PATH);
    if (!info.exists) {
        await FileSystem.writeAsStringAsync(BEEP_FILE_PATH, buildBeepWavBase64(), {
            encoding: FileSystem.EncodingType.Base64,
        });
    }
    return BEEP_FILE_PATH;
}

export async function playCallBeep(): Promise<void> {
    try {
        await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            staysActiveInBackground: false,
        });

        const uri = await ensureBeepFile();
        if (!sound) {
            const created = await Audio.Sound.createAsync(
                { uri },
                { shouldPlay: false, isLooping: false, volume: 0.75 }
            );
            sound = created.sound;
        }

        await sound.stopAsync().catch(() => undefined);
        await sound.setPositionAsync(0);
        await sound.playAsync();
    } catch (error) {
        console.warn('Failed to play call beep:', error);
    }
}

export async function unloadCallBeep(): Promise<void> {
    if (sound) {
        await sound.unloadAsync().catch(() => undefined);
        sound = null;
    }
}
