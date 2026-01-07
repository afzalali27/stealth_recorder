import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Alert,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Layout } from '../constants/styles';
import { VideoFile } from '../types';
import {
    listRecordings,
    deleteRecording,
    shareRecording,
    openFile,
    formatFileSize,
    formatDuration,
    getStorageStats,
} from '../services/StorageService';

interface RecordingsScreenProps {
    onBack: () => void;
    onPlayVideo?: (uri: string) => void;
}

export default function RecordingsScreen({
    onBack,
    onPlayVideo,
}: RecordingsScreenProps) {
    const [recordings, setRecordings] = useState<VideoFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [storageStats, setStorageStats] = useState({ totalSize: 0, fileCount: 0 });

    useEffect(() => {
        loadRecordings();
    }, []);

    const loadRecordings = async () => {
        try {
            const files = await listRecordings();
            const stats = await getStorageStats();
            setRecordings(files);
            setStorageStats(stats);
        } catch (error) {
            console.error('Error loading recordings:', error);
            Alert.alert('Error', 'Failed to load recordings');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadRecordings();
    };

    const handleDeleteRecording = (video: VideoFile) => {
        Alert.alert(
            'Delete Recording',
            `Are you sure you want to delete ${video.filename}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteRecording(video.uri);
                            loadRecordings(); // Reload list
                            Alert.alert('Success', 'Recording deleted');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete recording');
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (timestamp: number): string => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const renderRecording = ({ item }: { item: VideoFile }) => (
        <View style={styles.recordingItem}>
            <View style={styles.recordingIcon}>
                <Ionicons name="videocam" size={32} color={Colors.primary} />
            </View>

            <View style={styles.recordingInfo}>
                <Text style={styles.recordingFilename} numberOfLines={1}>
                    {item.filename}
                </Text>
                <Text style={styles.recordingDate}>{formatDate(item.timestamp)}</Text>
                <Text style={styles.recordingSize}>{formatFileSize(item.size)}</Text>
            </View>

            <View style={styles.recordingActions}>
                <TouchableOpacity
                    style={styles.actionIcon}
                    onPress={() => onPlayVideo && onPlayVideo(item.uri)}
                >
                    <Ionicons name="play-circle-outline" size={28} color={Colors.accent} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionIcon}
                    onPress={() => openFile(item.uri)}
                >
                    <Ionicons name="folder-open-outline" size={28} color={Colors.accent} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionIcon}
                    onPress={() => shareRecording(item.uri)}
                >
                    <Ionicons name="share-social-outline" size={28} color={Colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionIcon}
                    onPress={() => handleDeleteRecording(item)}
                >
                    <Ionicons name="trash-outline" size={28} color={Colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Recordings</Text>
                <View style={styles.placeholder} />
            </View>

            {/* Storage Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Ionicons name="folder-outline" size={24} color={Colors.accent} />
                    <Text style={styles.statValue}>{storageStats.fileCount}</Text>
                    <Text style={styles.statLabel}>Videos</Text>
                </View>

                <View style={styles.statDivider} />

                <View style={styles.statItem}>
                    <Ionicons name="download-outline" size={24} color={Colors.accent} />
                    <Text style={styles.statValue}>{formatFileSize(storageStats.totalSize)}</Text>
                    <Text style={styles.statLabel}>Total Size</Text>
                </View>
            </View>

            {/* Recordings List */}
            {recordings.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="videocam-off-outline" size={80} color={Colors.textSecondary} />
                    <Text style={styles.emptyText}>No recordings yet</Text>
                    <Text style={styles.emptySubtext}>
                        Start recording to see your videos here
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={recordings}
                    renderItem={renderRecording}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={Colors.primary}
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Layout.screenPadding,
        paddingVertical: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: Spacing.sm,
    },
    title: {
        fontSize: Typography.sizes.xxl,
        fontWeight: Typography.weights.bold,
        color: Colors.text,
    },
    placeholder: {
        width: 40,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        marginHorizontal: Layout.screenPadding,
        marginTop: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: Typography.sizes.xl,
        fontWeight: Typography.weights.bold,
        color: Colors.text,
        marginTop: Spacing.sm,
    },
    statLabel: {
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
        marginTop: Spacing.xs,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: Colors.border,
    },
    listContent: {
        padding: Layout.screenPadding,
    },
    recordingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
    },
    recordingIcon: {
        width: 56,
        height: 56,
        borderRadius: BorderRadius.md,
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
    },
    recordingInfo: {
        flex: 1,
    },
    recordingFilename: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    recordingDate: {
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
        marginBottom: 2,
    },
    recordingSize: {
        fontSize: Typography.sizes.xs,
        color: Colors.textSecondary,
    },
    recordingActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    actionIcon: {
        padding: Spacing.sm,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    emptyText: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
        color: Colors.textSecondary,
        marginTop: Spacing.lg,
    },
    emptySubtext: {
        fontSize: Typography.sizes.md,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
        textAlign: 'center',
    },
});
