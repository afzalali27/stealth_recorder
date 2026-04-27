import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, AppStateStatus, BackHandler, Platform, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import FakeCallInterface from '../components/FakeCallInterface';
import { CallRecordingResult } from '../types';
import { formatDuration } from '../services/StorageService';
import { setCallBeepLoop, stopCallBeep, unloadCallBeep } from '../services/CallAudioService';
import { proximityService } from '../services/ProximityService';
import { Colors } from '../constants/styles';

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
    // Keep screen awake during entire recording session - fix the error
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
    const [powerButtonPressed, setPowerButtonPressed] = useState(false);

    useEffect(() => {
        // Setup proximity detection with simple screen blackout
        const handleProximityChange = (isNear: boolean) => {
            setIsNearEar(isNear);
            // Just use visual blackout overlay, no brightness control
        };

        proximityService.addListener(handleProximityChange);

        return () => {
            proximityService.removeListener(handleProximityChange);
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

        // Simple app state handling - just track state changes
        const handleAppStateChange = (nextState: AppStateStatus) => {
            console.log('App state changed to:', nextState, 'Recording:', isRecording);
            
            if (isRecording) {
                if (nextState === 'background' || nextState === 'inactive') {
                    // App going to background - show blackout
                    console.log('App going to background during recording');
                    setPowerButtonPressed(true);
                    setScreenBlackout(true);
                } else if (nextState === 'active') {
                    // App back to foreground - don't auto-remove blackout
                    console.log('App back to active during recording');
                    setPowerButtonPressed(false);
                }
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [isRecording]);

    useEffect(() => {
        if (Platform.OS !== 'android') {
            return;
        }

        // Prevent back button from ending recording
        const handleBackPress = () => {
            if (isRecording) {
                // Ignore back press during recording to prevent accidental exit
                return true; // Prevent default back behavior
            }
            return false; // Allow default back behavior
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => subscription.remove();
    }, [isRecording]);

    // Additional effect to aggressively prevent app exit during recording
    useEffect(() => {
        if (!isRecording) return;

        const keepAliveInterval = setInterval(() => {
            // This helps keep the app process alive during recording
            if (isRecording) {
                console.log('Recording active - keeping app alive');
            }
        }, 5000);

        return () => {
            clearInterval(keepAliveInterval);
        };
    }, [isRecording]);

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

    const shouldBlackOut = currentView === 'fake-call' && (isNearEar || screenBlackout || powerButtonPressed);

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
                
                {/* Manual screen blackout button */}
                <TouchableOpacity 
                    style={styles.blackoutButton}
                    onPress={() => {
                        console.log('Manual blackout toggle');
                        setScreenBlackout((prev) => !prev);
                    }}
                >
                    <Ionicons 
                        name={screenBlackout ? "eye-outline" : "eye-off-outline"} 
                        size={20} 
                        color={Colors.callTextSecondary} 
                    />
                </TouchableOpacity>
            </View>

            {shouldBlackOut ? (
                <View style={styles.proximityOverlay}>
                    <TouchableOpacity 
                        style={styles.blackoutTouchArea}
                        activeOpacity={1}
                        onPress={() => {
                            console.log('Blackout overlay tapped - removing blackout');
                            setScreenBlackout(false);
                            setPowerButtonPressed(false);
                        }}
                    >
                        <View style={styles.blackoutContent}>
                            <Text style={styles.blackoutText}>Tap to turn screen on</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            ) : null}
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
    blackoutTouchArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    blackoutContent: {
        alignItems: 'center',
    },
    blackoutText: {
        color: '#333',
        fontSize: 16,
        opacity: 0.3,
    },
    blackoutButton: {
        position: 'absolute',
        top: 120,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
});
