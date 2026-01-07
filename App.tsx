import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, Alert } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import RecordingScreen from './src/screens/RecordingScreen';
import RecordingsScreen from './src/screens/RecordingsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { saveRecording } from './src/services/StorageService';
import { Colors } from './src/constants/styles';

export type RootStackParamList = {
  Home: undefined;
  Recording: {
    cameraType: 'front' | 'back';
    callerName?: string;
    callerNumber?: string;
  };
  Recordings: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const handleStartRecording = (config: { cameraType: 'front' | 'back' }) => {
    // Navigation will be handled by the navigation prop
    console.log('Starting recording with config:', config);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen name="Home">
            {(props) => (
              <HomeScreen
                {...props}
                onStartRecording={(config) => {
                  props.navigation.navigate('Recording', {
                    cameraType: config.cameraType,
                    callerName: 'Unknown Caller',
                    callerNumber: '+1 (555) 123-4567',
                  });
                }}
                onViewRecordings={() => {
                  props.navigation.navigate('Recordings');
                }}
                onOpenSettings={() => {
                  props.navigation.navigate('Settings');
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Recording">
            {(props) => (
              <RecordingScreen
                {...props}
                cameraType={props.route.params?.cameraType}
                callerName={props.route.params?.callerName}
                callerNumber={props.route.params?.callerNumber}
                onRecordingComplete={async (videoUri) => {
                  try {
                    const savedFile = await saveRecording(videoUri);
                    Alert.alert(
                      'Recording Saved',
                      `Video saved successfully!\n\nSize: ${(savedFile.size / 1024 / 1024).toFixed(2)} MB`,
                      [
                        {
                          text: 'OK',
                          onPress: () => props.navigation.goBack(),
                        },
                      ]
                    );
                  } catch (error) {
                    Alert.alert(
                      'Error',
                      'Failed to save recording',
                      [
                        {
                          text: 'OK',
                          onPress: () => props.navigation.goBack(),
                        },
                      ]
                    );
                  }
                }}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
