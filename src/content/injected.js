/**
 * Injected Script - Runs in page context with access to AngularJS
 * Communicates with content script which relays to background service worker
 */

(function() {
  'use strict';

  // Access to window.angular (AngularJS) available here
  if (!window.angular) {
    console.error('AngularJS not found on page');
    return;
  }

  // Initialize angular scope access
  new Promise((resolve) => {
    // Wait for Angular to be ready
    setTimeout(() => {
      console.log('Shopline Category Manager injected script initialized');
      resolve();
    }, 1000);
  });

  // Message listener for commands from extension
  window.addEventListener('message', function(event) {
    if (event.source !== window) return;

    if (event.data.type && event.data.type === 'FROM_EXTENSION') {
      // Handle commands from the extension
      handleExtensionCommand(event.data.payload);
    }
  });

  /**
   * Handle commands from the extension
   */
  function handleExtensionCommand(payload) {
    console.log('Extension command received:', payload);

    // Commands will be implemented in Phase 01-02
    // For now, this is a placeholder
    switch (payload.action) {
      case 'ping':
        sendMessageToExtension({
          status: 'pong',
          timestamp: new Date().toISOString()
        });
        break;
      default:
        console.warn('Unknown action:', payload.action);
    }
  }

  /**
   * Send message back to extension via content script
   */
  function sendMessageToExtension(payload) {
    window.postMessage({
      type: 'FROM_PAGE',
      payload: payload
    }, '*');
  }

  console.log('Shopline Category Manager injected script ready');
})();
