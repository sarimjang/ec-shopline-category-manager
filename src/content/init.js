/**
 * Content Script Initializer - Runs in ISOLATED world
 *
 * Responsible for:
 * 1. Injecting the injected.js script into the MAIN world
 * 2. Waiting for AngularJS to be available
 * 3. Setting up communication between content and main world
 * 4. Initializing the main content script
 * 5. Managing event listener lifecycle with proper cleanup (Phase 1.4)
 */

'use strict';

(function() {
  const PREFIX = '[SCM-Init]';

  // ============================================================================
  // EVENT LISTENER MANAGEMENT - Phase 1.4
  // ============================================================================

  /**
   * 統一管理事件監聽器，確保頁面卸載時正確清理
   * 防止記憶體洩漏和重複監聽器
   *
   * 使用 AbortController 模式：
   * - 為每個監聽器分組創建一個 AbortController
   * - 當分組清理時，所有該分組的監聽器同時被移除
   * - 當頁面卸載時，所有監聽器都被清理
   */
  class EventListenerManager {
    constructor() {
      this.listeners = []; // 追蹤所有註冊的監聽器
      this.abortControllers = {}; // 按名稱組織的 AbortController
      this.isDestroyed = false;
    }

    /**
     * 註冊一個事件監聽器
     * @param {string} groupName - 監聽器分組名稱（用於管理）
     * @param {EventTarget} target - 事件目標（window、document、element）
     * @param {string} eventType - 事件類型（如 'click', 'load'）
     * @param {Function} handler - 事件處理函數
     * @param {Object} options - addEventListener 選項
     */
    addEventListener(groupName, target, eventType, handler, options = {}) {
      if (this.isDestroyed) {
        console.warn(PREFIX, 'EventListenerManager has been destroyed, cannot add new listeners');
        return;
      }

      // 為該分組創建 AbortController（如果還沒有）
      if (!this.abortControllers[groupName]) {
        this.abortControllers[groupName] = new AbortController();
      }

      // 將 signal 添加到選項中
      const mergedOptions = {
        ...options,
        signal: this.abortControllers[groupName].signal
      };

      // 註冊監聽器
      target.addEventListener(eventType, handler, mergedOptions);

      // 記錄監聽器詳情
      this.listeners.push({
        groupName,
        target,
        eventType,
        handler,
        timestamp: new Date().toISOString()
      });

      console.log(PREFIX, `Registered listener: ${groupName}/${eventType}`, {
        targetType: target === window ? 'window' : (target === document ? 'document' : 'element'),
        totalListeners: this.listeners.length
      });
    }

    /**
     * 清理特定分組的所有監聽器
     * @param {string} groupName - 分組名稱
     */
    removeListenersFor(groupName) {
      if (!this.abortControllers[groupName]) {
        return;
      }

      this.abortControllers[groupName].abort();

      const removed = this.listeners.filter(l => l.groupName === groupName).length;
      this.listeners = this.listeners.filter(l => l.groupName !== groupName);

      console.log(PREFIX, `Cleaned up ${removed} listeners in group: ${groupName}`, {
        remainingListeners: this.listeners.length
      });
    }

    /**
     * 清理所有監聽器（頁面卸載時調用）
     */
    destroy() {
      if (this.isDestroyed) {
        return;
      }

      // 觸發所有 AbortController
      Object.values(this.abortControllers).forEach(controller => {
        try {
          controller.abort();
        } catch (e) {
          console.warn(PREFIX, 'Error aborting controller:', e);
        }
      });

      console.log(PREFIX, `Destroyed EventListenerManager: ${this.listeners.length} listeners cleaned up`);

      // 清空追蹤列表
      this.listeners = [];
      this.abortControllers = {};
      this.isDestroyed = true;
    }

    /**
     * 獲取統計信息（用於調試）
     */
    getStats() {
      const groupStats = {};
      this.listeners.forEach(listener => {
        if (!groupStats[listener.groupName]) {
          groupStats[listener.groupName] = 0;
        }
        groupStats[listener.groupName]++;
      });

      return {
        totalListeners: this.listeners.length,
        groups: Object.keys(this.abortControllers),
        stats: groupStats,
        isDestroyed: this.isDestroyed
      };
    }
  }

  // 全局事件監聽器管理器
  const eventManager = new EventListenerManager();

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
  // 3B. STORAGE MESSAGE HANDLER - Phase 2.1
  // ============================================================================

  /**
   * 存儲消息協議定義 (Phase 2.1)
   * 
   * Request 格式:
   * {
   *   source: 'scm-storage',
   *   action: 'get'|'set'|'remove'|'clear',
   *   key: string (for get/remove) | undefined (for clear),
   *   value: any (for set),
   *   requestId: string (for tracking)
   * }
   * 
   * Response 格式:
   * {
   *   source: 'scm-storage',
   *   requestId: string,
   *   success: boolean,
   *   data: any | undefined,
   *   error: string | undefined
   * }
   */

  /**
   * 從 chrome.storage.local 獲取值 (Phase 2.1)
   * @param {string|array} keys - 鍵或鍵陣列
   * @returns {Promise<object>}
   */
  function getFromStorage(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, function(result) {
        if (chrome.runtime.lastError) {
          console.error(PREFIX, 'Storage.get error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log(PREFIX, 'Storage.get successful:', keys);
          resolve(result);
        }
      });
    });
  }

  /**
   * 向 chrome.storage.local 設置值 (Phase 2.1)
   * @param {object} items - 鍵值對
   * @returns {Promise<void>}
   */
  function setInStorage(items) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(items, function() {
        if (chrome.runtime.lastError) {
          console.error(PREFIX, 'Storage.set error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log(PREFIX, 'Storage.set successful:', Object.keys(items));
          resolve();
        }
      });
    });
  }

  /**
   * 從 chrome.storage.local 移除值 (Phase 2.1)
   * @param {string|array} keys - 鍵或鍵陣列
   * @returns {Promise<void>}
   */
  function removeFromStorage(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, function() {
        if (chrome.runtime.lastError) {
          console.error(PREFIX, 'Storage.remove error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log(PREFIX, 'Storage.remove successful:', keys);
          resolve();
        }
      });
    });
  }

  /**
   * 清除所有 chrome.storage.local 數據 (Phase 2.1)
   * @returns {Promise<void>}
   */
  function clearStorage() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(function() {
        if (chrome.runtime.lastError) {
          console.error(PREFIX, 'Storage.clear error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          console.log(PREFIX, 'Storage.clear successful');
          resolve();
        }
      });
    });
  }

  /**
   * 處理存儲相關的消息請求 (Phase 2.1)
   * 驗證消息源，執行操作，返回結果
   * @param {object} request - 消息內容
   * @param {object} sender - 發送者信息
   * @param {function} sendResponse - 回應函數
   * @returns {boolean} 返回 true 以支援異步回應
   */
  async function handleStorageMessage(request, sender, sendResponse) {
    // 驗證消息源
    if (request.source !== 'scm-storage') {
      console.warn(PREFIX, 'Invalid message source:', request.source);
      return false;
    }

    const { action, key, value, requestId } = request;
    console.log(PREFIX, `Processing storage ${action} request (${requestId})`, {
      sender: sender.id ? `extension:${sender.id}` : 'content',
      key: key ? String(key).substring(0, 50) : 'undefined'
    });

    try {
      let data;

      switch (action) {
        case 'get':
          if (!key) {
            throw new Error('Key is required for get operation');
          }
          data = await getFromStorage(key);
          sendResponse({
            source: 'scm-storage',
            requestId,
            success: true,
            data
          });
          console.log(PREFIX, `Storage get completed (${requestId})`);
          break;

        case 'set':
          if (!key || value === undefined) {
            throw new Error('Key and value are required for set operation');
          }
          await setInStorage({ [key]: value });
          sendResponse({
            source: 'scm-storage',
            requestId,
            success: true,
            data: { [key]: value }
          });
          console.log(PREFIX, `Storage set completed (${requestId})`);
          break;

        case 'remove':
          if (!key) {
            throw new Error('Key is required for remove operation');
          }
          await removeFromStorage(key);
          sendResponse({
            source: 'scm-storage',
            requestId,
            success: true
          });
          console.log(PREFIX, `Storage remove completed (${requestId})`);
          break;

        case 'clear':
          await clearStorage();
          sendResponse({
            source: 'scm-storage',
            requestId,
            success: true
          });
          console.log(PREFIX, `Storage clear completed (${requestId})`);
          break;

        default:
          throw new Error(`Unknown storage action: ${action}`);
      }
    } catch (error) {
      console.error(PREFIX, `Error handling storage ${action}:`, error);
      sendResponse({
        source: 'scm-storage',
        requestId,
        success: false,
        error: error.message
      });
    }

    return true;
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
        // 清理該事件的監聽器
        eventManager.removeListenersFor('initialization-categoryManagerReady');
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
        // 清理該事件的監聽器
        eventManager.removeListenersFor('initialization-categoryManagerReady');
        resolve(event.detail);
      };

      // 通過事件監聽器管理器註冊監聽器
      eventManager.addEventListener('initialization-categoryManagerReady', window, 'categoryManagerReady', eventHandler);
    });
  }

  // ============================================================================
  // 4. INITIALIZATION FLOW
  // ============================================================================

  /**
   * 註冊存儲消息監聽器 (Phase 2.1)
   * 在初始化時設置，以便 content.js 可以通過消息進行存儲操作
   */
  function registerStorageMessageHandler() {
    console.log(PREFIX, 'Registering storage message handler...');
    
    try {
      chrome.runtime.onMessage.addListener(handleStorageMessage);
      console.log(PREFIX, 'Storage message handler registered successfully');
      return true;
    } catch (error) {
      console.error(PREFIX, 'Failed to register storage message handler:', error);
      return false;
    }
  }

  /**
   * Initialize the content script
   *
   * Note: We skip AngularJS detection because:
   * - Content script runs in isolated world and cannot access main world's window.angular
   * - Injected script in main world confirms AngularJS availability
   * - We rely on categoryManagerReady event as proof of successful initialization
   */
  async function initialize() {
    try {
      console.log(PREFIX, 'Initialization starting');

      // Step 0: Register storage message handler (Phase 2.1)
      registerStorageMessageHandler();
      console.log(PREFIX, 'Storage handler registered');

      // Step 1: Generate nonce for this page load
      const nonce = initializeNonce();
      console.log(PREFIX, 'Nonce initialized:', nonce);

      // Step 2: Inject the script into main world with nonce
      injectScript(nonce);
      console.log(PREFIX, 'Injected script with nonce');

      // Step 3: Wait for categoryManagerReady event with nonce validation
      // This event is only broadcasted after injected.js confirms AngularJS is available
      await waitForCategoryManagerReady(nonce);
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
  // 5. CLEANUP & LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * 註冊頁面卸載時的清理處理器
   * 確保所有事件監聽器都被正確移除，防止記憶體洩漏
   */
  function setupCleanupHandlers() {
    // 頁面卸載時清理所有事件監聽器
    window.addEventListener('beforeunload', () => {
      console.log(PREFIX, 'Page unloading, cleaning up event listeners...');
      eventManager.destroy();
    });

    // 備用：如果頁面被 navigate 離開（不觸發 beforeunload）
    window.addEventListener('pagehide', () => {
      console.log(PREFIX, 'Page hidden, cleaning up event listeners...');
      eventManager.destroy();
    });

    console.log(PREFIX, 'Cleanup handlers registered');
  }

  // ============================================================================
  // 6. START INITIALIZATION
  // ============================================================================

  // 設置清理處理器（必須在初始化前進行）
  setupCleanupHandlers();

  // Start initialization immediately when DOM is ready
  if (document.readyState === 'loading') {
    eventManager.addEventListener('initialization-domReady', document, 'DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // 暴露事件管理器的統計方法供調試使用
  if (typeof window !== 'undefined') {
    window._scm_eventManagerStats = () => eventManager.getStats();
    console.log(PREFIX, 'Event manager stats available at window._scm_eventManagerStats()');
  }

})();
