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

let steamworksModule = null;  // The steamworks.js module
let steam = null;             // The API object returned from init()
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
            steamworksModule = require('steamworks.js');
        } catch (loadErr) {
            console.log('steamworks.js not installed - Steam features disabled');
            console.log('To enable Steam multiplayer, run: npm install steamworks.js');
            steamworksModule = null;
            steam = null;
            steamInitialized = false;
            return false;
        }

        // Note: electronEnableSteamOverlay() adds 'in-process-gpu' switch which conflicts
        // with SwiftShader on Linux. Steam overlay may not work with software rendering.
        // Skip for now - overlay can still be triggered via lobby.openInviteDialog()
        if (process.platform !== 'linux') {
            try {
                steamworksModule.electronEnableSteamOverlay();
                console.log('Steam overlay enabled for Electron');
            } catch (overlayErr) {
                console.log('Could not enable Steam overlay:', overlayErr.message);
            }
        } else {
            console.log('Skipping Steam overlay on Linux (conflicts with SwiftShader)');
        }

        // Initialize with App ID - init() returns the API object
        // Also automatically starts runCallbacks interval at 30fps
        steam = steamworksModule.init(STEAM_APP_ID);

        // Verify initialization by checking if we can get player info
        const playerName = steam.localplayer.getName();
        const steamIdObj = steam.localplayer.getSteamId();
        const steamId = steamIdObj.steamId64.toString();

        if (!playerName) {
            console.error('Steam initialization failed - could not get player name');
            return false;
        }

        steamInitialized = true;
        console.log(`Steam initialized successfully with App ID: ${STEAM_APP_ID}`);
        console.log(`Logged in as: ${playerName} (${steamId})`);

        // Set up callbacks
        setupSteamCallbacks();

        return true;
    } catch (err) {
        console.log('Steam not available:', err.message);
        console.log('Game will run in offline/local mode');
        steamworksModule = null;
        steam = null;
        steamInitialized = false;
        return false;
    }
}

/**
 * Set up Steam event callbacks
 */
