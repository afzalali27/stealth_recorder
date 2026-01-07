import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../constants/styles';

interface CameraTestScreenProps {
    onBack: () => void;
}

export default function CameraTestScreen({ onBack }: CameraTestScreenProps) {
    const [facing, setFacing] = useState<'front' | 'back'>('back');

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} facing={facing}>
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={onBack}>
                        <Ionicons name="arrow-back" size={28} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.button}
                        onPress={() => setFacing(prev => prev === 'back' ? 'front' : 'back')}
                    >
                        <Ionicons name="camera-reverse" size={28} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.infoText}>Raw Camera Feed Verification</Text>
                    <Text style={styles.subInfoText}>If you see this, the camera hardware is working.</Text>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: Spacing.xl,
        paddingTop: 60,
    },
    button: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: Spacing.md,
        borderRadius: 30,
    },
    infoContainer: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
        padding: Spacing.md,
    },
    infoText: {
        color: '#fff',
        fontSize: Typography.sizes.lg,
        fontWeight: 'bold',
    },
    subInfoText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: Typography.sizes.sm,
    }
});
