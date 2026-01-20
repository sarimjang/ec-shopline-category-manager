/**
 * Injected Script - Runs in MAIN world with access to window.angular
 * Defines CategoryManager and communicates with content script
 *
 * 注意: 此腳本運行在頁面上下文（MAIN world），可直接存取 window.angular
 */

(function() {
  'use strict';

  // ============================================
  // CategoryManager 類別定義
  // ============================================

  class CategoryManager {
    constructor($scope, $http) {
      this.$scope = $scope;
      this.$http = $http;
      this.$rootScope = window.angular.injector(['ng', 'app']).get('$rootScope');
      this.categories = [];
      this.stats = {
        totalMoves: 0,
        totalTimeSaved: 0,
        lastReset: new Date().toISOString()
      };
      this.storageManager = new window.StorageManager();

      console.log('[CategoryManager] Initialized');
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
    document.addEventListener('DOMContentLoaded', initializeCategoryManager);
  } else {
    initializeCategoryManager();
  }

  function initializeCategoryManager() {
    try {
      // 存取 AngularJS injector
      const angular = window.angular;
      const injector = angular.injector(['ng', 'app']);
      const $rootScope = injector.get('$rootScope');
      const $http = injector.get('$http');

      // 初始化 CategoryManager
      // 注意: $scope 會在 Phase 1 Task 3 中從實際的控制器取得
      window.categoryManager = new CategoryManager($rootScope, $http);

      console.log('[Injected] CategoryManager successfully initialized');

      // 廣播初始化完成事件
      window.dispatchEvent(
        new CustomEvent('categoryManagerReady', {
          detail: { timestamp: new Date().toISOString() }
        })
      );
    } catch (error) {
      console.error('[Injected] Error initializing CategoryManager:', error);
    }
  }

  console.log('[Injected] Shopline Category Manager injected script loaded');
})();
