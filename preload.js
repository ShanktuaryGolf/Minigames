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

// Expose Steam API for multiplayer functionality
contextBridge.exposeInMainWorld('steamAPI', {
    // Check if Steam is available and initialized
    isAvailable: () => ipcRenderer.invoke('steam-available'),

    // Get local player info (steamId, name, level)
    getPlayer: () => ipcRenderer.invoke('steam-get-player'),

    // Lobby management
    createLobby: (lobbyType = 'friends_only', maxMembers = 4) =>
        ipcRenderer.invoke('steam-create-lobby', lobbyType, maxMembers),
    joinLobby: (lobbyId) => ipcRenderer.invoke('steam-join-lobby', lobbyId),
    leaveLobby: () => ipcRenderer.invoke('steam-leave-lobby'),
    getLobbyMembers: () => ipcRenderer.invoke('steam-get-lobby-members'),
    isHost: () => ipcRenderer.invoke('steam-is-host'),
    setLobbyData: (key, value) => ipcRenderer.invoke('steam-set-lobby-data', key, value),

    // P2P messaging
    sendP2P: (steamId, data) => ipcRenderer.invoke('steam-send-p2p', steamId, data),
    broadcastP2P: (data, reliable = true) => ipcRenderer.invoke('steam-broadcast-p2p', data, reliable),

    // Listen for incoming P2P messages
    onP2PMessage: (callback) => {
        ipcRenderer.on('steam-p2p-message', (event, data) => callback(data));
    },

    // Friend invite (opens Steam overlay)
    inviteFriend: () => ipcRenderer.invoke('steam-invite-friend'),

    // Lobby event listeners
    onLobbyCreated: (callback) => {
        ipcRenderer.on('steam-lobby-created', (event, data) => callback(data));
    },
    onLobbyJoined: (callback) => {
        ipcRenderer.on('steam-lobby-joined', (event, data) => callback(data));
    },
    onMemberJoined: (callback) => {
        ipcRenderer.on('steam-member-joined', (event, data) => callback(data));
    },
    onMemberLeft: (callback) => {
        ipcRenderer.on('steam-member-left', (event, data) => callback(data));
    },
    onLobbyMembers: (callback) => {
        ipcRenderer.on('steam-lobby-members', (event, data) => callback(data));
    },
    onLobbyInvite: (callback) => {
        ipcRenderer.on('steam-lobby-invite', (event, data) => callback(data));
    },
    onDebugLog: (callback) => {
        ipcRenderer.on('steam-debug-log', (event, data) => callback(data));
    }
});

// Auto-log Steam debug messages to console
ipcRenderer.on('steam-debug-log', (event, data) => {
    console.log('%c[STEAM MAIN]', 'color: #00ff00; font-weight: bold;', data.message);
});
