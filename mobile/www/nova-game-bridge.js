/**
 * Nova Game Bridge - Mobile
 * Bridges Nova shot data to games for mobile apps
 * Provides same interface as Electron's electronAPI for compatibility
 */

// Create electronAPI shim for mobile
if (!window.electronAPI && window.novaMobile) {
    console.log('🌉 Creating electronAPI bridge for mobile...');

    window.electronAPI = {
        // Shot listener for games (using onShotData to match Electron API)
        onShotData: function(callback) {
            console.log('📡 Game registered for shot data');
            window.novaMobile.onShot(callback);
        },

        // Stimp settings (TODO: implement mobile settings)
        onStimpChanged: function(callback) {
            // Mobile doesn't have Electron menu, could add to settings UI later
            console.log('Stimp change listener registered (not implemented on mobile)');
        },

        // Nova status
        onNovaStatus: function(callback) {
            window.novaMobile.onStatus(callback);
        },

        // GSPro compatibility (not needed for mobile, but keep interface)
        startGSProServer: function() {
            console.log('GSPro server not available on mobile');
        },

        stopGSProServer: function() {
            console.log('GSPro server not available on mobile');
        },

        // Update system (not applicable to mobile)
        checkForUpdates: function() {},
        downloadUpdate: function() {},
        quitAndInstall: function() {}
    };

    console.log('✅ Mobile electronAPI bridge created');
} else if (window.electronAPI) {
    console.log('📱 Running in Electron, using native electronAPI');
} else {
    console.warn('⚠️ No Nova connection available (novaMobile not found)');
}
