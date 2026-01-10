import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, Alert } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import RecordingScreen from './src/screens/RecordingScreen';
import RecordingsScreen from './src/screens/RecordingsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { saveRecording, openFile } from './src/services/StorageService';
import { loadSettings, AppSettings, DEFAULT_SETTINGS } from './src/services/SettingsManager';
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
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  React.useEffect(() => {
    refreshSettings();
  }, []);

  const refreshSettings = async () => {
    const loaded = await loadSettings();
    setSettings(loaded);
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
                    callerName: settings.callerName,
                    callerNumber: settings.callerNumber,
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
                    await saveRecording(videoUri);
                    // Landing to home page immediately as requested
                    props.navigation.goBack();
                  } catch (error) {
                    console.error('Failed to save recording:', error);
                    props.navigation.goBack();
                  }
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Recordings">
            {(props) => (
              <RecordingsScreen
                {...props}
                onBack={() => props.navigation.goBack()}
                onPlayVideo={(uri) => {
                  openFile(uri);
                }}
              />
            )}
          </Stack.Screen>

          <Stack.Screen name="Settings">
            {(props) => (
              <SettingsScreen
                {...props}
                onBack={() => {
                  refreshSettings();
                  props.navigation.goBack();
                }}
              />
            )}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
