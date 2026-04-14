import { Camera } from 'expo-camera';
import { Alert, Platform } from 'react-native';

export interface PermissionStatus {
    camera: boolean;
    microphone: boolean;
}

export async function requestAllPermissions(): Promise<PermissionStatus> {
    try {
        const cameraResult = await Camera.requestCameraPermissionsAsync();
        const microphoneResult = await Camera.requestMicrophonePermissionsAsync();

        return {
            camera: cameraResult.status === 'granted',
            microphone: microphoneResult.status === 'granted',
        };
    } catch (error) {
        console.error('Error requesting permissions:', error);
        return {
            camera: false,
            microphone: false,
        };
    }
}

export async function checkAllPermissions(): Promise<PermissionStatus> {
    try {
        const cameraResult = await Camera.getCameraPermissionsAsync();
        const microphoneResult = await Camera.getMicrophonePermissionsAsync();

        return {
            camera: cameraResult.status === 'granted',
            microphone: microphoneResult.status === 'granted',
        };
    } catch (error) {
        console.error('Error checking permissions:', error);
        return {
            camera: false,
            microphone: false,
        };
    }
}

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
                    if (Platform.OS === 'ios') {
                        return;
                    }
                },
            },
        ]
    );
}

export async function ensurePermissions(): Promise<boolean> {
    const current = await checkAllPermissions();

    if (current.camera && current.microphone) {
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

    return true;
}
