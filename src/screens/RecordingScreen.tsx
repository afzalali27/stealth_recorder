import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
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
    const [videoUri, setVideoUri] = useState<string | undefined>();

    // Timer for call duration
    useEffect(() => {
        if (!isRecording) return;

        const interval = setInterval(() => {
            setDuration((prev) => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [isRecording]);

    // Start recording on mount
    useEffect(() => {
        startRecording();
    }, []);

    const startRecording = async () => {
        if (!cameraRef.current || isRecording) return;

        try {
            console.log('Starting recording...');
            const video = await cameraRef.current.recordAsync({
                maxDuration: 3600, // 1 hour max
            });

            if (video?.uri) {
                console.log('Recording completed:', video.uri);
                setVideoUri(video.uri);
                setIsRecording(false);
            }
        } catch (error) {
            console.error('Error starting recording:', error);
            Alert.alert('Recording Error', 'Failed to start video recording.');
        }
    };

    const stopRecording = async () => {
        if (!cameraRef.current || !isRecording) return;

        try {
            console.log('Stopping recording...');
            cameraRef.current.stopRecording();

            // Wait a moment for video URI to be set
            setTimeout(() => {
                if (videoUri) {
                    onRecordingComplete(videoUri);
                }
            }, 500);
        } catch (error) {
            console.error('Error stopping recording:', error);
            Alert.alert('Recording Error', 'Failed to stop video recording.');
        }
    };

    const handleEndCall = () => {
        Alert.alert(
            'End Recording?',
            'This will stop the recording and save the video.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'End',
                    style: 'destructive',
                    onPress: stopRecording,
                },
            ]
        );
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
            {currentView === 'fake-call' ? (
                <>
                    {/* Hidden camera view for recording */}
                    <View style={styles.hiddenCamera}>
                        <CameraView
                            ref={cameraRef}
                            style={styles.camera}
                            facing={cameraType}
                            mode="video"
                            enableTorch={flashEnabled}
                            onCameraReady={() => {
                                console.log('Camera ready');
                                setIsRecording(true);
                            }}
                        />
                    </View>

                    {/* Fake call interface */}
                    <FakeCallInterface
                        callerName={callerName}
                        callerNumber={callerNumber}
                        duration={duration}
                        onEndCall={handleEndCall}
                        onToggleFlash={handleToggleFlash}
                        onToggleView={handleToggleView}
                        flashEnabled={flashEnabled}
                    />
                </>
            ) : (
                <CameraPreview
                    cameraRef={cameraRef}
                    cameraType={cameraType}
                    flashEnabled={flashEnabled}
                    onToggleView={handleToggleView}
                    isRecording={isRecording}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    hiddenCamera: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
    },
    camera: {
        flex: 1,
    },
});
