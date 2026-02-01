/**
 * Steam Manager - Handles all Steamworks SDK integration
 *
 * This module provides a modular adapter for Steam functionality including:
 * - Initialization and shutdown
 * - Lobby creation, joining, and management
 * - P2P networking via Steam relay
 * - Friend invites and overlay
 *
 * Gracefully degrades when Steam is not available.
 */

const { ipcMain, BrowserWindow } = require('electron');

// Steam App ID - Replace with your actual App ID from Steamworks
// Use 480 (Spacewar) for testing during development
const STEAM_APP_ID = process.env.STEAM_APP_ID || 480;

let steamworks = null;
let steamClient = null;  // The client object returned from steamworks.init()
let steamInitialized = false;
let currentLobby = null;      // The Lobby object from steamworks.js
let currentLobbyId = null;    // The lobby ID as string (for IPC)
let lobbyMembers = [];
let isHost = false;

// Message types for P2P communication
const MESSAGE_TYPES = {
    SHOT_DATA: 'shot',
    PLAYER_STATE: 'player_state',
    GAME_STATE: 'game_state',
    DRAFT_PICK: 'draft_pick',
    CHAT: 'chat',
    PING: 'ping',
    PONG: 'pong'
};

/**
 * Initialize Steam SDK
 * @returns {boolean} True if initialization succeeded
 */
function initializeSteam() {
    if (steamInitialized) {
        console.log('Steam already initialized');
        return true;
    }

    try {
        // Try to load steamworks.js (optional dependency)
        try {
            steamworks = require('steamworks.js');
        } catch (loadErr) {
            console.log('steamworks.js not installed - Steam features disabled');
            console.log('To enable Steam multiplayer, run: npm install steamworks.js');
            steamworks = null;
            steamInitialized = false;
            return false;
        }

        // Initialize with App ID
        steamClient = steamworks.init(STEAM_APP_ID);

        if (!steamClient) {
            console.error('Steam client initialization failed - is Steam running?');
            return false;
        }

        steamInitialized = true;
        console.log(`Steam initialized successfully with App ID: ${STEAM_APP_ID}`);

        // Get player info using the client object
        const playerName = steamClient.localplayer.getName();
        const steamIdObj = steamClient.localplayer.getSteamId();
        // steamId might be an object with steamId64 property or need conversion
        const steamId = steamIdObj.steamId64 || steamIdObj.toString() || JSON.stringify(steamIdObj);
        console.log(`Logged in as: ${playerName} (${steamId})`);

        // Set up callbacks
        setupSteamCallbacks();

        return true;
    } catch (err) {
        console.log('Steam not available:', err.message);
        console.log('Game will run in offline/local mode');
        steamworks = null;
        steamInitialized = false;
        return false;
    }
}

/**
 * Set up Steam event callbacks
 * Note: steamworks.js uses callback registration, not event emitters
 */
function setupSteamCallbacks() {
    if (!steamClient) return;

    try {
        // Register lobby callbacks if the API supports it
        if (steamClient.callback && typeof steamClient.callback.register === 'function') {
            // LobbyCreated callback
            steamClient.callback.register(513, (result) => {
                console.log('Lobby created callback:', result);
                if (result.m_eResult === 1) { // k_EResultOK
                    currentLobby = result.m_ulSteamIDLobby;
                    isHost = true;
                    broadcastToRenderers('steam-lobby-created', {
                        lobbyId: currentLobby,
                        isHost: true
                    });
                }
            });

            // LobbyEnter callback
            steamClient.callback.register(504, (result) => {
                console.log('Lobby entered callback:', result);
                currentLobby = result.m_ulSteamIDLobby;
                updateLobbyMembers();
                broadcastToRenderers('steam-lobby-joined', {
                    lobbyId: currentLobby,
                    isHost: isHost
                });
            });

            // LobbyChatUpdate callback (member join/leave)
            steamClient.callback.register(506, (result) => {
                const changeFlags = result.m_rgfChatMemberStateChange;
                const memberId = result.m_ulSteamIDUserChanged;

                if (changeFlags & 0x0001) { // Entered
                    console.log('Member joined:', memberId);
                    updateLobbyMembers();
                    broadcastToRenderers('steam-member-joined', { steamId: memberId });
                }
                if (changeFlags & 0x0002) { // Left
                    console.log('Member left:', memberId);
                    updateLobbyMembers();
                    broadcastToRenderers('steam-member-left', { steamId: memberId });
                }
            });

            // P2P session request callback
            steamClient.callback.register(1202, (result) => {
                const steamId = result.m_steamIDRemote;
                console.log('P2P session request from:', steamId);
                // Auto-accept P2P sessions
                if (steamClient.networking && steamClient.networking.acceptP2PSessionWithUser) {
                    steamClient.networking.acceptP2PSessionWithUser(steamId);
                }
            });

            console.log('Steam callbacks registered successfully');
        } else {
            console.log('Steam callback registration not available - using polling mode');
        }
    } catch (err) {
        console.log('Could not register Steam callbacks:', err.message);
        console.log('Steam multiplayer will use polling mode');
    }
}

