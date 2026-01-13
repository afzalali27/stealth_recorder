import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Alert, ToastAndroid, Platform, TouchableOpacity } from 'react-native';
import { CameraView } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import FakeCallInterface from '../components/FakeCallInterface';
import { RecordingState } from '../types';
import { Ionicons } from '@expo/vector-icons';
import KeyEvent from 'react-native-keyevent';
import * as MediaLibrary from 'expo-media-library';
import { formatDuration, savePhoto } from '../services/StorageService';
import { DeviceMotion } from 'expo-sensors';

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
    const [isNearEar, setIsNearEar] = useState(false);
    const durationRef = useRef(0);

    // Proximity sensor for screen dimming (simulate ear detection)
    useEffect(() => {
        let subscription: any;

        const startProximity = async () => {
            // DeviceMotion doesn't have proximity, but we can detect when phone is tilted to ear
            // For actual proximity, we'd need a native module. This uses orientation as a proxy.
            DeviceMotion.setUpdateInterval(500);
            subscription = DeviceMotion.addListener((data) => {
                if (data.rotation) {
                    // Phone is held to ear when tilted ~90 degrees on gamma axis
                    const isNearEarPosition = Math.abs(data.rotation.gamma) > 1.2 && Math.abs(data.rotation.beta) < 0.5;
                    setIsNearEar(isNearEarPosition);
                }
            });
        };

        startProximity();

        return () => {
            if (subscription) subscription.remove();
        };
    }, []);

    // Timer for call duration
    useEffect(() => {
        if (!isRecording) {
            durationRef.current = 0;
            setDuration(0);
            return;
        }

        const interval = setInterval(() => {
            durationRef.current += 1;
            setDuration(durationRef.current);
        }, 1000);

        return () => clearInterval(interval);
    }, [isRecording]);

    const takePhoto = useCallback(async () => {
        if (!cameraRef.current) {
            console.warn('[STEALTH_EYE] Camera ref is null, cannot take photo');
            return;
        }

        try {
            console.log('[STEALTH_EYE] Attempting to capture photo...');

            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                // skipProcessing: true, // Removed for reliability on real devices
                base64: false,
                exif: false,
            });

            if (photo?.uri) {
                console.log('[STEALTH_EYE] Photo captured:', photo.uri);
                await savePhoto(photo.uri);
                console.log('[STEALTH_EYE] Photo saved successfully');
                if (Platform.OS === 'android') {
                    ToastAndroid.show('Stealth Photo Captured', ToastAndroid.SHORT);
                }
            } else {
                console.warn('[STEALTH_EYE] Photo capture returned no URI');
                if (Platform.OS === 'android') {
                    ToastAndroid.show('Capture Failed: No URI', ToastAndroid.SHORT);
                }
            }
        } catch (error) {
            console.error('[STEALTH_EYE] Photo capture failed:', error);
            if (Platform.OS === 'android') {
                // Convert error to string safely
                const errorMessage = error instanceof Error ? error.message : String(error);
                ToastAndroid.show('Photo Capture Failed', ToastAndroid.SHORT);
            }
        }
    }, []);

    // Key event listener for hardware volume buttons
    useEffect(() => {
        const handleKeyDown = (keyEvent: any) => {
            if (keyEvent.keyCode === 24 || keyEvent.keyCode === 25) { // Volume Up or Down
                console.log('[STEALTH_EYE] Volume button pressed, taking photo...');
                takePhoto();
            }
        };

        KeyEvent.onKeyDownListener(handleKeyDown);

        return () => {
            KeyEvent.removeKeyDownListener();
        };
    }, [takePhoto]);

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
                    // Use ref value to avoid closure issue
                    ToastAndroid.show(`Call ended (${formatDuration(durationRef.current)})`, ToastAndroid.SHORT);
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
            {/* The single persistent CameraView - Switches between Full and PiP */}
            <View
                style={currentView === 'fake-call' ? styles.hiddenCamera : styles.pipCamera}
                pointerEvents={currentView === 'fake-call' ? 'none' : 'auto'}
            >
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

                {currentView === 'camera-preview' && (
                    <TouchableOpacity style={styles.pipClose} onPress={handleToggleView}>
                        <Ionicons name="close-circle" size={32} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Fake Call Interface - Stays as background even in preview mode */}
            <View style={[styles.overlayContainer, currentView === 'camera-preview' && { opacity: 0.5 }]}>
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

            {/* Screen dimming overlay when phone is near ear */}
            {isNearEar && currentView === 'fake-call' && (
                <View style={styles.proximityOverlay} />
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
        flex: 1,
    },
    hiddenCamera: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
        zIndex: -1,
    },
    pipCamera: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 150,
        height: 250,
        zIndex: 10,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: '#000',
    },
    pipClose: {
        position: 'absolute',
        top: 5,
        right: 5,
        zIndex: 11,
    },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    proximityOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 100,
    },
});
