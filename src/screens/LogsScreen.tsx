import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/styles';
import { clearCallHistory, getCallHistory } from '../services/CallHistoryService';
import { CallHistoryItem } from '../types';
import { formatDuration } from '../services/StorageService';

const formatStamp = (value: number) =>
    new Date(value).toLocaleString();

const LogsScreen = ({ navigation, onBack }: any) => {
    const [history, setHistory] = useState<CallHistoryItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadHistory = async () => {
        setLoading(true);
        const content = await getCallHistory();
        setHistory(content);
        setLoading(false);
    };

    const clearLogs = async () => {
        await clearCallHistory();
        await loadHistory();
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigation.goBack();
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>CALL LOGS</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={loadHistory} style={styles.iconButton}>
                        <Ionicons name="refresh" size={24} color={Colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={clearLogs} style={styles.iconButton}>
                        <Ionicons name="trash-outline" size={24} color={Colors.error} />
                    </TouchableOpacity>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
            ) : history.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="time-outline" size={72} color={Colors.textSecondary} />
                    <Text style={styles.emptyTitle}>No calls logged yet</Text>
                    <Text style={styles.emptyText}>Ended calls will show number, time, and duration here.</Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={styles.logCard}>
                            <View style={styles.logTopRow}>
                                <View>
                                    <Text style={styles.logName}>{item.callerName}</Text>
                                    <Text style={styles.logNumber}>{item.callerNumber}</Text>
                                </View>
                                <View style={styles.durationBadge}>
                                    <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
                                </View>
                            </View>
                            <Text style={styles.metaText}>Started: {formatStamp(item.startedAt)}</Text>
                            <Text style={styles.metaText}>Ended: {formatStamp(item.endedAt)}</Text>
                        </View>
                    )}
                />
            )}
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
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
        color: Colors.text,
    },
    headerActions: {
        flexDirection: 'row',
    },
    iconButton: {
        marginLeft: Spacing.md,
        padding: Spacing.sm,
    },
    loader: {
        marginTop: 32,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyTitle: {
        marginTop: 18,
        color: Colors.text,
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
    },
    emptyText: {
        marginTop: 10,
        color: Colors.textSecondary,
        fontSize: Typography.sizes.md,
        textAlign: 'center',
    },
    listContent: {
        padding: Spacing.md,
    },
    logCard: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    logTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    logName: {
        color: Colors.text,
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.bold,
    },
    logNumber: {
        color: Colors.textSecondary,
        fontSize: Typography.sizes.sm,
        marginTop: 4,
    },
    durationBadge: {
        backgroundColor: 'rgba(155, 0, 0, 0.16)',
        borderRadius: BorderRadius.round,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    durationText: {
        color: Colors.primary,
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
    },
    metaText: {
        color: Colors.textSecondary,
        fontSize: Typography.sizes.sm,
        marginTop: 4,
    },
});

export default LogsScreen;
