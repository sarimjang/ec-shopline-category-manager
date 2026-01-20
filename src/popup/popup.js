/**
 * Popup UI Script - Displays category move statistics and provides controls
 * Updates in real-time from content script events
 */

(function() {
  'use strict';

  const logger = window.ShoplineLogger || console;
  let storageManager = null;

  // Initialize popup on load
  document.addEventListener('DOMContentLoaded', function() {
    initializePopup();
  });

  /**
   * Initialize popup UI
   */
  async function initializePopup() {
    logger.log('[Popup] Initializing');

    // Create storage manager instance
    storageManager = new window.StorageManager();

    // Load stats on popup open
    await loadStats();

    // Attach event listeners
    document.getElementById('resetBtn').addEventListener('click', handleReset);
    document.getElementById('settingsBtn').addEventListener('click', handleSettings);

    // Listen for stat updates from content script
    window.addEventListener('categoryStats', (e) => {
      logger.log('[Popup] Received categoryStats event:', e.detail);
      updateUI(e.detail.stats);
    });

    logger.log('[Popup] Initialized successfully');
  }

  /**
   * Load stats from storage and update UI
   */
  async function loadStats() {
    try {
      const stats = await storageManager.getStats();
      logger.log('[Popup] Stats loaded:', stats);
      updateUI(stats);
    } catch (error) {
      logger.error('[Popup] Error loading stats:', error);
    }
  }

  /**
   * Update UI with stats data
   * @param {Object} stats - Statistics object with totalMoves, totalTimeSaved, lastReset
   */
  function updateUI(stats) {
    const { totalMoves = 0, totalTimeSaved = 0 } = stats;

    // Update total moves
    document.getElementById('totalMoves').textContent = totalMoves;

    // Format time saved: convert seconds to min:sec
    const minutes = Math.floor(totalTimeSaved / 60);
    const seconds = Math.floor(totalTimeSaved % 60);
    document.getElementById('timeSaved').textContent =
      `${minutes} min ${seconds} sec`;

    // Calculate and update average time per move
    const avgSeconds = totalMoves > 0
      ? Math.floor(totalTimeSaved / totalMoves)
      : 0;
    document.getElementById('avgTime').textContent = `${avgSeconds} sec`;

    logger.log('[Popup] UI updated with stats:', { totalMoves, totalTimeSaved, avgSeconds });
  }

  /**
   * Handle reset button click
   */
  async function handleReset() {
    if (confirm('Reset all statistics?')) {
      try {
        const stats = await storageManager.resetStats();
        updateUI(stats);
        showStatus('Stats reset', 'success');
        logger.log('[Popup] Statistics reset');
      } catch (error) {
        logger.error('[Popup] Error resetting stats:', error);
        showStatus('Error resetting stats', 'error');
      }
    }
  }

  /**
   * Handle settings button click
   */
  function handleSettings() {
    showStatus('Settings coming soon', 'error');
  }

  /**
   * Show temporary status message
   * @param {string} message - Status message
   * @param {string} type - Message type: 'success' or 'error'
   */
  function showStatus(message, type = 'success') {
    const el = document.getElementById('status');
    el.textContent = message;
    el.className = `status ${type}`;
    setTimeout(() => {
      el.textContent = '';
      el.className = 'status';
    }, 2000);
    logger.log(`[Popup] Status shown: ${message} (${type})`);
  }
})();