/**
 * Update lobby member list
 */
function updateLobbyMembers() {
    if (!steamClient || !currentLobby) return;

    try {
        if (typeof steamClient.matchmaking.getLobbyMembers === 'function') {
            const lobbyIdBigInt = typeof currentLobby === 'bigint' ? currentLobby : BigInt(currentLobby);
            lobbyMembers = steamClient.matchmaking.getLobbyMembers(lobbyIdBigInt);
        }
        console.log('Lobby members:', lobbyMembers);

        broadcastToRenderers('steam-lobby-members', {
            members: lobbyMembers.map(id => {
                let name = 'Player';
                try {
                    if (steamClient.friends && typeof steamClient.friends.getFriendPersonaName === 'function') {
                        name = steamClient.friends.getFriendPersonaName(id);
                    }
                } catch (e) { /* ignore */ }
                return { steamId: id, name: name };
            })
        });
    } catch (err) {
        console.log('Could not update lobby members:', err.message);
    }
}

/**
 * Broadcast message to all renderer windows
 */
function broadcastToRenderers(channel, data) {
    BrowserWindow.getAllWindows().forEach(window => {
        if (window && !window.isDestroyed()) {
            window.webContents.send(channel, data);
        }
    });
}

/**
 * Send debug log to renderer DevTools console
 */
function debugLog(...args) {
    // Helper to safely stringify values including BigInt
    const safeStringify = (val) => {
        if (val === null || val === undefined) return String(val);
        if (typeof val === 'bigint') return val.toString() + 'n';
        if (typeof val === 'object') {
            try {
                return JSON.stringify(val, (key, v) => typeof v === 'bigint' ? v.toString() + 'n' : v);
            } catch (e) {
                return '[Object]';
            }
        }
        return String(val);
    };
    const message = args.map(safeStringify).join(' ');
    console.log('[STEAM]', ...args);
    broadcastToRenderers('steam-debug-log', { message, timestamp: Date.now() });
}

/**
 * Create a Steam lobby
 */
