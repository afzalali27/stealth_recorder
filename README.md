# Stealth Video Recorder 🎥🤫

A discreet, high-performance background video recording application for Android, built with React Native and Expo. Perfect for security verification and personal safety.

## ✨ Key Features

- **Double-Stealth Mode**: 
    - **Fake Call Overlay**: Recording happens behind a realistic "Incoming Call" interface.
    - **PiP Preview**: Toggle a tiny "Picture-in-Picture" camera window to verify your framing without leaving stealth mode.
- **Silent Storage System**:
    - Automatic backup to a public gallery folder (`Movies/StealthRecorder`).
    - Multi-stage save process optimized to bypass intrusive "Allow modification" prompts on Android 11+.
- **Redesigned Recordings Gallery**:
    - **Instant Access**: Quick buttons to Play specific files or open the entire Gallery folder.
    - **Smart Lists**: Supports long filenames with elegant ellipses and detailed metadata.
- **Upfront Permissions**: Requests everything at launch for a seamless, alert-free recording experience.
- **Secure by Design**: Built-in App Lock (PIN/Biometric) support and local-first data architecture.

## 🚀 Getting Started

### Development
1. Clone the repository.
2. Install dependencies: `pnpm install`.
3. Start the dev server: `pnpm expo start`.
4. Run on Android: `pnpm android`.

### Production Build
To generate a standalone release APK:
```bash
npx expo run:android --variant release
```

## 🛠️ Tech Stack

- **Framework**: React Native / Expo
- **Camera**: `expo-camera`
- **Storage**: `expo-file-system`, `expo-media-library`
- **Styling**: Vanilla React Native StyleSheet
- **Icons**: Ionicons (@expo/vector-icons)

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Disclaimer: This tool is intended for personal safety and educational research. Please use responsibly and respect local privacy laws.*
