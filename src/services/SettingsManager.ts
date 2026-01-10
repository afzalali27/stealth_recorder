import * as SecureStore from 'expo-secure-store';

export const STORAGE_KEYS = {
    CALLER_NAME: 'caller_name',
    CALLER_NUMBER: 'caller_number',
    DEFAULT_CAMERA: 'default_camera',
    APP_LOCK_ENABLED: 'app_lock_enabled',
    APP_PASSWORD: 'app_password',
    NOTIFICATIONS_LOGGING_ENABLED: 'notifications_logging_enabled',
};

export interface AppSettings {
    callerName: string;
    callerNumber: string;
    defaultCamera: 'front' | 'back';
    appLockEnabled: boolean;
    notificationsLoggingEnabled: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
    callerName: 'Unknown Caller',
    callerNumber: '+1 (555) 123-4567',
    defaultCamera: 'back',
    appLockEnabled: false,
    notificationsLoggingEnabled: true,
};

export async function loadSettings(): Promise<AppSettings> {
    try {
        const [name, number, camera, lock, notifications] = await Promise.all([
            SecureStore.getItemAsync(STORAGE_KEYS.CALLER_NAME),
            SecureStore.getItemAsync(STORAGE_KEYS.CALLER_NUMBER),
            SecureStore.getItemAsync(STORAGE_KEYS.DEFAULT_CAMERA),
            SecureStore.getItemAsync(STORAGE_KEYS.APP_LOCK_ENABLED),
            SecureStore.getItemAsync(STORAGE_KEYS.NOTIFICATIONS_LOGGING_ENABLED),
        ]);

        return {
            callerName: name || DEFAULT_SETTINGS.callerName,
            callerNumber: number || DEFAULT_SETTINGS.callerNumber,
            defaultCamera: (camera as 'front' | 'back') || DEFAULT_SETTINGS.defaultCamera,
            appLockEnabled: lock === 'true',
            notificationsLoggingEnabled: notifications === null ? DEFAULT_SETTINGS.notificationsLoggingEnabled : notifications === 'true',
        };
    } catch (error) {
        console.error('Error loading settings:', error);
        return DEFAULT_SETTINGS;
    }
}

export async function saveSetting(key: string, value: string): Promise<void> {
    try {
        await SecureStore.setItemAsync(key, value);
    } catch (error) {
        console.error(`Error saving setting ${key}:`, error);
    }
}
