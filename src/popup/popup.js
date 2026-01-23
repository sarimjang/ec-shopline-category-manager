/**
 * Popup UI Script - Displays category move statistics and provides controls
 */
(function() {
  'use strict';

  const logger = window.ShoplineLogger || console;
  let storageManager = null;
  let searchDebounceTimer = null;
  const SEARCH_DEBOUNCE_MS = 300;

  const mockCategories = [
    { id: 1, name: '服裝', path: '服裝' },
    { id: 2, name: '鞋類', path: '服裝 > 鞋類' },
    { id: 3, name: '電子產品', path: '電子產品' },
    { id: 4, name: '手機', path: '電子產品 > 手機' },
    { id: 5, name: '配件', path: '電子產品 > 配件' },
    { id: 6, name: '家居用品', path: '家居用品' },
    { id: 7, name: '廚房', path: '家居用品 > 廚房' },
    { id: 8, name: '浴室', path: '家居用品 > 浴室' },
  ];

  const VALIDATION_STEPS = [
    { number: 1, label: 'Input validation' },
    { number: 2, label: 'Pre-flight check' },
    { number: 3, label: 'Scope verification' },
    { number: 4, label: 'Tree validation' },
    { number: 5, label: 'Permission check' },
    { number: 6, label: 'API request' },
    { number: 7, label: 'Response verification' },
    { number: 8, label: 'Post-move verification' }
  ];

  document.addEventListener('DOMContentLoaded', initializePopup);

  async function initializePopup() {
    logger.log('[Popup] Initializing');
    storageManager = new window.StorageManager();
    await loadStats();
    await loadSearchHistory();
    await loadErrorLog();
    initValidationSteps();

    document.getElementById('resetBtn').addEventListener('click', handleReset);
    document.getElementById('settingsBtn').addEventListener('click', handleSettings);
    document.getElementById('searchInput').addEventListener('input', handleSearchInput);
    document.getElementById('clearHistory').addEventListener('click', handleClearHistory);
    document.getElementById('clearErrors').addEventListener('click', handleClearErrors);

    window.addEventListener('categoryStats', (e) => {
      updateUI(e.detail.stats);
    });
  }

  async function loadStats() {
    try {
      const stats = await storageManager.getStats();
      updateUI(stats);
    } catch (error) {
      logger.error('[Popup] Error loading stats:', error);
    }
  }

  function updateUI(stats) {
    const { totalMoves = 0, totalTimeSaved = 0 } = stats;
    document.getElementById('totalMoves').textContent = totalMoves;
    const minutes = Math.floor(totalTimeSaved / 60);
    const seconds = Math.floor(totalTimeSaved % 60);
    document.getElementById('timeSaved').textContent = minutes + ' min ' + seconds + ' sec';
    const avgSeconds = totalMoves > 0 ? Math.floor(totalTimeSaved / totalMoves) : 0;
    document.getElementById('avgTime').textContent = avgSeconds + ' sec';
  }

  async function handleReset() {
    if (confirm('Reset all statistics?')) {
      try {
        const stats = await storageManager.resetStats();
        updateUI(stats);
        showStatus('Stats reset', 'success');
      } catch (error) {
        showStatus('Error resetting stats', 'error');
      }
    }
  }

  function handleSettings() {
    showStatus('Settings coming soon', 'error');
  }

  function handleSearchInput(event) {
    const query = event.target.value.trim();
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      performSearch(query);
    }, SEARCH_DEBOUNCE_MS);
  }

  async function performSearch(query) {
    const resultsContainer = document.getElementById('searchResults');
    if (!query) {
      resultsContainer.innerHTML = '';
      return;
    }

    await storageManager.recordSearchQuery(query);
    await loadSearchHistory();

    const lowerQuery = query.toLowerCase();
    const results = mockCategories.filter(cat =>
      cat.name.toLowerCase().includes(lowerQuery) ||
      cat.path.toLowerCase().includes(lowerQuery)
    );

    displaySearchResults(results);
  }

  function displaySearchResults(results) {
    const container = document.getElementById('searchResults');
    if (results.length === 0) {
      container.textContent = '';
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.textContent = 'No results';
      container.appendChild(noResults);
      return;
    }

    container.innerHTML = '';
    results.forEach(cat => {
      const item = document.createElement('div');
      item.className = 'result-item';
      item.setAttribute('data-category-id', cat.id);
      const name = document.createElement('strong');
      name.textContent = cat.name;
      const br = document.createElement('br');
      const path = document.createElement('span');
      path.style.fontSize = '10px';
      path.style.color = '#9ca3af';
      path.textContent = cat.path;
      item.appendChild(name);
      item.appendChild(br);
      item.appendChild(path);
      container.appendChild(item);
    });
  }

  async function loadSearchHistory() {
    try {
      const history = await storageManager.getSearchHistory();
      const recentHistory = history.slice(0, 10);
      const container = document.getElementById('historyList');

      if (recentHistory.length === 0) {
        container.innerHTML = '';
        return;
      }

      container.innerHTML = '';
      recentHistory.forEach((query, index) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.textContent = query;
        item.addEventListener('click', () => {
          document.getElementById('searchInput').value = recentHistory[index];
          performSearch(recentHistory[index]);
        });
        container.appendChild(item);
      });
    } catch (error) {
      logger.error('[Popup] Error loading search history:', error);
    }
  }

  async function handleClearHistory() {
    if (confirm('Clear all search history?')) {
      try {
        await storageManager.setSearchHistory([]);
        await loadSearchHistory();
        showStatus('Search history cleared', 'success');
      } catch (error) {
        showStatus('Failed to clear history', 'error');
      }
    }
  }

  async function loadErrorLog() {
    try {
      const errors = await storageManager.getErrorLog();
      const recentErrors = errors.slice(0, 10);
      displayErrorLog(recentErrors);
    } catch (error) {
      logger.error('[Popup] Error loading error log:', error);
    }
  }

  function displayErrorLog(errors) {
    const container = document.getElementById('errorList');

    if (errors.length === 0) {
      container.innerHTML = '';
      const noErrors = document.createElement('div');
      noErrors.className = 'no-errors';
      noErrors.textContent = 'No errors';
      container.appendChild(noErrors);
      return;
    }

    container.innerHTML = '';
    errors.forEach(err => {
      const errorType = err.type || 'unknown';
      const time = new Date(err.timestamp).toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const item = document.createElement('div');
      item.className = 'error-item error-' + errorType;

      const timeSpan = document.createElement('span');
      timeSpan.className = 'error-time';
      timeSpan.textContent = time;

      const typeSpan = document.createElement('span');
      typeSpan.className = 'error-type';
      typeSpan.textContent = errorType.toUpperCase();

      const msgSpan = document.createElement('span');
      msgSpan.className = 'error-message';
      msgSpan.textContent = err.message;

      item.appendChild(timeSpan);
      item.appendChild(typeSpan);
      item.appendChild(msgSpan);
      container.appendChild(item);
    });
  }

  async function handleClearErrors() {
    if (confirm('Clear all error logs?')) {
      try {
        await storageManager.setErrorLog([]);
        await loadErrorLog();
        showStatus('Error log cleared', 'success');
      } catch (error) {
        showStatus('Failed to clear errors', 'error');
      }
    }
  }

  function initValidationSteps() {
    const container = document.getElementById('validationSteps');
    container.innerHTML = '';

    VALIDATION_STEPS.forEach(step => {
      const stepDiv = document.createElement('div');
      stepDiv.className = 'validation-step pending';
      stepDiv.setAttribute('data-step', step.number);

      const numSpan = document.createElement('span');
      numSpan.className = 'step-number';
      numSpan.textContent = step.number;

      const labelSpan = document.createElement('span');
      labelSpan.className = 'step-label';
      labelSpan.textContent = step.label;

      const statusSpan = document.createElement('span');
      statusSpan.className = 'step-status';
      statusSpan.textContent = '⬜';

      stepDiv.appendChild(numSpan);
      stepDiv.appendChild(labelSpan);
      stepDiv.appendChild(statusSpan);
      container.appendChild(stepDiv);
    });

    const statusEl = document.getElementById('validationStatus');
    statusEl.className = 'status-message idle';
    statusEl.textContent = 'Waiting for move operation...';
  }

  function updateValidationStep(stepNumber, state) {
    const stepEl = document.querySelector('.validation-step[data-step="' + stepNumber + '"]');
    if (!stepEl) return;

    stepEl.classList.remove('pending', 'running', 'success', 'error');
    stepEl.classList.add(state);

    const statusIcon = { pending: '⬜', running: '⏳', success: '✅', error: '❌' };
    stepEl.querySelector('.step-status').textContent = statusIcon[state] || '⬜';
  }

  function displayValidationProgress(moveOperation) {
    const { currentStep, status, message } = moveOperation;
    if (currentStep) updateValidationStep(currentStep, status || 'running');
    const statusEl = document.getElementById('validationStatus');
    statusEl.className = 'status-message ' + (status || 'running');
    statusEl.textContent = message || 'Processing...';
  }

  function simulateValidation() {
    let step = 1;
    const interval = setInterval(() => {
      if (step > 8) {
        clearInterval(interval);
        document.getElementById('validationStatus').className = 'status-message success';
        document.getElementById('validationStatus').textContent = 'Move complete';
        return;
      }
      updateValidationStep(step, 'running');
      setTimeout(() => { 
        updateValidationStep(step, 'success');
        step++;
      }, 300);
    }, 600);
  }

  function showStatus(message, type) {
    type = type || 'success';
    const el = document.getElementById('status');
    el.textContent = message;
    el.className = 'status ' + type;
    setTimeout(() => {
      el.textContent = '';
      el.className = 'status';
    }, 2000);
  }

  window._popupDebug = {
    simulateValidation,
    updateValidationStep,
    displayValidationProgress,
    loadErrorLog,
    loadSearchHistory
  };
})();
