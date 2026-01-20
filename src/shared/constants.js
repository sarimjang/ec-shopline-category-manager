/**
 * Constants - Global configuration and constants for the extension
 */

const ShoplineConstants = {
  // Extension metadata
  EXTENSION_NAME: 'Shopline Category Manager',
  EXTENSION_VERSION: '1.0.0',

  // Shopline URLs and patterns
  HOSTS: {
    SHOPLINEAPP: 'app.shoplineapp.com',
    SHOPLINE_TW: 'app.shopline.tw',
    SHOPLINE_APP: 'app.shopline.app'
  },

  // URL patterns for content script injection
  CONTENT_SCRIPT_PATTERN: '/admin/*/categories',

  // Storage keys
  STORAGE_KEYS: {
    CATEGORIES: 'categories',
    EXPORT_HISTORY: 'exportHistory',
    IMPORT_HISTORY: 'importHistory',
    SETTINGS: 'settings',
    AUTO_SAVE: 'autoSave'
  },

  // API rate limiting
  API: {
    DELAY_BETWEEN_CALLS: 200, // milliseconds
    TIMEOUT: 30000 // milliseconds
  },

  // Export/Import formats
  EXPORT_FORMATS: {
    JSON: 'json',
    CSV: 'csv'
  },

  // Message types for communication
  MESSAGE_TYPES: {
    GET_CATEGORIES: 'getCategories',
    UPDATE_CATEGORIES: 'updateCategories',
    EXPORT_DATA: 'exportData',
    IMPORT_DATA: 'importData',
    PING: 'ping'
  },

  // Status codes
  STATUS: {
    SUCCESS: 'success',
    ERROR: 'error',
    PENDING: 'pending',
    CANCELLED: 'cancelled'
  }
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.ShoplineConstants = ShoplineConstants;
}
