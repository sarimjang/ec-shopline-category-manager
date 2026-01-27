/**
 * Storage Schema Definition
 *
 * 定義所有儲存鍵、描述和預設值
 * 此檔案作為文檔和類型檢查的參考
 */

'use strict';

/**
 * 儲存架構定義
 * 每個鍵對應一個物件，包含描述和預設值
 */
const STORAGE_SCHEMA = {
  // 統計數據相關
  categoryMoveStats: {
    description: '類別移動操作的統計數據',
    version: 1,
    defaults: {
      totalMoves: 0,
      totalTimeSaved: 0,
      lastReset: '',
      movesByDepth: {},
      movesBySize: {},
      lastMoveTimestamp: 0
    },
    quota: 'small'
  },

  searchHistory: {
    description: '最近的搜尋查詢記錄',
    version: 1,
    defaults: [],
    maxSize: 50,
    quota: 'small'
  },

  moveHistory: {
    description: '已執行的類別移動操作歷史',
    version: 1,
    defaults: [],
    maxSize: 500,
    quota: 'large'
  },

  errorLog: {
    description: '系統錯誤日誌，用於調試',
    version: 1,
    defaults: [],
    maxSize: 100,
    retention: 7 * 24 * 60 * 60 * 1000,
    quota: 'small'
  },

  userSettings: {
    description: '使用者偏好設定',
    version: 1,
    defaults: {
      autoScroll: true,
      notifications: true,
      showTimeSavings: true,
      theme: 'auto',
      debugMode: false
    },
    quota: 'tiny'
  },

  extensionMetadata: {
    description: '擴展版本和狀態信息',
    version: 1,
    defaults: {
      version: '1.0.0',
      installedAt: 0,
      lastUpdatedAt: 0,
      migrationVersion: 0
    },
    quota: 'tiny'
  },

  categoryCache: {
    description: '類別結構快取（用於性能優化）',
    version: 1,
    defaults: {
      categories: [],
      lastFetchedAt: 0
    },
    retention: 24 * 60 * 60 * 1000,
    quota: 'medium'
  }
};

/**
 * 儲存配額信息
 */
const STORAGE_QUOTAS = {
  tiny: 1024,
  small: 10 * 1024,
  medium: 200 * 1024,
  large: 500 * 1024,
  total: 5 * 1024 * 1024
};

/**
 * 遷移定義
 */
const STORAGE_MIGRATIONS = [
  {
    version: 1,
    description: '初始遷移：從 localStorage 轉移到 chrome.storage.local',
    migrate: async (oldData, storage) => {
      const oldKeys = [
        'shopline_category_stats',
        'shopline_search_history',
        'shopline_move_history',
        'shopline_error_log'
      ];

      const migratedData = {};
      let migrationCount = 0;

      for (const oldKey of oldKeys) {
        try {
          const oldValue = localStorage.getItem(oldKey);
          if (oldValue) {
            const parsedValue = JSON.parse(oldValue);
            if (oldKey === 'shopline_category_stats') {
              migratedData.categoryMoveStats = parsedValue;
            } else if (oldKey === 'shopline_search_history') {
              migratedData.searchHistory = parsedValue;
            } else if (oldKey === 'shopline_move_history') {
              migratedData.moveHistory = parsedValue;
            } else if (oldKey === 'shopline_error_log') {
              migratedData.errorLog = parsedValue;
            }
            migrationCount++;
          }
        } catch (error) {
          console.error(`[StorageMigration] Failed to migrate ${oldKey}:`, error);
        }
      }

      if (migrationCount > 0) {
        console.log(`[StorageMigration] Migrated ${migrationCount} items from localStorage`);
        migratedData.extensionMetadata = {
          version: '1.0.0',
          installedAt: Date.now(),
          lastUpdatedAt: Date.now(),
          migrationVersion: 1
        };
      }

      return migratedData;
    }
  }
];

/**
 * 驗證儲存值是否符合架構
 */
function validateStorageValue(key, value) {
  if (!STORAGE_SCHEMA[key]) {
    console.warn(`[StorageValidation] Unknown key: ${key}`);
    return true;
  }

  const schema = STORAGE_SCHEMA[key];
  const defaults = schema.defaults;

  if (typeof defaults !== typeof value) {
    console.warn(`[StorageValidation] Type mismatch for ${key}`);
    return false;
  }

  if (Array.isArray(defaults) && Array.isArray(value)) {
    if (schema.maxSize && value.length > schema.maxSize) {
      console.warn(`[StorageValidation] Array size exceeded for ${key}`);
      return false;
    }
  }

  return true;
}

/**
 * 計算儲存使用情況
 */
function estimateStorageUsage(data) {
  let totalBytes = 0;
  for (const [key, value] of Object.entries(data)) {
    const serialized = JSON.stringify({ [key]: value });
    totalBytes += serialized.length;
  }
  return totalBytes;
}

/**
 * 取得儲存配額使用百分比
 */
function getQuotaPercentage(usedBytes) {
  return Math.round((usedBytes / STORAGE_QUOTAS.total) * 100);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STORAGE_SCHEMA,
    STORAGE_QUOTAS,
    STORAGE_MIGRATIONS,
    validateStorageValue,
    estimateStorageUsage,
    getQuotaPercentage
  };
}
