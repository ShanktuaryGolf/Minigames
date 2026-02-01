/**
 * Steam Network Adapter - Renderer-side abstraction for Steam multiplayer
 *
 * This module provides a simple interface for ALL games in the Shanktuary suite
 * to interact with Steam lobbies and P2P networking.
 *
 * Supported Games:
 * - Golf (Par 3, Putting)
 * - Home Run Derby
 * - Bowling
 * - Darts
 * - Soccer Penalty
 * - Beer Pong
 *
 * Usage:
 *   const network = new SteamNetworkAdapter();
 *   await network.initialize();
 *
 *   // Host creates lobby
 *   await network.createLobby('Bowling', 4);
 *
 *   // Send game action to all peers
 *   network.broadcast({ type: 'turn_result', data: { pins: 7, player: 1 } });
 *
 *   // Handle incoming messages
 *   network.onMessage((msg) => handleNetworkMessage(msg));
 */

class SteamNetworkAdapter {
    constructor() {
        this.available = false;
        this.connected = false;
        this.isHost = false;
        this.lobbyId = null;
        this.members = [];
        this.localPlayer = null;
        this.gameType = null;
        this.messageHandlers = [];
        this.eventHandlers = {
            'lobby-created': [],
            'lobby-joined': [],
            'member-joined': [],
            'member-left': [],
            'members-updated': [],
            'disconnected': [],
            'game-start': [],
            'error': []
        };

        // Universal message types for all games
        this.MESSAGE_TYPES = {
            // Connection & Lobby
            PLAYER_JOIN: 'player_join',
            PLAYER_LEAVE: 'player_leave',
            PLAYER_READY: 'player_ready',
            GAME_START: 'game_start',
            GAME_END: 'game_end',

            // Turn-based
            TURN_START: 'turn_start',
            TURN_RESULT: 'turn_result',
            TURN_END: 'turn_end',

            // Shot/Action data (works for all games)
            SHOT_DATA: 'shot',              // Ball speed, angles, spin
            ACTION_RESULT: 'action_result', // What happened (score, pins, etc.)

            // Game state sync
            GAME_STATE: 'game_state',       // Full game state (host -> clients)
            PLAYER_STATE: 'player_state',   // Individual player update
            SCORE_UPDATE: 'score_update',   // Score change

            // Golf-specific
            BALL_POSITION: 'ball_position',
            DRAFT_PICK: 'draft_pick',
            HOLE_COMPLETE: 'hole_complete',

            // Bowling-specific
            PINS_STATE: 'pins_state',
            FRAME_COMPLETE: 'frame_complete',

            // Darts-specific
            DART_THROW: 'dart_throw',
            DART_LANDED: 'dart_landed',

            // Baseball-specific
            SWING_RESULT: 'swing_result',
            HOME_RUN: 'home_run',

            // Soccer-specific
            KICK_RESULT: 'kick_result',
            SAVE_RESULT: 'save_result',

            // Beer Pong-specific
            CUP_HIT: 'cup_hit',
            BALL_RESULT: 'ball_result',

            // Chat & misc
            CHAT: 'chat',
            PING: 'ping',
            PONG: 'pong'
        };

        // Game type identifiers
        this.GAME_TYPES = {
            GOLF: 'golf',
            PUTTING: 'putting',
            BOWLING: 'bowling',
            DARTS: 'darts',
            BASEBALL: 'baseball',
            SOCCER: 'soccer',
            BEER_PONG: 'beer_pong'
        };
    }

    /**
     * Initialize the adapter
     * @returns {Promise<boolean>} True if Steam is available
     */
    async initialize() {
        if (!window.steamAPI) {
            console.log('Steam API not available in this context');
            this.available = false;
            return false;
        }

        try {
            this.available = await window.steamAPI.isAvailable();

            if (this.available) {
                this.localPlayer = await window.steamAPI.getPlayer();
                console.log('Steam available, local player:', this.localPlayer);
                this._setupEventListeners();
            } else {
                console.log('Steam not initialized (offline mode)');
            }

            return this.available;
        } catch (err) {
            console.error('Failed to initialize Steam adapter:', err);
            this.available = false;
            return false;
        }
    }

    /**
     * Set up Steam event listeners
     */
    _setupEventListeners() {
        window.steamAPI.onLobbyCreated((data) => {
            this.lobbyId = data.lobbyId;
            this.isHost = data.isHost;
            this.connected = true;
            this._emit('lobby-created', data);
        });

        window.steamAPI.onLobbyJoined((data) => {
            this.lobbyId = data.lobbyId;
            this.isHost = data.isHost;
            this.connected = true;
            this._emit('lobby-joined', data);
        });

        window.steamAPI.onMemberJoined((data) => {
            this._refreshMembers();
            this._emit('member-joined', data);
        });

        window.steamAPI.onMemberLeft((data) => {
            this._refreshMembers();
            this._emit('member-left', data);
        });

        window.steamAPI.onLobbyMembers((data) => {
            this.members = data.members || [];
            this._emit('members-updated', { members: this.members });
        });

        window.steamAPI.onP2PMessage((message) => {
            this._handleMessage(message);
        });
    }

