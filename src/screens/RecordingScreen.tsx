import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { DeviceMotion } from 'expo-sensors';
import { Ionicons } from '@expo/vector-icons';
import FakeCallInterface from '../components/FakeCallInterface';
import { CallRecordingResult } from '../types';
import { formatDuration } from '../services/StorageService';
import { setCallBeepLoop, stopCallBeep, unloadCallBeep } from '../services/CallAudioService';

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
    useKeepAwake();

    const cameraRef = useRef<CameraView>(null);
    const startedRef = useRef(false);
    const endingRef = useRef(false);
    const completedRef = useRef(false);
    const durationRef = useRef(0);
    const [currentView, setCurrentView] = useState<'fake-call' | 'camera-preview'>('fake-call');
    const [flashEnabled, setFlashEnabled] = useState(false);
    const [duration, setDuration] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(0);
    const [isNearEar, setIsNearEar] = useState(false);
    const [screenBlackout, setScreenBlackout] = useState(false);

    useEffect(() => {
        let subscription: { remove: () => void } | undefined;

        const startMotionTracking = async () => {
            DeviceMotion.setUpdateInterval(250);
            subscription = DeviceMotion.addListener((data) => {
                const rotation = data.rotation;
                const gravity = data.accelerationIncludingGravity;

                const sideTilt =
                    !!rotation &&
                    Math.abs(rotation.gamma ?? 0) > 0.7 &&
                    Math.abs(rotation.beta ?? 0) < 1.5;

                const uprightGrip =
                    !!gravity &&
                    Math.abs(gravity.y ?? 0) > 7 &&
                    Math.abs(gravity.z ?? 0) < 6;

                setIsNearEar(sideTilt || uprightGrip);
            });
        };

        startMotionTracking();

        return () => {
            subscription?.remove();
        };
    }, []);

    useEffect(() => {
        return () => {
            stopCallBeep();
            unloadCallBeep();
        };
    }, []);

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

    useEffect(() => {
        if (Platform.OS !== 'android') {
            return;
        }

        let KeyEvent: any;
        try {
            KeyEvent = require('react-native-keyevent').default;
        } catch (error) {
            console.warn('[BAT_EYE] KeyEvent module not found');
            return;
        }

        const handleKeyDown = (keyEvent: { keyCode: number }) => {
            if (keyEvent.keyCode === 26) {
                setScreenBlackout((prev) => !prev);
            }
        };

        KeyEvent.onKeyDownListener(handleKeyDown);

        return () => {
            KeyEvent.removeKeyDownListener();
        };
    }, []);

    const startRecording = async () => {
        if (!cameraRef.current || startedRef.current || endingRef.current || completedRef.current) {
            return;
        }

        try {
            startedRef.current = true;
            setIsRecording(true);

            const video = await cameraRef.current.recordAsync({
                maxDuration: 3600,
            });

            if (video?.uri && !completedRef.current) {
                completedRef.current = true;
                if (Platform.OS === 'android') {
                    ToastAndroid.show(`Call ended (${formatDuration(durationRef.current)})`, ToastAndroid.SHORT);
                }

                await stopCallBeep();
                onRecordingComplete({
                    videoUri: video.uri,
                    duration: durationRef.current,
                    callerName,
                    callerNumber,
                    endedAt: Date.now(),
                });
            }
        } catch (error) {
            if (!endingRef.current) {
                console.error('Error starting recording:', error);
                if (Platform.OS === 'android') {
                    ToastAndroid.show('Starting recording failed', ToastAndroid.LONG);
                } else {
                    Alert.alert('Recording Error', 'Failed to start video recording.');
                }
            }
        } finally {
            setIsRecording(false);
            startedRef.current = false;
        }
    };

    const stopRecording = () => {
        if (!cameraRef.current || !isRecording || endingRef.current) {
            return;
        }

        endingRef.current = true;
        stopCallBeep();
        cameraRef.current.stopRecording();
    };

    const handleToggleView = () => {
        setCurrentView((prev) => (prev === 'fake-call' ? 'camera-preview' : 'fake-call'));
    };

    const handleToggleSpeakerTone = async (enabled: boolean) => {
        await setCallBeepLoop(enabled);
    };

    const handleZoomIn = () => {
        setZoomLevel((prev) => Math.min(0.85, Math.round((prev + 0.1) * 10) / 10));
    };

    const handleZoomOut = () => {
        setZoomLevel((prev) => Math.max(0, Math.round((prev - 0.1) * 10) / 10));
    };

    const shouldBlackOut = currentView === 'fake-call' && (isNearEar || screenBlackout);

    return (
        <View style={styles.container}>
            <View
                style={currentView === 'fake-call' ? styles.hiddenCamera : styles.pipCamera}
                pointerEvents={currentView === 'fake-call' ? 'none' : 'auto'}
            >
                <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing={initialCameraType}
                    mode="video"
                    zoom={zoomLevel}
                    enableTorch={flashEnabled}
                    onCameraReady={startRecording}
                />

                {currentView === 'camera-preview' ? (
                    <TouchableOpacity style={styles.pipClose} onPress={handleToggleView}>
                        <Ionicons name="close-circle" size={32} color="#fff" />
                    </TouchableOpacity>
                ) : null}
            </View>

            <View style={[styles.overlayContainer, currentView === 'camera-preview' && styles.dimmedOverlay]}>
                <FakeCallInterface
                    callerName={callerName}
                    callerNumber={callerNumber}
                    duration={duration}
                    onEndCall={stopRecording}
                    onToggleFlash={() => setFlashEnabled((prev) => !prev)}
                    onToggleView={handleToggleView}
                    onToggleSpeakerTone={handleToggleSpeakerTone}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    flashEnabled={flashEnabled}
                />
            </View>

            {shouldBlackOut ? <View style={styles.proximityOverlay} pointerEvents="none" /> : null}
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
        top: 64,
        right: 18,
        width: 140,
        height: 230,
        zIndex: 10,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#fff',
        backgroundColor: '#000',
    },
    pipClose: {
        position: 'absolute',
        top: 6,
        right: 6,
        zIndex: 11,
    },
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    dimmedOverlay: {
        opacity: 0.55,
    },
    proximityOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 100,
    },
});
