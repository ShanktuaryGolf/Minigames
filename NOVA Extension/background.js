// Store active listeners
const activeListeners = new Map();

// Listen for Firestore streaming requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.url.includes('firestore.googleapis.com') && 
        details.url.includes('/Listen/channel')) {
      
      console.log('Detected Firestore Listen channel request');
      
      // Store the request ID to track this stream
      activeListeners.set(details.requestId, {
        url: details.url,
        startTime: Date.now()
      });
    }
  },
  {urls: ["https://firestore.googleapis.com/*"]},
  []
);

// Note: We can't directly intercept streaming responses in background.js
// The content script will handle the actual data interception
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (activeListeners.has(details.requestId)) {
      console.log('Firestore stream connection completed');
      activeListeners.delete(details.requestId);
    }
  },
  {urls: ["https://firestore.googleapis.com/*"]}
);

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (activeListeners.has(details.requestId)) {
      console.log('Firestore stream connection error:', details.error);
      activeListeners.delete(details.requestId);
    }
  },
  {urls: ["https://firestore.googleapis.com/*"]}
);

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'FIRESTORE_STREAM_DATA') {
    console.log('Received stream data from content script:', message.data);
    // Could add additional processing here if needed
  }
});
