import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/styles';

interface FakeCallInterfaceProps {
    callerName: string;
    callerNumber: string;
    duration: number; // in seconds
    zoomLevel: number;
    onEndCall: () => void;
    onToggleFlash: () => void;
    onToggleView: () => void;
    onToggleSpeakerTone: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    flashEnabled: boolean;
}

const { width, height } = Dimensions.get('window');

export default function FakeCallInterface({
    callerName,
    callerNumber,
    duration,
    zoomLevel,
    onEndCall,
    onToggleFlash,
    onToggleView,
    onToggleSpeakerTone,
    onZoomIn,
    onZoomOut,
    flashEnabled,
}: FakeCallInterfaceProps) {
    const [muted, setMuted] = useState(false);
    const [speakerOn, setSpeakerOn] = useState(false);
    const [keypadVisible, setKeypadVisible] = useState(false);

    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            {/* View Toggle Button - Eye Icon */}
            <TouchableOpacity
                style={styles.viewToggle}
                onPress={onToggleView}
                activeOpacity={0.7}
            >
                <Ionicons name="eye-outline" size={24} color={Colors.callTextSecondary} />
            </TouchableOpacity>

            {/* Top Section - Caller Info */}
            <View style={styles.topSection}>
                <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={60} color={Colors.callTextSecondary} />
                </View>

                <Text style={styles.callerName}>{callerName}</Text>
                <Text style={styles.callerNumber}>{callerNumber}</Text>

                <View style={styles.statusContainer}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>
                        In call • {formatDuration(duration)} • Zoom {Math.max(1, zoomLevel).toFixed(1)}x
                    </Text>
                </View>
            </View>

            {/* Middle Section - Secondary Buttons */}
            <View style={styles.middleSection}>
                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.secondaryButton, muted && styles.activeButton]}
                        onPress={() => setMuted(!muted)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={muted ? "mic-off" : "mic-off-outline"}
                            size={28}
                            color={muted ? Colors.callAccent : Colors.callText}
                        />
                        <Text style={[styles.buttonLabel, muted && styles.activeLabel]}>Mute</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryButton, keypadVisible && styles.activeButton]}
                        onPress={() => setKeypadVisible(!keypadVisible)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={keypadVisible ? "keypad" : "keypad-outline"}
                            size={28}
                            color={keypadVisible ? Colors.callAccent : Colors.callText}
                        />
                        <Text style={[styles.buttonLabel, keypadVisible && styles.activeLabel]}>Keypad</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryButton, speakerOn && styles.activeButton]}
                        onPress={() => {
                            setSpeakerOn(!speakerOn);
                            onToggleSpeakerTone();
                        }}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={speakerOn ? "volume-high" : "volume-high-outline"}
                            size={28}
                            color={speakerOn ? Colors.callAccent : Colors.callText}
                        />
                        <Text style={[styles.buttonLabel, speakerOn && styles.activeLabel]}>Speaker</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={[styles.secondaryButton, flashEnabled && styles.activeButton]}
                        onPress={onToggleFlash}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={flashEnabled ? "flash" : "flash-outline"}
                            size={28}
                            color={flashEnabled ? Colors.callAccent : Colors.callText}
                        />
                        <Text style={[styles.buttonLabel, flashEnabled && styles.activeLabel]}>Flash</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={onZoomOut}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="remove-circle-outline"
                            size={28}
                            color={Colors.callText}
                        />
                        <Text style={styles.buttonLabel}>Zoom Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={onZoomIn}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name="add-circle-outline"
                            size={28}
                            color={Colors.callText}
                        />
                        <Text style={styles.buttonLabel}>Zoom In</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Bottom Section - End Call Button */}
            <View style={styles.bottomSection}>
                <TouchableOpacity
                    style={styles.endCallButton}
                    onPress={onEndCall}
                    activeOpacity={0.8}
                >
                    <Ionicons name="call" size={32} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.endCallText}>End Call</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.callBackground,
        paddingTop: 60,
        paddingBottom: 40,
    },
    viewToggle: {
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 40,
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
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
        backgroundColor: 'rgba(0, 200, 83, 0.2)',
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
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xl,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: Spacing.xl,
    },
    secondaryButton: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.md,
        width: 80,
    },
    activeButton: {
        backgroundColor: 'rgba(33, 150, 243, 0.2)',
        borderRadius: BorderRadius.md,
    },
    buttonLabel: {
        fontSize: Typography.sizes.xs,
        color: Colors.callTextSecondary,
        marginTop: Spacing.xs,
    },
    activeLabel: {
        color: Colors.callAccent,
    },
    bottomSection: {
        alignItems: 'center',
        paddingBottom: Spacing.xl,
    },
    endCallButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: Colors.callDanger,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    endCallText: {
        fontSize: Typography.sizes.md,
        color: Colors.callTextSecondary,
        marginTop: Spacing.md,
    },
});
