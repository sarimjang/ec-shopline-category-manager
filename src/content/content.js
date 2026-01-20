/**
 * Content Script - Bridge between Extension context and Page context
 * Runs in isolated world, communicates with injected script in main world
 *
 * 架構:
 * 1. Content script (isolated world) ← can access chrome.runtime
 * 2. Injected script (main world) ← can access window.angular
 * 3. Communication via CustomEvent
 */

(function() {
  'use strict';

  // 1. 偵測是否在 Shopline 類別管理頁面
  function isShoplineCategoryPage() {
    const url = window.location.href;
    const isCorrectPath = url.includes('/admin/') && url.includes('/categories');

    if (!isCorrectPath) {
      console.log('[Content] Not a Shopline category page, skipping initialization');
      return false;
    }

    console.log(`[Content] Loaded on Shopline category page: ${url}`);
    return true;
  }

  // 只在正確的頁面上執行
  if (!isShoplineCategoryPage()) {
    return;
  }

  // 2. 將 injected.js 注入到 MAIN world
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('content/injected.js');
  script.onload = function() {
    this.remove();
  };
  script.onerror = function() {
    console.error('[Content] Failed to load injected script');
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  // 3. 監聽來自 injected script 的類別操作事件
  window.addEventListener('categoryActionMessage', function(event) {
    const { type, data } = event.detail;
    console.log(`[Content] Received categoryActionMessage: type=${type}`, data);

    // 處理類別操作事件（移動、統計更新等）
    // 如果需要，轉發給 background service worker
    if (type === 'CATEGORY_MOVED') {
      // 可以轉發給 background worker 作進一步處理
    } else if (type === 'STATS_UPDATED') {
      // 更新統計資訊
    }
  });

  // 4. 監聽來自 background script 的消息
  chrome.runtime.onMessage.addListener(function(request, _sender, sendResponse) {
    console.log('[Content] Received message from background:', request.type);

    if (request.type === 'GET_PAGE_STATE') {
      // 返回當前的類別資料（如果有的話）
      const pageState = {
        url: window.location.href,
        hasAngular: !!(window.angular), // 這個檢查只能在 injected script 中做
        timestamp: new Date().toISOString()
      };
      sendResponse(pageState);
    }

    return true; // 保持 channel 開放進行異步回應
  });

  console.log('[Content] Shopline Category Manager content script loaded');
})();
