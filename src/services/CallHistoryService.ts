import * as FileSystem from 'expo-file-system/legacy';
import { CallHistoryItem } from '../types';

const CALL_HISTORY_PATH = `${FileSystem.documentDirectory || ''}call_history.json`;

async function readCallHistory(): Promise<CallHistoryItem[]> {
    try {
        const info = await FileSystem.getInfoAsync(CALL_HISTORY_PATH);
        if (!info.exists) {
            return [];
        }

        const raw = await FileSystem.readAsStringAsync(CALL_HISTORY_PATH, { encoding: 'utf8' });
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('Failed to read call history:', error);
        return [];
    }
}

async function writeCallHistory(items: CallHistoryItem[]): Promise<void> {
    await FileSystem.writeAsStringAsync(
        CALL_HISTORY_PATH,
        JSON.stringify(items, null, 2),
        { encoding: 'utf8' }
    );
}

export async function addCallHistoryEntry(
    item: Omit<CallHistoryItem, 'id'>
): Promise<void> {
    const items = await readCallHistory();
    items.unshift({
        id: `${item.startedAt}-${item.callerNumber}`,
        ...item,
    });
    await writeCallHistory(items.slice(0, 250));
}

export async function getCallHistory(): Promise<CallHistoryItem[]> {
    const items = await readCallHistory();
    return items.sort((a, b) => b.startedAt - a.startedAt);
}

export async function clearCallHistory(): Promise<void> {
    await FileSystem.deleteAsync(CALL_HISTORY_PATH, { idempotent: true });
}
