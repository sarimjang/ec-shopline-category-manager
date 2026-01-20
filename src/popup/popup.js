/**
 * Popup UI Script - Handles user interactions in the extension popup
 * Communicates with background service worker
 */

(function() {
  'use strict';

  const logger = window.ShoplineLogger || console;

  // Initialize popup on load
  document.addEventListener('DOMContentLoaded', function() {
    initializePopup();
  });

  /**
   * Initialize popup UI
   */
  function initializePopup() {
    logger.log('Popup initialized');

    // Load settings from storage
    loadSettings();

    // Attach event listeners
    document.getElementById('export-btn').addEventListener('click', handleExport);
    document.getElementById('import-btn').addEventListener('click', handleImport);
    document.getElementById('auto-save').addEventListener('change', handleSettingsChange);

    // Update status
    updateStatus('Ready');
  }

  /**
   * Load settings from chrome.storage.local
   */
  function loadSettings() {
    chrome.storage.local.get(['autoSave'], function(result) {
      const autoSave = result.autoSave || false;
      document.getElementById('auto-save').checked = autoSave;
    });
  }

  /**
   * Handle export button click
   */
  function handleExport() {
    logger.log('Export clicked');
    updateStatus('Exporting categories...');

    // Placeholder - actual implementation in Phase 01-02
    setTimeout(() => {
      updateStatus('Export complete');
    }, 1000);
  }

  /**
   * Handle import button click
   */
  function handleImport() {
    logger.log('Import clicked');
    updateStatus('Importing categories...');

    // Placeholder - actual implementation in Phase 01-02
    setTimeout(() => {
      updateStatus('Import complete');
    }, 1000);
  }

  /**
   * Handle settings change
   */
  function handleSettingsChange(event) {
    const autoSave = event.target.checked;
    chrome.storage.local.set({ autoSave: autoSave }, function() {
      logger.log('Setting saved: autoSave =', autoSave);
    });
  }

  /**
   * Update status message
   */
  function updateStatus(message) {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
      const paragraph = statusDiv.querySelector('p') || document.createElement('p');
      paragraph.textContent = message;
      if (!statusDiv.querySelector('p')) {
        statusDiv.appendChild(paragraph);
      }
    }
  }
})();
