import * as FileSystem from 'expo-file-system/legacy';

const LOG_FILE_PATH = (FileSystem.documentDirectory || '') + 'app_logs.txt';

class LoggerService {
    private static instance: LoggerService;

    private constructor() { }

    public static getInstance(): LoggerService {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }

    public async log(message: string, error?: any) {
        const timestamp = new Date().toISOString();
        let logMessage = `[${timestamp}] ${message}`;

        if (error) {
            const errorStr = error instanceof Error ? error.message : String(error);
            logMessage += `\nERROR: ${errorStr}`;
            if (error instanceof Error && error.stack) {
                logMessage += `\nSTACK: ${error.stack}`;
            }
        }
        logMessage += '\n-------------------\n';

        console.log(logMessage);

        try {
            const fileInfo = await FileSystem.getInfoAsync(LOG_FILE_PATH);
            if (fileInfo.exists) {
                const currentContent = await FileSystem.readAsStringAsync(LOG_FILE_PATH, { encoding: 'utf8' });
                await FileSystem.writeAsStringAsync(LOG_FILE_PATH, currentContent + logMessage, { encoding: 'utf8' });
            } else {
                await FileSystem.writeAsStringAsync(LOG_FILE_PATH, logMessage, { encoding: 'utf8' });
            }
        } catch (writeError) {
            console.error('Failed to write to log file:', writeError);
        }
    }

    public async getLogs(): Promise<string> {
        try {
            const fileInfo = await FileSystem.getInfoAsync(LOG_FILE_PATH);
            if (!fileInfo.exists) {
                return 'No logs found.';
            }
            return await FileSystem.readAsStringAsync(LOG_FILE_PATH, { encoding: 'utf8' });
        } catch (readError) {
            console.error('Failed to read log file:', readError);
            return 'Failed to read logs.';
        }
    }

    public async clearLogs() {
        try {
            await FileSystem.deleteAsync(LOG_FILE_PATH, { idempotent: true });
        } catch (deleteError) {
            console.error('Failed to clear log file:', deleteError);
        }
    }
}

export default LoggerService.getInstance();
