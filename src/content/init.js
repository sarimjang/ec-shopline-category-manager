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
  // 1. NONCE GENERATION
  // ============================================================================

  /**
   * 生成密碼安全的 nonce
   * 使用 crypto.getRandomValues 確保高熵隨機數
   * 格式：16 字節的十六進制字符串（32 個字符）
   */
  function generateNonce() {
    const nonceBytes = new Uint8Array(16);
    crypto.getRandomValues(nonceBytes);

    // 轉換為十六進制字符串
    const nonce = Array.from(nonceBytes)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');

    console.log(PREFIX, 'Nonce generated:', nonce);
    return nonce;
  }

  /**
   * 初始化全局 nonce
   * 在頁面加載時生成唯一的 nonce，存儲在 window 物件中
   */
  function initializeNonce() {
    // 檢查是否已經存在 nonce（防止重複生成）
    if (window._scm_nonce) {
      console.log(PREFIX, 'Nonce already exists, reusing:', window._scm_nonce);
      return window._scm_nonce;
    }

    const nonce = generateNonce();
    window._scm_nonce = nonce;

    console.log(PREFIX, 'Global nonce initialized:', nonce);
    return nonce;
  }

  // ============================================================================
  // 2. INJECT SCRIPT INTO MAIN WORLD
  // ============================================================================

  /**
   * Inject injected.js into the MAIN world so it can access window.angular
   * @param {string} nonce - 安全令牌，注入到 script 標籤
   */
  function injectScript(nonce) {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('content/injected.js');
    script.type = 'text/javascript';
    // 在注入之前將 nonce 寫入 script 元素的 dataset
    script.dataset.nonce = nonce;
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
  // 3. NONCE VALIDATION
  // ============================================================================

  /**
   * 驗證事件中的 nonce 是否與預期的 nonce 匹配
   * 使用常時間比較防止時序攻擊
   */
  function validateNonce(receivedNonce, expectedNonce) {
    if (!receivedNonce || typeof receivedNonce !== 'string') {
      console.warn(PREFIX, 'Invalid nonce format received');
      return false;
    }
    if (receivedNonce.length !== expectedNonce.length) {
      console.warn(PREFIX, 'Nonce length mismatch');
      return false;
    }
    // 常時間比較：防止時序攻擊
    let result = 0;
    for (let i = 0; i < receivedNonce.length; i++) {
      result |= (receivedNonce.charCodeAt(i) ^ expectedNonce.charCodeAt(i));
    }
    return result === 0;
  }

  // ============================================================================
  // 4. WAIT FOR ANGULAR & CATEGORY MANAGER READY
  // ============================================================================

  /**
   * Wait for categoryManagerReady event from injected script with nonce validation
   * @param {string} expectedNonce - 預期的 nonce 值
   */
  function waitForCategoryManagerReady(expectedNonce) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // 清理事件監聽器
        window.removeEventListener('categoryManagerReady', eventHandler);
        reject(new Error('Timeout waiting for categoryManagerReady event'));
      }, 5000);

      // 建立事件處理器函數以便後續清理
      const eventHandler = function(event) {
        // 驗證事件的 nonce
        if (!event.detail || !validateNonce(event.detail.nonce, expectedNonce)) {
          console.warn(PREFIX, 'Invalid or missing nonce in categoryManagerReady event, rejecting');
          return;
        }

        clearTimeout(timeout);
        console.log(PREFIX, 'categoryManagerReady event received with valid nonce', event.detail);
        // 清理事件監聽器
        window.removeEventListener('categoryManagerReady', eventHandler);
        resolve(event.detail);
      };

      window.addEventListener('categoryManagerReady', eventHandler);
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
  // 4. INITIALIZATION FLOW
  // ============================================================================

  /**
   * Initialize the content script
   */
  async function initialize() {
    try {
      console.log(PREFIX, 'Initialization starting');

      // Step 0: Generate nonce for this page load
      const nonce = initializeNonce();
      console.log(PREFIX, 'Nonce initialized:', nonce);

      // Step 1: Inject the script into main world with nonce
      injectScript(nonce);
      console.log(PREFIX, 'Injected script with nonce');

      // Step 2: Wait for AngularJS
      await waitForAngular();
      console.log(PREFIX, 'AngularJS ready');

      // Step 3: Wait for categoryManagerReady event with nonce validation
      const detail = await waitForCategoryManagerReady(nonce);
      console.log(PREFIX, 'categoryManagerReady event received with valid nonce');

      // Step 4: Content script is now ready to initialize
      console.log(PREFIX, 'All dependencies ready, content script can initialize');

      // Dispatch an event to indicate that init.js is done
      // Include nonce in the event detail for security-aware consumers
      window.dispatchEvent(new CustomEvent('scmInitComplete', {
        detail: {
          timestamp: new Date().toISOString(),
          nonce: nonce
        }
      }));

    } catch (error) {
      console.error(PREFIX, 'Initialization failed:', error);
    }
  }

  // ============================================================================
  // 5. START INITIALIZATION
  // ============================================================================

  // Start initialization immediately when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