function setupSteamCallbacks() {
    if (!steam) return;

    try {
        const { SteamCallback } = steam.callback;

        // P2P session request callback - auto-accept sessions from lobby members
        steam.callback.register(SteamCallback.P2PSessionRequest, (result) => {
            const remoteSteamId = result.remote;
            console.log('P2P session request from:', remoteSteamId.toString());
            // Auto-accept P2P sessions
            steam.networking.acceptP2PSession(remoteSteamId);
            debugLog('Accepted P2P session from:', remoteSteamId.toString());
        });

        // P2P session connect failure
        steam.callback.register(SteamCallback.P2PSessionConnectFail, (result) => {
            console.log('P2P session connect failed:', result.remote.toString(), 'error:', result.error);
            debugLog('P2P connect failed for:', result.remote.toString());
        });

        // Lobby data update callback
        steam.callback.register(SteamCallback.LobbyDataUpdate, (result) => {
            debugLog('Lobby data updated - lobby:', result.lobby.toString(), 'member:', result.member.toString());
            // Refresh member list when lobby data changes (might include name updates)
            if (currentLobby) {
                pollLobbyMembers();
            }
        });

        // Lobby chat update (member join/leave)
        steam.callback.register(SteamCallback.LobbyChatUpdate, (result) => {
            const memberId = result.user_changed;
            const change = result.member_state_change;

            // 0 = Entered, 1 = Left, 2 = Disconnected, 3 = Kicked, 4 = Banned
            if (change === 0) {
                console.log('Member joined:', memberId.toString());
                broadcastToRenderers('steam-member-joined', { steamId: memberId.toString() });
            } else {
                console.log('Member left:', memberId.toString(), 'reason:', change);
                broadcastToRenderers('steam-member-left', { steamId: memberId.toString() });
            }
            pollLobbyMembers();
        });

        // Game lobby join requested (when player clicks invite)
        steam.callback.register(SteamCallback.GameLobbyJoinRequested, (result) => {
            const lobbyId = result.lobby_steam_id;
            console.log('Game lobby join requested:', lobbyId.toString());
            broadcastToRenderers('steam-lobby-invite', { lobbyId: lobbyId.toString() });
        });

        console.log('Steam callbacks registered successfully');
    } catch (err) {
        console.log('Could not register Steam callbacks:', err.message);
        console.log('Steam multiplayer will use polling mode');
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
    if (!steam || !steamInitialized) {
        return { success: false, error: 'Steam not available' };
    }

    try {
        const { LobbyType } = steam.matchmaking;
        const typeMap = {
            'private': LobbyType.Private,
            'friends_only': LobbyType.FriendsOnly,
            'public': LobbyType.Public,
            'invisible': LobbyType.Invisible
        };

        const type = typeMap[lobbyType] !== undefined ? typeMap[lobbyType] : LobbyType.FriendsOnly;

        debugLog('Creating lobby with type:', lobbyType, '(', type, ') maxMembers:', maxMembers);

        // createLobby returns a Lobby object
        const lobby = await steam.matchmaking.createLobby(type, maxMembers);

        // Store the Lobby object for later use
        currentLobby = lobby;
        currentLobbyId = lobby.id.toString();
        isHost = true;

        debugLog('Lobby created successfully, ID:', currentLobbyId);

        // Store our name in lobby data so others can see it
        const myName = steam.localplayer.getName();
        const mySteamId = steam.localplayer.getSteamId();
        const myIdStr = mySteamId.steamId64.toString();

        currentLobby.setData('player_' + myIdStr, myName);
        currentLobby.setData('game', 'shanktuary-minigames');
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

    if (!steam || !steamInitialized) {
        return { success: false, error: 'Steam not available' };
    }

    try {
        // Convert lobbyId to BigInt if needed
        const lobbyIdBigInt = typeof lobbyId === 'bigint' ? lobbyId : BigInt(lobbyId);
        debugLog('Joining lobby with BigInt:', lobbyIdBigInt.toString());

        // joinLobby returns a Lobby object
        const lobby = await steam.matchmaking.joinLobby(lobbyIdBigInt);

        // Store the Lobby object
        currentLobby = lobby;
        currentLobbyId = lobby.id.toString();
        isHost = false;

        debugLog('Joined lobby successfully, ID:', currentLobbyId);

        // Store our name in lobby data so others can see it
        const myName = steam.localplayer.getName();
        const mySteamId = steam.localplayer.getSteamId();
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
    if (!steam || !currentLobby) {
        return { success: false, error: 'Not in a lobby' };
    }

    try {
        currentLobby.leave();
        currentLobby = null;
        currentLobbyId = null;
        lobbyMembers = [];
        isHost = false;
        lastMemberCount = 0;
        pendingNameRetries = {};

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
    if (!steam || !steamInitialized) {
        return false;
    }

    try {
        const buffer = Buffer.from(JSON.stringify(data));
        // SendType: 0=Unreliable, 1=UnreliableNoDelay, 2=Reliable, 3=ReliableWithBuffering
        const sendType = reliable ? 2 : 0;

        // Convert steamId to BigInt if needed
        const steamIdBigInt = typeof steamId === 'bigint' ? steamId : BigInt(steamId);

        return steam.networking.sendP2PPacket(steamIdBigInt, sendType, buffer);
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

    const mySteamId = steam.localplayer.getSteamId().steamId64;
    let success = true;

    lobbyMembers.forEach(member => {
        const memberSteamId = member.steamId64;
        if (memberSteamId !== mySteamId) {
            if (!sendP2PMessage(memberSteamId, data, reliable)) {
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
    if (!steam || !steamInitialized) return;

    try {
        // Note: steamworks.js init() already sets up runCallbacks at 30fps automatically

        // isP2PPacketAvailable returns the size of the packet, or 0 if none
        let packetSize = steam.networking.isP2PPacketAvailable();

        while (packetSize > 0) {
            const packet = steam.networking.readP2PPacket(packetSize);
            if (packet) {
                try {
                    const data = JSON.parse(packet.data.toString());
                    broadcastToRenderers('steam-p2p-message', {
                        from: packet.steamId.steamId64.toString(),
                        data: data
                    });
                } catch (parseErr) {
                    console.error('Failed to parse P2P packet:', parseErr);
                }
            }
            // Check for more packets
            packetSize = steam.networking.isP2PPacketAvailable();
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

    if (!steam || !currentLobby) {
        debugLog('Not in a lobby - steamworks:', !!steamworks, 'currentLobby:', !!currentLobby);
        return { success: false, error: 'Not in a lobby' };
    }

    try {
        // Use the Lobby object's openInviteDialog method
        debugLog('Calling lobby.openInviteDialog()');
        currentLobby.openInviteDialog();
        return { success: true };
    } catch (err) {
        console.error('Failed to open invite dialog:', err);

        // Fallback: try overlay.activateInviteDialog
        try {
            debugLog('Trying overlay.activateInviteDialog fallback');
            steam.overlay.activateInviteDialog(currentLobby.id);
            return { success: true };
        } catch (overlayErr) {
            console.error('Overlay fallback also failed:', overlayErr);
            return {
                success: false,
                error: err.message,
                lobbyId: currentLobbyId,
                message: 'Share this lobby ID with friends: ' + currentLobbyId
            };
        }
    }
}

/**
 * Get local player info
 */
function getLocalPlayer() {
    if (!steam || !steamInitialized) {
        return null;
    }

    const steamIdObj = steam.localplayer.getSteamId();

    return {
        steamId: steamIdObj.steamId64.toString(),
        name: steam.localplayer.getName(),
        level: steam.localplayer.getLevel()
    };
}

/**
 * Shutdown Steam
 */
function shutdown() {
    if (steam && steamInitialized) {
        try {
            if (currentLobby) {
                leaveLobby();
            }
            // steamworks.js cleanup is automatic
            steamInitialized = false;
            steam = null;
            steamworksModule = null;
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

        return buildMemberList();
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
        if (!steam || !currentLobby) {
            return { success: false, error: 'Not in a lobby' };
        }
        try {
            currentLobby.setData(key, value);
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
        if (currentLobby) {
            const lobbyName = currentLobby.getData('player_' + steamIdStr);
            if (lobbyName && lobbyName !== '') {
                name = lobbyName;
                // Clear retry tracking for this member
                delete pendingNameRetries[steamIdStr];
            }
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
        // member is a PlayerSteamId object with steamId64
        const steamIdStr = member.steamId64.toString();
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
    if (!steam || !currentLobby) return;

    try {
        const members = currentLobby.getMembers();

        // Debug: log raw result every 5 seconds
        if (!pollLobbyMembers.lastLog || Date.now() - pollLobbyMembers.lastLog > 5000) {
            debugLog('pollLobbyMembers - lobbyId:', currentLobbyId, 'memberCount:', members?.length);
            if (members && members.length > 0) {
                const firstMember = members[0];
                debugLog('First member - steamId64:', firstMember?.steamId64?.toString());
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
