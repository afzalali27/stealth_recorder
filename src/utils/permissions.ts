// Permission handling utilities
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Alert, Platform } from 'react-native';

export interface PermissionStatus {
    camera: boolean;
    microphone: boolean;
    mediaLibrary: boolean;
}

/**
 * Request all required permissions for the app
 */
export async function requestAllPermissions(): Promise<PermissionStatus> {
    try {
        // Request camera permissions (includes microphone on iOS)
        const cameraResult = await Camera.requestCameraPermissionsAsync();
        const microphoneResult = await Camera.requestMicrophonePermissionsAsync();

        // Request media library permissions for saving videos
        const mediaLibraryResult = await MediaLibrary.requestPermissionsAsync();

        const status: PermissionStatus = {
            camera: cameraResult.status === 'granted',
            microphone: microphoneResult.status === 'granted',
            mediaLibrary: mediaLibraryResult.status === 'granted' || (mediaLibraryResult as any).accessPrivileges === 'all',
        };

        return status;
    } catch (error) {
        console.error('Error requesting permissions:', error);
        return {
            camera: false,
            microphone: false,
            mediaLibrary: false,
        };
    }
}

/**
 * Check if all required permissions are granted
 */
export async function checkAllPermissions(): Promise<PermissionStatus> {
    try {
        const cameraResult = await Camera.getCameraPermissionsAsync();
        const microphoneResult = await Camera.getMicrophonePermissionsAsync();
        const mediaLibraryResult = await MediaLibrary.getPermissionsAsync();
        const isMediaGranted = mediaLibraryResult.status === 'granted' || (mediaLibraryResult as any).accessPrivileges === 'all';

        return {
            camera: cameraResult.status === 'granted',
            microphone: microphoneResult.status === 'granted',
            mediaLibrary: isMediaGranted,
        };
    } catch (error) {
        console.error('Error checking permissions:', error);
        return {
            camera: false,
            microphone: false,
            mediaLibrary: false,
        };
    }
}

/**
 * Show alert for denied permissions
 */
export function showPermissionDeniedAlert(permission: string) {
    Alert.alert(
        'Permission Required',
        `${permission} permission is required for this app to function. Please enable it in your device settings.`,
        [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Open Settings',
                onPress: () => {
                    // On real device, this would open settings
                    if (Platform.OS === 'ios') {
                        // Linking.openURL('app-settings:');
                    } else {
                        // Linking.openSettings();
                    }
                },
            },
        ]
    );
}

/**
 * Verify all permissions are granted, request if not
 */
export async function ensurePermissions(): Promise<boolean> {
    const current = await checkAllPermissions();

    if (current.camera && current.microphone && current.mediaLibrary) {
        return true;
    }

    const requested = await requestAllPermissions();

    if (!requested.camera) {
        showPermissionDeniedAlert('Camera');
        return false;
    }

    if (!requested.microphone) {
        showPermissionDeniedAlert('Microphone');
        return false;
    }

    if (!requested.mediaLibrary) {
        showPermissionDeniedAlert('Media Library');
        return false;
    }

    return true;
}