async function createLobby(lobbyType = 'friends_only', maxMembers = 4) {
    if (!steamClient || !steamInitialized) {
        return { success: false, error: 'Steam not available' };
    }

    try {
        const typeMap = {
            'private': 0,
            'friends_only': 1,
            'public': 2,
            'invisible': 3
        };

        const type = typeMap[lobbyType] || 1;

        // createLobby returns a Lobby object, not just an ID
        const lobby = await steamClient.matchmaking.createLobby(type, maxMembers);

        // Debug: log what we get back from createLobby
        debugLog('createLobby result - lobby object:', lobby);
        debugLog('createLobby - lobby.id:', lobby?.id);
        debugLog('createLobby - lobby methods:', lobby ? Object.keys(Object.getPrototypeOf(lobby)) : 'null');

        // Store the Lobby object for later use
        currentLobby = lobby;
        currentLobbyId = lobby.id ? lobby.id.toString() : null;
        isHost = true;

        debugLog('Lobby created successfully, ID:', currentLobbyId);

        // Store our name in lobby data so others can see it
        const myName = steamClient.localplayer.getName();
        const mySteamId = steamClient.localplayer.getSteamId();
        const myIdStr = mySteamId.steamId64.toString();
        currentLobby.setData('player_' + myIdStr, myName);
        debugLog('Set lobby data for self:', myIdStr, '=', myName);

        // Immediately poll for initial members (should include self)
        setTimeout(() => {
            debugLog('Initial member poll after lobby creation');
            pollLobbyMembers();
        }, 500);

        return {
            success: true,
            lobbyId: currentLobbyId,
            isHost: true
        };
    } catch (err) {
        console.error('Failed to create lobby:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Join a Steam lobby
 */
async function joinLobby(lobbyId) {
    debugLog('joinLobby called with:', lobbyId);

    if (!steamClient || !steamInitialized) {
        return { success: false, error: 'Steam not available' };
    }

    try {
        // Convert lobbyId to BigInt if needed
        const lobbyIdBigInt = typeof lobbyId === 'bigint' ? lobbyId : BigInt(lobbyId);
        debugLog('Joining lobby with BigInt:', lobbyIdBigInt.toString());

        // joinLobby returns a Lobby object
        const lobby = await steamClient.matchmaking.joinLobby(lobbyIdBigInt);

        debugLog('joinLobby result - lobby object:', lobby);
        debugLog('joinLobby - lobby.id:', lobby?.id);
        debugLog('joinLobby - lobby methods:', lobby ? Object.keys(Object.getPrototypeOf(lobby)) : 'null');

        // Store the Lobby object
        currentLobby = lobby;
        currentLobbyId = lobby?.id ? lobby.id.toString() : lobbyIdBigInt.toString();
        isHost = false;

        debugLog('Joined lobby successfully, ID:', currentLobbyId);

        // Store our name in lobby data so others can see it
        const myName = steamClient.localplayer.getName();
        const mySteamId = steamClient.localplayer.getSteamId();
        const myIdStr = mySteamId.steamId64.toString();
        currentLobby.setData('player_' + myIdStr, myName);
        debugLog('Set lobby data for self:', myIdStr, '=', myName);

        // Immediately try to get lobby members
        setTimeout(() => {
            debugLog('Initial member poll after joining');
            pollLobbyMembers();
        }, 500);

        return {
            success: true,
            lobbyId: currentLobbyId,
            isHost: false
        };
    } catch (err) {
        console.error('Failed to join lobby:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Leave current lobby
 */
function leaveLobby() {
    if (!steamClient || !currentLobby) {
        return { success: false, error: 'Not in a lobby' };
    }

    try {
        // currentLobby is a Lobby object - use its leave() method
        if (typeof currentLobby.leave === 'function') {
            currentLobby.leave();
        }
        currentLobby = null;
        currentLobbyId = null;
        lobbyMembers = [];
        isHost = false;
        lastMemberCount = 0;

        return { success: true };
    } catch (err) {
        console.error('Failed to leave lobby:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Send P2P message to a specific peer
 */
function sendP2PMessage(steamId, data, reliable = true) {
    if (!steamClient || !steamInitialized) {
        return false;
    }

    try {
        const buffer = Buffer.from(JSON.stringify(data));
        const sendType = reliable ? 2 : 0; // k_EP2PSendReliable : k_EP2PSendUnreliable

        return steamClient.networking.sendP2PPacket(steamId, buffer, sendType);
    } catch (err) {
        console.error('Failed to send P2P message:', err);
        return false;
    }
}

/**
 * Broadcast P2P message to all lobby members
 */
function broadcastP2P(data, reliable = true) {
    if (!currentLobby || lobbyMembers.length === 0) {
        return false;
    }

    const mySteamId = steamClient.localplayer.getSteamId();
    let success = true;

    lobbyMembers.forEach(memberId => {
        if (memberId !== mySteamId) {
            if (!sendP2PMessage(memberId, data, reliable)) {
                success = false;
            }
        }
    });

    return success;
}

/**
 * Poll for incoming P2P messages
 * Should be called periodically from main process
 */
function pollP2PMessages() {
    if (!steamClient || !steamInitialized) return;

    try {
        while (steamClient.networking.isP2PPacketAvailable()) {
            const packet = steamClient.networking.readP2PPacket();
            if (packet) {
                const data = JSON.parse(packet.data.toString());
                broadcastToRenderers('steam-p2p-message', {
                    from: packet.steamId,
                    data: data
                });
            }
        }
    } catch (err) {
        // Ignore read errors
    }
}

/**
 * Open Steam friend invite overlay
 */
function inviteFriend() {
    debugLog('inviteFriend called, currentLobbyId:', currentLobbyId);

    if (!steamClient || !currentLobby) {
        debugLog('Not in a lobby - steamClient:', !!steamClient, 'currentLobby:', !!currentLobby);
        return { success: false, error: 'Not in a lobby' };
    }

    try {
        // currentLobby is a Lobby object - use its openInviteDialog() method
        if (typeof currentLobby.openInviteDialog === 'function') {
            debugLog('Calling lobby.openInviteDialog()');
            currentLobby.openInviteDialog();
            return { success: true };
        }

        // Fallback: return lobby ID so renderer can show it for manual sharing
        debugLog('openInviteDialog not available, returning lobby ID for manual invite');
        return {
            success: true,
            lobbyId: currentLobbyId,
            message: 'Share this lobby ID with friends: ' + currentLobbyId
        };
    } catch (err) {
        console.error('Failed to open invite dialog:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Get local player info
 */
function getLocalPlayer() {
    if (!steamClient || !steamInitialized) {
        return null;
    }

    const steamIdObj = steamClient.localplayer.getSteamId();
    const steamId = steamIdObj.steamId64 || steamIdObj.toString() || steamIdObj;

    return {
        steamId: steamId,
        name: steamClient.localplayer.getName(),
        level: steamClient.localplayer.getLevel()
    };
}

/**
 * Shutdown Steam
 */
function shutdown() {
    if (steamClient && steamInitialized) {
        try {
            if (currentLobby) {
                leaveLobby();
            }
            // steamworks.js doesn't have a shutdown method - cleanup is automatic
            // Just clear our references
            steamInitialized = false;
            steamClient = null;
            console.log('Steam shutdown complete');
        } catch (err) {
            console.log('Error during Steam shutdown:', err.message);
        }
    }
}

/**
 * Register IPC handlers for renderer communication
 */
function registerIPCHandlers() {
    // Check if Steam is available
    ipcMain.handle('steam-available', () => {
        return steamInitialized;
    });

    // Get local player info
    ipcMain.handle('steam-get-player', () => {
        return getLocalPlayer();
    });

    // Lobby management
    ipcMain.handle('steam-create-lobby', async (event, lobbyType, maxMembers) => {
        return await createLobby(lobbyType, maxMembers);
    });

    ipcMain.handle('steam-join-lobby', async (event, lobbyId) => {
        return await joinLobby(lobbyId);
    });

    ipcMain.handle('steam-leave-lobby', () => {
        return leaveLobby();
    });

    ipcMain.handle('steam-get-lobby-members', () => {
        debugLog('IPC: getLobbyMembers called, currentLobbyId:', currentLobbyId, 'memberCount:', lobbyMembers.length);
        if (!currentLobby) return [];

        // lobbyMembers is populated by pollLobbyMembers with PlayerSteamId objects
        return lobbyMembers.map(member => {
            let name = 'Unknown';
            let steamIdStr;

            // Handle PlayerSteamId object format from steamworks.js
            if (member && member.steamId64) {
                steamIdStr = member.steamId64.toString();
            } else if (typeof member === 'bigint') {
                steamIdStr = member.toString();
            } else {
                steamIdStr = String(member);
            }

            try {
                if (steamClient && steamClient.friends && typeof steamClient.friends.getFriendPersonaName === 'function') {
                    name = steamClient.friends.getFriendPersonaName(member);
                }
            } catch (e) { /* ignore */ }
            return { steamId: steamIdStr, name: name };
        });
    });

    ipcMain.handle('steam-is-host', () => {
        return isHost;
    });

    // P2P messaging
    ipcMain.handle('steam-send-p2p', (event, steamId, data) => {
        return sendP2PMessage(steamId, data);
    });

    ipcMain.handle('steam-broadcast-p2p', (event, data, reliable) => {
        return broadcastP2P(data, reliable);
    });

    // Friend invite
    ipcMain.handle('steam-invite-friend', () => {
        return inviteFriend();
    });

    // Set lobby game mode data
    ipcMain.handle('steam-set-lobby-data', (event, key, value) => {
        if (!steamClient || !currentLobby) {
            return { success: false, error: 'Not in a lobby' };
        }
        if (typeof steamClient.matchmaking.setLobbyData !== 'function') {
            // API not available, silently succeed (lobby data is optional metadata)
            return { success: true };
        }
        try {
            steamClient.matchmaking.setLobbyData(currentLobby, key, value);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });
}

/**
 * Start P2P polling interval
 */
let pollInterval = null;
let lobbyPollInterval = null;
let lastMemberCount = 0;
let pendingNameRetries = {}; // Track members whose names we're still waiting for

/**
 * Get member name from lobby data with retry tracking
 */
function getMemberName(steamIdStr) {
    let name = 'Player';
    try {
        const lobbyName = currentLobby.getData('player_' + steamIdStr);
        if (lobbyName && lobbyName !== '') {
            name = lobbyName;
            // Clear retry tracking for this member
            delete pendingNameRetries[steamIdStr];
        }
    } catch (e) {
        debugLog('Could not get lobby data for', steamIdStr, e.message);
    }
    return name;
}

/**
 * Build member list with names from lobby data
 */
function buildMemberList() {
    return lobbyMembers.map(member => {
        let steamIdStr;

        // Handle PlayerSteamId object format from steamworks.js
        if (member && member.steamId64) {
            steamIdStr = member.steamId64.toString();
        } else if (typeof member === 'bigint') {
            steamIdStr = member.toString();
        } else if (member && typeof member.toString === 'function') {
            steamIdStr = member.toString();
        } else {
            steamIdStr = String(member);
        }

        const name = getMemberName(steamIdStr);

        // Track members still showing as "Player" for retry
        if (name === 'Player') {
            if (!pendingNameRetries[steamIdStr]) {
                pendingNameRetries[steamIdStr] = { count: 0, firstSeen: Date.now() };
            }
            pendingNameRetries[steamIdStr].count++;
        }

        return { steamId: steamIdStr, name: name };
    });
}

function pollLobbyMembers() {
    if (!steamClient || !currentLobby) return;

    try {
        // currentLobby is now a Lobby object - use its getMembers() method
        if (typeof currentLobby.getMembers === 'function') {
            const members = currentLobby.getMembers();

            // Debug: log raw result every 5 seconds
            if (!pollLobbyMembers.lastLog || Date.now() - pollLobbyMembers.lastLog > 5000) {
                debugLog('pollLobbyMembers - lobbyId:', currentLobbyId, 'memberCount:', members?.length);
                if (members && members.length > 0) {
                    const firstMember = members[0];
                    debugLog('First member - type:', typeof firstMember,
                        'steamId64:', firstMember?.steamId64?.toString(),
                        'value:', typeof firstMember === 'bigint' ? firstMember.toString() : firstMember);
                }
                pollLobbyMembers.lastLog = Date.now();
            }

            // Check if member count changed or if this is the first poll with members
            const currentCount = members?.length || 0;
            const membersChanged = currentCount !== lastMemberCount || (currentCount > 0 && lobbyMembers.length === 0);

            if (membersChanged) {
                debugLog('Lobby members changed:', lastMemberCount, '->', currentCount);
                lastMemberCount = currentCount;
                lobbyMembers = members || [];

                // Reset pending retries for new member detection
                pendingNameRetries = {};
            }

            // Build member list and broadcast
            const memberList = buildMemberList();

            // Check if we have any members still showing as "Player"
            const hasPendingNames = Object.keys(pendingNameRetries).length > 0;

            // Broadcast if members changed or if we're still waiting for names (retry for first 10 seconds)
            const shouldBroadcast = membersChanged || hasPendingNames;

            if (shouldBroadcast) {
                // Log retry attempts for debugging
                if (hasPendingNames && !membersChanged) {
                    const pendingIds = Object.keys(pendingNameRetries);
                    const oldestPending = Math.min(...Object.values(pendingNameRetries).map(r => r.firstSeen));
                    const waitingTime = Date.now() - oldestPending;

                    // Only log every 2 seconds to avoid spam
                    if (!pollLobbyMembers.lastRetryLog || Date.now() - pollLobbyMembers.lastRetryLog > 2000) {
                        debugLog('Retrying names for:', pendingIds.length, 'members, waiting', Math.round(waitingTime/1000), 's');
                        pollLobbyMembers.lastRetryLog = Date.now();
                    }

                    // Stop retrying after 15 seconds - names may genuinely not be set
                    if (waitingTime > 15000) {
                        debugLog('Giving up on name retries after 15s');
                        pendingNameRetries = {};
                    }
                }

                debugLog('Broadcasting member list:', memberList);
                broadcastToRenderers('steam-lobby-members', { members: memberList });
            }
        } else {
            debugLog('currentLobby.getMembers is not a function. currentLobby type:', typeof currentLobby);
        }
    } catch (err) {
        debugLog('pollLobbyMembers error:', err.message);
    }
}

function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(pollP2PMessages, 16); // ~60fps for P2P
    // Poll lobby members every 500ms to catch name updates faster
    lobbyPollInterval = setInterval(pollLobbyMembers, 500);
    debugLog('Steam polling started (P2P + lobby members @ 500ms)');
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
    if (lobbyPollInterval) {
        clearInterval(lobbyPollInterval);
        lobbyPollInterval = null;
    }
    lastMemberCount = 0;
}

module.exports = {
    initializeSteam,
    shutdown,
    registerIPCHandlers,
    startPolling,
    stopPolling,
    createLobby,
    joinLobby,
    leaveLobby,
    sendP2PMessage,
    broadcastP2P,
    inviteFriend,
    getLocalPlayer,
    MESSAGE_TYPES,
    isAvailable: () => steamInitialized,
    getCurrentLobby: () => currentLobbyId,
    isLobbyHost: () => isHost
};
