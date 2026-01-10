import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    Image,
    Dimensions,
    Alert,
    RefreshControl,
    ToastAndroid,
    Platform,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Layout } from '../constants/styles';
import { VideoFile } from '../types';
import {
    listPhotos,
    deletePhoto,
    shareRecording as sharePhoto,
    formatFileSize,
} from '../services/StorageService';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

interface PhotosScreenProps {
    onBack: () => void;
}

export default function PhotosScreen({ onBack }: PhotosScreenProps) {
    const [photos, setPhotos] = useState<VideoFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<VideoFile | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    useEffect(() => {
        loadPhotos();
    }, []);

    const loadPhotos = async () => {
        try {
            const files = await listPhotos();
            // Optional: Filter out potentially corrupted/empty files if needed
            setPhotos(files);
        } catch (error) {
            console.error('Error loading photos:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadPhotos();
    };

    const toggleSelection = (id: string) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedIds(newSelection);
        if (newSelection.size === 0) {
            setIsSelectionMode(false);
        }
    };

    const handleLongPress = (photo: VideoFile) => {
        if (!isSelectionMode) {
            setIsSelectionMode(true);
            setSelectedIds(new Set([photo.id]));
        }
    };

    const handlePhotoPress = (photo: VideoFile) => {
        if (isSelectionMode) {
            toggleSelection(photo.id);
        } else {
            setSelectedPhoto(photo);
        }
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;

        Alert.alert(
            'Delete Photos',
            `Are you sure you want to delete ${selectedIds.size} ${selectedIds.size === 1 ? 'photo' : 'photos'} permanently?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const idsToDelete = Array.from(selectedIds);
                            for (const id of idsToDelete) {
                                const photo = photos.find(p => p.id === id);
                                if (photo) await deletePhoto(photo.uri);
                            }
                            setIsSelectionMode(false);
                            setSelectedIds(new Set());
                            loadPhotos();
                            if (Platform.OS === 'android') {
                                ToastAndroid.show(`${idsToDelete.length} photos deleted`, ToastAndroid.SHORT);
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete some photos');
                        }
                    },
                },
            ]
        );
    };

    const renderPhotoItem = ({ item }: { item: VideoFile }) => {
        const isSelected = selectedIds.has(item.id);

        return (
            <TouchableOpacity
                style={[
                    styles.photoContainer,
                    isSelected && styles.photoContainerSelected
                ]}
                onPress={() => handlePhotoPress(item)}
                onLongPress={() => handleLongPress(item)}
                activeOpacity={0.8}
            >
                <Image
                    source={{ uri: item.uri }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                />
                {isSelectionMode && isSelected && (
                    <View style={styles.selectionOverlay}>
                        <Ionicons
                            name="checkmark-circle"
                            size={40}
                            color={Colors.primary}
                        />
                    </View>
                )}
                {isSelectionMode && !isSelected && (
                    <View style={[styles.selectionOverlay, { backgroundColor: 'transparent', alignItems: 'flex-end', justifyContent: 'flex-start', padding: 5 }]}>
                        <Ionicons
                            name="ellipse-outline"
                            size={24}
                            color="#fff"
                        />
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        onPress={isSelectionMode ? () => {
                            setIsSelectionMode(false);
                            setSelectedIds(new Set());
                        } : onBack}
                        style={styles.backButton}
                    >
                        <Ionicons
                            name={isSelectionMode ? "close" : "arrow-back"}
                            size={24}
                            color={Colors.text}
                        />
                    </TouchableOpacity>
                    <Text style={styles.title}>
                        {isSelectionMode ? `${selectedIds.size} TARGETS` : `PHOTOS (${photos.length})`}
                    </Text>
                </View>

                {isSelectionMode && (
                    <TouchableOpacity onPress={handleDeleteSelected} style={styles.headerAction}>
                        <Ionicons name="trash-outline" size={24} color={Colors.error} />
                    </TouchableOpacity>
                )}
            </View>

            {photos.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="images-outline" size={80} color={Colors.textSecondary} />
                    <Text style={styles.emptyText}>No photos yet</Text>
                    <Text style={styles.emptySubtext}>
                        Snap photos using volume buttons during recording
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={photos}
                    renderItem={renderPhotoItem}
                    keyExtractor={(item) => item.id}
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.listContent}
                    columnWrapperStyle={styles.columnWrapper}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={handleRefresh}
                            tintColor={Colors.primary}
                        />
                    }
                />
            )}

            {/* Custom Full-screen Viewer */}
            <Modal
                visible={!!selectedPhoto}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedPhoto(null)}
            >
                <View style={styles.modalBackground}>
                    <TouchableOpacity
                        style={styles.modalClose}
                        onPress={() => setSelectedPhoto(null)}
                    >
                        <Ionicons name="close" size={32} color="#fff" />
                    </TouchableOpacity>

                    {selectedPhoto && (
                        <>
                            <Image
                                source={{ uri: selectedPhoto.uri }}
                                style={styles.fullImage}
                                resizeMode="contain"
                            />

                            <View style={styles.modalFooter}>
                                <View style={styles.modalInfo}>
                                    <Text style={styles.modalMeta}>
                                        {formatFileSize(selectedPhoto.size)} • {new Date(selectedPhoto.timestamp).toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={styles.modalActions}>
                                    <TouchableOpacity
                                        style={styles.modalAction}
                                        onPress={() => sharePhoto(selectedPhoto.uri)}
                                    >
                                        <Ionicons name="share-social-outline" size={28} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.modalAction}
                                        onPress={() => {
                                            const photoUri = selectedPhoto.uri;
                                            setSelectedPhoto(null);
                                            Alert.alert(
                                                'Delete Photo',
                                                'Permanently delete this photo?',
                                                [
                                                    { text: 'Cancel' },
                                                    {
                                                        text: 'Delete',
                                                        style: 'destructive',
                                                        onPress: async () => {
                                                            await deletePhoto(photoUri);
                                                            loadPhotos();
                                                        }
                                                    }
                                                ]
                                            );
                                        }}
                                    >
                                        <Ionicons name="trash-outline" size={28} color={Colors.error} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </Modal>
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
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.sm,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        minHeight: 60,
    },
    headerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 24,
    },
    title: {
        fontSize: Typography.sizes.xl,
        fontWeight: '900',
        color: Colors.primary,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    headerAction: {
        padding: Spacing.sm,
    },
    listContent: {
        padding: 0,
    },
    columnWrapper: {
        justifyContent: 'flex-start',
        marginBottom: 0,
    },
    photoContainer: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        backgroundColor: Colors.surface,
    },
    photoContainerSelected: {
        // No border here to keep edge-to-edge, use overlay instead
    },
    thumbnail: {
        flex: 1,
    },
    selectionOverlay: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
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
    modalBackground: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalClose: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: Spacing.sm,
    },
    fullImage: {
        width: '100%',
        height: '70%',
    },
    modalFooter: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        paddingHorizontal: Spacing.xl,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalInfo: {
        flex: 1,
    },
    modalMeta: {
        color: '#fff',
        fontSize: Typography.sizes.sm,
    },
    modalActions: {
        flexDirection: 'row',
        gap: Spacing.lg,
    },
    modalAction: {
        padding: Spacing.sm,
    },
});