    /**
     * Refresh lobby member list
     */
    async _refreshMembers() {
        if (this.connected) {
            this.members = await window.steamAPI.getLobbyMembers();
            this._emit('members-updated', { members: this.members });
        }
    }

    /**
     * Handle incoming P2P message
     */
    _handleMessage(message) {
        const { from, data } = message;

        // Find sender info
        const sender = this.members.find(m => m.steamId === from);
        const senderName = sender ? sender.name : 'Unknown';

        // Enrich message with sender info
        const enrichedMessage = {
            from: from,
            senderName: senderName,
            timestamp: Date.now(),
            ...data
        };

        // Call all registered message handlers
        this.messageHandlers.forEach(handler => {
            try {
                handler(enrichedMessage);
            } catch (err) {
                console.error('Message handler error:', err);
            }
        });
    }

    /**
     * Emit event to registered handlers
     */
    _emit(event, data) {
        const handlers = this.eventHandlers[event] || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (err) {
                console.error(`Event handler error (${event}):`, err);
            }
        });
    }

    /**
     * Register event handler
     */
    on(event, handler) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(handler);
        } else {
            console.warn(`Unknown event: ${event}`);
        }
        return this; // Allow chaining
    }

    /**
     * Remove event handler
     */
    off(event, handler) {
        if (this.eventHandlers[event]) {
            const idx = this.eventHandlers[event].indexOf(handler);
            if (idx > -1) {
                this.eventHandlers[event].splice(idx, 1);
            }
        }
        return this;
    }

    /**
     * Register message handler
     */
    onMessage(handler) {
        this.messageHandlers.push(handler);
        return this;
    }

    /**
     * Create a new lobby for any game
     * @param {string} gameType Game type from GAME_TYPES
     * @param {number} maxMembers Maximum players
     * @param {string} lobbyType 'private', 'friends_only', or 'public'
     */
    async createLobby(gameType, maxMembers = 4, lobbyType = 'friends_only') {
        if (!this.available) {
            return { success: false, error: 'Steam not available' };
        }

        try {
            const result = await window.steamAPI.createLobby(lobbyType, maxMembers);

            if (result.success) {
                this.lobbyId = result.lobbyId;
                this.isHost = true;
                this.connected = true;
                this.gameType = gameType;

                // Set lobby metadata
                await window.steamAPI.setLobbyData('game', 'shanktuary-minigames');
                await window.steamAPI.setLobbyData('gameType', gameType);
                await window.steamAPI.setLobbyData('maxPlayers', String(maxMembers));
                await this._refreshMembers();
            }

            return result;
        } catch (err) {
            console.error('Failed to create lobby:', err);
            this._emit('error', { action: 'createLobby', error: err.message });
            return { success: false, error: err.message };
        }
    }

    /**
     * Join an existing lobby
     */
    async joinLobby(lobbyId) {
        if (!this.available) {
            return { success: false, error: 'Steam not available' };
        }

        try {
            const result = await window.steamAPI.joinLobby(lobbyId);

            if (result.success) {
                this.lobbyId = lobbyId;
                this.isHost = false;
                this.connected = true;
                await this._refreshMembers();
            }

            return result;
        } catch (err) {
            console.error('Failed to join lobby:', err);
            this._emit('error', { action: 'joinLobby', error: err.message });
            return { success: false, error: err.message };
        }
    }

    /**
     * Leave current lobby
     */
    async leaveLobby() {
        if (!this.connected) return { success: true };

        try {
            await window.steamAPI.leaveLobby();
        } catch (err) {
            console.error('Failed to leave lobby:', err);
        }

        this.lobbyId = null;
        this.isHost = false;
        this.connected = false;
        this.members = [];
        this.gameType = null;
        this._emit('disconnected', {});

        return { success: true };
    }

    /**
     * Open Steam friend invite dialog
     */
    async inviteFriend() {
        if (!this.connected) {
            return { success: false, error: 'Not in a lobby' };
        }
        return await window.steamAPI.inviteFriend();
    }

    /**
     * Send message to a specific peer
     */
    async send(steamId, data) {
        if (!this.connected) return false;
        return await window.steamAPI.sendP2P(steamId, data);
    }

    /**
     * Broadcast message to all peers in lobby
     * @param {object} data Message data (should include 'type' field)
     * @param {boolean} reliable Use reliable delivery (default true)
     */
    async broadcast(data, reliable = true) {
        if (!this.connected) return false;

        // Add timestamp if not present
        if (!data.timestamp) {
            data.timestamp = Date.now();
        }

        return await window.steamAPI.broadcastP2P(data, reliable);
    }

    // ==================== UNIVERSAL GAME METHODS ====================

    /**
     * Send shot/action data (works for all games)
     * @param {object} shotData Speed, angles, spin, etc.
     */
    async sendShot(shotData) {
        return await this.broadcast({
            type: this.MESSAGE_TYPES.SHOT_DATA,
            gameType: this.gameType,
            data: shotData
        });
    }

    /**
     * Send turn result (what happened after a shot/action)
     * @param {object} result Game-specific result data
     */
    async sendTurnResult(result) {
        return await this.broadcast({
            type: this.MESSAGE_TYPES.TURN_RESULT,
            gameType: this.gameType,
            data: result
        });
    }

    /**
     * Send score update
     * @param {string} playerId Player identifier
     * @param {number|object} score New score or score delta
     */
    async sendScoreUpdate(playerId, score) {
        return await this.broadcast({
            type: this.MESSAGE_TYPES.SCORE_UPDATE,
            playerId: playerId,
            score: score
        });
    }

    /**
     * Send full game state (host only)
     * @param {object} gameState Complete game state
     */
    async sendGameState(gameState) {
        if (!this.isHost) {
            console.warn('Only host can send game state');
            return false;
        }
        return await this.broadcast({
            type: this.MESSAGE_TYPES.GAME_STATE,
            data: gameState
        });
    }

    /**
     * Send player state update
     * @param {object} playerState Player's current state
     */
    async sendPlayerState(playerState) {
        return await this.broadcast({
            type: this.MESSAGE_TYPES.PLAYER_STATE,
            playerId: this.localPlayer?.steamId,
            data: playerState
        });
    }

    /**
     * Send ready status
     */
    async sendReady(ready = true) {
        return await this.broadcast({
            type: this.MESSAGE_TYPES.PLAYER_READY,
            playerId: this.localPlayer?.steamId,
            ready: ready
        });
    }

    /**
     * Signal game start (host only)
     * @param {object} gameConfig Initial game configuration
     */
    async startGame(gameConfig = {}) {
        if (!this.isHost) {
            console.warn('Only host can start game');
            return false;
        }
        return await this.broadcast({
            type: this.MESSAGE_TYPES.GAME_START,
            gameType: this.gameType,
            config: gameConfig,
            players: this.members.map(m => ({
                steamId: m.steamId,
                name: m.name
            }))
        });
    }

    /**
     * Signal game end (host only)
     * @param {object} finalResults Final scores/results
     */
    async endGame(finalResults = {}) {
        if (!this.isHost) {
            console.warn('Only host can end game');
            return false;
        }
        return await this.broadcast({
            type: this.MESSAGE_TYPES.GAME_END,
            results: finalResults
        });
    }

    // ==================== GAME-SPECIFIC HELPERS ====================

    // Golf
    async sendBallPosition(position, lie) {
        return await this.broadcast({
            type: this.MESSAGE_TYPES.BALL_POSITION,
            position: position,
            lie: lie
        });
    }

    async sendDraftPick(ballIndex) {
        return await this.broadcast({
            type: this.MESSAGE_TYPES.DRAFT_PICK,
            ballIndex: ballIndex,
            playerId: this.localPlayer?.steamId
        });
    }

    // Bowling
    async sendPinsState(pins, frame, roll) {
        return await this.broadcast({
            type: this.MESSAGE_TYPES.PINS_STATE,
            pins: pins,
            frame: frame,
            roll: roll
        });
    }

    // Darts
    async sendDartLanded(position, score, multiplier) {
        return await this.broadcast({
            type: this.MESSAGE_TYPES.DART_LANDED,
            position: position,
            score: score,
            multiplier: multiplier
        });
    }

    // Baseball
    async sendSwingResult(result, distance, angle) {
        return await this.broadcast({
            type: this.MESSAGE_TYPES.SWING_RESULT,
            result: result, // 'strike', 'foul', 'hit', 'home_run'
            distance: distance,
            angle: angle
        });
    }

    // Soccer
    async sendKickResult(goal, position) {
        return await this.broadcast({
            type: this.MESSAGE_TYPES.KICK_RESULT,
            goal: goal,
            position: position
        });
    }

    // Beer Pong
    async sendBallResult(cupHit, cupIndex) {
        return await this.broadcast({
            type: this.MESSAGE_TYPES.BALL_RESULT,
            cupHit: cupHit,
            cupIndex: cupIndex
        });
    }

    // ==================== UTILITY METHODS ====================

    getMemberCount() {
        return this.members.length;
    }

    getMembers() {
        return [...this.members];
    }

    isLobbyHost() {
        return this.isHost;
    }

    isConnected() {
        return this.connected;
    }

    isSteamAvailable() {
        return this.available;
    }

    getLocalPlayer() {
        return this.localPlayer;
    }

    getGameType() {
        return this.gameType;
    }

    getLobbyId() {
        return this.lobbyId;
    }
}

// Global instance for easy access
let _steamNetworkInstance = null;

/**
 * Get or create the global network adapter instance
 */
function getSteamNetwork() {
    if (!_steamNetworkInstance) {
        _steamNetworkInstance = new SteamNetworkAdapter();
    }
    return _steamNetworkInstance;
}

// Export for use in game files
if (typeof window !== 'undefined') {
    window.SteamNetworkAdapter = SteamNetworkAdapter;
    window.getSteamNetwork = getSteamNetwork;
}

// Also export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SteamNetworkAdapter, getSteamNetwork };
}
