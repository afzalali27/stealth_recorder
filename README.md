# Stealth Video Recorder

A React Native mobile application that records video while displaying a simulated call interface, designed for Android with future iOS support.

## Features

### ✨ Core Features
- **Fake Call Interface** - Records video while showing a realistic call screen
- **View Toggle** - Switch between fake call and camera preview during recording
- **Flash Control** - Toggle camera flash during recording
- **Dual Camera Support** - Select front or rear camera
- **Secure Storage** - Videos saved to local encrypted storage
- **App Lock** - Password protection for app access
- **Recordings Manager** - View, manage, and delete recordings

### 🎯 Stealth Features
- Recording continues seamlessly when switching views
- Minimal recording indicators
- Fake call interface mimics Android native UI
- Screen stays awake during recording

## Technology Stack

- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Navigation**: React Navigation 7
- **Camera**: Expo Camera API
- **Storage**: Expo File System with Secure Store
- **Package Manager**: pnpm

## Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Expo CLI
- Android Studio (for Android emulator) or physical Android device
- Expo Go app (for testing)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd stealth_recorder
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start the development server**
   ```bash
   pnpm start
   # or
   npx expo start
   ```

4. **Run on device/emulator**
   
   For Android:
   ```bash
   pnpm android
   # or
   npx expo run:android
   ```

   For iOS (macOS only):
   ```bash
   pnpm ios
   # or
   npx expo run:ios
   ```

## Project Structure

```
stealth_recorder/
├── App.tsx                          # Main app entry with navigation
├── src/
│   ├── components/                  # Reusable UI components
│   │   ├── FakeCallInterface.tsx    # Fake call screen UI
│   │   └── CameraPreview.tsx        # Camera preview overlay
│   ├── screens/                     # App screens
│   │   ├── HomeScreen.tsx           # Home screen with start button
│   │   ├── RecordingScreen.tsx      # Main recording screen
│   │   ├── RecordingsScreen.tsx     # Recordings library viewer
│   │   └── SettingsScreen.tsx       # App settings
│   ├── services/                    # Business logic
│   │   └── StorageService.ts        # File management & storage
│   ├── utils/                       # Utility functions
│   │   └── permissions.ts           # Permission handling
│   ├── constants/                   # App constants
│   │   └── styles.ts                # Design system (colors, typography)
│   └── types/                       # TypeScript types
│       └── index.ts                 # Type definitions
├── assets/                          # Images, icons, splash screens
└── app.json                         # Expo configuration
```

## Usage

### Basic Workflow

1. **Launch App** - Open the app (enter password if app lock enabled)
2. **Select Camera** - Choose front or rear camera on home screen
3. **Start Recording** - Tap "Start Recording" button
4. **Fake Call View** - Recording begins with fake call interface displayed
5. **Toggle View** - Tap the eye icon to see camera preview
6. **Flash Control** - Use flash button to toggle camera flash
7. **End Recording** - Tap "End Call" button to stop and save
8. **View Recordings** - Access saved videos from home screen

### Settings Configuration

Navigate to Settings to customize:
- **Caller Name**: Displayed on fake call screen
- **Caller Number**: Phone number shown on fake call
- **Default Camera**: Choose front or rear as default
- **App Lock**: Enable/disable password protection
- **Password**: Set app lock password (minimum 4 characters)

## Permissions

The app requires the following permissions on Android:

- ✅ `CAMERA` - Video recording
- ✅ `RECORD_AUDIO` - Audio recording
- ✅ `WRITE_EXTERNAL_STORAGE` - Save videos (Android <13)
- ✅ `READ_EXTERNAL_STORAGE` - Access videos (Android <13)
- ✅ `FOREGROUND_SERVICE` - Background recording
- ✅ `WAKE_LOCK` - Keep screen active

On first launch, you'll be prompted to grant these permissions.

## Development

### Running on Physical Device

1. Install Expo Go from Google Play Store
2. Scan QR code from `npx expo start`
3. App will load on your device

**Note**: Some features like background recording may not work fully in Expo Go. Use a development build for full functionality.

### Building for Production

#### Android APK/AAB

```bash
# Development build
eas build --platform android --profile development

# Production build  
eas build --platform android --profile production
```

### Key Components

#### FakeCallInterface
Simulates an Android call screen with:
- Caller ID and phone number display
- Call duration timer
- Functional flash toggle
- Non-functional buttons (mute, speaker, keypad, hold)
- View toggle button
- End call button

#### RecordingScreen
Manages the recording lifecycle:
- Starts recording on mount
- Handles view switching (fake call ↔ camera preview)
- Keeps screen awake during recording
- Saves video on completion

#### StorageService
Handles video file operations:
- Save recordings with timestamp filenames
- List all saved recordings
- Delete recordings
- Calculate storage statistics
- Format file sizes and durations

## Known Limitations

### Android
- **Background Recording**: Requires foreground service notification (Android OS restriction)
- **Complete Stealth**: Not possible on modern Android due to privacy indicators
- **Battery Usage**: Extended recording may drain battery quickly

### iOS
- Background video recording is extremely limited
- May require app to stay in foreground or use PiP mode
- Additional privacy restrictions apply

## Security & Privacy

⚠️ **Important Legal Notice**

This app is designed for legitimate use cases only. Before using this app:

1. **Know Your Local Laws**: Many jurisdictions require all-party consent for audio/video recording
2. **Respect Privacy**: Only record in situations where you have legal authority
3. **Secure Storage**: Videos are stored locally on device only
4. **No Cloud Sync**: App never uploads recordings to external servers

**You are solely responsible for ensuring your use complies with applicable laws.**

## Troubleshooting

### Camera Not Working
- Ensure camera permissions are granted
- Check if another app is using the camera
- Restart the app

### Recording Not Saving
- Check available storage space
- Verify storage permissions
- Check app logs for errors

### App Crashes on Launch
- Clear app data and cache
- Reinstall the app
- Check Android version compatibility (requires Android 8.0+)

## Future Enhancements

- [ ] Video encryption (AES-256)
- [ ] Video compression settings
- [ ] In-app video playback
- [ ] Export/share recordings
- [ ] Biometric authentication
- [ ] Multiple fake call templates
- [ ] Recording scheduler
- [ ] Auto-delete after X days
- [ ] Cloud backup (optional)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Commit your changes with conventional commits
4. Push to your branch
5. Open a Pull Request

## License

[Specify your license here]

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

---

**Disclaimer**: This software is provided "as is" without warranty. Use responsibly and legally.
