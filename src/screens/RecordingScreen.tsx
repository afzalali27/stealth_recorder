import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, ToastAndroid, Platform, TouchableOpacity } from 'react-native';
import { CameraView } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import FakeCallInterface from '../components/FakeCallInterface';
import { RecordingState } from '../types';
import { Ionicons } from '@expo/vector-icons';
import KeyEvent from 'react-native-keyevent';
import * as MediaLibrary from 'expo-media-library';
import { formatDuration, savePhoto } from '../services/StorageService';

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
    const durationRef = useRef(0);

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

    // Key event listener for hardware volume buttons
    useEffect(() => {
        KeyEvent.onKeyDownListener((keyEvent: any) => {
            if (keyEvent.keyCode === 24 || keyEvent.keyCode === 25) { // Volume Up or Down
                console.log('Volume button pressed, taking photo...');
                takePhoto();
            }
        });

        return () => {
            KeyEvent.removeKeyDownListener();
        };
    }, [isRecording]); // Re-bind if isRecording changes to ensure we have latest state if needed

    const takePhoto = async () => {
        if (!cameraRef.current) return;

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                skipProcessing: true,
            });

            if (photo?.uri) {
                console.log('Photo captured:', photo.uri);
                await savePhoto(photo.uri);
                if (Platform.OS === 'android') {
                    ToastAndroid.show('Stealth Photo Captured', ToastAndroid.SHORT);
                }
            }
        } catch (error) {
            console.warn('Photo capture failed:', error);
        }
    };

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
});
