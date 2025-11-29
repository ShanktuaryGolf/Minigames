/**
 * Client-side WebSocket connector for Shanktuary Golf
 * This replaces the local websocket connection in your games
 */

class RemoteGameConnector {
    constructor(serverUrl = 'ws://localhost:8765') {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.sessionId = null;
        this.connected = false;
        this.connectorConnected = false;

        // Callbacks
        this.onConnected = null;
        this.onConnectorConnected = null;
        this.onConnectorDisconnected = null;
        this.onShot = null;
        this.onError = null;
    }

    /**
     * Connect to remote server
     */
    async connect(sessionId = null) {
        return new Promise((resolve, reject) => {
            // Build URL with session if provided
            let url = this.serverUrl;
            if (sessionId) {
                url += `?session=${sessionId}`;
                this.sessionId = sessionId;
            }

            this.ws = new WebSocket(url);

            this.ws.onopen = () => {
                console.log('🌐 Connected to server');

                // Identify as browser
                this.ws.send(JSON.stringify({
                    type: 'browser_connect'
                }));
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);

                    // Resolve connection promise when we get session ID
                    if (data.type === 'connected' && !this.connected) {
                        this.connected = true;
                        this.sessionId = data.session_id;
                        resolve(data.session_id);
                    }
                } catch (err) {
                    console.error('Error parsing message:', err);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                if (this.onError) {
                    this.onError(error);
                }
                reject(error);
            };

            this.ws.onclose = () => {
                console.log('❌ Disconnected from server');
                this.connected = false;
                this.connectorConnected = false;
            };

            // Timeout if connection takes too long
            setTimeout(() => {
                if (!this.connected) {
                    reject(new Error('Connection timeout'));
                }
            }, 10000);
        });
    }

    /**
     * Handle incoming message from server
     */
    handleMessage(data) {
        switch (data.type) {
            case 'connected':
                console.log(`✅ Connected! Session ID: ${data.session_id}`);
                if (this.onConnected) {
                    this.onConnected(data.session_id);
                }
                break;

            case 'connector_connected':
                console.log('🎯 Launch monitor connected!');
                this.connectorConnected = true;
                if (this.onConnectorConnected) {
                    this.onConnectorConnected();
                }
                break;

            case 'connector_disconnected':
                console.log('⚠️ Launch monitor disconnected');
                this.connectorConnected = false;
                if (this.onConnectorDisconnected) {
                    this.onConnectorDisconnected();
                }
                break;

            case 'shot':
                console.log('🏌️ Shot received:', data.data);
                if (this.onShot) {
                    this.onShot(data.data);
                }
                break;

            case 'ping':
                // Respond to keepalive
                this.send({ type: 'pong' });
                break;

            default:
                console.log('Unknown message type:', data.type);
        }
    }

    /**
     * Send message to server
     */
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    /**
     * Notify server that a game was selected
     */
    selectGame(gameName) {
        this.send({
            type: 'game_selected',
            game: gameName
        });
    }

    /**
     * Disconnect from server
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.connected = false;
        }
    }

    /**
     * Get the session ID for display to user
     */
    getSessionId() {
        return this.sessionId;
    }

    /**
     * Check if connector is connected
     */
    isConnectorConnected() {
        return this.connectorConnected;
    }
}

// For use in existing games - replace WebSocket connection
window.RemoteGameConnector = RemoteGameConnector;
