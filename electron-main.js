const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const net = require('net');
// Test comment for v4.8.3 auto-update
const path = require('path');
const https = require('https');

let mainWindow;
let gspro_server;
let launchMonitorSocket = null;
let isListening = false;
let hasReceivedData = false;
let lastDataTime = null;

// GSPro Connect Configuration
let GSPRO_PORT = 921; // Default port, can be changed by user

// Golf settings
let greenStimp = 10.0; // Default green speed (Stimpmeter rating)

// Auto-updater configuration
autoUpdater.autoDownload = false; // Don't auto-download, let user choose when to download
autoUpdater.autoInstallOnAppQuit = true; // Install when app quits
autoUpdater.allowDowngrade = false;
autoUpdater.allowPrerelease = false;
autoUpdater.logger = console; // Enable logging

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
    sendUpdateStatusToWindow('checking-for-update');
});

autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    sendUpdateStatusToWindow('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available. Current version is up to date.');
    sendUpdateStatusToWindow('update-not-available', info);
});

autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
    sendUpdateStatusToWindow('error', { message: err.message });
});

autoUpdater.on('download-progress', (progressObj) => {
    console.log(`Download progress: ${progressObj.percent.toFixed(2)}%`);
    sendUpdateStatusToWindow('download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    sendUpdateStatusToWindow('update-downloaded', info);
});

function sendUpdateStatusToWindow(event, data = null) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-status', { event, data });
    }
}


function createApplicationMenu() {
    const stimpOptions = [7, 8, 9, 10, 11, 12, 13, 14]; // Slow to fast greens

    const template = [
        {
            label: 'Golf Settings',
            submenu: [
                {
                    label: 'Green Speed (Stimpmeter)',
                    submenu: stimpOptions.map(stimp => ({
                        label: `${stimp} ft ${stimp === 10 ? '(Default)' : stimp < 10 ? '(Slow)' : '(Fast)'}`,
                        type: 'radio',
                        checked: greenStimp === stimp,
                        click: () => {
                            greenStimp = stimp;
                            console.log(`Green Stimp set to: ${stimp} ft`);
                            // Send to all windows (golf-par3, putting-green)
                            BrowserWindow.getAllWindows().forEach(window => {
                                if (window && !window.isDestroyed()) {
                                    window.webContents.send('stimp-changed', stimp);
                                }
                            });
                        }
                    }))
                },
                { type: 'separator' },
                {
                    label: 'About Green Speed',
                    click: () => {
                        const { dialog } = require('electron');
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Stimpmeter Info',
                            message: 'Green Speed (Stimpmeter)',
                            detail: 'Stimpmeter measures how fast greens roll:\n\n' +
                                    '7-8 ft: Slow greens (more friction)\n' +
                                    '9-10 ft: Medium greens (standard)\n' +
                                    '11-12 ft: Fast greens (tournament)\n' +
                                    '13-14 ft: Very fast (professional)\n\n' +
                                    'Higher speeds = ball rolls farther on putts\n\n' +
                                    'Only applies to Golf Par 3 and Putting games.'
                        });
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Toggle DevTools (Active Window)',
                    accelerator: 'F12',
                    click: () => {
                        const focusedWindow = BrowserWindow.getFocusedWindow();
                        if (focusedWindow && !focusedWindow.isDestroyed()) {
                            if (focusedWindow.webContents.isDevToolsOpened()) {
                                focusedWindow.webContents.closeDevTools();
                            } else {
                                focusedWindow.webContents.openDevTools();
                            }
                        }
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        icon: path.join(__dirname, 'icon.png')
    });

    // Load the index.html
    mainWindow.loadFile('electron-index.html');

    // F12 to toggle DevTools
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12' && input.type === 'keyDown') {
            if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
            } else {
                mainWindow.webContents.openDevTools();
            }
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        stopGSProServer();
    });

    // Handle new windows (like Home Run Derby popup) - give them preload access too
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        return {
            action: 'allow',
            overrideBrowserWindowOptions: {
                webPreferences: {
                    preload: path.join(__dirname, 'preload.js'),
                    contextIsolation: true,
                    nodeIntegration: false,
                    webSecurity: false  // Allow loading local assets like 3D models
                }
            }
        };
    });
}

