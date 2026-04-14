import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import { VideoFile } from '../types';

const RECORDINGS_DIR = `${FileSystem.documentDirectory}recordings/`;
const PHOTOS_DIR = `${FileSystem.documentDirectory}photos/`;
const MEDIA_ALBUM_NAME = 'Bat Eye';
const LEGACY_MEDIA_ALBUM_NAME = 'StealthRecorder';

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
        const currentPermission = await MediaLibrary.getPermissionsAsync();
        const canSave = currentPermission.granted || (currentPermission as any).accessPrivileges === 'all';

        if (canSave) {
            try {
                const asset = await MediaLibrary.createAssetAsync(sourceUri);
                const album = await MediaLibrary.getAlbumAsync(MEDIA_ALBUM_NAME);
                if (album === null) {
                    await MediaLibrary.createAlbumAsync(MEDIA_ALBUM_NAME, asset, false);
                } else {
                    await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
                }
                const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
                const fileInfo = await FileSystem.getInfoAsync(sourceUri);

                const videoFile: VideoFile = {
                    id: asset.id,
                    assetId: asset.id,
                    uri: assetInfo.localUri || asset.uri,
                    filename: asset.filename,
                    timestamp: asset.creationTime || Date.now(),
                    duration: Math.round((asset.duration || 0) / 1000),
                    size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
                    encrypted: false,
                    thumbnail: assetInfo.localUri || asset.uri,
                };

                await FileSystem.deleteAsync(sourceUri, { idempotent: true }).catch(() => undefined);
                console.log('Recording saved to Media Library:', videoFile);
                return videoFile;
            } catch (libError) {
                console.warn('Media library save task failed:', libError);
            }
        }

        const filename = generateFilename();
        const destinationUri = `${RECORDINGS_DIR}${filename}`;
        await FileSystem.moveAsync({
            from: sourceUri,
            to: destinationUri,
        });

        const fileInfo = await FileSystem.getInfoAsync(destinationUri);
        return {
            id: filename,
            uri: destinationUri,
            filename,
            timestamp: Date.now(),
            duration: 0,
            size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
            encrypted: false,
            thumbnail: destinationUri,
        };
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
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                data: uri.startsWith('content://') ? uri : await FileSystem.getContentUriAsync(uri),
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
        const videoFiles: VideoFile[] = [];
        const albums = [
            await MediaLibrary.getAlbumAsync(MEDIA_ALBUM_NAME),
            await MediaLibrary.getAlbumAsync(LEGACY_MEDIA_ALBUM_NAME),
        ].filter(Boolean) as MediaLibrary.Album[];

        for (const album of albums) {
            const assets = await MediaLibrary.getAssetsAsync({
                album,
                mediaType: 'video',
                first: 1000,
                sortBy: [[MediaLibrary.SortBy.creationTime, false]],
            });

            for (const asset of assets.assets) {
                if (videoFiles.some((item) => item.assetId === asset.id)) {
                    continue;
                }

                const assetInfo = await MediaLibrary.getAssetInfoAsync(asset);
                const assetFileInfo = assetInfo.localUri
                    ? await FileSystem.getInfoAsync(assetInfo.localUri)
                    : null;

                videoFiles.push({
                    id: asset.id,
                    assetId: asset.id,
                    uri: assetInfo.localUri || asset.uri,
                    filename: asset.filename,
                    timestamp: asset.creationTime || Date.now(),
                    duration: Math.round((asset.duration || 0) / 1000),
                    size: assetFileInfo && assetFileInfo.exists && 'size' in assetFileInfo ? assetFileInfo.size : 0,
                    encrypted: false,
                    thumbnail: assetInfo.localUri || asset.uri,
                });
            }
        }

        const files = await FileSystem.readDirectoryAsync(RECORDINGS_DIR);
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
                    duration: 0,
                    size: fileInfo.size,
                    encrypted: false,
                    thumbnail: uri,
                });
            }
        }

        return videoFiles.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
        console.error('Error listing recordings:', error);
        return [];
    }
}

/**
 * Delete a recording (from internal storage and Media Library)
 */
export async function deleteRecording(video: Pick<VideoFile, 'uri' | 'assetId' | 'filename'>): Promise<void> {
    try {
        if (video.assetId) {
            await MediaLibrary.deleteAssetsAsync([video.assetId]).catch(async () => {
                const allAssets = await MediaLibrary.getAssetsAsync({
                    mediaType: 'video',
                    first: 1000,
                });
                const assetToDelete = allAssets.assets.find((item) => item.filename === video.filename);
                if (assetToDelete) {
                    await MediaLibrary.deleteAssetsAsync([assetToDelete.id]);
                }
            });
        }

        if (video.uri.startsWith('file://')) {
            await FileSystem.deleteAsync(video.uri, { idempotent: true }).catch(() => undefined);
        }
        console.log('[BAT_EYE] Recording deleted from device:', video.filename);
    } catch (error) {
        console.error('[BAT_EYE] Error deleting recording:', error);
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
