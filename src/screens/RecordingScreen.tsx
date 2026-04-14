import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ToastAndroid, Platform, TouchableOpacity } from 'react-native';
import { CameraView } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import FakeCallInterface from '../components/FakeCallInterface';
import { CallRecordingResult } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { formatDuration } from '../services/StorageService';
import { DeviceMotion } from 'expo-sensors';
import { playCallBeep, unloadCallBeep } from '../services/CallAudioService';

interface RecordingScreenProps {
    callerName?: string;
    callerNumber?: string;
    cameraType?: 'front' | 'back';
    onRecordingComplete: (result: CallRecordingResult) => void;
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
    const [zoomLevel, setZoomLevel] = useState(0);
    const durationRef = useRef(0);
    const callStartedAtRef = useRef(Date.now());
    const hasStartedRecordingRef = useRef(false);

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

    useEffect(() => {
        return () => {
            unloadCallBeep();
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

    // Key event listener for hardware volume buttons (Android only)
    useEffect(() => {
        if (Platform.OS !== 'android') return;

        let KeyEvent: any;
        try {
            KeyEvent = require('react-native-keyevent').default;
        } catch (e) {
            console.warn('[STEALTH_EYE] KeyEvent module not found');
            return;
        }

        const handleKeyDown = (keyEvent: any) => {
            if (keyEvent.keyCode === 24 || keyEvent.keyCode === 25) { // Volume Up or Down
                playCallBeep();
            }
        };

        KeyEvent.onKeyDownListener(handleKeyDown);

        return () => {
            KeyEvent.removeKeyDownListener();
        };
    }, []);

    const startRecording = async () => {
        if (!cameraRef.current || hasStartedRecordingRef.current) return;

        try {
            console.log('Starting recording...');
            hasStartedRecordingRef.current = true;
            callStartedAtRef.current = Date.now();
            setIsRecording(true);
            const video = await cameraRef.current.recordAsync({
                maxDuration: 3600, // 1 hour max
            });

            if (video?.uri) {
                console.log('Recording completed:', video.uri);
                if (Platform.OS === 'android') {
                    ToastAndroid.show(`Call ended (${formatDuration(durationRef.current)})`, ToastAndroid.SHORT);
                }
                onRecordingComplete({
                    videoUri: video.uri,
                    duration: durationRef.current,
                    callerName,
                    callerNumber,
                    endedAt: Date.now(),
                });
            }
        } catch (error) {
            console.error('Error starting recording:', error);
            setIsRecording(false);
            hasStartedRecordingRef.current = false;
            if (Platform.OS === 'android') {
                ToastAndroid.show('Starting recording failed', ToastAndroid.LONG);
            } else {
                Alert.alert('Recording Error', 'Failed to start video recording.');
            }
        } finally {
            setIsRecording(false);
            hasStartedRecordingRef.current = false;
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

    const handleToggleSpeakerTone = async () => {
        await playCallBeep();
    };

    const handleZoomIn = () => {
        setZoomLevel((prev) => Math.min(0.9, Math.round((prev + 0.1) * 10) / 10));
    };

    const handleZoomOut = () => {
        setZoomLevel((prev) => Math.max(0, Math.round((prev - 0.1) * 10) / 10));
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
                    zoom={zoomLevel}
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
                    zoomLevel={1 + zoomLevel}
                    onEndCall={handleEndCall}
                    onToggleFlash={handleToggleFlash}
                    onToggleView={handleToggleView}
                    onToggleSpeakerTone={handleToggleSpeakerTone}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
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
