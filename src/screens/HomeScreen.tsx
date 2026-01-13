import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Platform,
    Alert,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Layout } from '../constants/styles';
import { ensurePermissions } from '../utils/permissions';
import { loadSettings, saveSetting, STORAGE_KEYS } from '../services/SettingsManager';
import { useIsFocused } from '@react-navigation/native';

interface HomeScreenProps {
    onStartRecording: (config: { cameraType: 'front' | 'back'; callerNumber?: string }) => void;
    onViewRecordings: () => void;
    onViewPhotos: () => void;
    onOpenSettings: () => void;
}

const DIAL_PAD = [
    [{ num: '1', sub: '' }, { num: '2', sub: 'ABC' }, { num: '3', sub: 'DEF' }],
    [{ num: '4', sub: 'GHI' }, { num: '5', sub: 'JKL' }, { num: '6', sub: 'MNO' }],
    [{ num: '7', sub: 'PQRS' }, { num: '8', sub: 'TUV' }, { num: '9', sub: 'WXYZ' }],
    [{ num: '*', sub: '' }, { num: '0', sub: '+' }, { num: '#', sub: '' }],
];

export default function HomeScreen({
    onStartRecording,
    onViewRecordings,
    onViewPhotos,
    onOpenSettings,
}: HomeScreenProps) {
    const isFocused = useIsFocused();
    const [selectedCamera, setSelectedCamera] = useState<'front' | 'back'>('back');
    const [hasPermissions, setHasPermissions] = useState(false);
    const [showDialer, setShowDialer] = useState(false);
    const [dialNumber, setDialNumber] = useState('');

    useEffect(() => {
        if (isFocused) {
            loadDefaultCamera();
        }
    }, [isFocused]);

    const loadDefaultCamera = async () => {
        const settings = await loadSettings();
        setSelectedCamera(settings.defaultCamera);
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

    const handleDialPress = (digit: string) => {
        setDialNumber(prev => prev + digit);
    };

    const handleBackspace = () => {
        setDialNumber(prev => prev.slice(0, -1));
    };

    const handleDialerCall = async () => {
        if (!dialNumber.trim()) {
            Alert.alert('Error', 'Please enter a phone number');
            return;
        }

        if (!hasPermissions) {
            const granted = await ensurePermissions();
            if (!granted) {
                Alert.alert('Permissions Required', 'Camera and microphone permissions are required.');
                return;
            }
            setHasPermissions(true);
        }

        onStartRecording({ cameraType: selectedCamera, callerNumber: dialNumber.trim() });
        setDialNumber('');
        setShowDialer(false);
    };

    // Full-screen Dialer View
    if (showDialer) {
        return (
            <SafeAreaView style={styles.dialerScreen}>
                <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

                {/* Header with back button */}
                <View style={styles.dialerScreenHeader}>
                    <TouchableOpacity onPress={() => setShowDialer(false)} style={styles.dialerBackButton}>
                        <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.dialerScreenTitle}>QUICK DIAL</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Number Display */}
                <View style={styles.numberDisplay}>
                    <Text style={styles.numberText} numberOfLines={1} adjustsFontSizeToFit>
                        {dialNumber || 'Enter Number'}
                    </Text>
                    {dialNumber.length > 0 && (
                        <TouchableOpacity onPress={handleBackspace} style={styles.backspaceButton}>
                            <Ionicons name="backspace-outline" size={28} color={Colors.text} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Dial Pad */}
                <View style={styles.dialPad}>
                    {DIAL_PAD.map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.dialRow}>
                            {row.map((item) => (
                                <TouchableOpacity
                                    key={item.num}
                                    style={styles.dialButton}
                                    onPress={() => handleDialPress(item.num)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.dialButtonNum}>{item.num}</Text>
                                    {item.sub && <Text style={styles.dialButtonSub}>{item.sub}</Text>}
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </View>

                {/* Call Button */}
                <TouchableOpacity
                    style={[styles.callButton, !dialNumber && styles.callButtonDisabled]}
                    onPress={handleDialerCall}
                    disabled={!dialNumber}
                >
                    <Ionicons name="call" size={32} color="#fff" />
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    // Main Home Screen
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
                {/* Bat Logo - Tap to open dialer */}
                <TouchableOpacity
                    style={styles.logoContainer}
                    onPress={() => setShowDialer(true)}
                    activeOpacity={0.8}
                >
                    <Image
                        source={require('../../assets/bat-logo.png')}
                        style={styles.batLogo}
                        resizeMode="contain"
                    />
                </TouchableOpacity>

                {/* Secondary Actions */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onViewRecordings}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="videocam" size={24} color={Colors.primary} />
                        <Text style={styles.actionButtonText}>VIDEOS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onViewPhotos}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="images" size={24} color={Colors.primary} />
                        <Text style={styles.actionButtonText}>PHOTOS</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={onOpenSettings}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="settings-sharp" size={24} color={Colors.primary} />
                        <Text style={styles.actionButtonText} numberOfLines={1} adjustsFontSizeToFit>SETTINGS</Text>
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
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
        height: 150,
    },
    batLogo: {
        width: 200,
        height: 150,
        opacity: 0.9,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.xl,
    },
    actionButton: {
        flex: 1,
        backgroundColor: Colors.surface,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: Spacing.xs,
        borderWidth: 1,
        borderColor: Colors.border,
        minHeight: 80,
    },
    actionButtonText: {
        marginTop: Spacing.sm,
        fontSize: Typography.sizes.xs,
        color: Colors.text,
        fontWeight: Typography.weights.bold,
        textAlign: 'center',
    },
    rapidCameraContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.round,
        padding: Spacing.xs,
        alignSelf: 'center',
    },
    rapidCameraButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.round,
    },
    rapidCameraActive: {
        backgroundColor: Colors.secondary,
    },
    rapidCameraText: {
        marginLeft: Spacing.xs,
        fontSize: Typography.sizes.xs,
        color: Colors.textSecondary,
        fontWeight: Typography.weights.semibold,
    },
    rapidCameraActiveText: {
        color: Colors.primary,
    },
    startButton: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xxl,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xl,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
    },
    startButtonText: {
        color: '#FFFFFF',
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.bold,
        letterSpacing: 2,
    },
    fab: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.batBlue,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: Colors.batBlue,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    // Dialer Screen Styles
    dialerScreen: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    dialerScreenHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Layout.screenPadding,
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    dialerBackButton: {
        padding: Spacing.sm,
    },
    dialerScreenTitle: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
        color: Colors.primary,
        letterSpacing: 1,
    },
    numberDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Layout.screenPadding,
        paddingVertical: Spacing.xxl,
        minHeight: 100,
    },
    numberText: {
        flex: 1,
        fontSize: 36,
        fontWeight: '300',
        color: Colors.text,
        textAlign: 'center',
        letterSpacing: 2,
    },
    backspaceButton: {
        padding: Spacing.md,
    },
    dialPad: {
        flex: 1,
        paddingHorizontal: Spacing.xl,
        justifyContent: 'center',
    },
    dialRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: Spacing.md,
    },
    dialButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    dialButtonNum: {
        fontSize: 28,
        fontWeight: '300',
        color: Colors.text,
    },
    dialButtonSub: {
        fontSize: 10,
        color: Colors.textSecondary,
        marginTop: 2,
        letterSpacing: 1,
    },
    callButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: Colors.primary,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.xl,
        marginBottom: Spacing.xxl,
    },
    callButtonDisabled: {
        opacity: 0.5,
    },
    callButtonText: {
        display: 'none',
    },
});
