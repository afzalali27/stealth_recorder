// Core types for the stealth recorder app

export interface RecordingConfig {
    callerName: string;
    callerNumber: string;
    defaultCamera: 'front' | 'back';
    videoQuality: '720p' | '1080p' | '4k';
    frameRate: 30 | 60;
    enableAudio: boolean;
    storageLocation: string;
}

export interface RecordingState {
    isRecording: boolean;
    isPaused: boolean;
    duration: number;
    currentView: 'fake-call' | 'camera-preview';
    flashEnabled: boolean;
    cameraType: 'front' | 'back';
    videoUri?: string;
}

export interface VideoFile {
    id: string;
    uri: string;
    assetId?: string; // Media Library Asset ID
    filename: string;
    timestamp: number;
    duration: number;
    size: number;
    encrypted: boolean;
    thumbnail?: string;
}

export interface AppSettings {
    appLockEnabled: boolean;
    appPassword?: string;
    recordingConfig: RecordingConfig;
    autoDeleteAfterDays?: number;
    maxStorageSize?: number; // in MB
}
