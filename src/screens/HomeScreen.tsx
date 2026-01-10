import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Platform,
    Alert,
    ScrollView,
    DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Layout } from '../constants/styles';
import { ensurePermissions } from '../utils/permissions';
import { loadSettings, saveSetting, STORAGE_KEYS } from '../services/SettingsManager';
import { useIsFocused } from '@react-navigation/native';
import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import { AppState } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';

interface HomeScreenProps {
    onStartRecording: (config: { cameraType: 'front' | 'back' }) => void;
    onViewRecordings: () => void;
    onViewPhotos: () => void;
    onOpenSettings: () => void;
}

export default function HomeScreen({
    onStartRecording,
    onViewRecordings,
    onViewPhotos,
    onOpenSettings,
}: HomeScreenProps) {
    const isFocused = useIsFocused();
    const [selectedCamera, setSelectedCamera] = useState<'front' | 'back'>('back');
    const [hasPermissions, setHasPermissions] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [isNotificationEnabled, setIsNotificationEnabled] = useState(false);
    const [notificationsLoggingEnabled, setNotificationsLoggingEnabled] = useState(true);
    const [cursorVisible, setCursorVisible] = useState(true);
    const terminalRef = React.useRef<ScrollView>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setCursorVisible(prev => !prev);
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const checkNotificationPermission = async () => {
        if (Platform.OS !== 'android') return;

        if (!RNAndroidNotificationListener) {
            console.log('[STEALTH_EYE] Notification Listener module not found (Expo Go?)');
            return;
        }

        try {
            const status = await RNAndroidNotificationListener.getPermissionStatus();
            setIsNotificationEnabled(status === 'authorized');
        } catch (error) {
            console.error('[STEALTH_EYE] Permission check failed:', error);
        }
    };

    useEffect(() => {
        if (!isFocused) return;

        checkNotificationPermission();

        const notificationSubscription = DeviceEventEmitter.addListener('notificationReceived', (notification) => {
            if (!notificationsLoggingEnabled) return;

            const app = notification.app?.toUpperCase().split('.').pop() || 'UNK';
            const logEntry = `[${app}] ${notification.title || 'MSG'}: ${notification.text || '...'}`;

            setLogs(prev => {
                const updated = [logEntry, ...prev].slice(0, 30);
                return updated;
            });

            // Auto-scroll logic happens via ref if needed, but ScrollView has a prop
        });

        const appStateSubscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active') {
                checkNotificationPermission();
            }
        });

        return () => {
            notificationSubscription.remove();
            appStateSubscription.remove();
        };
    }, [isFocused, notificationsLoggingEnabled]);

    const dummyLogs = [
        "[SYSTEM] UPLINK_ESTABLISHED: SATELLITE_7",
        "[NET] INTERCEPTED: ENCRYPTED_SIGNAL_04",
        "[MSG] INCOMING: GOTHAM_POLICE_RADIO",
        "[SYS] SCANNING_VULNERABILITIES...",
        "[DET] MOTION_SENSORS: ACTIVE",
        "[BIO] BIOMETRIC_SCAN: SECURE",
        "[LOG] KERNEL_INTEGRITY: OK",
        "[NET] DDOS_PREVENTION: ARMED",
        "[SYS] OVERRIDE_PROTOCOL_88: READY",
        "[MSG] INTERCEPTED: 'Meet at ACE Chemicals'",
        "[SYS] GPS_SPOOFING: ACTIVE",
        "[DET] AUDIO_DEBUGGER: FILTERING",
        "[LOG] DB_SYNC: 100%",
        "[SYS] THERMAL_IMAGING: STANDBY",
        "[NET] PACKET_INTERCEPTION: BUSY",
        "[MSG] INCOMING: 'The Bat is near'",
        "[SYS] FACIAL_RECOGNITION: MATCH_FOUND",
        "[LOG] ACCESS_GRANTED: ARKHAM_SERVER",
        "[DET] VIBRATION_LEVEL: NORMAL",
        "[SYS] NIGHT_VISION_SENSORS: ON",
        "[NET] VPN_TUNNEL: ENCRYPTED",
        "[MSG] INTERCEPTED: 'Initiate black-out'",
        "[SYS] BATTERY_OPTIMIZATION: OFF",
        "[LOG] REMOTE_WIPE: DISABLED",
        "[DET] PROXIMITY_ALERT: 50m",
        "[SYS] CLOUD_BACKUP: FORCED",
        "[NET] SIGNAL_STRENGTH: 98%",
        "[LOG] SYSTEM_UPTIME: 4:20:15",
        "[MSG] INCOMING: 'Protocol 10 active'",
        "[SYS] STEALTH_EYE_CORE: STANDBY",
    ];

    const handleRequestPermission = () => {
        if (Platform.OS === 'android') {
            if (RNAndroidNotificationListener) {
                RNAndroidNotificationListener.requestPermission();
            } else {
                // Fallback for Expo Go or unlinked native modules
                IntentLauncher.startActivityAsync('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS')
                    .catch(() => {
                        Alert.alert(
                            'TRANSMISSION_LINK_FAILED',
                            'Manual authorization required. Navigate to Settings > Notifications > Device & App Notifications > Stealth Eye.'
                        );
                    });
            }
        }
    };

    useEffect(() => {
        if (isFocused) {
            loadDefaultCamera();
        }
    }, [isFocused]);

    const loadDefaultCamera = async () => {
        const settings = await loadSettings();
        setSelectedCamera(settings.defaultCamera);
        setNotificationsLoggingEnabled(settings.notificationsLoggingEnabled);
    };

    const handleCameraToggle = async (type: 'front' | 'back') => {
        setSelectedCamera(type);
        await saveSetting(STORAGE_KEYS.DEFAULT_CAMERA, type);
    };

    useEffect(() => {
        const init = async () => {
            const granted = await ensurePermissions();
            setHasPermissions(granted);
        };
        init();
    }, []);

    const handleStartRecording = async () => {
        if (!hasPermissions) {
            const granted = await ensurePermissions();
            if (!granted) {
                Alert.alert(
                    'Permissions Required',
                    'Camera and microphone permissions are required to record video.'
                );
                return;
            }
            setHasPermissions(true);
        }

        onStartRecording({ cameraType: selectedCamera });
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            <View style={styles.header}>
                <Text style={styles.title}>STEALTH EYE</Text>
                <TouchableOpacity onPress={onOpenSettings} style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={24} color={Colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.terminalContainer}>
                    <View style={styles.terminalHeader}>
                        <Text style={styles.terminalTitle}>[ TRANSMISSIONS ]</Text>
                        {!isNotificationEnabled && (
                            <TouchableOpacity onPress={handleRequestPermission}>
                                <Text style={styles.terminalAction}>ENABLE_ACCESS</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    <ScrollView
                        style={styles.terminalContent}
                        contentContainerStyle={styles.terminalScrollContent}
                        ref={terminalRef}
                        onContentSizeChange={() => terminalRef.current?.scrollToEnd({ animated: true })}
                    >
                        {(logs.length > 0 ? logs : dummyLogs).map((log, index) => (
                            <Text key={index} style={styles.terminalLine}>
                                {'>'} {log}
                            </Text>
                        ))}
                        <Text style={[styles.terminalLine, { color: Colors.primary, opacity: cursorVisible ? 1 : 0 }]}>
                            {'>'} _
                        </Text>
                    </ScrollView>
                </View>

                {/* Secondary Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onViewRecordings}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="videocam" size={28} color={Colors.primary} />
                        <Text style={styles.actionButtonText}>VIDEOS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onViewPhotos}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="images" size={28} color={Colors.primary} />
                        <Text style={styles.actionButtonText}>PHOTOS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onOpenSettings}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="settings-sharp" size={28} color={Colors.primary} />
                        <Text style={styles.actionButtonText}>SETTINGS</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }} />

                {/* Rapid Camera Selection */}
                <View style={styles.rapidCameraContainer}>
                    <TouchableOpacity
                        style={[styles.rapidCameraButton, selectedCamera === 'front' && styles.rapidCameraActive]}
                        onPress={() => handleCameraToggle('front')}
                    >
                        <Ionicons name="camera-reverse" size={20} color={selectedCamera === 'front' ? Colors.primary : Colors.textSecondary} />
                        <Text style={[styles.rapidCameraText, selectedCamera === 'front' && styles.rapidCameraActiveText]}>FRONT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.rapidCameraButton, selectedCamera === 'back' && styles.rapidCameraActive]}
                        onPress={() => handleCameraToggle('back')}
                    >
                        <Ionicons name="camera" size={20} color={selectedCamera === 'back' ? Colors.primary : Colors.textSecondary} />
                        <Text style={[styles.rapidCameraText, selectedCamera === 'back' && styles.rapidCameraActiveText]}>REAR</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.startButton}
                    onPress={handleStartRecording}
                    activeOpacity={0.8}
                >
                    <Ionicons name="flash" size={28} color="#FFFFFF" />
                    <View style={{ width: Spacing.md }} />
                    <Text style={styles.startButtonText}>DEPLOY</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Layout.screenPadding,
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    title: {
        fontSize: Typography.sizes.xxl,
        fontWeight: '900',
        color: Colors.primary,
        letterSpacing: 2,
        textShadowColor: 'rgba(155, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    settingsButton: {
        padding: Spacing.sm,
    },
    content: {
        flex: 1,
        paddingHorizontal: Layout.screenPadding,
        paddingTop: Spacing.xl,
    },


    terminalContainer: {
        backgroundColor: Colors.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        height: 180,
        marginBottom: Spacing.xl,
    },
    terminalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    terminalTitle: {
        fontSize: Typography.sizes.xs,
        color: Colors.primary,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    terminalAction: {
        fontSize: 10,
        color: Colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        textDecorationLine: 'underline',
    },
    terminalContent: {
        flex: 1,
    },
    terminalScrollContent: {
        paddingBottom: Spacing.sm,
    },
    terminalLine: {
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginBottom: 2,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    actionButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    actionButtonText: {
        fontSize: Typography.sizes.xs,
        color: Colors.text,
        marginTop: Spacing.xs,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    rapidCameraContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    rapidCameraButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.sm,
    },
    rapidCameraActive: {
        borderColor: Colors.primary,
        backgroundColor: 'rgba(155, 0, 0, 0.05)',
    },
    rapidCameraText: {
        fontSize: Typography.sizes.xs,
        color: Colors.textSecondary,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    rapidCameraActiveText: {
        color: Colors.primary,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.sm,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.accent,
    },
    startButtonText: {
        fontSize: Typography.sizes.xl,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: 3,
    },
    infoContainer: {
        padding: Spacing.sm,
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    infoText: {
        fontSize: Typography.sizes.xs,
        color: Colors.primary,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        letterSpacing: 1,
    },
});
