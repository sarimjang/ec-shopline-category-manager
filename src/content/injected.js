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
      this.categories = [];
      this.stats = {
        totalMoves: 0,
        timeSaved: 0
      };

      console.log('[CategoryManager] Initialized');
    }

    /**
     * 移動類別到新的父類別和位置
     * Phase 1 Task 3 會實作此方法
     */
    async moveCategory(categoryId, newParent, newPosition) {
      console.log(
        `[CategoryManager] moveCategory called: categoryId=${categoryId}, newParent=${newParent}, newPosition=${newPosition}`
      );
      // 此方法將在 Phase 1 Task 3 中實作
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
     * 廣播統計資訊給 content script
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
