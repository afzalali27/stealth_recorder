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
    useWindowDimensions,
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
    onOpenSettings,
    onOpenLogs,
}: HomeScreenProps) {
    const isFocused = useIsFocused();
    const { width } = useWindowDimensions();
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
            duration: 180,
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

    const recentRows = useMemo(() => {
        const rows = [
            {
                name: savedIdentity.name,
                number: savedIdentity.number,
                region: 'Pakistan',
            },
        ];

        if (dialNumber.trim()) {
            rows.unshift({
                name: 'Dialing target',
                number: dialNumber.trim(),
                region: 'Manual',
            });
        }

        return rows.slice(0, 2);
    }, [dialNumber, savedIdentity]);

    const dialButtonSize = Math.min(74, Math.max(62, Math.floor((width - 148) / 3)));
    const dialPadWidth = dialButtonSize * 3 + 32;

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
                                    outputRange: [0, 18],
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
                            activeOpacity={0.8}
                        >
                            <Ionicons name="videocam" size={24} color={Colors.primary} />
                            <Text style={styles.actionButtonText}>VIDEOS</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={onOpenSettings}
                            activeOpacity={0.8}
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
                        <Ionicons name="flash" size={26} color="#FFFFFF" />
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
                                    outputRange: [28, 0],
                                }),
                            },
                        ],
                    },
                ]}
                pointerEvents={showDialer ? 'auto' : 'none'}
            >
                <View style={styles.dialerHeader}>
                    <TouchableOpacity onPress={() => setDialerVisibility(false)} style={styles.headerBubbleButton}>
                        <Ionicons name="home-outline" size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.dialerTitle}>BAT DIAL</Text>
                    <TouchableOpacity onPress={onOpenLogs} style={styles.headerBubbleButton}>
                        <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <View style={styles.numberDisplay}>
                    <Text style={styles.numberText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                        {activeIdentity.number}
                    </Text>
                    <Text style={styles.savedContactText}>{activeIdentity.label}</Text>
                    {dialNumber.length > 0 ? (
                        <TouchableOpacity onPress={handleBackspace} style={styles.backspaceButton}>
                            <Ionicons name="backspace-outline" size={24} color={Colors.textSecondary} />
                        </TouchableOpacity>
                    ) : null}
                </View>

                <View style={styles.recentList}>
                    {recentRows.map((row) => (
                        <View key={`${row.name}-${row.number}`} style={styles.recentRow}>
                            <View>
                                <Text style={styles.recentName}>{row.name}</Text>
                                <Text style={styles.recentNumber}>{row.number}</Text>
                            </View>
                            <View style={styles.recentRight}>
                                <Text style={styles.recentRegion}>{row.region}</Text>
                                <Ionicons name="information-circle-outline" size={18} color={Colors.textSecondary} />
                            </View>
                        </View>
                    ))}
                </View>

                <View style={[styles.dialPad, { width: dialPadWidth }]}>
                    {DIAL_PAD.map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.dialRow}>
                            {row.map((item) => (
                                <TouchableOpacity
                                    key={item.num}
                                    style={[styles.dialButton, { width: dialButtonSize, height: dialButtonSize, borderRadius: dialButtonSize / 2 }]}
                                    onPress={() => handleDialPress(item.num)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.dialButtonNum}>{item.num}</Text>
                                    {item.sub ? <Text style={styles.dialButtonSub}>{item.sub}</Text> : <Text style={styles.dialButtonSub}> </Text>}
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </View>

                <View style={[styles.dialerFooter, { width: dialPadWidth }]}>
                    <TouchableOpacity style={styles.footerUtilityButton} onPress={onViewRecordings}>
                        <Ionicons name="list-outline" size={22} color={Colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.callButton} onPress={handleDialerCall}>
                        <Ionicons name="call" size={30} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.footerUtilityButton} onPress={handleBackspace}>
                        <Ionicons name="backspace-outline" size={22} color={Colors.textSecondary} />
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
        minHeight: 82,
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
        paddingHorizontal: 22,
        paddingTop: 8,
        paddingBottom: 18,
    },
    dialerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        paddingBottom: 12,
    },
    headerBubbleButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dialerTitle: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
        color: Colors.textSecondary,
        letterSpacing: 2.4,
    },
    numberDisplay: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 88,
        marginTop: 6,
        paddingHorizontal: 36,
    },
    numberText: {
        fontSize: 26,
        fontWeight: '300',
        color: Colors.text,
        letterSpacing: 2,
        textAlign: 'center',
    },
    savedContactText: {
        marginTop: 6,
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
        letterSpacing: 1.3,
        textTransform: 'uppercase',
    },
    backspaceButton: {
        position: 'absolute',
        right: 4,
        top: 24,
        padding: 8,
    },
    recentList: {
        marginTop: 4,
        marginBottom: 8,
    },
    recentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#1c1c1c',
    },
    recentName: {
        fontSize: Typography.sizes.md,
        color: Colors.text,
        fontWeight: Typography.weights.medium,
    },
    recentNumber: {
        marginTop: 3,
        fontSize: Typography.sizes.sm,
        color: '#5BB3B0',
    },
    recentRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recentRegion: {
        color: Colors.textSecondary,
        fontSize: Typography.sizes.sm,
        marginRight: 8,
    },
    dialPad: {
        alignSelf: 'center',
        marginTop: 12,
    },
    dialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    dialButton: {
        backgroundColor: '#131313',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1d1d1d',
    },
    dialButtonNum: {
        fontSize: 18,
        fontWeight: '400',
        color: Colors.text,
    },
    dialButtonSub: {
        fontSize: 9,
        color: Colors.textSecondary,
        marginTop: 2,
        letterSpacing: 0.7,
        minHeight: 12,
    },
    dialerFooter: {
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
    },
    footerUtilityButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    callButton: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#1ED760',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1ED760',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
});
