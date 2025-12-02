const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Listen for shot data from main process
    onShotData: (callback) => {
        ipcRenderer.on('shot-data', (event, data) => callback(data));
    },

    // Listen for connection status updates
    onConnectionStatus: (callback) => {
        ipcRenderer.on('connection-status', (event, status) => callback(status));
    },

    // Get current connection status
    getConnectionStatus: () => ipcRenderer.invoke('get-connection-status'),

    // Restart the GSPro listener
    restartListener: () => ipcRenderer.invoke('restart-listener'),

    // Open a new game window (Home Run Derby, Putting Practice)
    openGameWindow: (options) => ipcRenderer.invoke('open-game-window', options),

    // Get green speed (Stimp) setting
    getGreenStimp: () => ipcRenderer.invoke('get-green-stimp'),

    // Listen for Stimp changes
    onStimpChanged: (callback) => {
        ipcRenderer.on('stimp-changed', (event, stimp) => callback(stimp));
    },

    // Get/Set GSPro port
    getGSProPort: () => ipcRenderer.invoke('get-gspro-port'),
    setGSProPort: (port) => ipcRenderer.invoke('set-gspro-port', port),

    // Auto-updater methods
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),

    // Listen for update status events
    onUpdateStatus: (callback) => {
        ipcRenderer.on('update-status', (event, status) => callback(status));
    },

    // Listen for launch monitor status updates
    onLaunchMonitorStatus: (callback) => {
        ipcRenderer.on('launch-monitor-status', (event, status) => callback(status));
    },

    // Nova launch monitor methods
    startNovaDiscovery: () => ipcRenderer.invoke('start-nova-discovery'),
    stopNovaDiscovery: () => ipcRenderer.invoke('stop-nova-discovery'),

    // Listen for Nova status updates
    onNovaStatus: (callback) => {
        ipcRenderer.on('nova-status', (event, status) => callback(status));
    },

    // GSPro server control
    startGSProServer: () => ipcRenderer.invoke('start-gspro-server'),
    stopGSProServer: () => ipcRenderer.invoke('stop-gspro-server')
});
