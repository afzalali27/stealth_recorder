import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize } from '../constants/styles';
import LoggerService from '../services/LoggerService';

const LogsScreen = ({ navigation, onBack }: any) => {
    const [logs, setLogs] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const loadLogs = async () => {
        setLoading(true);
        const content = await LoggerService.getLogs();
        setLogs(content);
        setLoading(false);
    };

    const clearLogs = async () => {
        await LoggerService.clearLogs();
        loadLogs();
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigation.goBack();
        }
    };

    useEffect(() => {
        loadLogs();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>ERROR LOGS</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={loadLogs} style={styles.iconButton}>
                        <Ionicons name="refresh" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={clearLogs} style={styles.iconButton}>
                        <Ionicons name="trash-outline" size={24} color={Colors.error} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {loading ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
                ) : (
                    <Text style={styles.logText}>{logs}</Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: Spacing.sm,
    },
    title: {
        fontSize: FontSize.lg,
        fontWeight: 'bold',
        color: Colors.text,
    },
    headerActions: {
        flexDirection: 'row',
    },
    iconButton: {
        marginLeft: Spacing.md,
        padding: Spacing.sm,
    },
    scrollView: {
        flex: 1,
        padding: Spacing.md,
    },
    scrollContent: {
        paddingBottom: Spacing.xxl,
    },
    logText: {
        color: Colors.textSecondary,
        fontFamily: 'monospace',
        fontSize: FontSize.sm,
    }
});

export default LogsScreen;
