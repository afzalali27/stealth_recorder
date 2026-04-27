import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/styles';
import { clearCallHistory, getCallHistory } from '../services/CallHistoryService';
import { CallHistoryItem } from '../types';
import { formatDuration } from '../services/StorageService';

interface LogsScreenProps {
    navigation?: any;
    onBack: () => void;
    onDialNumber?: (number: string, name?: string) => void;
    onViewDetails?: (item: CallHistoryItem) => void;
}

const formatStamp = (value: number) =>
    new Date(value).toLocaleString();

const LogsScreen = ({ navigation, onBack, onDialNumber, onViewDetails }: LogsScreenProps) => {
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
                <Text style={styles.title}>Call Logs</Text>
                <TouchableOpacity onPress={clearLogs} style={styles.iconButton}>
                    <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </TouchableOpacity>
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
                        <TouchableOpacity 
                            style={styles.logItem}
                            onPress={() => onDialNumber?.(item.callerNumber, item.callerName)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.avatar}>
                                <Ionicons name="person" size={24} color={Colors.textSecondary} />
                            </View>
                            
                            <View style={styles.logInfo}>
                                <Text style={styles.logName}>{item.callerName}</Text>
                                <Text style={styles.logNumber}>{item.callerNumber}</Text>
                                <Text style={styles.logTime}>{formatStamp(item.startedAt)}</Text>
                            </View>

                            <TouchableOpacity 
                                style={styles.infoButton}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onViewDetails?.(item);
                                }}
                            >
                                <Ionicons name="information-circle-outline" size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </TouchableOpacity>
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
        flex: 1,
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
        color: Colors.text,
        textAlign: 'center',
        marginHorizontal: Spacing.md,
    },
    iconButton: {
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
        paddingHorizontal: Spacing.md,
    },
    logItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    logInfo: {
        flex: 1,
    },
    logName: {
        color: Colors.text,
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
        marginBottom: 4,
    },
    logNumber: {
        color: Colors.textSecondary,
        fontSize: Typography.sizes.sm,
        marginBottom: 2,
    },
    logTime: {
        color: Colors.textSecondary,
        fontSize: Typography.sizes.xs,
    },
    infoButton: {
        padding: Spacing.sm,
        marginLeft: Spacing.sm,
    },
});

export default LogsScreen;
