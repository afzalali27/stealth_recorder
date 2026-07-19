import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    BackHandler,
    Platform,
    StyleSheet,
    ToastAndroid,
    TouchableOpacity,
    View,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { Ionicons } from '@expo/vector-icons';
import FakeCallInterface from '../components/FakeCallInterface';
import { CallRecordingResult } from '../types';
import { formatDuration } from '../services/StorageService';
import { setCallBeepLoop, stopCallBeep, unloadCallBeep } from '../services/CallAudioService';
import { CallRecorder } from '../native/CallRecorder';
import { ProximityLock } from '../native/ProximityLock';

interface RecordingScreenProps {
    callerName?: string;
    callerNumber?: string;
    cameraType?: 'front' | 'back';
    onRecordingComplete: (result: CallRecordingResult) => void;
    onCancel?: () => void;
}

export default function RecordingScreen({
    callerName = 'Unknown Caller',
    callerNumber = '+1 (555) 123-4567',
    cameraType: initialCameraType = 'back',
    onRecordingComplete,
    onCancel,
}: RecordingScreenProps) {
    // Prevent the idle timeout from dimming the screen during a "call".
    useKeepAwake();

    // On Android the camera is owned by a native foreground service so recording keeps
    // running when the screen locks. Other platforms fall back to the in-app camera.
    const useNativeRecorder = CallRecorder.isAvailable();

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

    const finalizeComplete = useCallback(
        (uri: string, durationMsFromNative?: number) => {
            if (completedRef.current) return;
            completedRef.current = true;

            const seconds =
                durationMsFromNative && durationMsFromNative > 0
                    ? Math.round(durationMsFromNative / 1000)
                    : durationRef.current;

            stopCallBeep();

            if (Platform.OS === 'android') {
                ToastAndroid.show(`Call ended (${formatDuration(seconds)})`, ToastAndroid.SHORT);
            }

            onRecordingComplete({
                videoUri: uri,
                duration: seconds,
                callerName,
                callerNumber,
                endedAt: Date.now(),
            });
        },
        [callerName, callerNumber, onRecordingComplete]
    );

    // Proximity screen-off for the duration of the call.
    useEffect(() => {
        ProximityLock.activate().catch(() => undefined);
        return () => {
            ProximityLock.deactivate();
        };
    }, []);

    // Ringback / audio cleanup on unmount.
    useEffect(() => {
        return () => {
            stopCallBeep();
            unloadCallBeep();
        };
    }, []);

    // Duration counter while recording.
    useEffect(() => {
        if (!isRecording) {
            return;
        }
        const interval = setInterval(() => {
            durationRef.current += 1;
            setDuration(durationRef.current);
        }, 1000);
        return () => clearInterval(interval);
    }, [isRecording]);

    // Native recorder lifecycle.
    useEffect(() => {
        if (!useNativeRecorder) return;

        const subscription = CallRecorder.addListener((event) => {
            if (event.event === 'started') {
                setIsRecording(true);
            } else if (event.event === 'finalized' && event.uri) {
                finalizeComplete(event.uri, event.durationMs);
            } else if (event.event === 'error') {
                if (!completedRef.current) {
                    completedRef.current = true;
                    if (Platform.OS === 'android') {
                        ToastAndroid.show('Recording failed to start', ToastAndroid.LONG);
                    }
                    onCancel?.();
                }
            }
        });

        startedRef.current = true;
        CallRecorder.start(initialCameraType, false)
            .then(() => setIsRecording(true))
            .catch((error) => {
                console.error('Native recorder start failed:', error);
                if (!completedRef.current) {
                    completedRef.current = true;
                    if (Platform.OS === 'android') {
                        ToastAndroid.show('Recording failed to start', ToastAndroid.LONG);
                    }
                    onCancel?.();
                }
            });

        return () => {
            subscription.remove();
            // If we leave without an explicit End Call, make sure the service stops.
            if (!completedRef.current) {
                CallRecorder.stop().catch(() => undefined);
            }
        };
    }, [useNativeRecorder, initialCameraType, finalizeComplete, onCancel]);

    // Block the hardware back button during a call so it isn't ended by accident.
    useEffect(() => {
        if (Platform.OS !== 'android') return;
        const subscription = BackHandler.addEventListener('hardwareBackPress', () => isRecording);
        return () => subscription.remove();
    }, [isRecording]);

    // Fallback recorder (non-Android): start when the in-app camera is ready.
    const startFallbackRecording = async () => {
        if (useNativeRecorder) return;
        if (!cameraRef.current || startedRef.current || endingRef.current || completedRef.current) {
            return;
        }
        try {
            startedRef.current = true;
            setIsRecording(true);
            const video = await cameraRef.current.recordAsync({ maxDuration: 3600 });
            if (video?.uri) {
                finalizeComplete(video.uri);
            }
        } catch (error) {
            if (!endingRef.current) {
                console.error('Error starting recording:', error);
                Alert.alert('Recording Error', 'Failed to start video recording.');
                onCancel?.();
            }
        } finally {
            setIsRecording(false);
        }
    };

    const stopRecording = async () => {
        if (endingRef.current) return;
        endingRef.current = true;
        stopCallBeep();

        if (useNativeRecorder) {
            try {
                const result = await CallRecorder.stop();
                if (result?.uri) {
                    finalizeComplete(result.uri, result.durationMs);
                }
            } catch (error) {
                console.error('Native recorder stop failed:', error);
                onCancel?.();
            }
        } else {
            cameraRef.current?.stopRecording();
        }
    };

    const handleToggleView = () => {
        setCurrentView((prev) => (prev === 'fake-call' ? 'camera-preview' : 'fake-call'));
    };

    const handleToggleSpeakerTone = async (enabled: boolean) => {
        await setCallBeepLoop(enabled);
    };

    const handleToggleFlash = () => {
        setFlashEnabled((prev) => {
            const next = !prev;
            if (useNativeRecorder) CallRecorder.setTorch(next);
            return next;
        });
    };

    const applyZoom = (next: number) => {
        setZoomLevel(next);
        if (useNativeRecorder) CallRecorder.setZoom(next);
    };

    const handleZoomIn = () => applyZoom(Math.min(0.85, Math.round((zoomLevel + 0.1) * 10) / 10));
    const handleZoomOut = () => applyZoom(Math.max(0, Math.round((zoomLevel - 0.1) * 10) / 10));

    return (
        <View style={styles.container}>
            {!useNativeRecorder && (
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
                        onCameraReady={startFallbackRecording}
                    />
                    {currentView === 'camera-preview' ? (
                        <TouchableOpacity style={styles.pipClose} onPress={handleToggleView}>
                            <Ionicons name="close-circle" size={32} color="#fff" />
                        </TouchableOpacity>
                    ) : null}
                </View>
            )}

            <View style={styles.overlayContainer}>
                <FakeCallInterface
                    callerName={callerName}
                    callerNumber={callerNumber}
                    duration={duration}
                    onEndCall={stopRecording}
                    onToggleFlash={handleToggleFlash}
                    onToggleView={useNativeRecorder ? undefined : handleToggleView}
                    onToggleSpeakerTone={handleToggleSpeakerTone}
                    onZoomIn={handleZoomIn}
                    onZoomOut={handleZoomOut}
                    flashEnabled={flashEnabled}
                />
            </View>
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
});
