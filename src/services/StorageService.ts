import * as FileSystem from 'expo-file-system';
import { VideoFile } from '../types';

const RECORDINGS_DIR = `${FileSystem.documentDirectory}recordings/`;

/**
 * Initialize recordings directory
 */
export async function initializeStorage(): Promise<void> {
    try {
        const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
            console.log('Recordings directory created:', RECORDINGS_DIR);
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
 * Save recorded video to recordings directory
 */
export async function saveRecording(sourceUri: string): Promise<VideoFile> {
    try {
        await initializeStorage();

        const filename = generateFilename();
        const destinationUri = `${RECORDINGS_DIR}${filename}`;

        // Move the video file to recordings directory
        await FileSystem.moveAsync({
            from: sourceUri,
            to: destinationUri,
        });

        // Get file info
        const fileInfo = await FileSystem.getInfoAsync(destinationUri);

        const videoFile: VideoFile = {
            id: `${Date.now()}`,
            uri: destinationUri,
            filename,
            timestamp: Date.now(),
            duration: 0, // Would need video metadata extraction
            size: fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0,
            encrypted: false,
        };

        console.log('Recording saved:', videoFile);
        return videoFile;
    } catch (error) {
        console.error('Error saving recording:', error);
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
 * Delete a recording
 */
export async function deleteRecording(uri: string): Promise<void> {
    try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        console.log('Recording deleted:', uri);
    } catch (error) {
        console.error('Error deleting recording:', error);
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