function parseJSONMessages(buffer) {
    /**
     * Parse complete JSON messages from TCP stream buffer
     * Returns array of [parsedObjects, remainingBuffer]
     */
    const messages = [];
    let remaining = buffer;

    while (remaining.length > 0) {
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;
        let foundComplete = false;

        for (let i = 0; i < remaining.length; i++) {
            const char = remaining[i];

            if (escapeNext) {
                escapeNext = false;
                continue;
            }

            if (char === '\\') {
                escapeNext = true;
                continue;
            }

            if (char === '"') {
                inString = !inString;
                continue;
            }

            if (!inString) {
                if (char === '{') braceCount++;
                if (char === '}') {
                    braceCount--;
                    if (braceCount === 0) {
                        // Found complete JSON
                        const jsonStr = remaining.substring(0, i + 1);
                        try {
                            const parsed = JSON.parse(jsonStr);
                            messages.push(parsed);
                            remaining = remaining.substring(i + 1).trim();
                            foundComplete = true;
                            break;
                        } catch (e) {
                            // Invalid JSON, skip
                            console.error('Invalid JSON:', e.message);
                            return [messages, ''];
                        }
                    }
                }
            }
        }

        if (!foundComplete) {
            // No complete JSON found
            break;
        }
    }

    return [messages, remaining];
}

