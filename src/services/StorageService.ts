import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import { VideoFile } from '../types';

const RECORDINGS_DIR = `${FileSystem.documentDirectory}recordings/`;
const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;

/**
 * Initialize recordings directory
 */
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

/**
 * Generate a unique filename with timestamp
 */
export function generateFilename(extension: string = 'mp4'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `recording_${timestamp}.${extension}`;
}

/**
 * Save recorded video to public Media Library
 */
export async function saveRecording(sourceUri: string): Promise<VideoFile> {
    try {
        await initializeStorage();

        // 1. Copy to internal app storage first for record keeping
        const filename = generateFilename();
        const destinationUri = `${RECORDINGS_DIR}${filename}`;

        await FileSystem.copyAsync({
            from: sourceUri,
            to: destinationUri,
        });

        // 2. Save to Media Library (Public Storage)
        const currentPermission = await MediaLibrary.getPermissionsAsync();
        const canSave = currentPermission.granted || (currentPermission as any).accessPrivileges === 'all';

        if (canSave) {
            try {
                // Create the asset first
                const asset = await MediaLibrary.createAssetAsync(destinationUri);

                // Try and add to album. Using copy: true on some devices avoids the 'modify' prompt
                // because it treats the album entry as a new file rather than a move.
                const album = await MediaLibrary.getAlbumAsync('StealthRecorder');
                if (album === null) {
                    await MediaLibrary.createAlbumAsync('StealthRecorder', asset, true);
                } else {
                    await MediaLibrary.addAssetsToAlbumAsync([asset], album, true);
                }
                console.log('Saved to Media Library album: StealthRecorder');
            } catch (libError) {
                console.warn('Media library save/album task failed:', libError);
                // Fallback to simpler save if album fails
                await MediaLibrary.saveToLibraryAsync(destinationUri).catch(e =>
                    console.error('Final fallback save failed:', e)
                );
            }
        }

        // Get file info
        const fileInfo = await FileSystem.getInfoAsync(destinationUri);

        const videoFile: VideoFile = {
            id: `${Date.now()}`,
            uri: destinationUri,
            filename,
            timestamp: Date.now(),
            duration: 0,
            size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
            encrypted: false,
        };

        console.log('Recording saved internally:', videoFile);
        return videoFile;
    } catch (error) {
        console.error('Error saving recording:', error);
        throw error;
    }
}

/**
 * Share a recording
 */
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

/**
 * Open file in system gallery/files app
 */
export async function openFile(uri: string): Promise<void> {
    try {
        if (Platform.OS === 'android') {
            const contentUri = await FileSystem.getContentUriAsync(uri);
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                data: contentUri,
                flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
                type: 'video/mp4',
            });
        } else {
            // For iOS, sharing is the best we can do for direct file access
            await shareRecording(uri);
        }
    } catch (error) {
        console.error('Error opening file:', error);
        throw error;
    }
}

/**
 * Open recording directory in system files app
 */
export async function openDirectory(): Promise<void> {
    try {
        if (Platform.OS === 'android') {
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                data: 'content://media/external/video/media',
                type: 'vnd.android.cursor.dir/video',
            });
        } else {
            // For iOS, sharing is the best we can do
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

/**
 * List all recordings
 */
export async function listRecordings(): Promise<VideoFile[]> {
    try {
        await initializeStorage();

        const files = await FileSystem.readDirectoryAsync(RECORDINGS_DIR);
        const videoFiles: VideoFile[] = [];

        for (const filename of files) {
            if (filename.endsWith('.mp4')) {
                const uri = `${RECORDINGS_DIR}${filename}`;
                const fileInfo = await FileSystem.getInfoAsync(uri);

                if (fileInfo.exists && 'size' in fileInfo && 'modificationTime' in fileInfo) {
                    videoFiles.push({
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

        // Sort by timestamp descending (newest first)
        return videoFiles.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('Error listing recordings:', error);
        return [];
    }
}

/**
 * Delete a recording (from internal storage and Media Library)
 */
export async function deleteRecording(uri: string): Promise<void> {
    try {
        // 1. Try to find and delete from Media Library first
        const filename = uri.split('/').pop();
        if (filename) {
            const assets = await MediaLibrary.getAssetsAsync({
                album: await MediaLibrary.getAlbumAsync('StealthRecorder'),
                mediaType: 'video',
            });

            const assetToDelete = assets.assets.find(a => a.filename === filename);
            if (assetToDelete) {
                await MediaLibrary.deleteAssetsAsync([assetToDelete.id]);
                console.log('Deleted from Media Library:', filename);
            }
        }

        // 2. Delete from internal storage
        await FileSystem.deleteAsync(uri, { idempotent: true });
        console.log('Recording deleted internally:', uri);
    } catch (error) {
        console.error('Error deleting recording:', error);
        throw error;
    }
}

/**
 * Save a photo
 */
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

/**
 * List all photos
 */
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

/**
 * Delete a photo
 */
export async function deletePhoto(uri: string): Promise<void> {
    try {
        const filename = uri.split('/').pop();
        if (filename) {
            const assets = await MediaLibrary.getAssetsAsync({
                album: await MediaLibrary.getAlbumAsync('StealthRecorder'),
                mediaType: 'photo',
            });
            const assetToDelete = assets.assets.find(a => a.filename === filename);
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

/**
 * Get storage usage statistics
 */
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

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
