/**
 * Popup UI Script - Shopline Category Manager Statistics Panel
 * Displays category move statistics and provides extension controls
 * Includes import preview UI and execution flow
 */

(function() {
  'use strict';

  const logger = window.ShoplineLogger || console;
  let storageManager = null;
  let autoRefreshInterval = null;
  const AUTO_REFRESH_MS = 2000; // 每 2 秒更新一次統計
  const STATUS_DISPLAY_MS = 3000; // 狀態訊息顯示 3 秒

  // 預覽狀態
  let previewState = {
    validationResult: null,
    selectedFile: null,
    isImporting: false
  };

  /**
   * 初始化彈出窗口
   */
  document.addEventListener('DOMContentLoaded', initializePopup);

  async function initializePopup() {
    logger.log('[Popup] 正在初始化彈出窗口');

    try {
      // 初始化存儲管理器
      storageManager = new window.StorageManager();

      // 綁定主要按鈕事件
      document.getElementById('resetStatsBtn').addEventListener('click', handleResetStats);
      document.getElementById('exportBtn').addEventListener('click', handleExport);
      document.getElementById('importBtn').addEventListener('click', handleImport);
      document.getElementById('settingsBtn').addEventListener('click', handleSettings);
      document.getElementById('importFile').addEventListener('change', handleFileImport);

      // 綁定預覽面板事件
      document.getElementById('closePreviewBtn').addEventListener('click', closePreviewPanel);
      document.getElementById('previewOverlay').addEventListener('click', closePreviewPanel);
      document.getElementById('previewCancelBtn').addEventListener('click', closePreviewPanel);
      document.getElementById('previewSaveBackupBtn').addEventListener('click', handleSaveBackupBeforeImport);
      document.getElementById('previewImportBtn').addEventListener('click', handleConfirmImport);

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
   * 處理文件選擇 - 新的預覽工作流程
   * 讀取文件 → 驗證 → 顯示預覽面板 → 用戶確認 → 執行匯入
   */
  async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    try {
      setButtonLoading('importBtn', true);
      showStatus('正在驗證匯入檔案...', 'loading');

      // 保存文件信息
      previewState.selectedFile = file;

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
        event.target.value = '';
        return;
      }

      // 保存驗證結果並顯示預覽面板
      previewState.validationResult = validationResult;
      showImportPreview(validationResult, file.size);
      showStatus('驗證完成，請檢查匯入預覽', 'success');

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
        { action: 'executeImportData', data: data },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!response || !response.success) {
            reject(new Error(response?.message || '匯入失敗'));
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  /**
   * 顯示匯入預覽面板
   * 顯示資料摘要、衝突列表、合併策略和匯入影響
   */
  function showImportPreview(validationResult, fileSize) {
    const summary = validationResult.summary;

    // 更新資料摘要
    document.getElementById('previewMoves').textContent = summary.moveRecords;
    document.getElementById('previewSearches').textContent = summary.searchQueries;
    document.getElementById('previewErrors').textContent = summary.errorRecords;
    document.getElementById('previewFileSize').textContent = formatFileSize(fileSize);

    // 顯示衝突列表（如果存在）
    if (validationResult.conflictDetected && validationResult.conflicts.length > 0) {
      displayConflicts(validationResult.conflicts);
    } else {
      document.getElementById('conflictsSection').style.display = 'none';
    }

    // 顯示合併策略
    displayMergeStrategy(validationResult.mergeStrategy);

    // 顯示匯入影響
    displayImpactPreview(validationResult);

    // 顯示預覽面板和覆蓋層
    document.getElementById('importPreviewPanel').style.display = 'block';
    document.getElementById('previewOverlay').style.display = 'block';
    document.body.style.overflow = 'hidden';

    logger.log('[Popup] 匯入預覽面板已顯示');
  }

  /**
   * 顯示衝突列表
   */
  function displayConflicts(conflicts) {
    const section = document.getElementById('conflictsSection');
    const list = document.getElementById('conflictsList');
    const count = document.getElementById('conflictCount');

    count.textContent = conflicts.length;
    list.textContent = '';

    const conflictsByType = {};
    conflicts.forEach(conflict => {
      if (!conflictsByType[conflict.type]) {
        conflictsByType[conflict.type] = [];
      }
      conflictsByType[conflict.type].push(conflict);
    });

    Object.entries(conflictsByType).forEach(([_type, items]) => {
      items.forEach(conflict => {
        const item = document.createElement('div');
        item.className = 'conflict-item';

        const severity = conflict.severity || 'INFO';
        const severityClass = severity === 'ERROR' ? 'error' : severity === 'WARNING' ? 'warning' : 'info';
        const severityIcon = severity === 'ERROR' ? '❌' : severity === 'WARNING' ? '⚠️' : 'ℹ️';

        const severityDiv = document.createElement('div');
        severityDiv.className = 'conflict-severity ' + severityClass;
        severityDiv.textContent = severityIcon;

        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'conflict-details';

        const messageDiv = document.createElement('div');
        messageDiv.className = 'conflict-message';
        messageDiv.textContent = conflict.message;

        const resolutionDiv = document.createElement('div');
        resolutionDiv.className = 'conflict-resolution';
        resolutionDiv.textContent = '建議處理: ';
        const strong = document.createElement('strong');
        strong.textContent = conflict.resolution;
        resolutionDiv.appendChild(strong);

        detailsDiv.appendChild(messageDiv);
        detailsDiv.appendChild(resolutionDiv);
        item.appendChild(severityDiv);
        item.appendChild(detailsDiv);

        list.appendChild(item);
      });
    });

    section.style.display = 'block';
  }

  /**
   * 顯示合併策略
   */
  function displayMergeStrategy(strategy) {
    const display = document.getElementById('mergeStrategyDisplay');
    display.textContent = '';

    if (!strategy) {
      const item = document.createElement('div');
      item.className = 'strategy-item';
      const label = document.createElement('span');
      label.className = 'strategy-label';
      label.textContent = '無衝突，直接匯入';
      item.appendChild(label);
      display.appendChild(item);
      return;
    }

    const strategies = [
      { label: '移動記錄', value: strategy.moves },
      { label: '搜尋查詢', value: strategy.searches },
      { label: '錯誤日誌', value: strategy.errors },
      { label: '統計資料', value: strategy.stats }
    ];

    strategies.forEach(s => {
      if (s.value) {
        const item = document.createElement('div');
        item.className = 'strategy-item';

        const label = document.createElement('span');
        label.className = 'strategy-label';
        label.textContent = s.label;

        const value = document.createElement('span');
        value.className = 'strategy-value';
        value.textContent = s.value;

        item.appendChild(label);
        item.appendChild(value);
        display.appendChild(item);
      }
    });
  }

  /**
   * 顯示匯入影響預覽
   */
  function displayImpactPreview(validationResult) {
    const preview = document.getElementById('impactPreview');
    preview.textContent = '';

    const summary = validationResult.summary;
    const impacts = [];

    if (summary.moveRecords > 0) {
      impacts.push({
        type: 'success',
        text: '將新增或合併 ' + summary.moveRecords + ' 筆移動記錄'
      });
    }

    if (summary.searchQueries > 0) {
      impacts.push({
        type: 'success',
        text: '將新增或合併 ' + summary.searchQueries + ' 個搜尋查詢'
      });
    }

    if (validationResult.conflictDetected && validationResult.conflictSummary) {
      const cs = validationResult.conflictSummary;
      if (cs.duplicateMoves > 0) {
        impacts.push({
          type: 'warning',
          text: '將跳過 ' + cs.duplicateMoves + ' 筆重複的移動記錄'
        });
      }
      if (cs.duplicateSearches > 0) {
        impacts.push({
          type: 'warning',
          text: '將跳過 ' + cs.duplicateSearches + ' 個重複的搜尋'
        });
      }
    }

    impacts.push({
      type: 'success',
      text: '預計匯入後保留 ' + (summary.moveRecords + 10) + ' 筆記錄'
    });

    impacts.forEach(impact => {
      const item = document.createElement('div');
      item.className = 'impact-item ' + impact.type;
      item.textContent = impact.text;
      preview.appendChild(item);
    });
  }

  /**
   * 關閉預覽面板
   */
  function closePreviewPanel() {
    document.getElementById('importPreviewPanel').style.display = 'none';
    document.getElementById('previewOverlay').style.display = 'none';
    document.body.style.overflow = 'auto';

    previewState.validationResult = null;
    previewState.selectedFile = null;

    logger.log('[Popup] 預覽面板已關閉');
  }

  /**
   * 保存備份
   */
  async function handleSaveBackupBeforeImport() {
    try {
      setButtonLoading('previewSaveBackupBtn', true);
      showStatus('正在保存備份...', 'loading');

      await handleExport();

      showStatus('備份已保存', 'success');
      logger.log('[Popup] 備份已保存');
    } catch (error) {
      logger.error('[Popup] 保存備份失敗:', error);
      showStatus('備份失敗：' + error.message, 'error');
    } finally {
      setButtonLoading('previewSaveBackupBtn', false);
    }
  }

  /**
   * 確認並執行匯入
   */
  async function handleConfirmImport() {
    if (!previewState.validationResult) {
      showStatus('預覽數據遺失，請重新選擇檔案', 'error');
      return;
    }

    try {
      previewState.isImporting = true;
      setButtonLoading('previewImportBtn', true);

      document.getElementById('progressSection').style.display = 'block';
      updateImportProgress(0, '開始匯入...');

      const validationResult = previewState.validationResult;
      const dataToImport = validationResult.conflictDetected
        ? validationResult.mergedData
        : validationResult.data;

      await performImport(dataToImport);

      updateImportProgress(100, '匯入完成！');

      setTimeout(async () => {
        await loadAndDisplayStats();

        const summary = validationResult.summary;
        const successMsg = '匯入成功！已匯入 ' + summary.moveRecords + ' 筆移動記錄、' + summary.searchQueries + ' 個搜尋';
        showStatus(successMsg, 'success');

        logger.log('[Popup] 匯入完成');

        closePreviewPanel();
      }, 1000);

    } catch (error) {
      logger.error('[Popup] 執行匯入失敗:', error);
      showStatus('匯入失敗：' + error.message, 'error');
      updateImportProgress(0, '匯入失敗');
    } finally {
      previewState.isImporting = false;
      setButtonLoading('previewImportBtn', false);
    }
  }

  /**
   * 更新匯入進度顯示
   */
  function updateImportProgress(percentage, message) {
    const progressSection = document.getElementById('progressSection');
    const progressFill = document.getElementById('progressFill');
    const progressMessage = document.getElementById('progressMessage');

    if (progressSection.style.display !== 'block') {
      progressSection.style.display = 'block';
    }

    progressFill.style.width = percentage + '%';
    progressMessage.textContent = message;

    logger.log('[Popup] 匯入進度:', percentage + '%', message);
  }

  /**
   * 格式化文件大小
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
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
  function _formatConflictSummary(summary) {
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
  function _formatMergeStrategy(strategy) {
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
