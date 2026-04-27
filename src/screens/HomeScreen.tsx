import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Easing,
    Image,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
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
import {
    Contact,
    addContact,
    findContactByNumber,
    getContacts,
    getDefaultContact,
} from '../services/ContactsService';

interface HomeScreenProps {
    onStartRecording: (config: { cameraType: 'front' | 'back'; callerNumber?: string; callerName?: string }) => void;
    onViewRecordings: () => void;
    onOpenSettings: () => void;
    onOpenLogs: () => void;
    onOpenContacts: (prefillNumber?: string) => void;
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
    onOpenContacts,
}: HomeScreenProps) {
    const isFocused = useIsFocused();
    const { width } = useWindowDimensions();
    const [selectedCamera, setSelectedCamera] = useState<'front' | 'back'>('back');
    const [hasPermissions, setHasPermissions] = useState(false);
    const [showDialer, setShowDialer] = useState(true);
    const [dialNumber, setDialNumber] = useState('');
    const [defaultContact, setDefaultContact] = useState<Contact | null>(null);
    const [contacts, setContacts] = useState<Contact[]>([]);
    // Save-to-contacts modal
    const [saveModalVisible, setSaveModalVisible] = useState(false);
    const [saveModalName, setSaveModalName] = useState('');
    const [saveModalNumber, setSaveModalNumber] = useState('');
    const dialerAnim = useRef(new Animated.Value(1)).current;

    const loadData = useCallback(async () => {
        const settings = await loadSettings();
        setSelectedCamera(settings.defaultCamera);
        const def = await getDefaultContact();
        setDefaultContact(def);
        const all = await getContacts();
        setContacts(all);
    }, []);

    useEffect(() => {
        if (isFocused) {
            loadData();
        }
    }, [isFocused, loadData]);

    useEffect(() => {
        const init = async () => {
            const granted = await ensurePermissions();
            setHasPermissions(granted);
        };
        init();
    }, []);

    const handleCameraToggle = async (type: 'front' | 'back') => {
        setSelectedCamera(type);
        await saveSetting(STORAGE_KEYS.DEFAULT_CAMERA, type);
    };

    const ensureCapturePermissions = async (): Promise<boolean> => {
        if (hasPermissions) return true;
        const granted = await ensurePermissions();
        if (!granted) {
            Alert.alert('Permissions Required', 'Camera and microphone permissions are required.');
            return false;
        }
        setHasPermissions(true);
        return true;
    };

    const handleStartRecording = async () => {
        const ready = await ensureCapturePermissions();
        if (!ready) return;
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
        if (!ready) return;

        const typed = dialNumber.trim();

        if (typed) {
            // Check if number matches a contact
            const match = await findContactByNumber(typed);
            onStartRecording({
                cameraType: selectedCamera,
                callerNumber: typed,
                callerName: match?.name,
            });
        } else {
            // Dial default contact
            if (defaultContact) {
                onStartRecording({
                    cameraType: selectedCamera,
                    callerNumber: defaultContact.number,
                    callerName: defaultContact.name,
                });
            } else {
                Alert.alert('No Default', 'Add a contact and set it as default, or enter a number.');
            }
        }

        setDialNumber('');
    };

    const handleSaveNewContact = async () => {
        const name = saveModalName.trim();
        const number = saveModalNumber;
        if (!name) {
            Alert.alert('Name required', 'Please enter a name for this contact.');
            return;
        }
        await addContact(name, number);
        setSaveModalVisible(false);
        await loadData();
    };

    // Matched contact for the typed number
    const matchedContact = useMemo(() => {
        const typed = dialNumber.trim();
        if (!typed) return null;
        const normalized = typed.replace(/\s+/g, '');
        return contacts.find((c) => c.number.replace(/\s+/g, '') === normalized) ?? null;
    }, [dialNumber, contacts]);

    const displayNumber = dialNumber.trim() || '';
    const displayLabel = dialNumber.trim()
        ? matchedContact
            ? matchedContact.name
            : 'Unknown number'
        : defaultContact
        ? `${defaultContact.name} (default)`
        : 'No default set';

    const dialButtonSize = Math.min(80, Math.max(68, Math.floor((width - 80) / 3)));
    const dialPadWidth = dialButtonSize * 3 + 32;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            {/* Home layer */}
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
                        <TouchableOpacity style={styles.actionButton} onPress={onViewRecordings} activeOpacity={0.8}>
                            <Ionicons name="videocam" size={24} color={Colors.primary} />
                            <Text style={styles.actionButtonText}>VIDEOS</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton} onPress={onOpenSettings} activeOpacity={0.8}>
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

                    <TouchableOpacity style={styles.startButton} onPress={handleStartRecording} activeOpacity={0.84}>
                        <Ionicons name="flash" size={26} color="#FFFFFF" />
                        <View style={{ width: Spacing.md }} />
                        <Text style={styles.startButtonText}>DEPLOY</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Dialer overlay */}
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
                {/* Main content area */}
                <View style={styles.dialerContent}>
                    {/* Number display area - full width */}
                    <View style={styles.numberSection}>
                        {displayNumber ? (
                            <>
                                <Text style={styles.numberText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                                    {displayNumber}
                                </Text>
                                {/* Contact save option when typing unknown number */}
                                {dialNumber.trim() && !matchedContact && (
                                    <TouchableOpacity 
                                        style={styles.newContactOption}
                                        onPress={() => {
                                            setSaveModalName('');
                                            setSaveModalNumber(dialNumber.trim());
                                            setSaveModalVisible(true);
                                        }}
                                    >
                                        <Ionicons name="person-add-outline" size={20} color={Colors.textSecondary} />
                                        <Text style={styles.newContactText}>New contact</Text>
                                    </TouchableOpacity>
                                )}
                                {matchedContact && (
                                    <Text style={styles.contactLabel}>{matchedContact.name}</Text>
                                )}
                            </>
                        ) : (
                            <Text style={styles.placeholderText}>
                                {defaultContact ? `Default: ${defaultContact.name}` : 'Enter number or add a contact'}
                            </Text>
                        )}
                    </View>

                    {/* Dial pad - wider */}
                    <View style={styles.dialPadContainer}>
                        {DIAL_PAD.map((row, rowIndex) => (
                            <View key={rowIndex} style={styles.dialRow}>
                                {row.map((item) => (
                                    <TouchableOpacity
                                        key={item.num}
                                        style={[styles.dialButton, { width: dialButtonSize, height: dialButtonSize, borderRadius: dialButtonSize / 2 }]}
                                        onPress={() => handleDialPress(item.num)}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.dialButtonNum}>{item.num}</Text>
                                        <Text style={styles.dialButtonSub}>
                                            {item.sub || ' '}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        ))}
                    </View>

                    {/* Call button and side actions */}
                    <View style={styles.callSection}>
                        <View style={styles.callRow}>
                            <TouchableOpacity style={styles.sideButton} onPress={onOpenLogs}>
                                <Ionicons name="time-outline" size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.callButton} onPress={handleDialerCall}>
                                <Ionicons name="call" size={32} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={styles.sideButton} 
                                onPress={dialNumber ? handleBackspace : undefined}
                                disabled={!dialNumber}
                            >
                                <Ionicons 
                                    name="backspace-outline" 
                                    size={24} 
                                    color={dialNumber ? Colors.textSecondary : Colors.border} 
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Bottom navigation bar */}
                <View style={styles.bottomNav}>
                    <TouchableOpacity style={styles.bottomNavButton} onPress={onOpenLogs}>
                        <Ionicons name="call-outline" size={24} color={Colors.textSecondary} />
                        <Text style={styles.bottomNavText}>Calls</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.bottomNavButton} onPress={() => setDialerVisibility(false)}>
                        <Ionicons name="home-outline" size={24} color={Colors.textSecondary} />
                        <Text style={styles.bottomNavText}>Home</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.bottomNavButton} onPress={() => onOpenContacts()}>
                        <Ionicons name="people-outline" size={24} color={Colors.textSecondary} />
                        <Text style={styles.bottomNavText}>Contacts</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Save contact modal */}
            <Modal
                visible={saveModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setSaveModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Save Contact</Text>
                        <Text style={styles.modalSubtitle}>{saveModalNumber}</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Contact name"
                            placeholderTextColor={Colors.textSecondary}
                            value={saveModalName}
                            onChangeText={setSaveModalName}
                            autoCapitalize="words"
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSaveModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveNewContact}>
                                <Text style={styles.modalSaveText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Save contact modal */}
            <Modal
                visible={saveModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setSaveModalVisible(false)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Save Contact</Text>
                        <Text style={styles.modalSubtitle}>{saveModalNumber}</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Contact name"
                            placeholderTextColor={Colors.textSecondary}
                            value={saveModalName}
                            onChangeText={setSaveModalName}
                            autoCapitalize="words"
                            autoFocus
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSaveModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveNewContact}>
                                <Text style={styles.modalSaveText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    headerActions: { flexDirection: 'row' },
    title: {
        fontSize: Typography.sizes.xxl,
        fontWeight: '900',
        color: Colors.primary,
        letterSpacing: 2,
        textShadowColor: 'rgba(155, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    settingsButton: { padding: Spacing.sm, marginLeft: 8 },
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
    batLogo: { width: 200, height: 150, opacity: 0.92 },
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
    rapidCameraActive: { backgroundColor: Colors.secondary },
    rapidCameraText: {
        marginLeft: Spacing.xs,
        fontSize: Typography.sizes.xs,
        color: Colors.textSecondary,
        fontWeight: Typography.weights.semibold,
    },
    rapidCameraActiveText: { color: Colors.primary },
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
    // Dialer
    dialerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Colors.background,
        paddingHorizontal: 16,
        justifyContent: 'space-between',
    },
    dialerTopBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        paddingBottom: 8,
        paddingHorizontal: 8,
    },
    topBarButton: {
        padding: 8,
    },
    dialerTitle: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
        color: Colors.textSecondary,
        letterSpacing: 2,
    },
    dialerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    numberSection: {
        alignItems: 'center',
        minHeight: 120,
        justifyContent: 'center',
        marginBottom: 32,
        paddingHorizontal: 0, // Full width
    },
    numberText: {
        fontSize: 32,
        fontWeight: '300',
        color: Colors.text,
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 8,
        width: '100%',
    },
    contactLabel: {
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    newContactOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 8,
        alignSelf: 'flex-start',
    },
    newContactText: {
        marginLeft: 12,
        fontSize: Typography.sizes.md,
        color: Colors.textSecondary,
    },
    placeholderText: {
        fontSize: Typography.sizes.md,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
        width: '100%',
    },
    dialPadContainer: {
        alignSelf: 'stretch', // Full width
        paddingHorizontal: 24, // Small padding on sides
        marginBottom: 24,
    },
    dialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    dialButton: {
        backgroundColor: Colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    dialButtonNum: {
        fontSize: 20,
        fontWeight: '400',
        color: Colors.text,
        marginBottom: 2,
    },
    dialButtonSub: {
        fontSize: 10,
        color: Colors.textSecondary,
        letterSpacing: 0.5,
        height: 12,
        textAlign: 'center',
        lineHeight: 12,
    },
    callSection: {
        alignSelf: 'stretch',
        paddingHorizontal: 24, // Same as dial pad
        marginBottom: 32,
    },
    callRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sideButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    callButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#1ED760', // Green call button
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#1ED760',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    bottomNavButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    bottomNavText: {
        marginTop: 4,
        fontSize: Typography.sizes.xs,
        color: Colors.textSecondary,
    },
    // Save modal
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    modalBox: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        width: '100%',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    modalTitle: {
        color: Colors.text,
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
        marginBottom: 4,
    },
    modalSubtitle: {
        color: Colors.textSecondary,
        fontSize: Typography.sizes.sm,
        marginBottom: Spacing.md,
    },
    modalInput: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        color: Colors.text,
        fontSize: Typography.sizes.md,
        marginBottom: Spacing.md,
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
    modalCancelBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginRight: Spacing.sm },
    modalCancelText: { color: Colors.textSecondary, fontSize: Typography.sizes.md },
    modalSaveBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    modalSaveText: { color: '#fff', fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
});
