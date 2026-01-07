import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing } from '../constants/styles';

interface CameraPreviewProps {
    cameraType: 'front' | 'back';
    flashEnabled: boolean;
    onToggleView: () => void;
    isRecording: boolean;
}

export default function CameraPreview({
    cameraType,
    flashEnabled,
    onToggleView,
    isRecording,
}: CameraPreviewProps) {
    return (
        <View style={styles.container}>
            {/* Overlay UI */}
            <View style={styles.overlay}>
                {/* Toggle back to fake call button */}
                <TouchableOpacity
                    style={styles.toggleButton}
                    onPress={onToggleView}
                    activeOpacity={0.7}
                >
                    <Ionicons name="call" size={20} color={Colors.text} />
                    <Text style={styles.toggleText}>Back to Call</Text>
                </TouchableOpacity>

                {/* Camera info */}
                <View style={styles.infoContainer}>
                    <View style={styles.infoRow}>
                        <Ionicons
                            name={cameraType === 'front' ? 'camera-reverse' : 'camera'}
                            size={16}
                            color={Colors.text}
                        />
                        <Text style={styles.infoText}>
                            {cameraType === 'front' ? 'Front' : 'Rear'} Camera
                        </Text>
                    </View>

                    {flashEnabled && (
                        <View style={styles.infoRow}>
                            <Ionicons name="flash" size={16} color={Colors.accent} />
                            <Text style={[styles.infoText, { color: Colors.accent }]}>
                                Flash On
                            </Text>
                        </View>
                    )}

                    {isRecording && (
                        <View style={styles.recordingIndicator}>
                            <View style={styles.recordingDot} />
                            <Text style={styles.recordingText}>REC</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
        padding: Spacing.lg,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 20,
        marginTop: 20,
    },
    toggleText: {
        color: Colors.text,
        fontSize: Typography.sizes.sm,
        marginLeft: Spacing.sm,
        fontWeight: Typography.weights.medium,
    },
    infoContainer: {
        position: 'absolute',
        bottom: Spacing.xl,
        left: Spacing.lg,
        right: Spacing.lg,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
        marginBottom: Spacing.sm,
        alignSelf: 'flex-start',
    },
    infoText: {
        color: Colors.text,
        fontSize: Typography.sizes.sm,
        marginLeft: Spacing.sm,
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 23, 68, 0.8)',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    recordingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFFFFF',
        marginRight: Spacing.sm,
    },
    recordingText: {
        color: '#FFFFFF',
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.bold,
    },
});
