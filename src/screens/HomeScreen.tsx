import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Easing,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, Layout } from '../constants/styles';
import { ensurePermissions } from '../utils/permissions';
import { loadSettings, saveSetting, STORAGE_KEYS } from '../services/SettingsManager';

interface HomeScreenProps {
    onStartRecording: (config: { cameraType: 'front' | 'back'; callerNumber?: string }) => void;
    onViewRecordings: () => void;
    onViewPhotos: () => void;
    onOpenSettings: () => void;
    onOpenLogs: () => void;
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
    onOpenLogs,
}: HomeScreenProps) {
    const isFocused = useIsFocused();
    const [selectedCamera, setSelectedCamera] = useState<'front' | 'back'>('back');
    const [hasPermissions, setHasPermissions] = useState(false);
    const [showDialer, setShowDialer] = useState(true);
    const [dialNumber, setDialNumber] = useState('');
    const [savedIdentity, setSavedIdentity] = useState({
        name: 'Unknown Caller',
        number: '+1 (555) 123-4567',
    });
    const dialerAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (isFocused) {
            loadDefaultCamera();
        }
    }, [isFocused]);

    useEffect(() => {
        const init = async () => {
            const granted = await ensurePermissions();
            setHasPermissions(granted);
        };
        init();
    }, []);

    const loadDefaultCamera = async () => {
        const settings = await loadSettings();
        setSelectedCamera(settings.defaultCamera);
        setSavedIdentity({ name: settings.callerName, number: settings.callerNumber });
    };

    const handleCameraToggle = async (type: 'front' | 'back') => {
        setSelectedCamera(type);
        await saveSetting(STORAGE_KEYS.DEFAULT_CAMERA, type);
    };

    const ensureCapturePermissions = async (): Promise<boolean> => {
        if (hasPermissions) {
            return true;
        }

        const granted = await ensurePermissions();
        if (!granted) {
            Alert.alert(
                'Permissions Required',
                'Camera and microphone permissions are required to record video.'
            );
            return false;
        }

        setHasPermissions(true);
        return true;
    };

    const handleStartRecording = async () => {
        const ready = await ensureCapturePermissions();
        if (!ready) {
            return;
        }

        onStartRecording({ cameraType: selectedCamera });
    };

    const handleDialPress = (digit: string) => {
        setDialNumber((prev) => prev + digit);
    };

    const handleBackspace = () => {
        setDialNumber((prev) => prev.slice(0, -1));
    };

    const setDialerVisibility = (visible: boolean) => {
        setShowDialer(visible);
        Animated.timing(dialerAnim, {
            toValue: visible ? 1 : 0,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    };

    const handleDialerCall = async () => {
        const ready = await ensureCapturePermissions();
        if (!ready) {
            return;
        }

        onStartRecording({
            cameraType: selectedCamera,
            callerNumber: dialNumber.trim() || savedIdentity.number,
        });
        setDialNumber('');
    };

    const activeIdentity = useMemo(() => {
        const typed = dialNumber.trim();
        return {
            number: typed || savedIdentity.number,
            label: typed ? 'Manual number' : savedIdentity.name,
        };
    }, [dialNumber, savedIdentity]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            <Animated.View
                style={[
                    styles.homeLayer,
                    {
                        opacity: dialerAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
                        transform: [
                            {
                                translateY: dialerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 24],
                                }),
                            },
                        ],
                    },
                ]}
                pointerEvents={showDialer ? 'none' : 'auto'}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>BAT EYE</Text>
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={onOpenLogs} style={styles.settingsButton}>
                            <Ionicons name="time-outline" size={24} color={Colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onOpenSettings} style={styles.settingsButton}>
                            <Ionicons name="settings-outline" size={24} color={Colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.content}>
                    <TouchableOpacity
                        style={styles.logoContainer}
                        onPress={() => setDialerVisibility(true)}
                        activeOpacity={0.82}
                    >
                        <Image
                            source={require('../../assets/bat-logo.png')}
                            style={styles.batLogo}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>

                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={onViewRecordings}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="videocam" size={24} color={Colors.primary} />
                            <Text style={styles.actionButtonText}>VIDEOS</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={onViewPhotos}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="images" size={24} color={Colors.primary} />
                            <Text style={styles.actionButtonText}>PHOTOS</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={onOpenSettings}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="settings-sharp" size={24} color={Colors.primary} />
                            <Text style={styles.actionButtonText}>SETTINGS</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1 }} />

                    <View style={styles.rapidCameraContainer}>
                        <TouchableOpacity
                            style={[styles.rapidCameraButton, selectedCamera === 'front' && styles.rapidCameraActive]}
                            onPress={() => handleCameraToggle('front')}
                        >
                            <Ionicons
                                name="camera-reverse"
                                size={20}
                                color={selectedCamera === 'front' ? Colors.primary : Colors.textSecondary}
                            />
                            <Text style={[styles.rapidCameraText, selectedCamera === 'front' && styles.rapidCameraActiveText]}>FRONT</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.rapidCameraButton, selectedCamera === 'back' && styles.rapidCameraActive]}
                            onPress={() => handleCameraToggle('back')}
                        >
                            <Ionicons
                                name="camera"
                                size={20}
                                color={selectedCamera === 'back' ? Colors.primary : Colors.textSecondary}
                            />
                            <Text style={[styles.rapidCameraText, selectedCamera === 'back' && styles.rapidCameraActiveText]}>REAR</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.startButton}
                        onPress={handleStartRecording}
                        activeOpacity={0.84}
                    >
                        <Ionicons name="flash" size={28} color="#FFFFFF" />
                        <View style={{ width: Spacing.md }} />
                        <Text style={styles.startButtonText}>DEPLOY</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            <Animated.View
                style={[
                    styles.dialerOverlay,
                    {
                        opacity: dialerAnim,
                        transform: [
                            {
                                translateY: dialerAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [56, 0],
                                }),
                            },
                        ],
                    },
                ]}
                pointerEvents={showDialer ? 'auto' : 'none'}
            >
                <View style={styles.dialerHeader}>
                    <TouchableOpacity onPress={() => setDialerVisibility(false)} style={styles.headerBubbleButton}>
                        <Ionicons name="home-outline" size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.dialerTitle}>BAT DIAL</Text>
                    <TouchableOpacity onPress={onOpenLogs} style={styles.headerBubbleButton}>
                        <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.numberDisplay}>
                    <Text style={styles.numberText} numberOfLines={1} adjustsFontSizeToFit>
                        {activeIdentity.number}
                    </Text>
                    <Text style={styles.savedContactText}>{activeIdentity.label}</Text>
                    {dialNumber.length > 0 && (
                        <TouchableOpacity onPress={handleBackspace} style={styles.backspaceButton}>
                            <Ionicons name="backspace-outline" size={28} color={Colors.text} />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.dialPad}>
                    {DIAL_PAD.map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.dialRow}>
                            {row.map((item) => (
                                <TouchableOpacity
                                    key={item.num}
                                    style={styles.dialButton}
                                    onPress={() => handleDialPress(item.num)}
                                    activeOpacity={0.78}
                                >
                                    <Text style={styles.dialButtonNum}>{item.num}</Text>
                                    {item.sub ? <Text style={styles.dialButtonSub}>{item.sub}</Text> : null}
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </View>

                <View style={styles.dialerFooter}>
                    <View style={styles.cameraQuickSwitch}>
                        <TouchableOpacity
                            style={[styles.cameraQuickButton, selectedCamera === 'front' && styles.cameraQuickButtonActive]}
                            onPress={() => handleCameraToggle('front')}
                        >
                            <Ionicons
                                name="camera-reverse-outline"
                                size={20}
                                color={selectedCamera === 'front' ? Colors.primary : Colors.textSecondary}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.cameraQuickButton, selectedCamera === 'back' && styles.cameraQuickButtonActive]}
                            onPress={() => handleCameraToggle('back')}
                        >
                            <Ionicons
                                name="camera-outline"
                                size={20}
                                color={selectedCamera === 'back' ? Colors.primary : Colors.textSecondary}
                            />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.callButton} onPress={handleDialerCall}>
                        <Ionicons name="call" size={32} color="#fff" />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    homeLayer: {
        flex: 1,
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
    headerActions: {
        flexDirection: 'row',
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
        marginLeft: 8,
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
        opacity: 0.92,
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
    dialerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.background,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 26,
    },
    dialerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 22,
    },
    headerBubbleButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dialerTitle: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
        color: Colors.textSecondary,
        letterSpacing: 2.6,
    },
    numberDisplay: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 146,
        marginTop: 8,
        paddingHorizontal: 20,
    },
    numberText: {
        fontSize: 38,
        fontWeight: '300',
        color: Colors.text,
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 10,
    },
    savedContactText: {
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
        letterSpacing: 1.3,
        textTransform: 'uppercase',
    },
    backspaceButton: {
        position: 'absolute',
        right: 6,
        bottom: 40,
        padding: 10,
    },
    dialPad: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    dialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 18,
    },
    dialButton: {
        width: 92,
        height: 92,
        borderRadius: 46,
        backgroundColor: '#111111',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1f1f1f',
    },
    dialButtonNum: {
        fontSize: 34,
        fontWeight: '300',
        color: Colors.text,
    },
    dialButtonSub: {
        fontSize: 10,
        color: Colors.textSecondary,
        marginTop: 2,
        letterSpacing: 1,
    },
    dialerFooter: {
        alignItems: 'center',
        paddingBottom: 6,
    },
    cameraQuickSwitch: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.round,
        padding: 6,
        marginBottom: 18,
    },
    cameraQuickButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cameraQuickButtonActive: {
        backgroundColor: '#171717',
    },
    callButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#00C853',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#00C853',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
});
