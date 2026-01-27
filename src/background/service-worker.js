/**
 * Background Service Worker - Handles persistent background tasks
 * Manifest V3 requires service workers instead of background pages
 */

'use strict';

const logger = {
  log: (msg, data) => console.log('[SERVICE_WORKER]', msg, data || ''),
  error: (msg, err) => console.error('[SERVICE_WORKER]', msg, err || '')
};

logger.log('Service Worker loaded');

// ============================================================================
// 1. INSTALLATION & LIFECYCLE MANAGEMENT
// ============================================================================

/**
 * Handle extension installation and updates
 * Initialize storage and context menu on first install
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize storage on first install
    chrome.storage.local.set({
      categoryMoveStats: {
        totalMoves: 0,
        totalTimeSaved: 0,
        lastReset: new Date().toISOString()
      }
    });
    logger.log('Extension installed, storage initialized');
  } else if (details.reason === 'update') {
    logger.log('Extension updated');
  }
});

// ============================================================================
// 2. STORAGE CHANGE LISTENER (Phase 3 multi-tab sync preparation)
// ============================================================================

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    logger.log('Storage changed:', changes);
    // Future: broadcast to other tabs for real-time sync
  }
});

// ============================================================================
// 3. CONTEXT MENU (Phase 2+ features preparation)
// ============================================================================

/**
 * Create context menu for future Phase 2 export feature
 */
// 先移除舊的菜單項（如果存在），避免重複 ID 錯誤
chrome.contextMenus.remove('shopline-export', () => {
  // 忽略錯誤（第一次加載時菜單項不存在）
  chrome.runtime.lastError;

  // 創建新的菜單項
  chrome.contextMenus.create({
    id: 'shopline-export',
    title: 'Export Categories (coming in Phase 2)',
    contexts: ['page'],
    documentUrlPatterns: [
      '*://app.shoplineapp.com/admin/*/categories*',
      '*://app.shopline.tw/admin/*/categories*',
      '*://app.shopline.app/admin/*/categories*'
    ]
  }, () => {
    if (chrome.runtime.lastError) {
      logger.error('Failed to create context menu:', chrome.runtime.lastError);
    } else {
      logger.log('Context menu created successfully');
    }
  });
});

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener((info, _tab) => {
  if (info.menuItemId === 'shopline-export') {
    logger.log('Export menu clicked (Phase 2 feature)');
  }
});

// ============================================================================
// 4. MESSAGE HANDLING (Core functionality - storage & data operations)
// ============================================================================

/**
 * Listen for messages from content scripts
 */
chrome.runtime.onMessage.addListener(function(request, _sender, sendResponse) {
  logger.log('Message received from content script:', request);

  try {
    // Route based on action type
    switch (request.action) {
      case 'getCategories':
        handleGetCategories(request, sendResponse);
        break;

      case 'updateCategories':
        handleUpdateCategories(request, sendResponse);
        break;

      case 'exportData':
        handleExportData(request, sendResponse);
        break;

      case 'importData':
        handleImportData(request, sendResponse);
        break;

      case 'recordCategoryMove':
        handleRecordCategoryMove(request, sendResponse);
        break;

      case 'getStats':
        handleGetStats(request, sendResponse);
        break;

      case 'resetStats':
        handleResetStats(request, sendResponse);
        break;

      case 'getSearchHistory':
        handleGetSearchHistory(request, sendResponse);
        break;

      case 'recordSearchQuery':
        handleRecordSearchQuery(request, sendResponse);
        break;

      case 'classifyError':
        handleClassifyError(request, sendResponse);
        break;

      case 'getErrorLog':
        handleGetErrorLog(request, sendResponse);
        break;

      case 'validateCategoryPath':
        handleValidateCategoryPath(request, sendResponse);
        break;

      case 'getMoveHistory':
        handleGetMoveHistory(request, sendResponse);
        break;

      default:
        logger.log('Unknown action:', request.action);
        sendResponse({ error: 'Unknown action' });
    }
  } catch (error) {
    logger.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }

  // Return true to indicate we'll send response asynchronously
  return true;
});

