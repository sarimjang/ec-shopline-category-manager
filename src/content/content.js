/**
 * Content Script - Bridge between Extension context and Page context
 * Injects the injected.js script to access window.angular
 */

(function() {
  'use strict';

  // Inject the injected script to access AngularJS and page context
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('content/injected.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  // Listen for messages from injected script
  window.addEventListener('message', function(event) {
    // Only accept messages from the page itself
    if (event.source !== window) return;

    if (event.data.type && event.data.type === 'FROM_PAGE') {
      // Forward messages from injected script to background service worker
      chrome.runtime.sendMessage(event.data.payload, function(_response) {
        if (chrome.runtime.lastError) {
          console.error('Extension error:', chrome.runtime.lastError);
        }
      });
    }
  });

  // Listen for messages from background service worker
  chrome.runtime.onMessage.addListener(function(request, _sender, sendResponse) {
    // Forward messages to the page via injected script
    if (request.type === 'TO_PAGE') {
      window.postMessage({
        type: 'FROM_EXTENSION',
        payload: request.payload
      }, '*');
    }
    sendResponse({ received: true });
  });

  console.log('Shopline Category Manager content script loaded');
})();
