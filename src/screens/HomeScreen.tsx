import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Layout } from '../constants/styles';
import { ensurePermissions } from '../utils/permissions';

interface HomeScreenProps {
    onStartRecording: (config: { cameraType: 'front' | 'back' }) => void;
    onViewRecordings: () => void;
    onOpenSettings: () => void;
}

export default function HomeScreen({
    onStartRecording,
    onViewRecordings,
    onOpenSettings,
}: HomeScreenProps) {
    const [selectedCamera, setSelectedCamera] = useState<'front' | 'back'>('back');
    const [hasPermissions, setHasPermissions] = useState(false);

    useEffect(() => {
        checkPermissions();
    }, []);

    const checkPermissions = async () => {
        const granted = await ensurePermissions();
        setHasPermissions(granted);
    };

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
                <Text style={styles.title}>Stealth Recorder</Text>
                <TouchableOpacity onPress={onOpenSettings} style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={24} color={Colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {/* Camera Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Select Camera</Text>
                    <View style={styles.cameraOptions}>
                        <TouchableOpacity
                            style={[
                                styles.cameraOption,
                                selectedCamera === 'back' && styles.cameraOptionActive,
                            ]}
                            onPress={() => setSelectedCamera('back')}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="camera"
                                size={40}
                                color={selectedCamera === 'back' ? Colors.primary : Colors.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.cameraOptionText,
                                    selectedCamera === 'back' && styles.cameraOptionTextActive,
                                ]}
                            >
                                Rear Camera
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.cameraOption,
                                selectedCamera === 'front' && styles.cameraOptionActive,
                            ]}
                            onPress={() => setSelectedCamera('front')}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="camera-reverse"
                                size={40}
                                color={selectedCamera === 'front' ? Colors.primary : Colors.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.cameraOptionText,
                                    selectedCamera === 'front' && styles.cameraOptionTextActive,
                                ]}
                            >
                                Front Camera
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Start Recording Button */}
                <TouchableOpacity
                    style={styles.startButton}
                    onPress={handleStartRecording}
                    activeOpacity={0.8}
                >
                    <Ionicons name="videocam" size={32} color="#FFFFFF" />
                    <Text style={styles.startButtonText}>Start Recording</Text>
                </TouchableOpacity>

                {/* Secondary Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onViewRecordings}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="folder-open-outline" size={28} color={Colors.text} />
                        <Text style={styles.actionButtonText}>View Recordings</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onOpenSettings}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="settings-outline" size={28} color={Colors.text} />
                        <Text style={styles.actionButtonText}>Settings</Text>
                    </TouchableOpacity>
                </View>

                {/* Info */}
                <View style={styles.infoContainer}>
                    <Ionicons name="information-circle-outline" size={20} color={Colors.textSecondary} />
                    <Text style={styles.infoText}>
                        Recording will start with a fake call interface
                    </Text>
                </View>
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
        fontWeight: Typography.weights.bold,
        color: Colors.text,
    },
    settingsButton: {
        padding: Spacing.sm,
    },
    content: {
        flex: 1,
        paddingHorizontal: Layout.screenPadding,
        paddingTop: Spacing.xl,
    },
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    cameraOptions: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    cameraOption: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    cameraOptionActive: {
        borderColor: Colors.primary,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
    },
    cameraOptionText: {
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
        textAlign: 'center',
    },
    cameraOptionTextActive: {
        color: Colors.primary,
        fontWeight: Typography.weights.semibold,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.xl,
        elevation: 4,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    startButtonText: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
        color: '#FFFFFF',
        marginLeft: Spacing.md,
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
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
    },
    actionButtonText: {
        fontSize: Typography.sizes.sm,
        color: Colors.text,
        marginTop: Spacing.sm,
        textAlign: 'center',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        borderRadius: BorderRadius.md,
        borderLeftWidth: 3,
        borderLeftColor: Colors.accent,
    },
    infoText: {
        flex: 1,
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
        marginLeft: Spacing.sm,
    },
});
