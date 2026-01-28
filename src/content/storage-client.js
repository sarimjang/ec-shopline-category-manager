/**
 * Storage Client - Content Script Storage API Client (Phase 2.1)
 * 
 * 提供 content.js 與 init.js/service-worker 的存儲通信接口
 * 使用 chrome.runtime.sendMessage 發送存儲操作請求
 * 
 * 使用方式:
 *   const StorageClient = window.StorageClient;
 *   const value = await StorageClient.get('key');
 *   await StorageClient.set('key', value);
 *   await StorageClient.remove('key');
 *   await StorageClient.clear();
 */

'use strict';

const StorageClient = (function() {
  const PREFIX = '[StorageClient]';
  let requestCounter = 0;

  /**
   * 生成唯一的請求 ID
   * @returns {string} 唯一的請求識別符
   */
  function generateRequestId() {
    return `storage-req-${Date.now()}-${++requestCounter}`;
  }

  /**
   * 發送存儲操作消息到 service worker
   * @param {string} action - 操作類型: 'get'|'set'|'remove'|'clear'
   * @param {string} key - 存儲鍵（clear 操作時為 undefined）
   * @param {any} value - 存儲值（set 操作時需要，其他操作時為 undefined）
   * @returns {Promise<any>} 操作結果
   */
  function sendStorageMessage(action, key, value) {
    return new Promise((resolve, reject) => {
      const requestId = generateRequestId();
      const timeout = setTimeout(() => {
        reject(new Error(`Storage ${action} operation timeout (${requestId})`));
      }, 5000);

      const message = {
        source: 'scm-storage',
        action,
        requestId
      };

      // 根據操作類型添加參數
      if (action !== 'clear') {
        message.key = key;
      }
      if (action === 'set') {
        message.value = value;
      }

      console.log(PREFIX, `Sending ${action} message (${requestId})`, { key: key ? String(key).substring(0, 30) : undefined });

      try {
        chrome.runtime.sendMessage(message, (response) => {
          clearTimeout(timeout);

          if (chrome.runtime.lastError) {
            console.error(PREFIX, `${action} failed: ${chrome.runtime.lastError.message} (${requestId})`);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (!response || !response.success) {
            const errorMsg = response?.error || 'Unknown error';
            console.error(PREFIX, `${action} failed: ${errorMsg} (${requestId})`);
            reject(new Error(errorMsg));
            return;
          }

          console.log(PREFIX, `${action} succeeded (${requestId})`);
          resolve(response.data);
        });
      } catch (error) {
        clearTimeout(timeout);
        console.error(PREFIX, `${action} exception: ${error.message} (${requestId})`);
        reject(error);
      }
    });
  }

  /**
   * 從存儲中獲取值
   * @param {string|array} key - 鍵或鍵陣列
   * @returns {Promise<object>} 包含鍵值對的物件
   */
  async function get(key) {
    if (!key) {
      throw new Error('Key is required for get operation');
    }
    console.log(PREFIX, `get('${String(key).substring(0, 30)}')`);
    return sendStorageMessage('get', key);
  }

  /**
   * 向存儲中設置值
   * @param {string} key - 鍵
   * @param {any} value - 值（支援任何可 JSON 序列化的值）
   * @returns {Promise<object>} 設置的鍵值對
   */
  async function set(key, value) {
    if (!key || value === undefined) {
      throw new Error('Key and value are required for set operation');
    }
    console.log(PREFIX, `set('${String(key).substring(0, 30)}', ...)`);
    return sendStorageMessage('set', key, value);
  }

  /**
   * 從存儲中移除值
   * @param {string|array} key - 鍵或鍵陣列
   * @returns {Promise<void>}
   */
  async function remove(key) {
    if (!key) {
      throw new Error('Key is required for remove operation');
    }
    console.log(PREFIX, `remove('${String(key).substring(0, 30)}')`);
    return sendStorageMessage('remove', key);
  }

  /**
   * 清除所有存儲數據
   * @returns {Promise<void>}
   */
  async function clear() {
    console.log(PREFIX, 'clear()');
    return sendStorageMessage('clear');
  }

  /**
   * 初始化存儲客戶端
   * 檢查 chrome.runtime API 是否可用
   * @returns {Promise<boolean>} 初始化是否成功
   */
  async function init() {
    try {
      if (!chrome || !chrome.runtime) {
        throw new Error('chrome.runtime API not available');
      }
      console.log(PREFIX, 'Initialized successfully');
      return true;
    } catch (error) {
      console.error(PREFIX, 'Initialization failed:', error);
      return false;
    }
  }

  // 公開 API
  return {
    get,
    set,
    remove,
    clear,
    init
  };
})();

// 將 StorageClient 掛載到 window，供 content.js 使用
if (typeof window !== 'undefined') {
  window.StorageClient = StorageClient;
  console.log('[StorageClient] Attached to window object');
}
