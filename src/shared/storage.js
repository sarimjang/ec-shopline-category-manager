/**
 * Storage API Abstraction - Provides unified interface for chrome.storage.local
 * Handles get, set, remove, clear operations with error handling
 */

const ShoplineStorage = (function() {
  'use strict';

  const logger = window.ShoplineLogger || console;

  /**
   * Get value from storage
   * @param {string|array} keys - Key(s) to retrieve
   * @returns {Promise}
   */
  function get(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, function(result) {
        if (chrome.runtime.lastError) {
          logger.error('Storage.get error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Set value in storage
   * @param {object} items - Key-value pairs to set
   * @returns {Promise}
   */
  function set(items) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(items, function() {
        if (chrome.runtime.lastError) {
          logger.error('Storage.set error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          logger.log('Storage.set successful');
          resolve(items);
        }
      });
    });
  }

  /**
   * Remove value from storage
   * @param {string|array} keys - Key(s) to remove
   * @returns {Promise}
   */
  function remove(keys) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.remove(keys, function() {
        if (chrome.runtime.lastError) {
          logger.error('Storage.remove error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          logger.log('Storage.remove successful');
          resolve();
        }
      });
    });
  }

  /**
   * Clear all storage
   * @returns {Promise}
   */
  function clear() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(function() {
        if (chrome.runtime.lastError) {
          logger.error('Storage.clear error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          logger.log('Storage.clear successful');
          resolve();
        }
      });
    });
  }

  return {
    get,
    set,
    remove,
    clear
  };
})();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.ShoplineStorage = ShoplineStorage;
}
