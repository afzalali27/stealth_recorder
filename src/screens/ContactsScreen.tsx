import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/styles';
import {
    Contact,
    addContact,
    deleteContact,
    getContacts,
    setDefaultContact,
    updateContact,
} from '../services/ContactsService';

interface ContactsScreenProps {
    onBack: () => void;
    onDial?: (contact: Contact) => void;
    /** Pre-fill a number to save (e.g. from dialer) */
    prefillNumber?: string;
}

export default function ContactsScreen({ onBack, onDial, prefillNumber }: ContactsScreenProps) {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [formName, setFormName] = useState('');
    const [formNumber, setFormNumber] = useState('');

    const load = useCallback(async () => {
        setContacts(await getContacts());
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Auto-open add modal if prefillNumber provided
    useEffect(() => {
        if (prefillNumber && prefillNumber.trim()) {
            setFormName('');
            setFormNumber(prefillNumber.trim());
            setEditingContact(null);
            setModalVisible(true);
        }
    }, [prefillNumber]);

    const openAdd = () => {
        setEditingContact(null);
        setFormName('');
        setFormNumber('');
        setModalVisible(true);
    };

    const openEdit = (contact: Contact) => {
        setEditingContact(contact);
        setFormName(contact.name);
        setFormNumber(contact.number);
        setModalVisible(true);
    };

    const handleSave = async () => {
        const name = formName.trim();
        const number = formNumber.trim();
        if (!name || !number) {
            Alert.alert('Required', 'Please enter both name and number.');
            return;
        }
        if (editingContact) {
            await updateContact(editingContact.id, { name, number });
        } else {
            await addContact(name, number);
        }
        setModalVisible(false);
        await load();
    };

    const handleDelete = (contact: Contact) => {
        Alert.alert('Delete Contact', `Delete "${contact.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    await deleteContact(contact.id);
                    await load();
                },
            },
        ]);
    };

    const handleSetDefault = async (contact: Contact) => {
        await setDefaultContact(contact.id);
        await load();
    };

    const renderContact = ({ item }: { item: Contact }) => (
        <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => onDial?.(item)}
            activeOpacity={0.7}
        >
            <View style={styles.avatar}>
                <Ionicons name="person" size={20} color={Colors.textSecondary} />
            </View>
            
            <View style={styles.contactInfo}>
                <View style={styles.nameRow}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    {item.isDefault && (
                        <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.contactNumber}>{item.number}</Text>
            </View>

            <TouchableOpacity 
                style={styles.infoButton}
                onPress={() => openEdit(item)}
            >
                <Ionicons name="information-circle-outline" size={24} color={Colors.textSecondary} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.title}>CONTACTS</Text>
                <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
                    <Ionicons name="person-add-outline" size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {contacts.length === 0 ? (
                <View style={styles.empty}>
                    <Ionicons name="people-outline" size={72} color={Colors.textSecondary} />
                    <Text style={styles.emptyTitle}>No contacts yet</Text>
                    <Text style={styles.emptyText}>Add contacts to dial them quickly.</Text>
                    <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
                        <Ionicons name="add" size={20} color="#fff" />
                        <Text style={styles.emptyAddText}>Add Contact</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={contacts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderContact}
                    contentContainerStyle={styles.list}
                />
            )}

            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>{editingContact ? 'Edit Contact' : 'Add Contact'}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Name"
                            placeholderTextColor={Colors.textSecondary}
                            value={formName}
                            onChangeText={setFormName}
                            autoCapitalize="words"
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone number"
                            placeholderTextColor={Colors.textSecondary}
                            value={formNumber}
                            onChangeText={setFormNumber}
                            keyboardType="phone-pad"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                                <Text style={styles.saveText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backBtn: { padding: Spacing.sm },
    addBtn: { padding: Spacing.sm },
    title: {
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
        color: Colors.text,
        letterSpacing: 2,
    },
    list: { paddingHorizontal: Spacing.md },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Colors.border,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    contactInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center' },
    contactName: {
        color: Colors.text,
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
    },
    defaultBadge: {
        marginLeft: 8,
        backgroundColor: 'rgba(155,0,0,0.2)',
        borderRadius: BorderRadius.round,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    defaultBadgeText: {
        color: Colors.primary,
        fontSize: Typography.sizes.xs,
        fontWeight: Typography.weights.bold,
    },
    contactNumber: {
        color: Colors.textSecondary,
        fontSize: Typography.sizes.sm,
        marginTop: 2,
    },
    infoButton: { padding: 8 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
    emptyTitle: {
        marginTop: 18,
        color: Colors.text,
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.semibold,
    },
    emptyText: {
        marginTop: 8,
        color: Colors.textSecondary,
        fontSize: Typography.sizes.sm,
        textAlign: 'center',
    },
    emptyAddBtn: {
        marginTop: 24,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.md,
        borderRadius: BorderRadius.lg,
    },
    emptyAddText: {
        color: '#fff',
        fontSize: Typography.sizes.md,
        fontWeight: Typography.weights.semibold,
        marginLeft: 8,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    modalBox: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        width: '100%',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    modalTitle: {
        color: Colors.text,
        fontSize: Typography.sizes.lg,
        fontWeight: Typography.weights.bold,
        marginBottom: Spacing.lg,
    },
    input: {
        backgroundColor: Colors.background,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        color: Colors.text,
        fontSize: Typography.sizes.md,
        marginBottom: Spacing.md,
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.sm },
    cancelBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginRight: Spacing.sm },
    cancelText: { color: Colors.textSecondary, fontSize: Typography.sizes.md },
    saveBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.xl,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    saveText: { color: '#fff', fontSize: Typography.sizes.md, fontWeight: Typography.weights.semibold },
});
