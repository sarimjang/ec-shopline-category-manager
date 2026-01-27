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
   * 支援 JSON 格式匯出，包含所有統計、移動歷史、搜尋歷史和錯誤日誌
   */
  async function handleExport() {
    try {
      setButtonLoading('exportBtn', true);
      showStatus('正在準備匯出...', 'loading');

      // 收集所有需要匯出的數據
      const stats = await storageManager.getStats();
      const moveHistory = await storageManager.getMoveHistory();
      const searchHistory = await storageManager.getSearchHistory();
      const errorLog = await storageManager.getErrorLog();

      // 使用新的匯出格式庫創建匯出數據
      if (!window.ShoplineExportFormats) {
        throw new Error('匯出格式庫未加載');
      }

      // 創建完整的匯出數據結構
      const fullExportData = {
        categoryMoveStats: stats,
        moveHistory: moveHistory,
        searchHistory: searchHistory,
        errorLog: errorLog
      };

      // 生成 JSON 匯出
      const jsonExportData = window.ShoplineExportFormats.createJsonExport(fullExportData);
      const jsonExport = window.ShoplineExportFormats.generateJsonExport(jsonExportData);

      // 觸發下載
      const downloadSuccess = window.ShoplineExportFormats.triggerDownload(
        jsonExport.blob,
        jsonExport.filename
      );

      if (downloadSuccess) {
        // 記錄匯出到歷史
        const exportEntry = {
          timestamp: new Date().toISOString(),
          format: 'JSON',
          filename: jsonExport.filename,
          fileSize: jsonExport.size,
          summary: window.ShoplineExportFormats.getExportSummary(jsonExportData)
        };

        await storageManager.addToHistory('exports', exportEntry);

        // 顯示成功訊息及摘要
        const summary = exportEntry.summary;
        const message = `匯出成功！移動: ${summary.totalMoves}, 搜尋: ${summary.searchQueries}, 錯誤: ${summary.errorRecords}`;
        showStatus(message, 'success');
        logger.log('[Popup] JSON 匯出成功:', exportEntry);
      } else {
        showStatus('匯出失敗：無法觸發下載', 'error');
      }
    } catch (error) {
      logger.error('[Popup] 匯出失敗:', error);
      showStatus('匯出失敗：' + error.message, 'error');
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

  /**
   * 處理文件選擇 - 新的驗證工作流程
   * 現在會先驗證，顯示衝突，然後要求用戶確認
   */
  async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    try {
      setButtonLoading('importBtn', true);
      showStatus('正在驗證匯入檔案...', 'loading');

      // 讀取文件內容
      const content = await file.text();

      // 發送到背景程序進行驗證
      const validationResult = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'validateImportData', jsonString: content },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      });

      if (!validationResult.success) {
        throw new Error(validationResult.error || '驗證失敗');
      }

      // 檢查是否有驗證錯誤
      if (!validationResult.isValid) {
        const errorMessage = formatValidationErrors(validationResult.errors);
        showStatus('驗證失敗：' + errorMessage, 'error');
        logger.error('[Popup] Import validation failed:', validationResult.errors);
        setButtonLoading('importBtn', false);
        event.target.value = '';
        return;
      }

      // 顯示驗證結果摘要
      const summary = validationResult.summary;
      const summaryText = '移動: ' + summary.totalMoves + ' (' + summary.moveRecords + ' 筆記錄)\\n搜尋: ' + summary.searchQueries + ' 個查詢\\n錯誤: ' + summary.errorRecords + ' 筆錯誤日誌';

      // 檢查是否有衝突
      if (validationResult.conflictDetected) {
        const conflictSummary = validationResult.conflictSummary;
        const conflictText = formatConflictSummary(conflictSummary);

        const confirmMessage = '匯入資料驗證成功，但偵測到以下衝突:\\n' + conflictText + '\\n\\n資料摘要:\\n' + summaryText + '\\n\\n合併策略:\\n' + formatMergeStrategy(validationResult.mergeStrategy) + '\\n\\n要繼續匯入嗎?';

        if (!confirm(confirmMessage)) {
          showStatus('匯入已取消', 'error');
          logger.log('[Popup] Import cancelled by user');
          setButtonLoading('importBtn', false);
          event.target.value = '';
          return;
        }

        // 使用合併後的資料
        showStatus('正在匯入並合併資料...', 'loading');
        await performImport(validationResult.mergedData);
      } else {
        // 沒有衝突，直接匯入
        const confirmMessage = '匯入資料驗證成功，準備匯入:\\n' + summaryText + '\\n\\n確認匯入嗎?';

        if (!confirm(confirmMessage)) {
          showStatus('匯入已取消', 'error');
          logger.log('[Popup] Import cancelled by user');
          setButtonLoading('importBtn', false);
          event.target.value = '';
          return;
        }

        showStatus('正在匯入資料...', 'loading');
        await performImport(validationResult.data);
      }

      // 刷新顯示
      await loadAndDisplayStats();
      showStatus('匯入成功', 'success');
      logger.log('[Popup] 匯入成功');
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
   * 執行實際的資料匯入
   */
  async function performImport(data) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'importData', data: data },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!response.success) {
            reject(new Error(response.message || '匯入失敗'));
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * 格式化驗證錯誤訊息
   */
  function formatValidationErrors(errors) {
    if (!errors || errors.length === 0) {
      return '未知錯誤';
    }

    const firstError = errors[0];
    if (errors.length === 1) {
      return firstError.message;
    }

    return firstError.message + ' (及其他 ' + (errors.length - 1) + ' 個錯誤)';
  }

  /**
   * 格式化衝突摘要
   */
  function formatConflictSummary(summary) {
    const conflicts = [];

    if (summary.duplicateMoves > 0) {
      conflicts.push('  - 重複的移動: ' + summary.duplicateMoves);
    }
    if (summary.duplicateSearches > 0) {
      conflicts.push('  - 重複的搜尋: ' + summary.duplicateSearches);
    }
    if (summary.duplicateErrors > 0) {
      conflicts.push('  - 重複的錯誤: ' + summary.duplicateErrors);
    }
    if (summary.versionMismatches > 0) {
      conflicts.push('  - 版本不匹配: ' + summary.versionMismatches);
    }
    if (summary.dataLossRisks > 0) {
      conflicts.push('  - 資料遺失風險: ' + summary.dataLossRisks);
    }

    return conflicts.length > 0 ? conflicts.join('\\n') : '沒有檢測到衝突';
  }

  /**
   * 格式化合併策略
   */
  function formatMergeStrategy(strategy) {
    if (!strategy) {
      return '無';
    }

    const strategies = [];

    if (strategy.moves) {
      strategies.push('  - 移動: ' + strategy.moves);
    }
    if (strategy.searches) {
      strategies.push('  - 搜尋: ' + strategy.searches);
    }
    if (strategy.errors) {
      strategies.push('  - 錯誤: ' + strategy.errors);
    }
    if (strategy.stats) {
      strategies.push('  - 統計: ' + strategy.stats);
    }

    return strategies.length > 0 ? strategies.join('\\n') : '無';
  }
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
