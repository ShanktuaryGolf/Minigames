# Nova Darts - Electron App

A standalone desktop application for playing Darts with your launch monitor!

## Features

- 🎯 **Full Darts Game** - All game modes (Practice, 301, 501, Cricket, Killer)
- 📡 **GSPro Integration** - Automatically listens for GSPro shots on port 921
- 📽️ **Projector Mode** - Separate window for projector display
- 💾 **Standalone** - No web server or Python needed
- 🖥️ **Cross-Platform** - Works on Windows, macOS, and Linux

## Quick Start

### For Users (Just Want to Play)

1. Download the latest release for your platform:
   - **Windows**: `Nova-Darts-Setup.exe`
   - **macOS**: `Nova-Darts.dmg`
   - **Linux**: `Nova-Darts.AppImage`

2. Install and run the application

3. Make sure GSPro is running and configured to send data on port 921

4. Click "🎯 Play Darts" and start playing!

## For Developers

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

```bash
cd /path/to/minigames/web
npm install
```

### Running in Development

```bash
npm start
```

This will launch the Electron app in development mode.

### Building for Distribution

#### Build for all platforms:
```bash
npm run build
```

#### Build for specific platform:
```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

The built applications will be in the `dist/` directory.

## How It Works

### GSPro Connection

The app automatically starts listening for GSPro data when it launches:

1. Opens UDP socket on port **921**
2. Waits for JSON shot data from GSPro
3. Parses ball data (speed, HLA, VLA, spin, etc.)
4. Sends data to the darts game

### Game Flow

1. **Main Menu** - Click "Play Darts" to start
2. **Setup Screen** - Select players and game mode
3. **Game Screen** - Dartboard, controls, and data panels
4. **Shot Detection** - Real shots from GSPro or test shots

### Projector Mode

Click "Fullscreen" → "Projector Mode" to open a separate window showing only the dartboard. Perfect for launch monitor setups!

- **Main Window**: Shows controls, data panels, scoreboard
- **Projector Window**: Shows only dartboard and shot feedback
- Real-time sync via BroadcastChannel API

## Configuration

### GSPro Port

The default port is 921. To change it, edit `electron-main.js`:

```javascript
const GSPRO_PORT = 921; // Change this value
```

### Window Size

Default window size is 1400x900. To change it, edit `electron-main.js`:

```javascript
mainWindow = new BrowserWindow({
    width: 1400,  // Change width
    height: 900,  // Change height
    // ...
});
```

## Troubleshooting

### GSPro Not Connecting

- Make sure GSPro is configured to send data on port 921
- Check that no firewall is blocking UDP port 921
- Try clicking the connection status to restart the listener

### Game Won't Start

- Make sure you've completed the full setup (players + game mode)
- Check the developer console (Ctrl+Shift+I) for errors

### Projector Window Blank

- Make sure popups are allowed
- Wait 1-2 seconds for sync
- Try clicking "New Game" to refresh

## File Structure

```
web/
├── package.json           # Electron dependencies and build config
├── electron-main.js       # Main process (GSPro listener, window management)
├── preload.js             # Secure IPC bridge
├── electron-index.html    # Main app interface
├── darts_multiplayer.js   # Darts game logic
├── projector.html         # Projector display window
└── dist/                  # Built applications (after running build)
```

## Development Tips

### Enable DevTools

Uncomment this line in `electron-main.js`:

```javascript
// mainWindow.webContents.openDevTools();
```

### Watch for Changes

The app doesn't hot-reload in development. After making changes:

1. Close the app
2. Run `npm start` again

### Debugging GSPro Data

Check the console for shot data:

```javascript
console.log('Shot received:', shotData);
```

## Building for Release

Before building for distribution:

1. Update version in `package.json`
2. Add an `icon.png` file (512x512) to the web directory
3. Test on target platform
4. Run the build command

### Code Signing (Optional)

For production releases, you may want to sign your app:

- **Windows**: Add certificate details to `electron-builder` config
- **macOS**: Configure Apple Developer ID
- **Linux**: No signing required

See [electron-builder docs](https://www.electron.build/) for details.

## License

MIT

## Support

For issues or questions, please visit the project repository.

---

Built with ❤️ using Electron and HTML5 Canvas