function startGSProServer() {
    if (isListening) return;

    console.log('════════════════════════════════════════');
    console.log('Starting GSPro Connect Server...');
    console.log(`  Port: ${GSPRO_PORT}`);
    console.log('  Protocol: TCP Server (GSPro Open Connect v1)');
    console.log('  Waiting for launch monitor to connect...');
    console.log('════════════════════════════════════════\n');

    try {
        gspro_server = net.createServer((socket) => {
            console.log('✓ Launch monitor connected!');
            console.log(`  From: ${socket.remoteAddress}:${socket.remotePort}\n`);

            launchMonitorSocket = socket;
            let socketBuffer = '';

            // CRITICAL: Send Code 202 message immediately upon connection
            // SquareGolf connector specifically looks for Code 202 to activate ball detection
            const readyMessage = {
                Code: 202,
                Message: "GSPro ready",
                Player: null
            };
            socket.write(JSON.stringify(readyMessage) + '\n');
            console.log('🚀 Sent Code 202 "GSPro ready" to activate SquareGolf launch monitor');
            console.log('   This triggers the connector to enter ball detection mode\n');

            // Notify renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('connection-status', {
                    connected: true,
                    receivingData: false,
                    port: GSPRO_PORT
                });
            }

            // Handle incoming data from launch monitor
            socket.on('data', (data) => {
                socketBuffer += data.toString();

                // Parse complete JSON messages
                const [messages, remaining] = parseJSONMessages(socketBuffer);
                socketBuffer = remaining;

                messages.forEach((parsed) => {
                    // Mark first data received
                    if (!hasReceivedData) {
                        hasReceivedData = true;
                        console.log('🎉 FIRST DATA RECEIVED! Launch monitor working!');
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('connection-status', {
                                connected: true,
                                receivingData: true,
                                port: GSPRO_PORT
                            });
                        }
                    }

                    lastDataTime = Date.now();

                    console.log('=== MESSAGE RECEIVED ===');
                    console.log('DeviceID:', parsed.DeviceID || 'N/A');
                    console.log('ShotNumber:', parsed.ShotNumber || 'N/A');

                    // Extract and broadcast launch monitor status
                    if (parsed.ShotDataOptions) {
                        const lmStatus = {
                            isReady: parsed.ShotDataOptions.LaunchMonitorIsReady,
                            ballDetected: parsed.ShotDataOptions.LaunchMonitorBallDetected
                        };

                        console.log('📡 Launch Monitor Status:');
                        console.log('  IsReady:', lmStatus.isReady);
                        console.log('  BallDetected:', lmStatus.ballDetected);

                        // Send status to all windows
                        BrowserWindow.getAllWindows().forEach(window => {
                            if (window && !window.isDestroyed()) {
                                window.webContents.send('launch-monitor-status', lmStatus);
                            }
                        });
                    }

                    // Handle shot data
                    if (parsed.BallData && parsed.ShotDataOptions?.ContainsBallData) {
                        console.log('✓ Valid shot data detected!');
                        console.log('BallData:', parsed.BallData);

                        // Calculate backspin and sidespin from total spin and spin axis
                        // The launch monitor's BackSpin/SideSpin values are often incorrect
                        const totalSpin = parsed.BallData.TotalSpin || 0;
                        const spinAxis = parsed.BallData.SpinAxis || 0;
                        const spinAxisRad = spinAxis * Math.PI / 180;
                        const backSpin = totalSpin * Math.cos(spinAxisRad);
                        const sideSpin = totalSpin * Math.sin(spinAxisRad);

                        console.log('🔄 SPIN CALCULATION:');
                        console.log('  Raw BackSpin from monitor:', parsed.BallData.BackSpin);
                        console.log('  Raw SideSpin from monitor:', parsed.BallData.SideSpin);
                        console.log('  TotalSpin:', totalSpin);
                        console.log('  SpinAxis:', spinAxis, '°');
                        console.log('  ✓ Calculated BackSpin:', backSpin.toFixed(0));
                        console.log('  ✓ Calculated SideSpin:', sideSpin.toFixed(0));

                        const shotData = {
                            ball_speed: parsed.BallData.Speed || 0,
                            hla: parsed.BallData.HLA || 0,
                            vla: parsed.BallData.VLA || 0,
                            total_spin: totalSpin,
                            back_spin: backSpin,
                            side_spin: sideSpin,
                            spin_axis: spinAxis,
                            carry_distance: parsed.BallData.CarryDistance || 0
                        };

                        console.log('Extracted shot data:', shotData);

                        // Send to ALL windows (main window + any popups like Home Run Derby)
                        BrowserWindow.getAllWindows().forEach(window => {
                            if (window && !window.isDestroyed()) {
                                console.log(`Sending shot data to window: ${window.getTitle()}`);
                                window.webContents.send('shot-data', shotData);
                            }
                        });
                        console.log('Shot data sent to all windows ✓');

                        // Send success response to launch monitor
                        const response = {
                            Code: 200,
                            Message: "Shot received successfully"
                        };
                        socket.write(JSON.stringify(response));
                        console.log('Sent 200 response to launch monitor');

                    } else if (parsed.ShotDataOptions?.IsHeartBeat) {
                        console.log('Heartbeat received');

                        // Check if heartbeat contains ball data (SquareGolf specific)
                        const containsBallData = parsed.ShotDataOptions?.LaunchMonitorIsReady !== undefined ||
                                                 parsed.ShotDataOptions?.LaunchMonitorBallDetected !== undefined;

                        if (containsBallData) {
                            // Heartbeat with ball data -> Send Code 202 (SquareGolf requirement)
                            const response = {
                                Code: 202,
                                Message: "SMG ready",
                                Player: null
                            };
                            socket.write(JSON.stringify(response) + '\n');
                            console.log('✅ Sent Code 202 "SMG ready" to heartbeat with ball data (SquareGolf)');
                        } else {
                            // Regular heartbeat -> Send Code 200
                            const response = {
                                Code: 200,
                                Message: "Heartbeat acknowledged"
                            };
                            socket.write(JSON.stringify(response) + '\n');
                        }

                    } else {
                        console.log('Other message:', JSON.stringify(parsed).substring(0, 150));

                        // Special handling for ready state packets from SquareGolf
                        // When SquareGolf sends heartbeat with ball data, respond with Code 202
                        if (parsed.ShotDataOptions?.LaunchMonitorIsReady !== undefined ||
                            parsed.ShotDataOptions?.LaunchMonitorBallDetected !== undefined) {

                            console.log('🎯 Launch Monitor Status Packet Detected!');
                            console.log('  LaunchMonitorIsReady:', parsed.ShotDataOptions.LaunchMonitorIsReady);
                            console.log('  LaunchMonitorBallDetected:', parsed.ShotDataOptions.LaunchMonitorBallDetected);

                            // Send Code 202 message to keep SquareGolf in ball detection mode
                            const readyResponse = {
                                Code: 202,
                                Message: "GSPro ready",
                                Player: null
                            };
                            socket.write(JSON.stringify(readyResponse) + '\n');
                            console.log('✅ Sent Code 202 "GSPro ready" response to launch monitor');
                            console.log('   This keeps SquareGolf in ball detection mode');
                        } else {
                            // Send generic 200 response
                            const response = {
                                Code: 200,
                                Message: "Message received"
                            };
                            socket.write(JSON.stringify(response));
                        }
                    }

                    console.log('=== END MESSAGE ===\n');
                });
            });

            socket.on('error', (err) => {
                console.error('❌ Socket error:', err.message);
            });

            socket.on('close', () => {
                console.log('⚠ Launch monitor disconnected\n');
                launchMonitorSocket = null;
                hasReceivedData = false;

                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('connection-status', {
                        connected: false
                    });
                }
            });
        });

        gspro_server.on('error', (err) => {
            console.error('❌ Server error:', err.message);

            if (err.code === 'EADDRINUSE') {
                console.error(`\n⚠️  Port ${GSPRO_PORT} is already in use!`);
                console.error('   Possible causes:');
                console.error('   - GSPro Connect is running');
                console.error('   - Another Nova Darts instance is running');
                console.error('   - Another launch monitor app is using port 921\n');
            }

            isListening = false;

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('connection-status', {
                    connected: false,
                    error: err.message
                });
            }
        });

        gspro_server.listen(GSPRO_PORT, '0.0.0.0', () => {
            console.log('✓ Server listening successfully!');
            console.log(`  Port: ${GSPRO_PORT}`);
            console.log('  Ready to accept launch monitor connections\n');
            isListening = true;

            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('connection-status', {
                    connected: true,
                    receivingData: false,
                    port: GSPRO_PORT
                });
            }
        });

    } catch (err) {
        console.error('❌ Error starting server:', err);
        isListening = false;

        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('connection-status', {
                connected: false,
                error: err.message
            });
        }
    }
}

