/**
 * Injected Script - Runs in MAIN world with access to window.angular
 *
 * 職責:
 * 1. 提供 window._scm_getAngular() 供 content script 使用
 * 2. 提供 window._scm_getScope() 供需要 AngularJS scope 的操作
 * 3. 廣播 categoryManagerReady 事件表示初始化完成
 * 4. 條件性地暴露調試 API（僅在開發構建中）
 *
 * 安全性注意：
 * - 調試 API 只在開發構建中暴露（通過環境變數 NODE_ENV=development）
 * - 生產構建中 DEBUG_APIS_ENABLED 為 false，所有調試代碼被 tree-shaking 移除
 * - 內部 categoryManager 對象保持在閉包中，不暴露給頁面
 */

(function() {
  'use strict';

  // ============================================
  // 環境檢查 - 構建時閘控 (Phase 3.1)
  // ============================================

  /**
   * 構建時環境標誌
   * 此值在編譯時由構建工具注入（例如 webpack DefinePlugin）
   * 開發構建：process.env.NODE_ENV === 'development' → DEBUG_APIS_ENABLED = true
   * 生產構建：process.env.NODE_ENV === 'production' → DEBUG_APIS_ENABLED = false
   *
   * 生產構建時，所有包含 if (DEBUG_APIS_ENABLED) 的代碼段會被 tree-shake 移除
   */
  var DEBUG_APIS_ENABLED = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';

  // ============================================
  // AngularJS 存取介面
  // ============================================

  /**
   * 提供 AngularJS 物件給 content script
   * Content script 通過呼叫此函數取得 window.angular
   *
   * @returns {Object|null} AngularJS 物件，若不可用返回 null
   */
  window._scm_getAngular = function() {
    if (typeof window === 'undefined') {
      console.error('[Injected] window is not defined (unexpected)');
      return null;
    }

    if (!window.angular) {
      console.warn('[Injected] AngularJS not available on window.angular');
      return null;
    }

    if (typeof window.angular.element !== 'function') {
      console.error('[Injected] window.angular found but missing expected methods');
      return null;
    }

    return window.angular;
  };

  /**
   * 取得 AngularJS scope
   * 用於需要直接操作 scope 的情況
   *
   * @param {Element|string} element - DOM 元素或選擇器字符串
   * @returns {Object|null} AngularJS scope 物件，若失敗返回 null
   */
  window._scm_getScope = function(element) {
    const ng = window._scm_getAngular();
    if (!ng) {
      console.error('[Injected] AngularJS not available, cannot get scope');
      return null;
    }

    if (!element) {
      console.error('[Injected] Element parameter is required for getScope');
      return null;
    }

    try {
      let targetElement = element;
      if (typeof element === 'string') {
        targetElement = document.querySelector(element);
        if (!targetElement) {
          console.warn('[Injected] Element not found for selector:', element);
          return null;
        }
      }

      const scope = ng.element(targetElement).scope();

      if (!scope) {
        console.warn('[Injected] No AngularJS scope found on element');
        return null;
      }

      return scope;
    } catch (error) {
      console.error('[Injected] Failed to get scope:', error.message);
      return null;
    }
  };

  console.log('[Injected] AngularJS access functions initialized', {
    getAngularAvailable: typeof window._scm_getAngular === 'function',
    getScopeAvailable: typeof window._scm_getScope === 'function',
    angularPresent: typeof window.angular !== 'undefined'
  });

  // ============================================
  // EVENT LISTENER CLEANUP MECHANISM (Phase 1.4)
  // ============================================

  /**
   * 簡化版事件監聽器管理器（injected.js 版本）
   * 注意：injected.js 在 MAIN world 中運行，與 init.js 分離
   * 需要獨立的清理機制
   */
  class InjectedEventListenerManager {
    constructor() {
      this.listeners = [];
      this.isDestroyed = false;
    }

    /**
     * 註冊事件監聽器並追蹤
     */
    addEventListener(target, eventType, handler, options = {}) {
      if (this.isDestroyed) {
        console.warn('[Injected] Event listener manager destroyed, cannot add new listeners');
        return;
      }

      target.addEventListener(eventType, handler, options);

      this.listeners.push({
        target,
        eventType,
        handler,
        timestamp: new Date().toISOString()
      });

      console.log('[Injected] Registered listener:', eventType, '(total:', this.listeners.length + ')');
    }

    /**
     * 清理所有監聽器
     */
    cleanup() {
      if (this.isDestroyed) {
        return;
      }

      console.log('[Injected] Cleaning up', this.listeners.length, 'event listeners');

      // 移除所有已註冊的監聽器
      this.listeners.forEach(listener => {
        try {
          listener.target.removeEventListener(listener.eventType, listener.handler);
        } catch (e) {
          console.warn('[Injected] Error removing listener:', e);
        }
      });

      this.listeners = [];
      this.isDestroyed = true;
    }

    /**
     * 獲取統計信息
     */
    getStats() {
      return {
        totalListeners: this.listeners.length,
        isDestroyed: this.isDestroyed
      };
    }
  }

  // 全局監聽器管理器（注入的腳本版本）
  const injectedEventManager = new InjectedEventListenerManager();

  // 頁面卸載時清理
  window.addEventListener('beforeunload', () => {
    console.log('[Injected] Page unloading, cleaning up event listeners');
    injectedEventManager.cleanup();
  });

  // 備用清理機制
  window.addEventListener('pagehide', () => {
    console.log('[Injected] Page hidden, cleaning up event listeners');
    injectedEventManager.cleanup();
  });

  console.log('[Injected] Event listener cleanup mechanism initialized');

  // ============================================
  // 讀取 nonce 並驗證完整性
  // ============================================

  /**
   * 從 script 標籤中提取 nonce
   * 這是跨世界通信的安全令牌
   */
  function getNonceFromScriptTag() {
    // 查找當前加載的 script 元素（本文件的來源）
    const scripts = document.querySelectorAll('script');
    for (let script of scripts) {
      if (script.dataset.nonce) {
        return script.dataset.nonce;
      }
    }
    console.warn('[Injected] No nonce found in script tags');
    return null;
  }

  const nonce = getNonceFromScriptTag();
  console.log('[Injected] Nonce extracted from script tag:', nonce ? 'present' : 'missing');

  // ============================================
  // 廣播初始化完成事件
  // ============================================

  window.dispatchEvent(new CustomEvent('categoryManagerReady', {
    detail: {
      timestamp: new Date().toISOString(),
      nonce: nonce
    }
  }));

  console.log('[Injected] categoryManagerReady event broadcasted with nonce');

  // ============================================
  // (舊) CategoryManager 類別定義 (保留供參考)
  // ============================================

  class CategoryManager {
    constructor($scope, $http, $rootScope) {
      this.$scope = $scope;
      this.$http = $http;
      this.$rootScope = $rootScope;
      this.categories = [];
      this.stats = {
        totalMoves: 0,
        totalTimeSaved: 0,
        lastReset: new Date().toISOString()
      };
      this.storageManager = new window.StorageManager();

      console.log('[CategoryManager] Initialized with injected dependencies');
    }

    /**
     * 移動類別到新的父類別和位置
     * 實作包括 API 呼叫、統計更新和事件廣播
     */
    async moveCategory(categoryId, newParent, newPosition) {
      try {
        console.log(
          `[CategoryManager] moveCategory called: categoryId=${categoryId}, newParent=${newParent}, newPosition=${newPosition}`
        );

        // 1. 從 URL 提取 shopId
        const shopId = this.extractShopIdFromUrl();
        if (!shopId) throw new Error('Cannot extract shopId from URL');

        console.log(`[CategoryManager] Extracted shopId: ${shopId}`);

        // 2. 建立 API 請求載荷
        const payload = {
          parent: newParent,
          ancestor: newParent, // Shopline API 期望兩者都存在
          descendant: categoryId
        };

        console.log('[CategoryManager] API payload:', payload);

        // 3. 呼叫 Shopline API（含 200ms 保守延遲）
        const response = await this.callApiWithDelay(
          `PUT /api/admin/v1/${shopId}/categories/${categoryId}/ordering`,
          payload
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        console.log('[CategoryManager] API call successful');

        // 4. 更新本地狀態
        this.updateLocalState(categoryId, newParent, newPosition);

        // 5. 觸發 AngularJS $apply() 以更新 DOM
        try {
          this.$rootScope.$apply();
          console.log('[CategoryManager] AngularJS $apply() triggered');
        } catch (error) {
          console.warn('[CategoryManager] $apply() may have failed (digest already in progress):', error);
        }

        // 6. 計算節省的時間
        const targetLevel = this.getTargetLevel(newParent);
        const timeSaved = this.calculateTimeSaved(this.categories.length, targetLevel);

        // 7. 更新統計並存儲
        const newStats = await this.storageManager.addMove(timeSaved);
        this.stats = newStats;

        console.log('[CategoryManager] Stats updated:', this.stats);

        // 8. 廣播統計到 popup
        this.broadcastStats();

        return { success: true, timeSaved, stats: newStats };
      } catch (error) {
        console.error('[CategoryManager] Move failed:', error);
        this.broadcastError(error.message);
        throw error;
      }
    }

    /**
     * 從 URL 提取 shopId
     * 格式: /admin/{shopId}/categories
     */
    extractShopIdFromUrl() {
      const match = window.location.pathname.match(/\/admin\/([^\/]+)\/categories/);
      return match ? match[1] : null;
    }

    /**
     * 呼叫 Shopline API，帶有保守延遲
     * @param {string} endpoint - 格式: "PUT /api/admin/v1/..."
     * @param {Object} payload - 請求載荷
     */
    async callApiWithDelay(endpoint, payload) {
      // 等待 200ms（保守速率限制）
      await new Promise(r => setTimeout(r, 200));

      // 簡單 fetch 呼叫（Phase 2 才加重試邏輯）
      const parts = endpoint.split(' ');
      const method = parts[0];
      const path = parts[1];
      const url = `https://${window.location.host}${path}`;

      console.log(`[CategoryManager] Calling API: ${method} ${url}`);

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      return response;
    }

    /**
     * 更新本地類別狀態
     * 在實際的樹形結構中找到類別並更新其父節點和位置
     */
    updateLocalState(categoryId, newParent, newPosition) {
      // 此為簡化實作 - 實際應根據目前的資料結構進行遞迴搜索
      console.log(`[CategoryManager] Updating local state: categoryId=${categoryId}, newParent=${newParent}, newPosition=${newPosition}`);
      // TODO: 根據實際的類別樹結構實作
    }

    /**
     * 取得目標父節點的層級
     * 1 = 根層級, 2 = 根的子節點, 3 = 孫節點等
     */
    getTargetLevel(parentId) {
      // 此為簡化實作 - 應根據實際樹形結構計算深度
      if (!parentId) return 1; // 根層級
      return 2; // 預設為第二層（需根據樹結構改進）
    }

    /**
     * 計算節省的時間
     *
     * 公式 (from design.md):
     * - visual: sqrt(categoryCount) * 0.3
     * - scroll: categoryCount * 0.05
     * - alignment: targetLevel * 1.5
     * - tool overhead: 2.5s (search) or 3.5s (browse)
     */
    calculateTimeSaved(categoryCount, targetLevel) {
      const visual = Math.sqrt(categoryCount) * 0.3;
      const scroll = categoryCount * 0.05;
      const alignment = targetLevel * 1.5;
      const toolOverhead = 2.5; // search 模式

      const totalTime = visual + scroll + alignment + toolOverhead;

      console.log(
        `[CategoryManager] Time saved calculation: ${totalTime.toFixed(2)}s (categories=${categoryCount}, level=${targetLevel})`
      );

      return totalTime;
    }

    /**
     * 廣播統計資訊給 content script 和 popup
     * 使用 CustomEvent 進行跨世界通信
     */
    broadcastStats() {
      const statsEvent = new CustomEvent('categoryStats', {
        detail: {
          stats: this.stats,
          timestamp: new Date().toISOString()
        }
      });

      window.dispatchEvent(statsEvent);
      console.log('[CategoryManager] Broadcasting stats:', this.stats);
    }

    /**
     * 廣播錯誤事件
     */
    broadcastError(message) {
      const errorEvent = new CustomEvent('categoryError', {
        detail: {
          error: message,
          timestamp: new Date().toISOString()
        }
      });

      window.dispatchEvent(errorEvent);
      console.error('[CategoryManager] Broadcasting error:', message);
    }

    /**
     * 廣播類別操作事件
     */
    broadcastCategoryAction(type, data) {
      const actionEvent = new CustomEvent('categoryActionMessage', {
        detail: {
          type: type,
          data: data,
          timestamp: new Date().toISOString()
        }
      });

      window.dispatchEvent(actionEvent);
      console.log(`[CategoryManager] Broadcasting action: ${type}`, data);
    }
  }

  // ============================================
  // 初始化 AngularJS 存取
  // ============================================

  if (!window.angular) {
    console.error('[Injected] AngularJS not found on page');
    return;
  }

  console.log('[Injected] AngularJS found, initializing CategoryManager');

  // 在 DOM 完全載入後初始化
  if (document.readyState === 'loading') {
    injectedEventManager.addEventListener(document, 'DOMContentLoaded', initializeCategoryManager);
  } else {
    initializeCategoryManager();
  }

  function initializeCategoryManager() {
    try {
      // 正確方式獲取現有的 AngularJS injector（不是創建新的）
      const angular = window.angular;
      let injector;

      // 嘗試從 document.body 獲取已初始化的 injector
      try {
        injector = angular.element(document.body).injector();
      } catch (e) {
        // 如果失敗，嘗試從 document 元素獲取
        console.warn('[Injected] Failed to get injector from body, trying document');
        injector = angular.element(document).injector();
      }

      if (!injector) {
        throw new Error('Cannot get AngularJS injector from page');
      }

      const $rootScope = injector.get('$rootScope');
      const $http = injector.get('$http');

      // 初始化 CategoryManager（私密，不暴露於全局）
      const categoryManager = new CategoryManager(null, $http, $rootScope);

      console.log('[Injected] CategoryManager successfully initialized');

      // ============================================
      // Phase 3.1: 構建時調試 API 閘控
      // ============================================
      // 只在開發構建中暴露調試接口
      // 生產構建中，此段代碼完全被移除（tree-shake）

      if (DEBUG_APIS_ENABLED) {
        // 開發構建：暴露調試接口
        window.debugCategoryManager = {
          moveCategory: function(categoryId, newParent, newPosition) {
            return categoryManager.moveCategory(categoryId, newParent, newPosition);
          },
          undo: function() {
            console.log('[Debug] Undo action - not yet implemented');
            return Promise.resolve({ success: false, message: 'Undo not implemented' });
          },
          redo: function() {
            console.log('[Debug] Redo action - not yet implemented');
            return Promise.resolve({ success: false, message: 'Redo not implemented' });
          },
          getState: function() {
            return {
              categories: categoryManager.categories || [],
              stats: categoryManager.stats || {},
              timestamp: new Date().toISOString()
            };
          }
        };
        console.log('[Injected] Debug API enabled (development build)');
      } else {
        // 生產構建：確保調試 API 不存在
        // 明確刪除以防止意外暴露
        if (window.debugCategoryManager) {
          delete window.debugCategoryManager;
        }
        if (window.categoryManager) {
          delete window.categoryManager;
        }
      }

      // 注意：即使在開發模式下，內部 categoryManager 也不暴露
      // 所有生產通信通過消息傳遞（messaging）進行
      // 若需要測試，請使用瀏覽器控制台的 chrome.runtime.sendMessage() 命令

      // 廣播初始化完成事件（包含 nonce 作為安全驗證）
      window.dispatchEvent(
        new CustomEvent('categoryManagerReady', {
          detail: {
            timestamp: new Date().toISOString(),
            nonce: nonce
          }
        })
      );
    } catch (error) {
      console.error('[Injected] Error initializing CategoryManager:', error);
      console.error('[Injected] Stack trace:', error.stack);
    }
  }

  // ============================================
  // 跨世界通信驗證與狀態暴露
  // ============================================

  window._scm_injected_status = function() {
    return {
      injected_ready: true,
      angular_available: typeof window.angular !== 'undefined',
      functions_exposed: {
        getAngular: typeof window._scm_getAngular === 'function',
        getScope: typeof window._scm_getScope === 'function'
      },
      timestamp: new Date().toISOString()
    };
  };

  const status = window._scm_injected_status();
  console.log('[Injected] Status check:', {
    ready: status.injected_ready,
    angular: status.angular_available,
    functionsExposed: status.functions_exposed,
    timestamp: status.timestamp
  });

  if (!status.functions_exposed.getAngular || !status.functions_exposed.getScope) {
    console.error('[Injected] WARNING: Expected functions not properly exposed!', {
      getAngular: status.functions_exposed.getAngular,
      getScope: status.functions_exposed.getScope
    });
  }

  console.log('[Injected] Shopline Category Manager injected script loaded');
})();