/**
 * Handle getCategories request
 */
function handleGetCategories(_request, sendResponse) {
  chrome.storage.local.get(['categories'], function(result) {
    sendResponse({
      success: true,
      data: result.categories || []
    });
  });
}

/**
 * Handle updateCategories request
 */
function handleUpdateCategories(request, sendResponse) {
  const categories = request.categories || [];
  chrome.storage.local.set({ categories: categories }, function() {
    logger.log('Categories updated');
    sendResponse({
      success: true,
      message: 'Categories updated'
    });
  });
}

/**
 * Handle exportData request
 * Retrieves all storage data for export
 * Includes: stats, move history, search history, error log, and any other stored data
 */
function handleExportData(_request, sendResponse) {
  chrome.storage.local.get(null, function(result) {
    if (chrome.runtime.lastError) {
      logger.error('Error retrieving data for export:', chrome.runtime.lastError);
      sendResponse({
        success: false,
        error: 'Failed to retrieve storage data',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Prepare export data with metadata
    const exportData = {
      success: true,
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        stats: result.categoryMoveStats || {
          totalMoves: 0,
          totalTimeSaved: 0,
          lastReset: null
        },
        moveHistory: result.moveHistory || [],
        searchHistory: result.searchHistory || [],
        errorLog: result.errorLog || [],
        // Include any additional data keys
        additionalData: Object.keys(result).reduce((acc, key) => {
          if (!['categoryMoveStats', 'moveHistory', 'searchHistory', 'errorLog'].includes(key)) {
            acc[key] = result[key];
          }
          return acc;
        }, {})
      },
      summary: {
        totalMoves: (result.categoryMoveStats || {}).totalMoves || 0,
        totalTimeSaved: (result.categoryMoveStats || {}).totalTimeSaved || 0,
        moveRecords: (result.moveHistory || []).length,
        searchQueries: (result.searchHistory || []).length,
        errorRecords: (result.errorLog || []).length
      }
    };

    logger.log('Export data prepared:', exportData.summary);
    sendResponse(exportData);
  });
}

/**
 * Handle importData request
 */
function handleImportData(request, sendResponse) {
  const data = request.data || {};
  chrome.storage.local.set(data, function() {
    logger.log('Data imported');
    sendResponse({
      success: true,
      message: 'Data imported successfully'
    });
  });
}

/**
 * Handle recordCategoryMove request
 * Called when a category move is detected
 */
function handleRecordCategoryMove(request, sendResponse) {
  const timeSaved = request.timeSaved || 0;

  chrome.storage.local.get(['categoryMoveStats'], function(result) {
    const stats = result.categoryMoveStats || {
      totalMoves: 0,
      totalTimeSaved: 0,
      lastReset: new Date().toISOString()
    };

    stats.totalMoves += 1;
    stats.totalTimeSaved += timeSaved;

    chrome.storage.local.set({ categoryMoveStats: stats }, function() {
      logger.log('Category move recorded', { stats });
      sendResponse({
        success: true,
        stats: stats
      });
    });
  });
}

/**
 * Handle getStats request
 * Retrieve current stats
 */
function handleGetStats(_request, sendResponse) {
  chrome.storage.local.get(['categoryMoveStats'], function(result) {
    const stats = result.categoryMoveStats || {
      totalMoves: 0,
      totalTimeSaved: 0,
      lastReset: new Date().toISOString()
    };

    sendResponse({
      success: true,
      stats: stats
    });
  });
}

/**
 * Handle resetStats request
 * Reset statistics to zero
 */
function handleResetStats(_request, sendResponse) {
  const newStats = {
    totalMoves: 0,
    totalTimeSaved: 0,
    lastReset: new Date().toISOString()
  };

  chrome.storage.local.set({ categoryMoveStats: newStats }, function() {
    logger.log('Stats reset');
    sendResponse({
      success: true,
      stats: newStats
    });
  });
}

/**
 * Handle getSearchHistory request
 * Retrieve search query history from storage
 */
function handleGetSearchHistory(_request, sendResponse) {
  chrome.storage.local.get(['searchHistory'], function(result) {
    const history = result.searchHistory || [];
    logger.log('Search history retrieved:', history.length, 'queries');
    sendResponse({
      success: true,
      history: history
    });
  });
}

/**
 * Handle recordSearchQuery request
 * Record a search query and return updated history
 */
function handleRecordSearchQuery(request, sendResponse) {
  const query = request.query || '';

  if (!query || query.trim() === '') {
    sendResponse({ success: false, error: 'Empty query' });
    return;
  }

  chrome.storage.local.get(['searchHistory'], function(result) {
    let history = result.searchHistory || [];

    // Add to beginning if not already present
    const index = history.indexOf(query);
    if (index > -1) {
      history.splice(index, 1);
    }
    history.unshift(query);

    // Keep only last 50 searches
    if (history.length > 50) {
      history.pop();
    }

    chrome.storage.local.set({ searchHistory: history }, function() {
      logger.log('Search query recorded:', query);
      sendResponse({
        success: true,
        history: history
      });
    });
  });
}

/**
 * Handle classifyError request
 * Classify error type and log it
 */
function handleClassifyError(request, sendResponse) {
  const errorData = {
    timestamp: new Date().toISOString(),
    type: request.errorType || 'unknown',  // 'network', 'api', 'validation', 'scope'
    message: request.message || '',
    details: request.details || {}
  };

  // Log to console for debugging
  logger.log('Error classified:', errorData.type, '-', errorData.message);

  // Store in error log
  chrome.storage.local.get(['errorLog'], function(result) {
    let errorLog = result.errorLog || [];
    errorLog.unshift(errorData);

    // Keep only last 100 errors
    if (errorLog.length > 100) {
      errorLog.pop();
    }

    chrome.storage.local.set({ errorLog: errorLog }, function() {
      sendResponse({
        success: true,
        errorData: errorData,
        logSize: errorLog.length
      });
    });
  });
}

/**
 * Handle getErrorLog request
 * Retrieve error log from storage
 */
function handleGetErrorLog(_request, sendResponse) {
  chrome.storage.local.get(['errorLog'], function(result) {
    const errorLog = result.errorLog || [];
    logger.log('Error log retrieved:', errorLog.length, 'errors');
    sendResponse({
      success: true,
      errors: errorLog
    });
  });
}

/**
 * Handle validateCategoryPath request
 * Pre-flight validation for category move
 */
function handleValidateCategoryPath(request, sendResponse) {
  const categoryId = request.categoryId;
  const targetCategoryId = request.targetCategoryId;
  const validationErrors = [];

  // Basic validation checks
  if (!categoryId) {
    validationErrors.push('Missing categoryId');
  }

  // targetCategoryId can be null (move to root), so only check if provided
  if (targetCategoryId === undefined) {
    validationErrors.push('Missing targetCategoryId parameter (can be null for root)');
  }

  logger.log('Category path validation:', {
    categoryId: categoryId,
    targetCategoryId: targetCategoryId,
    hasErrors: validationErrors.length > 0
  });

  sendResponse({
    success: validationErrors.length === 0,
    errors: validationErrors,
    isValid: validationErrors.length === 0
  });
}

/**
 * Handle getMoveHistory request
 * Retrieve individual move records
 */
function handleGetMoveHistory(_request, sendResponse) {
  chrome.storage.local.get(['moveHistory'], function(result) {
    const moveHistory = result.moveHistory || [];
    logger.log('Move history retrieved:', moveHistory.length, 'moves');
    sendResponse({
      success: true,
      history: moveHistory
    });
  });
}

/**
 * Handle extension icon click - popup is opened automatically by manifest
 */
chrome.action.onClicked.addListener(function(_tab) {
  logger.log('Extension icon clicked');
  // Popup is handled automatically by default_popup in manifest
});
