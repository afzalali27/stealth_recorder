import * as FileSystem from 'expo-file-system/legacy';

export interface Contact {
    id: string;
    name: string;
    number: string;
    isDefault: boolean;
    createdAt: number;
}

const CONTACTS_PATH = `${FileSystem.documentDirectory || ''}contacts.json`;

async function readContacts(): Promise<Contact[]> {
    try {
        const info = await FileSystem.getInfoAsync(CONTACTS_PATH);
        if (!info.exists) return [];
        const raw = await FileSystem.readAsStringAsync(CONTACTS_PATH, { encoding: 'utf8' });
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function writeContacts(contacts: Contact[]): Promise<void> {
    await FileSystem.writeAsStringAsync(CONTACTS_PATH, JSON.stringify(contacts, null, 2), {
        encoding: 'utf8',
    });
}

export async function getContacts(): Promise<Contact[]> {
    const contacts = await readContacts();
    return contacts.sort((a, b) => {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return b.createdAt - a.createdAt;
    });
}

export async function addContact(name: string, number: string): Promise<Contact> {
    const contacts = await readContacts();
    const newContact: Contact = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        number,
        isDefault: contacts.length === 0,
        createdAt: Date.now(),
    };
    contacts.push(newContact);
    await writeContacts(contacts);
    return newContact;
}

export async function updateContact(id: string, updates: Partial<Pick<Contact, 'name' | 'number'>>): Promise<void> {
    const contacts = await readContacts();
    const idx = contacts.findIndex((c) => c.id === id);
    if (idx !== -1) {
        contacts[idx] = { ...contacts[idx], ...updates };
        await writeContacts(contacts);
    }
}

export async function deleteContact(id: string): Promise<void> {
    let contacts = await readContacts();
    const wasDefault = contacts.find((c) => c.id === id)?.isDefault ?? false;
    contacts = contacts.filter((c) => c.id !== id);
    if (wasDefault && contacts.length > 0) {
        contacts[0].isDefault = true;
    }
    await writeContacts(contacts);
}

export async function setDefaultContact(id: string): Promise<void> {
    const contacts = await readContacts();
    for (const c of contacts) {
        c.isDefault = c.id === id;
    }
    await writeContacts(contacts);
}

export async function getDefaultContact(): Promise<Contact | null> {
    const contacts = await readContacts();
    return contacts.find((c) => c.isDefault) ?? contacts[0] ?? null;
}

export async function findContactByNumber(number: string): Promise<Contact | null> {
    const contacts = await readContacts();
    const normalized = number.replace(/\s+/g, '');
    return contacts.find((c) => c.number.replace(/\s+/g, '') === normalized) ?? null;
}
