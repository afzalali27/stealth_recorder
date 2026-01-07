import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ToastAndroid, Platform } from 'react-native';
import { CameraView } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import FakeCallInterface from '../components/FakeCallInterface';
import CameraPreview from '../components/CameraPreview';
import { RecordingState } from '../types';

interface RecordingScreenProps {
    callerName?: string;
    callerNumber?: string;
    cameraType?: 'front' | 'back';
    onRecordingComplete: (videoUri: string) => void;
}

export default function RecordingScreen({
    callerName = 'Unknown Caller',
    callerNumber = '+1 (555) 123-4567',
    cameraType: initialCameraType = 'back',
    onRecordingComplete,
}: RecordingScreenProps) {
    // Keep screen awake during recording
    useKeepAwake();

    const cameraRef = useRef<CameraView>(null);
    const [currentView, setCurrentView] = useState<'fake-call' | 'camera-preview'>('fake-call');
    const [flashEnabled, setFlashEnabled] = useState(false);
    const [cameraType, setCameraType] = useState<'front' | 'back'>(initialCameraType);
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);

    // Timer for call duration
    useEffect(() => {
        if (!isRecording) return;

        const interval = setInterval(() => {
            setDuration((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isRecording]);

    // No auto-start here, let onCameraReady handle it
    useEffect(() => {
        // initialize storage directory
    }, []);

    const startRecording = async () => {
        if (!cameraRef.current || isRecording) return;

        try {
            console.log('Starting recording...');
            setIsRecording(true);
            const video = await cameraRef.current.recordAsync({
                maxDuration: 3600, // 1 hour max
            });

            if (video?.uri) {
                console.log('Recording completed:', video.uri);
                if (Platform.OS === 'android') {
                    ToastAndroid.show('Recording saved to Gallery', ToastAndroid.SHORT);
                }
                onRecordingComplete(video.uri);
            }
        } catch (error) {
            console.error('Error starting recording:', error);
            setIsRecording(false);
            if (Platform.OS === 'android') {
                ToastAndroid.show('Starting recording failed', ToastAndroid.LONG);
            } else {
                Alert.alert('Recording Error', 'Failed to start video recording.');
            }
        } finally {
            setIsRecording(false);
        }
    };

    const stopRecording = async () => {
        if (!cameraRef.current || !isRecording) {
            return;
        }

        try {
            console.log('Stopping recording...');
            if (cameraRef.current) {
                cameraRef.current.stopRecording();
            }
        } catch (error) {
            console.error('Error stopping recording:', error);
            Alert.alert('Recording Error', 'Failed to stop video recording.');
        }
    };

    const handleEndCall = () => {
        stopRecording();
    };

    const handleToggleFlash = () => {
        setFlashEnabled((prev) => !prev);
    };

    const handleToggleView = () => {
        setCurrentView((prev) =>
            prev === 'fake-call' ? 'camera-preview' : 'fake-call'
        );
    };

    return (
        <View style={styles.container}>
            {/* The single persistent CameraView - Always full screen at bottom */}
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={cameraType}
                mode="video"
                enableTorch={flashEnabled}
                onCameraReady={() => {
                    console.log('Camera ready');
                    startRecording();
                }}
            />

            {/* Overlays - On top of CameraView */}
            {currentView === 'fake-call' && (
                <View style={styles.overlayContainer}>
                    <FakeCallInterface
                        callerName={callerName}
                        callerNumber={callerNumber}
                        duration={duration}
                        onEndCall={handleEndCall}
                        onToggleFlash={handleToggleFlash}
                        onToggleView={handleToggleView}
                        flashEnabled={flashEnabled}
                    />
                </View>
            )}

            {currentView === 'camera-preview' && (
                <View style={styles.overlayContainer} pointerEvents="box-none">
                    <CameraPreview
                        cameraType={cameraType}
                        flashEnabled={flashEnabled}
                        onToggleView={handleToggleView}
                        isRecording={isRecording}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 2,
    },
});
