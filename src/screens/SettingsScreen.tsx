import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    TextInput,
    Switch,
    Alert,
    ToastAndroid,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS, saveSetting, loadSettings as loadFromManager } from '../services/SettingsManager';
import { Colors, Typography, Spacing, BorderRadius, Layout } from '../constants/styles';

interface SettingsScreenProps {
    onBack: () => void;
}



export default function SettingsScreen({ onBack }: SettingsScreenProps) {
    const [callerName, setCallerName] = useState('Unknown Caller');
    const [callerNumber, setCallerNumber] = useState('+1 (555) 123-4567');
    const [defaultCamera, setDefaultCamera] = useState<'front' | 'back'>('back');
    const [appLockEnabled, setAppLockEnabled] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const settings = await loadFromManager();
            setCallerName(settings.callerName);
            setCallerNumber(settings.callerNumber);
            setDefaultCamera(settings.defaultCamera);
            setAppLockEnabled(settings.appLockEnabled);

            const savedPassword = await SecureStore.getItemAsync(STORAGE_KEYS.APP_PASSWORD);
            if (savedPassword) setPassword(savedPassword);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    };

    const saveSettings = async () => {
        try {
            await Promise.all([
                saveSetting(STORAGE_KEYS.CALLER_NAME, callerName),
                saveSetting(STORAGE_KEYS.CALLER_NUMBER, callerNumber),
                saveSetting(STORAGE_KEYS.DEFAULT_CAMERA, defaultCamera),
                saveSetting(STORAGE_KEYS.APP_LOCK_ENABLED, appLockEnabled.toString()),
            ]);

            if (appLockEnabled && password) {
                if (password !== confirmPassword) {
                    Alert.alert('Error', 'Passwords do not match');
                    return;
                }
                if (password.length < 4) {
                    Alert.alert('Error', 'Password must be at least 4 characters');
                    return;
                }
                await saveSetting(STORAGE_KEYS.APP_PASSWORD, password);
            }

            if (Platform.OS === 'android') {
                ToastAndroid.show('Settings saved', ToastAndroid.SHORT);
            }
            onBack();
        } catch (error) {
            console.error('Error saving settings:', error);
            if (Platform.OS === 'android') {
                ToastAndroid.show('Failed to save settings', ToastAndroid.LONG);
            } else {
                Alert.alert('Error', 'Failed to save settings');
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Settings</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Fake Call Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Fake Call Settings</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Caller Name</Text>
                        <TextInput
                            style={styles.input}
                            value={callerName}
                            onChangeText={setCallerName}
                            placeholder="Enter caller name"
                            placeholderTextColor={Colors.textSecondary}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Caller Number</Text>
                        <TextInput
                            style={styles.input}
                            value={callerNumber}
                            onChangeText={setCallerNumber}
                            placeholder="Enter phone number"
                            placeholderTextColor={Colors.textSecondary}
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>

                {/* Camera Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Camera Settings</Text>

                    <View style={styles.optionRow}>
                        <Text style={styles.optionLabel}>Default Camera</Text>
                        <View style={styles.cameraToggle}>
                            <TouchableOpacity
                                style={[
                                    styles.cameraToggleButton,
                                    defaultCamera === 'back' && styles.cameraToggleButtonActive,
                                ]}
                                onPress={() => setDefaultCamera('back')}
                            >
                                <Text
                                    style={[
                                        styles.cameraToggleText,
                                        defaultCamera === 'back' && styles.cameraToggleTextActive,
                                    ]}
                                >
                                    Rear
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.cameraToggleButton,
                                    defaultCamera === 'front' && styles.cameraToggleButtonActive,
                                ]}
                                onPress={() => setDefaultCamera('front')}
                            >
                                <Text
                                    style={[
                                        styles.cameraToggleText,
                                        defaultCamera === 'front' && styles.cameraToggleTextActive,
                                    ]}
                                >
                                    Front
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Security Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Security</Text>

                    <View style={styles.optionRow}>
                        <View>
                            <Text style={styles.optionLabel}>App Lock</Text>
                            <Text style={styles.optionDescription}>
                                Require password to open app
                            </Text>
                        </View>
                        <Switch
                            value={appLockEnabled}
                            onValueChange={setAppLockEnabled}
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                            thumbColor="#FFFFFF"
                        />
                    </View>

                    {appLockEnabled && (
                        <>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Password</Text>
                                <TextInput
                                    style={styles.input}
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Enter password (min 4 chars)"
                                    placeholderTextColor={Colors.textSecondary}
                                    secureTextEntry
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Confirm Password</Text>
                                <TextInput
                                    style={styles.input}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Re-enter password"
                                    placeholderTextColor={Colors.textSecondary}
                                    secureTextEntry
                                />
                            </View>
                        </>
                    )}
                </View>

                {/* About */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <View style={styles.aboutItem}>
                        <Text style={styles.aboutLabel}>Version</Text>
                        <Text style={styles.aboutValue}>1.0.0</Text>
                    </View>
                    <View style={styles.aboutItem}>
                        <Text style={styles.aboutLabel}>Build</Text>
                        <Text style={styles.aboutValue}>2026.01.07</Text>
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
                    <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    <Text style={styles.saveButtonText}>Save Settings</Text>
                </TouchableOpacity>
            </ScrollView>
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
    backButton: {
        padding: Spacing.sm,
    },
    title: {
        fontSize: Typography.sizes.xxl,
        fontWeight: Typography.weights.bold,
        color: Colors.text,
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: Layout.screenPadding,
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
    inputGroup: {
        marginBottom: Spacing.md,
    },
    inputLabel: {
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
    },
    input: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        fontSize: Typography.sizes.md,
        color: Colors.text,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    optionLabel: {
        fontSize: Typography.sizes.md,
        color: Colors.text,
        fontWeight: Typography.weights.medium,
    },
    optionDescription: {
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    cameraToggle: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: 2,
    },
    cameraToggleButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.sm,
    },
    cameraToggleButtonActive: {
        backgroundColor: Colors.primary,
    },
    cameraToggleText: {
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
    },
    cameraToggleTextActive: {
        color: '#FFFFFF',
        fontWeight: Typography.weights.semibold,
    },
    aboutItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
    },
    aboutLabel: {
        fontSize: Typography.sizes.md,
        color: Colors.textSecondary,
    },
    aboutValue: {
        fontSize: Typography.sizes.md,
        color: Colors.text,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginTop: Spacing.lg,
    },
    saveButtonText: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
        color: '#FFFFFF',
        marginLeft: Spacing.sm,
    },
});
