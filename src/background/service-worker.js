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

      case 'validateImportData':
        handleValidateImportData(request, sendResponse);
        break;

      case 'executeImportData':
        handleExecuteImportData(request, sendResponse);
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

/**
 * Handle validateImportData request
 * Validates imported data structure, schema, and detects conflicts
 */
function handleValidateImportData(request, sendResponse) {
  const jsonString = request.jsonString;
  
  if (!jsonString) {
    sendResponse({
      success: false,
      error: 'No JSON data provided for validation'
    });
    return;
  }

  try {
    // 第一步：驗證 JSON 格式和完整性
    if (typeof window.ShoplineImportValidator === 'undefined') {
      logger.error('Import validator not loaded');
      sendResponse({
        success: false,
        error: 'Import validator module not available'
      });
      return;
    }

    const validationResult = window.ShoplineImportValidator.validateImportData(jsonString);

    // 如果驗證失敗，立即返回
    if (!validationResult.isValid) {
      logger.log('Import validation failed:', validationResult.errors);
      sendResponse({
        success: false,
        isValid: false,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        summary: validationResult.summary
      });
      return;
    }

    // 第二步：檢測衝突
    const importedData = validationResult.data;
    
    chrome.storage.local.get(null, function(existingData) {
      if (chrome.runtime.lastError) {
        logger.error('Error retrieving existing data for conflict detection:', chrome.runtime.lastError);
        sendResponse({
          success: false,
          error: 'Failed to retrieve existing storage data'
        });
        return;
      }

      try {
        // 執行衝突檢測
        if (typeof window.ShoplineConflictDetector === 'undefined') {
          logger.error('Conflict detector not loaded');
          sendResponse({
            success: true,
            isValid: true,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            summary: validationResult.summary,
            conflicts: [],
            mergeStrategy: null,
            conflictDetected: false
          });
          return;
        }

        const conflictResult = window.ShoplineConflictDetector.detectConflicts(
          importedData,
          existingData
        );

        logger.log('Conflict detection complete:', conflictResult.summary);

        // 返回完整的驗證和衝突檢測結果
        sendResponse({
          success: true,
          isValid: validationResult.isValid,
          errors: validationResult.errors,
          warnings: validationResult.warnings,
          summary: validationResult.summary,
          schemaVersion: validationResult.schemaVersion,
          conflictDetected: conflictResult.hasConflicts,
          conflicts: conflictResult.conflicts,
          conflictSummary: conflictResult.summary,
          mergeStrategy: conflictResult.mergeStrategy,
          mergedData: conflictResult.mergedData
        });
      } catch (error) {
        logger.error('Error during conflict detection:', error);
        sendResponse({
          success: false,
          error: 'Conflict detection failed: ' + error.message,
          isValid: validationResult.isValid,
          errors: validationResult.errors,
          warnings: validationResult.warnings
        });
      }
    });
  } catch (error) {
    logger.error('Error validating import data:', error);
    sendResponse({
      success: false,
      error: 'Import validation failed: ' + error.message
    });
  }
}

/**
 * Handle executeImportData request
 * Executes the actual data import with validated and optionally merged data
 * Applies conflict resolutions and writes to storage with data integrity checks
 */
function handleExecuteImportData(request, sendResponse) {
  const data = request.data;

  if (!data || typeof data !== 'object') {
    logger.error('Invalid data provided for import');
    sendResponse({
      success: false,
      error: 'Invalid data structure for import'
    });
    return;
  }

  try {
    logger.log('Starting import execution...');

    // Retrieve existing data to calculate changes
    chrome.storage.local.get(null, function(existingData) {
      if (chrome.runtime.lastError) {
        logger.error('Error retrieving existing data:', chrome.runtime.lastError);
        sendResponse({
          success: false,
          error: 'Failed to retrieve existing data'
        });
        return;
      }

      try {
        // Calculate changes
        const oldMoveCount = (existingData.moveHistory || []).length;
        const oldSearchCount = (existingData.searchHistory || []).length;
        const oldErrorCount = (existingData.errorLog || []).length;

        const newMoveCount = (data.moveHistory || []).length;
        const newSearchCount = (data.searchHistory || []).length;
        const newErrorCount = (data.errorLog || []).length;

        const movedAdded = Math.max(0, newMoveCount - oldMoveCount);
        const searchesAdded = Math.max(0, newSearchCount - oldSearchCount);
        const errorsAdded = Math.max(0, newErrorCount - oldErrorCount);

        // Prepare import data with safeguards
        const importData = {
          categoryMoveStats: data.categoryMoveStats || {
            totalMoves: 0,
            totalTimeSaved: 0,
            lastReset: new Date().toISOString()
          },
          moveHistory: Array.isArray(data.moveHistory) ? data.moveHistory.slice(0, 500) : [],
          searchHistory: Array.isArray(data.searchHistory) ? data.searchHistory.slice(0, 50) : [],
          errorLog: Array.isArray(data.errorLog) ? data.errorLog.slice(0, 100) : [],
          importTimestamp: new Date().toISOString()
        };

        // Set the data to storage
        chrome.storage.local.set(importData, function() {
          if (chrome.runtime.lastError) {
            logger.error('Error saving import data:', chrome.runtime.lastError);
            sendResponse({
              success: false,
              error: 'Failed to save imported data: ' + chrome.runtime.lastError.message
            });
            return;
          }

          logger.log('Import execution completed successfully', {
            movesAdded: movedAdded,
            searchesAdded: searchesAdded,
            errorsAdded: errorsAdded,
            totalMoveCount: newMoveCount,
            totalSearchCount: newSearchCount,
            totalErrorCount: newErrorCount
          });

          // Return success with import summary
          sendResponse({
            success: true,
            message: 'Data imported successfully',
            summary: {
              recordsAdded: movedAdded + searchesAdded + errorsAdded,
              movesAdded: movedAdded,
              searchesAdded: searchesAdded,
              errorsAdded: errorsAdded,
              totalRecords: newMoveCount + newSearchCount + newErrorCount,
              timestamp: new Date().toISOString()
            }
          });
        });

      } catch (error) {
        logger.error('Error during import processing:', error);
        sendResponse({
          success: false,
          error: 'Import processing failed: ' + error.message
        });
      }
    });

  } catch (error) {
    logger.error('Error executing import:', error);
    sendResponse({
      success: false,
      error: 'Import execution failed: ' + error.message
    });
  }

  // Return true to indicate we'll send response asynchronously
  return true;
}
