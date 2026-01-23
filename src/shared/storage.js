/**
 * Storage API Abstraction - Provides unified interface for chrome.storage.local
 * Handles get, set, remove, clear operations with error handling
 * Includes StorageManager class for statistics and history management
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

/**
 * StorageManager - Handles category move statistics and history
 * Provides methods for getting/setting stats, tracking moves, resetting stats
 * and managing export/import history
 */
class StorageManager {
  constructor() {
    this.logger = window.ShoplineLogger || console;
  }

  /**
   * Get statistics for category moves
   * @returns {Promise<Object>} Statistics object with totalMoves, totalTimeSaved, lastReset
   */
  async getStats() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['categoryMoveStats'], (result) => {
        if (chrome.runtime.lastError) {
          this.logger.error('[StorageManager] getStats error:', chrome.runtime.lastError);
          resolve({
            totalMoves: 0,
            totalTimeSaved: 0,
            lastReset: new Date().toISOString()
          });
        } else {
          const stats = result.categoryMoveStats || {
            totalMoves: 0,
            totalTimeSaved: 0,
            lastReset: new Date().toISOString()
          };
          resolve(stats);
        }
      });
    });
  }

  /**
   * Set statistics for category moves
   * @param {Object} stats - Statistics object
   * @returns {Promise<Object>} The stats that were set
   */
  async setStats(stats) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ categoryMoveStats: stats }, () => {
        if (chrome.runtime.lastError) {
          this.logger.error('[StorageManager] setStats error:', chrome.runtime.lastError);
        } else {
          this.logger.log('[StorageManager] Stats saved:', stats);
        }
        resolve(stats);
      });
    });
  }

  /**
   * Add a move record and update statistics
   * @param {number} timeSaved - Time saved in seconds
   * @param {Object} moveDetails - Additional move details (optional)
   *   - categoryId, categoryName, targetLevel, usedSearch
   * @returns {Promise<Object>} Updated statistics
   */
  async addMove(timeSaved, moveDetails = {}) {
    const stats = await this.getStats();
    stats.totalMoves += 1;
    stats.totalTimeSaved += timeSaved;

    // Track individual move history
    const moveHistory = await this.getMoveHistory();
    moveHistory.push({
      timestamp: new Date().toISOString(),
      timeSaved: timeSaved,
      categoryId: moveDetails.categoryId,
      categoryName: moveDetails.categoryName,
      targetLevel: moveDetails.targetLevel,
      usedSearch: moveDetails.usedSearch
    });

    // Keep only last 500 moves
    if (moveHistory.length > 500) {
      moveHistory.shift();
    }

    await this.setStats(stats);
    await this.setMoveHistory(moveHistory);
    this.logger.log('[StorageManager] Move recorded:', { timeSaved, moveDetails, stats });
    return stats;
  }

  /**
   * Get move history
   * @returns {Promise<Array>} Array of move records with timestamps
   */
  async getMoveHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['moveHistory'], (result) => {
        if (chrome.runtime.lastError) {
          this.logger.error('[StorageManager] getMoveHistory error:', chrome.runtime.lastError);
          resolve([]);
        } else {
          resolve(result.moveHistory || []);
        }
      });
    });
  }

  /**
   * Set move history
   * @param {Array} history - Move history array
   * @returns {Promise<void>}
   */
  async setMoveHistory(history) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ moveHistory: history }, () => {
        if (chrome.runtime.lastError) {
          this.logger.error('[StorageManager] setMoveHistory error:', chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  /**
   * Track search query
   * @param {string} query - Search query string
   * @returns {Promise<Array>} Updated search history
   */
  async recordSearchQuery(query) {
    if (!query || query.trim() === '') {
      return [];
    }

    const searchHistory = await this.getSearchHistory();

    // Add to beginning if not already there
    const index = searchHistory.indexOf(query);
    if (index > -1) {
      searchHistory.splice(index, 1);
    }
    searchHistory.unshift(query);

    // Keep only last 50 searches
    if (searchHistory.length > 50) {
      searchHistory.pop();
    }

    await this.setSearchHistory(searchHistory);
    this.logger.log('[StorageManager] Search query recorded:', query);
    return searchHistory;
  }

  /**
   * Get search query history
   * @returns {Promise<Array>} Array of search queries (most recent first)
   */
  async getSearchHistory() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['searchHistory'], (result) => {
        if (chrome.runtime.lastError) {
          this.logger.error('[StorageManager] getSearchHistory error:', chrome.runtime.lastError);
          resolve([]);
        } else {
          resolve(result.searchHistory || []);
        }
      });
    });
  }

  /**
   * Set search history
   * @param {Array} history - Search history array
   * @returns {Promise<void>}
   */
  async setSearchHistory(history) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ searchHistory: history }, () => {
        if (chrome.runtime.lastError) {
          this.logger.error('[StorageManager] setSearchHistory error:', chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  /**
   * Log error for diagnostics
   * @param {Object} errorData - Error details
   * @returns {Promise<void>}
   */
  async recordError(errorData) {
    const errorLog = await this.getErrorLog();
    errorLog.unshift({
      timestamp: new Date().toISOString(),
      type: errorData.type,      // 'network', 'api', 'validation', 'scope'
      message: errorData.message,
      details: errorData.details
    });

    // Keep only last 100 errors
    if (errorLog.length > 100) {
      errorLog.pop();
    }

    await this.setErrorLog(errorLog);
    this.logger.log('[StorageManager] Error recorded:', errorData);
  }

  /**
   * Get error log
   * @returns {Promise<Array>} Array of error records
   */
  async getErrorLog() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['errorLog'], (result) => {
        if (chrome.runtime.lastError) {
          this.logger.error('[StorageManager] getErrorLog error:', chrome.runtime.lastError);
          resolve([]);
        } else {
          resolve(result.errorLog || []);
        }
      });
    });
  }

  /**
   * Set error log
   * @param {Array} log - Error log array
   * @returns {Promise<void>}
   */
  async setErrorLog(log) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ errorLog: log }, () => {
        if (chrome.runtime.lastError) {
          this.logger.error('[StorageManager] setErrorLog error:', chrome.runtime.lastError);
        }
        resolve();
      });
    });
  }

  /**
   * Reset all statistics
   * @returns {Promise<Object>} Reset statistics object
   */
  async resetStats() {
    const stats = {
      totalMoves: 0,
      totalTimeSaved: 0,
      lastReset: new Date().toISOString()
    };
    await this.setStats(stats);
    this.logger.log('[StorageManager] Statistics reset');
    return stats;
  }

  /**
   * Get history entries (exports or imports)
   * @param {string} type - Type of history: 'exports' or 'imports'
   * @returns {Promise<Array>} Array of history entries
   */
  async getHistory(type) {
    return new Promise((resolve) => {
      chrome.storage.local.get([type], (result) => {
        if (chrome.runtime.lastError) {
          this.logger.error(`[StorageManager] getHistory error for type=${type}:`, chrome.runtime.lastError);
          resolve([]);
        } else {
          resolve(result[type] || []);
        }
      });
    });
  }

  /**
   * Add entry to history (exports or imports)
   * Keeps last 100 entries, newest first
   * @param {string} type - Type of history: 'exports' or 'imports'
   * @param {Object} entry - History entry object
   * @returns {Promise<Array>} Updated history array
   */
  async addToHistory(type, entry) {
    const history = await this.getHistory(type);
    history.unshift(entry); // Add to beginning (newest first)
    if (history.length > 100) {
      history.pop(); // Keep only last 100
    }

    return new Promise((resolve) => {
      chrome.storage.local.set({ [type]: history }, () => {
        if (chrome.runtime.lastError) {
          this.logger.error(`[StorageManager] addToHistory error for type=${type}:`, chrome.runtime.lastError);
        } else {
          this.logger.log(`[StorageManager] History entry added for type=${type}`);
        }
        resolve(history);
      });
    });
  }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.ShoplineStorage = ShoplineStorage;
  window.StorageManager = StorageManager;
}