function stopGSProServer() {
    if (launchMonitorSocket) {
        // Send disconnect message to launch monitor
        try {
            const disconnectMessage = {
                Code: 201,
                Message: "Disconnecting"
            };
            launchMonitorSocket.write(JSON.stringify(disconnectMessage), () => {
                console.log('✓ Disconnect message sent to launch monitor');
                launchMonitorSocket.destroy();
                launchMonitorSocket = null;
            });
        } catch (err) {
            console.error('Error sending disconnect message:', err);
            launchMonitorSocket.destroy();
            launchMonitorSocket = null;
        }
    }

    if (gspro_server) {
        gspro_server.close(() => {
            console.log('GSPro server stopped');
        });
        isListening = false;
        hasReceivedData = false;
    }
}

// Enable GPU acceleration (native OpenGL on Linux)
app.commandLine.appendSwitch('ignore-gpu-blacklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');

// App lifecycle
app.whenReady().then(() => {
    createApplicationMenu();
    createWindow();
    startGSProServer();

    // Check for updates after a short delay (let the app load first)
    setTimeout(() => {
        console.log('Checking for app updates...');
        autoUpdater.checkForUpdates();
    }, 3000);

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    stopGSProServer();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopGSProServer();
});

// IPC Handlers
ipcMain.handle('get-connection-status', () => {
    return {
        connected: isListening,
        receivingData: hasReceivedData,
        port: GSPRO_PORT
    };
});

ipcMain.handle('restart-listener', () => {
    stopGSProServer();
    setTimeout(() => {
        startGSProServer();
    }, 1000);
    return true;
});

ipcMain.handle('get-green-stimp', () => {
    return greenStimp;
});

ipcMain.handle('get-gspro-port', () => {
    return GSPRO_PORT;
});

ipcMain.handle('set-gspro-port', (event, newPort) => {
    const port = parseInt(newPort);
    if (port < 1 || port > 65535) {
        return { success: false, error: 'Port must be between 1 and 65535' };
    }

    GSPRO_PORT = port;

    // Restart server with new port
    stopGSProServer();
    setTimeout(() => {
        startGSProServer();
    }, 1000);

    return { success: true, port: GSPRO_PORT };
});

// Handle opening new game windows (Home Run Derby, Putting Practice)
ipcMain.handle('open-game-window', (event, { url, title, width, height, playerData }) => {
    const gameWindow = new BrowserWindow({
        width: width || 1200,
        height: height || 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: false  // Allow loading local assets like 3D models
        },
        title: title || 'Game',
        icon: path.join(__dirname, 'icon.png')
    });

    // Store player data in localStorage if provided
    if (playerData) {
        gameWindow.webContents.on('did-finish-load', () => {
            // Determine which game based on URL
            if (url.includes('home-run-derby')) {
                gameWindow.webContents.executeJavaScript(`
                    localStorage.setItem('homeRunDerbyPlayers', '${JSON.stringify(playerData.players || [])}');
                    localStorage.setItem('homeRunDerbyCurrentPlayer', '${playerData.currentPlayer || 0}');
                `);
            } else if (url.includes('putting-green')) {
                gameWindow.webContents.executeJavaScript(`
                    localStorage.setItem('puttingPlayers', '${JSON.stringify(playerData.players || [])}');
                    localStorage.setItem('puttingCurrentPlayer', '${playerData.currentPlayer || 0}');
                `);
            } else if (url.includes('bowling')) {
                gameWindow.webContents.executeJavaScript(`
                    localStorage.setItem('bowlingPlayers', '${JSON.stringify(playerData.players || [])}');
                    localStorage.setItem('bowlingCurrentPlayer', '${playerData.currentPlayer || 0}');
                `);
            } else if (url.includes('soccer-penalty')) {
                gameWindow.webContents.executeJavaScript(`
                    localStorage.setItem('soccerPlayers', '${JSON.stringify(playerData.players || [])}');
                    localStorage.setItem('soccerCurrentPlayer', '${playerData.currentPlayer || 0}');
                `);
            }
        });
    }

    gameWindow.loadFile(url);

    // F12 to toggle DevTools
    gameWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12' && input.type === 'keyDown') {
            if (gameWindow.webContents.isDevToolsOpened()) {
                gameWindow.webContents.closeDevTools();
            } else {
                gameWindow.webContents.openDevTools();
            }
        }
    });

    return true;
});

// Auto-updater IPC handlers
ipcMain.handle('check-for-updates', () => {
    autoUpdater.checkForUpdates();
    return true;
});

ipcMain.handle('download-update', () => {
    // Download the update now
    autoUpdater.downloadUpdate();
    return true;
});

ipcMain.handle('quit-and-install', () => {
    autoUpdater.quitAndInstall();
    return true;
});

