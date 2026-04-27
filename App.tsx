import React, { useEffect, useState } from 'react';
import { Alert, BackHandler, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';
import RecordingScreen from './src/screens/RecordingScreen';
import RecordingsScreen from './src/screens/RecordingsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LogsScreen from './src/screens/LogsScreen';
import ContactsScreen from './src/screens/ContactsScreen';
import { saveRecording, openFile } from './src/services/StorageService';
import { loadSettings, AppSettings, DEFAULT_SETTINGS } from './src/services/SettingsManager';
import { Colors, Typography, Spacing, BorderRadius } from './src/constants/styles';
import { addCallHistoryEntry } from './src/services/CallHistoryService';
import { Contact } from './src/services/ContactsService';

export type RootStackParamList = {
    Home: undefined;
    Recording: {
        cameraType: 'front' | 'back';
        callerName?: string;
        callerNumber?: string;
    };
    Recordings: undefined;
    Settings: undefined;
    Logs: undefined;
    Contacts: { prefillNumber?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
    const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [appReady, setAppReady] = useState(false);

    useEffect(() => {
        initApp();
    }, []);

    const initApp = async () => {
        const loaded = await loadSettings();
        setSettings(loaded);

        if (loaded.appLockEnabled) {
            authenticate(loaded);
        } else {
            setIsAuthenticated(true);
        }
        setAppReady(true);
    };

    const authenticate = async (currentSettings?: AppSettings) => {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                setIsAuthenticated(true);
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Bat Eye',
                fallbackLabel: 'Use Passcode',
            });

            if (result.success) {
                setIsAuthenticated(true);
            } else {
                Alert.alert('Authentication Failed', 'Please try again.', [
                    { text: 'Retry', onPress: () => authenticate(currentSettings) },
                ]);
            }
        } catch (error) {
            console.error('Auth error:', error);
            setIsAuthenticated(true);
        }
    };

    const refreshSettings = async () => {
        const loaded = await loadSettings();
        setSettings(loaded);
    };

    if (!appReady) return null;

    if (!isAuthenticated && settings.appLockEnabled) {
        return (
            <View style={styles.lockContainer}>
                <Ionicons name="lock-closed" size={80} color={Colors.primary} />
                <Text style={styles.lockTitle}>Bat Eye Locked</Text>
                <TouchableOpacity
                    style={styles.unlockButton}
                    onPress={() => authenticate()}
                >
                    <Text style={styles.unlockText}>Unlock with Fingerprint</Text>
                </TouchableOpacity>
            </View>
        );
    }

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
                                        callerName: config.callerName || settings.callerName,
                                        callerNumber: config.callerNumber || settings.callerNumber,
                                    });
                                }}
                                onViewRecordings={() => props.navigation.navigate('Recordings')}
                                onOpenSettings={() => props.navigation.navigate('Settings')}
                                onOpenLogs={() => props.navigation.navigate('Logs')}
                                onOpenContacts={(prefillNumber) =>
                                    props.navigation.navigate('Contacts', prefillNumber ? { prefillNumber } : undefined)
                                }
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
                                onRecordingComplete={async (result) => {
                                    try {
                                        await saveRecording(result.videoUri, result.duration);
                                        await addCallHistoryEntry({
                                            callerName: result.callerName,
                                            callerNumber: result.callerNumber,
                                            startedAt: result.endedAt - result.duration * 1000,
                                            endedAt: result.endedAt,
                                            duration: result.duration,
                                        });
                                    } catch (error) {
                                        console.error('Failed to save recording:', error);
                                    } finally {
                                        props.navigation.reset({
                                            index: 0,
                                            routes: [{ name: 'Home' }],
                                        });

                                        if (Platform.OS === 'android') {
                                            setTimeout(() => BackHandler.exitApp(), 120);
                                        }
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
                                onPlayVideo={(uri) => openFile(uri)}
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

                    <Stack.Screen name="Logs">
                        {(props) => (
                            <LogsScreen 
                                {...props} 
                                onBack={() => props.navigation.goBack()}
                                onDialNumber={(number, name) => {
                                    props.navigation.navigate('Recording', {
                                        cameraType: settings.defaultCamera,
                                        callerName: name || 'Unknown Caller',
                                        callerNumber: number,
                                    });
                                }}
                                onViewDetails={(item) => {
                                    // TODO: Navigate to call details screen
                                    console.log('View details for:', item);
                                }}
                            />
                        )}
                    </Stack.Screen>

                    <Stack.Screen name="Contacts">
                        {(props) => (
                            <ContactsScreen
                                {...props}
                                onBack={() => props.navigation.goBack()}
                                prefillNumber={props.route.params?.prefillNumber}
                                onDial={(contact: Contact) => {
                                    props.navigation.navigate('Recording', {
                                        cameraType: settings.defaultCamera,
                                        callerName: contact.name,
                                        callerNumber: contact.number,
                                    });
                                }}
                            />
                        )}
                    </Stack.Screen>
                </Stack.Navigator>
            </NavigationContainer>
        </>
    );
}

const styles = StyleSheet.create({
    lockContainer: {
        flex: 1,
        backgroundColor: Colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    lockTitle: {
        fontSize: Typography.sizes.xl,
        color: Colors.text,
        marginTop: Spacing.xl,
        marginBottom: Spacing.xxl,
        fontWeight: Typography.weights.bold,
    },
    unlockButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.lg,
        borderRadius: BorderRadius.lg,
    },
    unlockText: {
        color: '#fff',
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
    },
});
