import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import { VideoFile } from '../types';

const DURATIONS_PATH = `${FileSystem.documentDirectory || ''}recording_durations.json`;

async function readDurations(): Promise<Record<string, number>> {
    try {
        const info = await FileSystem.getInfoAsync(DURATIONS_PATH);
        if (!info.exists) return {};
        const raw = await FileSystem.readAsStringAsync(DURATIONS_PATH, { encoding: 'utf8' });
        return JSON.parse(raw) ?? {};
    } catch {
        return {};
    }
}

async function writeDurations(map: Record<string, number>): Promise<void> {
    await FileSystem.writeAsStringAsync(DURATIONS_PATH, JSON.stringify(map), { encoding: 'utf8' });
}

export async function saveRecordingDuration(filename: string, seconds: number): Promise<void> {
    const map = await readDurations();
    map[filename] = seconds;
    await writeDurations(map);
}

const RECORDINGS_DIR = `${FileSystem.documentDirectory}recordings/`;
const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;

export async function initializeStorage(): Promise<void> {
    try {
        const recDir = await FileSystem.getInfoAsync(RECORDINGS_DIR);
        if (!recDir.exists) {
            await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
        }

        const photoDir = await FileSystem.getInfoAsync(PHOTOS_DIR);
        if (!photoDir.exists) {
            await FileSystem.makeDirectoryAsync(PHOTOS_DIR, { intermediates: true });
        }
    } catch (error) {
        console.error('Error initializing storage:', error);
        throw error;
    }
}

export function generateFilename(extension: string = 'mp4'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `recording_${timestamp}.${extension}`;
}

export async function saveRecording(sourceUri: string, durationSeconds?: number): Promise<VideoFile> {
    try {
        await initializeStorage();

        const filename = generateFilename();
        const destinationUri = `${RECORDINGS_DIR}${filename}`;
        await FileSystem.moveAsync({
            from: sourceUri,
            to: destinationUri,
        });

        const fileInfo = await FileSystem.getInfoAsync(destinationUri);
        const timestamp =
            fileInfo.exists && 'modificationTime' in fileInfo && fileInfo.modificationTime
                ? fileInfo.modificationTime * 1000
                : Date.now();

        if (durationSeconds && durationSeconds > 0) {
            await saveRecordingDuration(filename, durationSeconds);
        }

        return {
            id: filename,
            uri: destinationUri,
            filename,
            timestamp,
            duration: durationSeconds ?? 0,
            size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
            encrypted: false,
        };
    } catch (error) {
        console.error('Error saving recording:', error);
        throw error;
    }
}

export async function shareRecording(uri: string): Promise<void> {
    try {
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
            throw new Error('Sharing is not available on this device');
        }
        await Sharing.shareAsync(uri);
    } catch (error) {
        console.error('Error sharing recording:', error);
        throw error;
    }
}

export async function openFile(uri: string): Promise<void> {
    try {
        if (Platform.OS === 'android') {
            const contentUri = await FileSystem.getContentUriAsync(uri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                data: contentUri,
                flags: 1,
                type: 'video/mp4',
            });
        } else {
            await shareRecording(uri);
        }
    } catch (error) {
        console.error('Error opening file:', error);
        throw error;
    }
}

export async function openDirectory(): Promise<void> {
    try {
        if (Platform.OS === 'android') {
            const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
            if (dirInfo.exists) {
                await Sharing.shareAsync(RECORDINGS_DIR);
            }
        } else {
            const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
            if (dirInfo.exists) {
                await Sharing.shareAsync(RECORDINGS_DIR);
            }
        }
    } catch (error) {
        console.error('Error opening directory:', error);
        throw error;
    }
}

