/**
 * Nova Launch Monitor - Mobile Integration
 * Implements OpenLaunch WebSocket API with mDNS discovery
 * Based on Nova Developer Guide specs
 */

class NovaMobile {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.discovering = false;
        this.novaHost = null;
        this.novaPort = null;
        this.shotCallbacks = [];
        this.statusCallbacks = [];
        this.zeroconf = null;
    }

    /**
     * Auto-discover Nova using mDNS (Zeroconf)
     * Service: _openlaunch-ws._tcp.local.
     */
    async discoverAndConnect() {
        console.log('🔍 Starting Nova discovery via mDNS...');
        this.notifyStatus('discovering', 'Searching for Nova via mDNS...');

        try {
            // Access Zeroconf plugin
            const { ZeroConf } = window.Capacitor.Plugins;

            if (!ZeroConf) {
                console.error('❌ ZeroConf plugin not found');
                console.log('Available plugins:', window.Capacitor ? Object.keys(window.Capacitor.Plugins || {}) : 'Capacitor not available');
                this.notifyStatus('discovery-unavailable', 'mDNS plugin not loaded');
                return false;
            }

            this.discovering = true;
            this.zeroconf = ZeroConf;

            // Register listener for discovered services
            await this.zeroconf.addListener('discover', (result) => {
                console.log('📡 mDNS event:', result.action, result.service);

                if (result.action === 'resolved' && result.service) {
                    const service = result.service;
                    console.log('✅ Nova found via mDNS:', service);

                    // Get IP address (prefer IPv4)
                    const ipAddress = service.ipv4Addresses && service.ipv4Addresses.length > 0
                        ? service.ipv4Addresses[0]
                        : service.ipv6Addresses && service.ipv6Addresses.length > 0
                            ? service.ipv6Addresses[0]
                            : service.hostname;

                    this.novaHost = ipAddress;
                    this.novaPort = service.port || 2920;

                    console.log(`📡 Nova WebSocket at ${this.novaHost}:${this.novaPort}`);

                    // Stop discovery
                    this.stopDiscovery();

                    // Connect
                    this.connect(this.novaHost, this.novaPort);
                }
            });

            // Start browsing for OpenLaunch WebSocket service
            // Service type: _openlaunch-ws._tcp
            await this.zeroconf.watch({
                type: '_openlaunch-ws._tcp',
                domain: 'local.'
            });

            console.log('📡 mDNS discovery started for _openlaunch-ws._tcp.local.');

            // Timeout after 10 seconds
            setTimeout(() => {
                if (this.discovering) {
                    console.log('⏱️ mDNS discovery timeout');
                    this.stopDiscovery();
                    this.notifyStatus('not-found', 'Nova not found via mDNS');
                }
            }, 10000);

            return true;

        } catch (err) {
            console.error('❌ mDNS discovery error:', err);
            this.notifyStatus('error', `Discovery failed: ${err.message}`);
            this.discovering = false;
            return false;
        }
    }

    /**
     * Stop mDNS discovery
     */
    async stopDiscovery() {
        if (this.zeroconf && this.discovering) {
            try {
                await this.zeroconf.unwatch({
                    type: '_openlaunch-ws._tcp',
                    domain: 'local.'
                });
                await this.zeroconf.close();
                console.log('🛑 mDNS discovery stopped');
            } catch (err) {
                console.error('Error stopping discovery:', err);
            }
        }
        this.discovering = false;
    }

    /**
     * Connect to Nova using IP address and port
     * @param {string} host - Nova IP address
     * @param {number} port - Nova WebSocket port (default: 2920)
     */
    connect(host, port = 2920) {
        this.novaHost = host;
        this.novaPort = port;

        console.log(`🔌 Connecting to Nova WebSocket at ${host}:${port}...`);
        this.notifyStatus('connecting', `Connecting to ${host}:${port}...`);

        try {
            // Connect via WebSocket
            // Per Nova Developer Guide: ws://host:port
            this.ws = new WebSocket(`ws://${host}:${port}`);

            this.ws.onopen = () => {
                console.log('✅ Connected to Nova WebSocket!');
                this.connected = true;
                this.notifyStatus('connected', `Connected to Nova at ${host}:${port}`);

                // Save last successful connection
                localStorage.setItem('nova_last_host', host);
                localStorage.setItem('nova_last_port', port.toString());
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const msgType = data.type;

                    if (msgType === 'shot') {
                        console.log('⛳ Shot detected:', data);
                        this.handleShotData(data);
                    } else if (msgType === 'status') {
                        console.log('📊 Status update:', data);
                        // Could handle status updates if needed
                    } else {
                        console.log('📡 Nova message:', msgType, data);
                    }
                } catch (err) {
                    console.error('Error parsing Nova message:', err);
                }
            };

            this.ws.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                this.notifyStatus('error', 'Connection error');
            };

            this.ws.onclose = () => {
                console.log('🔌 Disconnected from Nova');
                this.connected = false;
                this.notifyStatus('disconnected', 'Disconnected from Nova');
            };

        } catch (err) {
            console.error('Failed to connect to Nova:', err);
            this.notifyStatus('error', `Connection failed: ${err.message}`);
        }
    }

    /**
     * Disconnect from Nova
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.notifyStatus('disconnected', 'Manually disconnected');
    }

    /**
     * Handle shot data from Nova
     * Converts OpenLaunch WebSocket format to desktop app format
     */
    handleShotData(data) {
        // OpenLaunch WebSocket API format (from developer guide):
        // {
        //   "type": "shot",
        //   "shot_number": 123,
        //   "ball_speed_meters_per_second": 45.6,
        //   "vertical_launch_angle_degrees": 12.3,
        //   "horizontal_launch_angle_degrees": -2.1,
        //   "total_spin_rpm": 2500,
        //   "spin_axis_degrees": 15.0
        // }

        // Convert to format expected by games (matches Electron IPC format)
        const shotData = {
            BallSpeed: data.ball_speed_meters_per_second * 2.23694, // Convert m/s to mph
            LaunchAngle: data.vertical_launch_angle_degrees,
            LaunchDirection: data.horizontal_launch_angle_degrees,
            TotalSpin: data.total_spin_rpm,
            SpinAxis: data.spin_axis_degrees,
            ClubSpeed: 0, // Not provided in basic WebSocket API
            Smash: 0 // Calculate if club speed available
        };

        console.log('📤 Forwarding shot to games:', shotData);

        // Notify all registered callbacks
        this.shotCallbacks.forEach(callback => {
            try {
                callback(shotData);
            } catch (err) {
                console.error('Error in shot callback:', err);
            }
        });
    }

    /**
     * Register callback for shot data
     */
    onShot(callback) {
        this.shotCallbacks.push(callback);
    }

    /**
     * Register callback for status updates
     */
    onStatus(callback) {
        this.statusCallbacks.push(callback);
    }

    /**
     * Notify all status callbacks
     */
    notifyStatus(status, message) {
        this.statusCallbacks.forEach(callback => {
            try {
                callback({ status, message });
            } catch (err) {
                console.error('Error in status callback:', err);
            }
        });
    }

    /**
     * Get last successful connection info
     */
    getLastConnection() {
        const host = localStorage.getItem('nova_last_host');
        const port = localStorage.getItem('nova_last_port');
        return host && port ? { host, port: parseInt(port) } : null;
    }

    /**
     * Auto-connect using last successful connection OR mDNS discovery
     */
    async autoConnect() {
        const autoConnectMethod = localStorage.getItem('nova_auto_connect_method') || 'mdns';

        if (autoConnectMethod === 'mdns') {
            console.log('🔄 Auto-connecting via mDNS discovery...');
            return await this.discoverAndConnect();
        } else {
            const lastConnection = this.getLastConnection();
            if (lastConnection) {
                console.log('🔄 Auto-connecting to last Nova:', lastConnection);
                this.connect(lastConnection.host, lastConnection.port);
                return true;
            }
        }
        return false;
    }
}

// Create global instance
window.novaMobile = new NovaMobile();

// Auto-connect on page load if enabled
document.addEventListener('DOMContentLoaded', () => {
    const autoConnect = localStorage.getItem('nova_auto_connect');
    if (autoConnect === 'true') {
        setTimeout(() => {
            window.novaMobile.autoConnect();
        }, 1000);
    }
});
