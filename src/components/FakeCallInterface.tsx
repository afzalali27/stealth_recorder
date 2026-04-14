import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/styles';

interface FakeCallInterfaceProps {
    callerName: string;
    callerNumber: string;
    duration: number;
    onEndCall: () => void;
    onToggleFlash: () => void;
    onToggleView: () => void;
    onToggleSpeakerTone: (enabled: boolean) => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    flashEnabled: boolean;
}

export default function FakeCallInterface({
    callerName,
    callerNumber,
    duration,
    onEndCall,
    onToggleFlash,
    onToggleView,
    onToggleSpeakerTone,
    onZoomIn,
    onZoomOut,
    flashEnabled,
}: FakeCallInterfaceProps) {
    const { width } = useWindowDimensions();
    const [muted, setMuted] = useState(false);
    const [speakerOn, setSpeakerOn] = useState(false);
    const [keypadVisible, setKeypadVisible] = useState(false);
    const [holdActive, setHoldActive] = useState(false);

    useEffect(() => {
        return () => {
            onToggleSpeakerTone(false);
        };
    }, [onToggleSpeakerTone]);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const buttonWidth = Math.min(92, Math.max(80, (width - 64) / 3));

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.viewToggle}
                onPress={onToggleView}
                activeOpacity={0.7}
            >
                <Ionicons name="eye-outline" size={22} color={Colors.callTextSecondary} />
            </TouchableOpacity>

            <View style={styles.topSection}>
                <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={54} color={Colors.callTextSecondary} />
                </View>

                <Text style={styles.callerName}>{callerName}</Text>
                <Text style={styles.callerNumber}>{callerNumber}</Text>

                <View style={styles.statusContainer}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>In call • {formatDuration(duration)}</Text>
                </View>
            </View>

            <View style={styles.middleSection}>
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.secondaryButton, { width: buttonWidth }, muted && styles.activeButton]}
                        onPress={() => setMuted((prev) => !prev)}
                        activeOpacity={0.75}
                    >
                        <Ionicons
                            name={muted ? 'mic-off' : 'mic-off-outline'}
                            size={26}
                            color={muted ? Colors.callAccent : Colors.callText}
                        />
                        <Text style={[styles.buttonLabel, muted && styles.activeLabel]}>Mute</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryButton, { width: buttonWidth }, keypadVisible && styles.activeButton]}
                        onPress={() => setKeypadVisible((prev) => !prev)}
                        activeOpacity={0.75}
                    >
                        <Ionicons
                            name={keypadVisible ? 'keypad' : 'keypad-outline'}
                            size={26}
                            color={keypadVisible ? Colors.callAccent : Colors.callText}
                        />
                        <Text style={[styles.buttonLabel, keypadVisible && styles.activeLabel]}>Keypad</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryButton, { width: buttonWidth }, speakerOn && styles.activeButton]}
                        onPress={() => {
                            const next = !speakerOn;
                            setSpeakerOn(next);
                            onToggleSpeakerTone(next);
                        }}
                        activeOpacity={0.75}
                    >
                        <Ionicons
                            name={speakerOn ? 'volume-high' : 'volume-high-outline'}
                            size={26}
                            color={speakerOn ? Colors.callAccent : Colors.callText}
                        />
                        <Text style={[styles.buttonLabel, speakerOn && styles.activeLabel]}>Speaker</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.secondaryButton, { width: buttonWidth }, flashEnabled && styles.activeButton]}
                        onPress={onToggleFlash}
                        activeOpacity={0.75}
                    >
                        <Ionicons
                            name={flashEnabled ? 'flash' : 'flash-outline'}
                            size={26}
                            color={flashEnabled ? Colors.callAccent : Colors.callText}
                        />
                        <Text style={[styles.buttonLabel, flashEnabled && styles.activeLabel]}>Flash</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryButton, { width: buttonWidth }, holdActive && styles.activeButton]}
                        onPress={() => {
                            setHoldActive((prev) => !prev);
                            onZoomOut();
                        }}
                        activeOpacity={0.75}
                    >
                        <Ionicons
                            name={holdActive ? 'pause' : 'pause-outline'}
                            size={26}
                            color={holdActive ? Colors.callAccent : Colors.callText}
                        />
                        <Text style={[styles.buttonLabel, holdActive && styles.activeLabel]}>Hold</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryButton, { width: buttonWidth }]}
                        onPress={onZoomIn}
                        activeOpacity={0.75}
                    >
                        <Ionicons name="add-outline" size={26} color={Colors.callText} />
                        <Text style={styles.buttonLabel}>Add call</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.bottomSection}>
                <TouchableOpacity
                    style={styles.endCallButton}
                    onPress={onEndCall}
                    activeOpacity={0.85}
                >
                    <Ionicons name="call" size={30} color="#FFFFFF" style={styles.endCallIcon} />
                </TouchableOpacity>
                <Text style={styles.endCallText}>End call</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.callBackground,
        paddingTop: 58,
        paddingBottom: 38,
    },
    viewToggle: {
        position: 'absolute',
        top: 18,
        right: 20,
        zIndex: 10,
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 32,
    },
    avatarPlaceholder: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: Colors.callSecondary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    callerName: {
        fontSize: Typography.sizes.huge,
        fontWeight: Typography.weights.semibold,
        color: Colors.callText,
        marginBottom: Spacing.xs,
    },
    callerNumber: {
        fontSize: Typography.sizes.lg,
        color: Colors.callTextSecondary,
        marginBottom: Spacing.lg,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        backgroundColor: 'rgba(0, 200, 83, 0.16)',
        borderRadius: BorderRadius.lg,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.callPrimary,
        marginRight: Spacing.sm,
    },
    statusText: {
        fontSize: Typography.sizes.sm,
        color: Colors.callPrimary,
        fontWeight: Typography.weights.medium,
    },
    middleSection: {
        paddingHorizontal: 18,
        paddingVertical: 24,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    secondaryButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: BorderRadius.md,
    },
    activeButton: {
        backgroundColor: 'rgba(33, 150, 243, 0.16)',
    },
    buttonLabel: {
        fontSize: Typography.sizes.xs,
        color: Colors.callTextSecondary,
        marginTop: 6,
        textTransform: 'capitalize',
    },
    activeLabel: {
        color: Colors.callAccent,
    },
    bottomSection: {
        alignItems: 'center',
        paddingBottom: 10,
    },
    endCallButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: Colors.callDanger,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    endCallIcon: {
        transform: [{ rotate: '135deg' }],
    },
    endCallText: {
        fontSize: Typography.sizes.sm,
        color: Colors.callTextSecondary,
        marginTop: Spacing.md,
        textTransform: 'capitalize',
    },
});
