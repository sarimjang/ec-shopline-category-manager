/**
 * Content Script Initializer - Runs in ISOLATED world
 * 
 * Responsible for:
 * 1. Injecting the injected.js script into the MAIN world
 * 2. Waiting for AngularJS to be available
 * 3. Setting up communication between content and main world
 * 4. Initializing the main content script
 */

'use strict';

(function() {
  const PREFIX = '[SCM-Init]';

  // ============================================================================
  // 1. INJECT SCRIPT INTO MAIN WORLD
  // ============================================================================

  /**
   * Inject injected.js into the MAIN world so it can access window.angular
   */
  function injectScript() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content/injected.js');
    script.type = 'text/javascript';
    script.onload = function() {
      console.log(PREFIX, 'injected.js loaded successfully');
      this.remove();
    };
    script.onerror = function() {
      console.error(PREFIX, 'Failed to load injected.js');
      this.remove();
    };
    
    const target = document.documentElement;
    target.appendChild(script);
  }

  // ============================================================================
  // 2. WAIT FOR ANGULAR & CATEGORY MANAGER READY
  // ============================================================================

  /**
   * Wait for categoryManagerReady event from injected script
   */
  function waitForCategoryManagerReady() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for categoryManagerReady event'));
      }, 5000);

      window.addEventListener('categoryManagerReady', function(event) {
        clearTimeout(timeout);
        console.log(PREFIX, 'categoryManagerReady event received', event.detail);
        resolve(event.detail);
      });
    });
  }

  /**
   * Wait for AngularJS to be available
   */
  function waitForAngular() {
    return new Promise((resolve, reject) => {
      const maxAttempts = 50; // 5 seconds max (50 * 100ms)
      let attempts = 0;

      const checkInterval = setInterval(() => {
        if (typeof window !== 'undefined' && window.angular) {
          clearInterval(checkInterval);
          console.log(PREFIX, 'AngularJS detected');
          resolve(window.angular);
        } else if (++attempts > maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('Timeout waiting for AngularJS'));
        }
      }, 100);
    });
  }

  // ============================================================================
  // 3. INITIALIZATION FLOW
  // ============================================================================

  /**
   * Initialize the content script
   */
  async function initialize() {
    try {
      console.log(PREFIX, 'Initialization starting');

      // Step 1: Inject the script into main world
      injectScript();
      console.log(PREFIX, 'Injected script injected');

      // Step 2: Wait for AngularJS
      await waitForAngular();
      console.log(PREFIX, 'AngularJS ready');

      // Step 3: Wait for categoryManagerReady event
      await waitForCategoryManagerReady();
      console.log(PREFIX, 'categoryManagerReady event received');

      // Step 4: Content script is now ready to initialize
      console.log(PREFIX, 'All dependencies ready, content script can initialize');
      
      // Dispatch an event to indicate that init.js is done
      window.dispatchEvent(new CustomEvent('scmInitComplete', {
        detail: { timestamp: new Date().toISOString() }
      }));

    } catch (error) {
      console.error(PREFIX, 'Initialization failed:', error);
    }
  }

  // ============================================================================
  // 4. START INITIALIZATION
  // ============================================================================

  // Start initialization immediately when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