export async function listRecordings(): Promise<VideoFile[]> {
    try {
        await initializeStorage();

        const files = await FileSystem.readDirectoryAsync(RECORDINGS_DIR);
        const durations = await readDurations();
        const videoFiles: VideoFile[] = [];

        for (const filename of files) {
            if (!filename.endsWith('.mp4')) {
                continue;
            }

            const uri = `${RECORDINGS_DIR}${filename}`;
            const fileInfo = await FileSystem.getInfoAsync(uri);

            if (fileInfo.exists && 'size' in fileInfo && 'modificationTime' in fileInfo) {
                videoFiles.push({
                    id: filename,
                    uri,
                    filename,
                    timestamp: fileInfo.modificationTime * 1000,
                    duration: durations[filename] ?? 0,
                    size: fileInfo.size,
                    encrypted: false,
                });
            }
        }

        return videoFiles.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('Error listing recordings:', error);
        return [];
    }
}

export async function deleteRecording(video: Pick<VideoFile, 'uri'>): Promise<void> {
    try {
        await FileSystem.deleteAsync(video.uri, { idempotent: true });
    } catch (error) {
        console.error('Error deleting recording:', error);
        throw error;
    }
}

export async function savePhoto(sourceUri: string): Promise<VideoFile> {
    try {
        await initializeStorage();
        const filename = generateFilename('jpg');
        const destinationUri = `${PHOTOS_DIR}${filename}`;

        await FileSystem.copyAsync({
            from: sourceUri,
            to: destinationUri,
        });

        const currentPermission = await MediaLibrary.getPermissionsAsync();
        if (currentPermission.granted || (currentPermission as any).accessPrivileges === 'all') {
            try {
                const asset = await MediaLibrary.createAssetAsync(destinationUri);
                const album = await MediaLibrary.getAlbumAsync('StealthRecorder');
                if (album === null) {
                    await MediaLibrary.createAlbumAsync('StealthRecorder', asset, true);
                } else {
                    await MediaLibrary.addAssetsToAlbumAsync([asset], album, true);
                }
            } catch (e) {
                console.warn('Media Library photo save failed:', e);
            }
        }

        const fileInfo = await FileSystem.getInfoAsync(destinationUri);
        return {
            id: filename,
            uri: destinationUri,
            filename,
            timestamp: Date.now(),
            duration: 0,
            size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
            encrypted: false,
        };
    } catch (error) {
        console.error('Error saving photo:', error);
        throw error;
    }
}

export async function listPhotos(): Promise<VideoFile[]> {
    try {
        await initializeStorage();
        const files = await FileSystem.readDirectoryAsync(PHOTOS_DIR);
        const photoFiles: VideoFile[] = [];

        for (const filename of files) {
            if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
                const uri = `${PHOTOS_DIR}${filename}`;
                const fileInfo = await FileSystem.getInfoAsync(uri);
                if (fileInfo.exists && 'size' in fileInfo && 'modificationTime' in fileInfo) {
                    photoFiles.push({
                        id: filename,
                        uri,
                        filename,
                        timestamp: fileInfo.modificationTime * 1000,
                        duration: 0,
                        size: fileInfo.size,
                        encrypted: false,
                    });
                }
            }
        }
        return photoFiles.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('Error listing photos:', error);
        return [];
    }
}

export async function deletePhoto(uri: string): Promise<void> {
    try {
        const filename = uri.split('/').pop();
        if (filename) {
            const assets = await MediaLibrary.getAssetsAsync({
                album: await MediaLibrary.getAlbumAsync('StealthRecorder'),
                mediaType: 'photo',
            });
            const assetToDelete = assets.assets.find((a) => a.filename === filename);
            if (assetToDelete) {
                await MediaLibrary.deleteAssetsAsync([assetToDelete.id]);
            }
        }
        await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (error) {
        console.error('Error deleting photo:', error);
        throw error;
    }
}

export async function getStorageStats(): Promise<{
    totalSize: number;
    fileCount: number;
}> {
    try {
        const recordings = await listRecordings();
        const totalSize = recordings.reduce((sum, file) => sum + file.size, 0);

        return {
            totalSize,
            fileCount: recordings.length,
        };
    } catch (error) {
        console.error('Error getting storage stats:', error);
        return { totalSize: 0, fileCount: 0 };
    }
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
