/**
 * Environment Configuration - Build-time feature flags
 *
 * 此文件定義構建時環境變數，用於控制功能在開發和生產版本中的可用性。
 *
 * 使用方式：
 * - 在構建時，構建工具應設置 process.env.NODE_ENV 的值
 * - 開發構建：NODE_ENV=development
 * - 生產構建：NODE_ENV=production（預設）
 *
 * 調試 API 在生產構建中會被 tree-shaking 完全移除
 */

/**
 * 構建時環境標誌
 * 由構建工具或包裝器注入的值（例如 webpack DefinePlugin）
 */
const ENV = {
  // 環境模式：'development' 或 'production'
  NODE_ENV: typeof process !== 'undefined' && process.env ? (process.env.NODE_ENV || 'production') : 'production',

  // 調試 API 啟用標誌（只在開發環境啟用）
  DEBUG_APIS_ENABLED: (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development'),
};

/**
 * 特性開關（Feature Flags）
 */
const FEATURES = {
  /**
   * 調試 API - 只在開發構建中啟用
   *
   * 生產構建中：window.debugCategoryManager === undefined
   * 開發構建中：window.debugCategoryManager 包含調試方法
   */
  DEBUG_APIS: ENV.NODE_ENV === 'development',

  /**
   * 調試日誌 - 在開發環境啟用詳細日誌
   */
  VERBOSE_LOGGING: ENV.NODE_ENV === 'development',

  /**
   * 內部狀態暴露 - 只在開發環境啟用
   * 禁止生產環境暴露 window.categoryManager
   */
  EXPOSE_INTERNAL_STATE: ENV.NODE_ENV === 'development',
};

/**
 * 生產構建驗證函數
 * 用於 tree-shaking 和死碼消除
 */
function isProduction() {
  return ENV.NODE_ENV === 'production';
}

function isDevelopment() {
  return ENV.NODE_ENV === 'development';
}

/**
 * 條件日誌記錄 - 只在開發環境輸出
 * 生產環境中會被 tree-shake 移除
 */
function debugLog(prefix, message, data) {
  if (FEATURES.VERBOSE_LOGGING) {
    const log = data ? `${message} ${JSON.stringify(data)}` : message;
    console.log(`[${prefix}] ${log}`);
  }
}

function debugError(prefix, message, error) {
  if (FEATURES.VERBOSE_LOGGING) {
    console.error(`[${prefix}] ${message}`, error);
  }
}

/**
 * 驗證調試 API 是否應被暴露
 * 用於確保生產構建中沒有調試接口
 */
function canExposeDebugAPI() {
  return FEATURES.DEBUG_APIS;
}

/**
 * 匯出環境配置
 * 可用於全局作用域和模塊化環境
 */
if (typeof window !== 'undefined') {
  window.SCM_ENV = ENV;
  window.SCM_FEATURES = FEATURES;
  window.SCM_DEBUG_LOG = debugLog;
  window.SCM_DEBUG_ERROR = debugError;
  window.SCM_CAN_EXPOSE_DEBUG_API = canExposeDebugAPI;
}

// 模塊化匯出（如果支援）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ENV,
    FEATURES,
    isProduction,
    isDevelopment,
    debugLog,
    debugError,
    canExposeDebugAPI
  };
}
