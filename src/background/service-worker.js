/**
 * Background Service Worker - Handles persistent background tasks
 * Manifest V3 requires service workers instead of background pages
 */

'use strict';

const logger = {
  log: (msg, data) => console.log('[SERVICE_WORKER]', msg, data || ''),
  error: (msg, err) => console.error('[SERVICE_WORKER]', msg, err || '')
};

// Initialize service worker
logger.log('Service worker initialized');

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
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
function handleGetCategories(request, sendResponse) {
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
 */
function handleExportData(request, sendResponse) {
  chrome.storage.local.get(null, function(result) {
    sendResponse({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
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

// Handle extension icon click - will open popup.html automatically
chrome.action.onClicked.addListener(function(tab) {
  logger.log('Extension icon clicked');
  // Popup is handled automatically by default_popup in manifest
});
