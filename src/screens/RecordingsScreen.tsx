import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    ToastAndroid,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as VideoThumbnails from 'expo-video-thumbnails';
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
    const [refreshing, setRefreshing] = useState(false);
    const [storageStats, setStorageStats] = useState({ totalSize: 0, fileCount: 0 });
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

    useEffect(() => {
        loadRecordings();
    }, []);

    const loadRecordings = async () => {
        try {
            const files = await listRecordings();
            const stats = await getStorageStats();
            setRecordings(files);
            setStorageStats(stats);

            const thumbnailPairs = await Promise.all(
                files.map(async (file) => {
                    try {
                        const result = await VideoThumbnails.getThumbnailAsync(file.uri, {
                            time: 1000,
                            quality: 0.35,
                        });
                        return [file.id, result.uri] as const;
                    } catch (error) {
                        return [file.id, ''] as const;
                    }
                })
            );

            setThumbnails(
                thumbnailPairs.reduce<Record<string, string>>((acc, [id, uri]) => {
                    if (uri) {
                        acc[id] = uri;
                    }
                    return acc;
                }, {})
            );
        } catch (error) {
            console.error('Error loading recordings:', error);
            Alert.alert('Error', 'Failed to load recordings');
        } finally {
            setRefreshing(false);
        }
    };

    const handleDeleteRecording = (video: VideoFile) => {
        Alert.alert(
            'Delete Recording',
            `Delete ${video.filename}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteRecording(video);
                            await loadRecordings();
                            if (Platform.OS === 'android') {
                                ToastAndroid.show('Recording deleted', ToastAndroid.SHORT);
                            }
                        } catch (error) {
                            if (Platform.OS === 'android') {
                                ToastAndroid.show('Failed to delete recording', ToastAndroid.LONG);
                            } else {
                                Alert.alert('Error', 'Failed to delete recording');
                            }
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (timestamp: number): string => new Date(timestamp).toLocaleString();

    const renderRecording = ({ item }: { item: VideoFile }) => (
        <View style={styles.recordingItem}>
            <TouchableOpacity
                style={styles.recordingMain}
                activeOpacity={0.8}
                onPress={() => (onPlayVideo ? onPlayVideo(item.uri) : openFile(item.uri))}
            >
                <View style={styles.thumbnailWrap}>
                    {thumbnails[item.id] ? (
                        <Image
                            source={{ uri: thumbnails[item.id] }}
                            style={styles.thumbnailImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <Ionicons name="videocam" size={26} color={Colors.batBlue} />
                    )}
                    <View style={styles.thumbnailShade} />
                    <View style={styles.playBadge}>
                        <Ionicons name="play" size={14} color="#fff" />
                    </View>
                    <View style={styles.durationBadge}>
                        <Text style={styles.durationBadgeText}>{formatDuration(item.duration)}</Text>
                    </View>
                </View>

                <View style={styles.recordingInfo}>
                    <Text style={styles.recordingFilename} numberOfLines={1} ellipsizeMode="middle">
                        {item.filename}
                    </Text>
                    <Text style={styles.recordingMeta}>
                        {formatDate(item.timestamp)}
                    </Text>
                    <Text style={styles.recordingMeta}>
                        {formatFileSize(item.size)}
                    </Text>
                </View>
            </TouchableOpacity>

            <View style={styles.recordingActions}>
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => (onPlayVideo ? onPlayVideo(item.uri) : openFile(item.uri))}
                >
                    <Ionicons name="play-circle-outline" size={24} color={Colors.batBlue} />
                    <Text style={styles.actionLabel}>Play</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => shareRecording(item.uri)}
                >
                    <Ionicons name="share-social-outline" size={24} color={Colors.batBlue} />
                    <Text style={styles.actionLabel}>Share</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteRecording(item)}
                >
                    <Ionicons name="trash-outline" size={24} color={Colors.error} />
                    <Text style={styles.actionLabel}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>VIDEOS</Text>
                <View style={styles.placeholder} />
            </View>

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

            {recordings.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="videocam-off-outline" size={80} color={Colors.textSecondary} />
                    <Text style={styles.emptyText}>No recordings yet</Text>
                    <Text style={styles.emptySubtext}>Start recording to see your videos here</Text>
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
                            onRefresh={() => {
                                setRefreshing(true);
                                loadRecordings();
                            }}
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
        color: Colors.primary,
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
        borderRadius: BorderRadius.sm,
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
        paddingBottom: 40,
    },
    recordingItem: {
        backgroundColor: Colors.surface,
        padding: Spacing.md,
        borderRadius: BorderRadius.sm,
        marginBottom: Spacing.md,
    },
    recordingMain: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    thumbnailWrap: {
        width: 64,
        height: 64,
        borderRadius: BorderRadius.md,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.md,
        overflow: 'hidden',
    },
    thumbnailImage: {
        ...StyleSheet.absoluteFillObject,
        width: '100%',
        height: '100%',
    },
    thumbnailShade: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.22)',
    },
    playBadge: {
        position: 'absolute',
        left: 6,
        bottom: 6,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    durationBadge: {
        position: 'absolute',
        bottom: 6,
        right: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    durationBadgeText: {
        color: '#fff',
        fontSize: 10,
    },
    recordingInfo: {
        flex: 1,
    },
    recordingFilename: {
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
        color: Colors.text,
        marginBottom: 4,
    },
    recordingMeta: {
        fontSize: Typography.sizes.sm,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    recordingActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        paddingTop: Spacing.sm,
    },
    actionButton: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    actionLabel: {
        fontSize: Typography.sizes.xs,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.xl,
    },
    emptyText: {
        marginTop: Spacing.lg,
        color: Colors.text,
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
    },
    emptySubtext: {
        marginTop: Spacing.sm,
        color: Colors.textSecondary,
        fontSize: Typography.sizes.sm,
        textAlign: 'center',
    },
});
