import { registerRootComponent } from 'expo';
import { AppRegistry, DeviceEventEmitter } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import App from './App';
import { STORAGE_KEYS } from './src/services/SettingsManager';

/**
 * Headless task for Android Notification Listener.
 * This runs in the background when a notification is received.
 */
const headlessNotificationListener = async (notification: any) => {
    try {
        const isEnabled = await SecureStore.getItemAsync(STORAGE_KEYS.NOTIFICATIONS_LOGGING_ENABLED);

        if (isEnabled !== 'false') {
            // Emit directly to the UI if app is in foreground
            // The notification object usually comes as a parsed object or string
            DeviceEventEmitter.emit('notificationReceived', notification);
            console.log('[STEALTH_EYE] Notification Forwarded to UI');
        }
    } catch (error) {
        console.error('[STEALTH_EYE] Headless Task Error:', error);
    }
};

AppRegistry.registerHeadlessTask(
    'RNAndroidNotificationListenerHeadlessTask',
    () => headlessNotificationListener
);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
