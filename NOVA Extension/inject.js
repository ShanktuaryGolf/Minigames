console.log('✅ Shot Metrics: inject.js loaded');

(function() {
  console.log('✅ Shot Metrics: Starting injection in page context');
  
  // Intercept XMLHttpRequest
  const OriginalXHR = XMLHttpRequest;
  const originalOpen = OriginalXHR.prototype.open;
  const originalSend = OriginalXHR.prototype.send;
  
  OriginalXHR.prototype.open = function(method, url, ...args) {
    console.log('🔍 XHR Open:', url);
    this._url = url;
    return originalOpen.apply(this, [method, url, ...args]);
  };
  
  OriginalXHR.prototype.send = function(...args) {
    const xhr = this;
    
    if (this._url && this._url.includes('firestore.googleapis.com')) {
      console.log('🎯 Firestore XHR detected:', this._url);
      
      let lastLength = 0;
      
      const checkResponse = () => {
        if (xhr.readyState >= 3) {
          try {
            const text = xhr.responseText || '';
            if (text.length > lastLength) {
              const newChunk = text.substring(lastLength);
              lastLength = text.length;
              
              console.log('📦 New chunk length:', newChunk.length);
              
              if (newChunk.includes('ball_speed')) {
                console.log('⚡ Shot data found in chunk!');
                window.dispatchEvent(new CustomEvent('shotMetricsData', {
                  detail: newChunk
                }));
              }
            }
          } catch (e) {
            console.error('❌ Error reading XHR:', e);
          }
        }
      };
      
      xhr.addEventListener('readystatechange', checkResponse);
      xhr.addEventListener('progress', checkResponse);
    }
    
    return originalSend.apply(this, args);
  };
  
  // Intercept Fetch
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    console.log('🔍 Fetch:', url);
    
    const response = await originalFetch.apply(this, args);
    
    if (url && url.includes('firestore.googleapis.com')) {
      console.log('🎯 Firestore Fetch detected:', url);
      
      const clonedResponse = response.clone();
      const reader = clonedResponse.body?.getReader();
      
      if (reader) {
        const decoder = new TextDecoder();
        
        (async () => {
          try {
            while (true) {
              const {done, value} = await reader.read();
              if (done) {
                console.log('✅ Stream ended');
                break;
              }
              
              const chunk = decoder.decode(value, {stream: true});
              console.log('📦 Fetch chunk length:', chunk.length);
              
              if (chunk.includes('ball_speed')) {
                console.log('⚡ Shot data found in fetch chunk!');
                window.dispatchEvent(new CustomEvent('shotMetricsData', {
                  detail: chunk
                }));
              }
            }
          } catch (e) {
            console.error('❌ Error reading fetch stream:', e);
          }
        })();
      }
    }
    
    return response;
  };
  
  console.log('✅ Shot Metrics: Interception setup complete');
})();
