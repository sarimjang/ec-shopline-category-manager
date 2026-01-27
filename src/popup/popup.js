/**
 * Popup UI Script - Shopline Category Manager Statistics Panel
 * Displays category move statistics and provides extension controls
 */

(function() {
  'use strict';

  const logger = window.ShoplineLogger || console;
  let storageManager = null;
  let autoRefreshInterval = null;
  const AUTO_REFRESH_MS = 2000; // 每 2 秒更新一次統計
  const STATUS_DISPLAY_MS = 3000; // 狀態訊息顯示 3 秒

  /**
   * 初始化彈出窗口
   */
  document.addEventListener('DOMContentLoaded', initializePopup);

  async function initializePopup() {
    logger.log('[Popup] 正在初始化彈出窗口');

    try {
      // 初始化存儲管理器
      storageManager = new window.StorageManager();

      // 綁定按鈕事件
      document.getElementById('resetStatsBtn').addEventListener('click', handleResetStats);
      document.getElementById('exportBtn').addEventListener('click', handleExport);
      document.getElementById('importBtn').addEventListener('click', handleImport);
      document.getElementById('settingsBtn').addEventListener('click', handleSettings);
      document.getElementById('importFile').addEventListener('change', handleFileImport);

      // 初次加載統計
      await loadAndDisplayStats();

      // 啟動自動更新
      startAutoRefresh();

      logger.log('[Popup] 彈出窗口初始化完成');
    } catch (error) {
      logger.error('[Popup] 初始化失敗:', error);
      showStatus('初始化失敗', 'error');
    }
  }

  /**
   * 加載並顯示統計數據
   */
  async function loadAndDisplayStats() {
    try {
      const stats = await storageManager.getStats();
      updateStatsDisplay(stats);
    } catch (error) {
      logger.error('[Popup] 加載統計失敗:', error);
      showStatus('無法加載統計', 'error');
    }
  }

  /**
   * 更新統計數據顯示
   * @param {Object} stats - 統計對象
   */
  function updateStatsDisplay(stats) {
    const { totalMoves = 0, totalTimeSaved = 0, lastReset = null } = stats;

    // 總移動次數
    document.getElementById('totalMoves').textContent = totalMoves;

    // 應用高亮或警告樣式
    const totalMovesEl = document.getElementById('totalMoves');
    const totalMovesItem = totalMovesEl.closest('.stat-item');
    if (totalMovesItem) {
      totalMovesItem.classList.remove('highlight', 'warning');
      if (totalMoves > 100) {
        totalMovesItem.classList.add('highlight');
      } else if (totalMoves === 0) {
        totalMovesItem.classList.add('warning');
      }
    }

    // 總節省時間（格式化為分鐘）
    const totalMinutes = Math.floor(totalTimeSaved / 60);
    document.getElementById('totalTime').textContent = totalMinutes + ' 分鐘';

    // 平均每次時間（秒）
    const avgSeconds = totalMoves > 0 ? Math.floor(totalTimeSaved / totalMoves) : 0;
    document.getElementById('avgTime').textContent = avgSeconds + ' 秒';

    // 最後重置時間
    const resetEl = document.getElementById('lastReset');
    if (lastReset) {
      const resetDate = new Date(lastReset);
      const now = new Date();

      // 計算距離現在的時間差
      const diffMs = now - resetDate;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      if (diffDays > 0) {
        resetEl.textContent = diffDays + ' 天前';
      } else if (diffHours > 0) {
        resetEl.textContent = diffHours + ' 小時前';
      } else {
        resetEl.textContent = '剛剛';
      }
    } else {
      resetEl.textContent = '未重置';
    }
  }

  /**
   * 啟動自動更新統計
   */
  function startAutoRefresh() {
    // 清除舊的間隔
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }

    // 設置新的自動更新間隔
    autoRefreshInterval = setInterval(async () => {
      try {
        const stats = await storageManager.getStats();
        updateStatsDisplay(stats);
      } catch (error) {
        logger.warn('[Popup] 自動更新失敗:', error);
      }
    }, AUTO_REFRESH_MS);
  }

  /**
   * 停止自動更新
   */
  function stopAutoRefresh() {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
  }

  /**
   * 處理重置統計按鈕
   */
  async function handleResetStats() {
    if (!confirm('確定要清除所有統計資料嗎？此操作無法撤銷。')) {
      return;
    }

    try {
      setButtonLoading('resetStatsBtn', true);

      const stats = await storageManager.resetStats();
      updateStatsDisplay(stats);

      showStatus('統計已重置', 'success');
      logger.log('[Popup] 統計已重置');
    } catch (error) {
      logger.error('[Popup] 重置失敗:', error);
      showStatus('重置失敗', 'error');
    } finally {
      setButtonLoading('resetStatsBtn', false);
    }
  }

  /**
   * 處理匯出按鈕
   */
  async function handleExport() {
    try {
      setButtonLoading('exportBtn', true);

      const stats = await storageManager.getStats();
      const moveHistory = await storageManager.getMoveHistory();
      const searchHistory = await storageManager.getSearchHistory();

      const exportData = {
        exportDate: new Date().toISOString(),
        stats: stats,
        moveHistory: moveHistory,
        searchHistory: searchHistory
      };

      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = 'shopline-category-stats-' + new Date().toISOString().split('T')[0] + '.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      showStatus('統計已匯出', 'success');
      logger.log('[Popup] 統計已匯出');
    } catch (error) {
      logger.error('[Popup] 匯出失敗:', error);
      showStatus('匯出失敗', 'error');
    } finally {
      setButtonLoading('exportBtn', false);
    }
  }

  /**
   * 處理匯入按鈕
   */
  function handleImport() {
    document.getElementById('importFile').click();
  }

  /**
   * 處理文件選擇
   */
  async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    try {
      setButtonLoading('importBtn', true);
      showStatus('正在匯入...', 'loading');

      const content = await file.text();
      const data = JSON.parse(content);

      // 驗證數據結構
      if (!data.stats || !data.moveHistory) {
        throw new Error('無效的匯入文件格式');
      }

      // 保存匯入的數據
      await storageManager.setStats(data.stats);
      await storageManager.setMoveHistory(data.moveHistory);
      if (data.searchHistory) {
        await storageManager.setSearchHistory(data.searchHistory);
      }

      // 刷新顯示
      await loadAndDisplayStats();

      showStatus('統計已匯入', 'success');
      logger.log('[Popup] 統計已匯入');
    } catch (error) {
      logger.error('[Popup] 匯入失敗:', error);
      showStatus('匯入失敗：' + error.message, 'error');
    } finally {
      setButtonLoading('importBtn', false);
      // 重置文件輸入
      event.target.value = '';
    }
  }

  /**
   * 處理設定按鈕
   */
  function handleSettings() {
    showStatus('設定功能即將推出', 'error');
    // TODO: 在任務 2-P1.5 中實現設定頁面
  }

  /**
   * 顯示狀態訊息
   * @param {string} message - 訊息文本
   * @param {string} type - 訊息類型: 'success', 'error', 'loading'
   */
  function showStatus(message, type = 'success') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;

    // 自動隱藏（除了 loading）
    if (type !== 'loading') {
      setTimeout(() => {
        if (statusEl.textContent === message) {
          statusEl.textContent = '';
          statusEl.className = 'status';
        }
      }, STATUS_DISPLAY_MS);
    }
  }

  /**
   * 設置按鈕加載狀態
   * @param {string} buttonId - 按鈕 ID
   * @param {boolean} isLoading - 是否加載中
   */
  function setButtonLoading(buttonId, isLoading) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = isLoading;
      button.style.opacity = isLoading ? '0.6' : '1';
    }
  }

  /**
   * 清理資源
   */
  window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
  });

  /**
   * 暴露調試接口
   */
  window._popupDebug = {
    loadAndDisplayStats,
    updateStatsDisplay,
    handleResetStats,
    handleExport,
    handleImport,
    handleSettings,
    showStatus,
    getStorageManager: () => storageManager
  };

})();
