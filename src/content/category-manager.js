/**
 * Category Manager - Chrome Extension Content Script
 * 
 * 從 Greasemonkey UserScript 遷移而來的分類管理邏輯
 * 核心職責：
 * 1. 分類樹結構操作和搜尋
 * 2. 時間節省追蹤和統計
 * 3. 分類管理 UI 注入和事件處理
 * 
 * Migrated from: src/shopline-category-manager.user.js
 * Phase: Migration to Chrome Extension content script
 */

'use strict';

// ============================================================================
// 工具函數：樹結構操作
// ============================================================================

/**
 * 取得分類的所有後代分類（遞迴）
 * @param {Object} category - 分類物件
 * @returns {Array} 所有後代分類陣列
 */
function getAllDescendants(category) {
  if (!category || !category.children) {
    return [];
  }

  let descendants = [...category.children];
  for (let child of category.children) {
    descendants = descendants.concat(getAllDescendants(child));
  }
  return descendants;
}

/**
 * 檢查一個分類是否為另一個分類的子孫
 * @param {Object} potentialAncestor - 可能是祖先的分類
 * @param {Object} potentialDescendant - 可能是後代的分類
 * @returns {boolean} 是否為後代關係
 */
function isDescendant(potentialAncestor, potentialDescendant) {
  const descendants = getAllDescendants(potentialAncestor);
  return descendants.some((category) => category === potentialDescendant);
}

/**
 * 遞迴計算分類的層級（1 = 根層級）
 * @param {Array} categories - 要搜尋的分類陣列
 * @param {Object} targetCategory - 目標分類物件
 * @param {number} currentLevel - 當前層級（內部遞迴參數，預設 1）
 * @returns {number} 分類層級，或 -1 如果未找到
 */
function getCategoryLevel(categories, targetCategory, currentLevel = 1) {
  if (!categories || !Array.isArray(categories)) {
    return -1;
  }

  for (const category of categories) {
    if (category === targetCategory) {
      return currentLevel;
    }

    if (category.children && Array.isArray(category.children)) {
      const level = getCategoryLevel(
        category.children,
        targetCategory,
        currentLevel + 1
      );
      if (level !== -1) {
        return level;
      }
    }
  }

  return -1;
}

/**
 * 取得分類的所有子孫（遞迴，包括自己）
 * @param {Object} category - 分類物件
 * @returns {Array} 該分類及其所有後代的陣列
 */
function getCategoryDescendants(category) {
  const descendants = [category];

  if (category.children && Array.isArray(category.children)) {
    category.children.forEach((child) => {
      descendants.push(...getCategoryDescendants(child));
    });
  }

  return descendants;
}

/**
 * 計算時間節省（非線性成長模型）
 *
 * 模型設計：
 * - 視覺搜尋：sqrt(categoryCount) - 認知心理學研究表明視覺搜尋時間呈次線性成長
 * - 捲動時間：線性成長 - 捲動距離正比於分類數
 * - 對齊時間：層級越深越困難
 *
 * @param {number} categoryCount - 分類總數（影響視覺搜尋和捲動時間）
 * @param {number} targetLevel - 目標層級 1-3（影響對齊難度）
 * @param {boolean} usedSearch - 是否使用搜尋功能
 * @returns {{dragTime: number, toolTime: number, timeSaved: number}}
 */
function calculateTimeSaved(categoryCount, targetLevel, usedSearch) {
  // 時間組成部分
  const baseTime = 2;                                    // 基礎操作時間（抓取 + 放開 + 確認）
  const visualSearchTime = Math.sqrt(categoryCount) * 0.3; // 視覺搜尋時間（非線性）
  const scrollTime = categoryCount * 0.05;               // 捲動時間（線性）
  const alignmentTime = targetLevel * 1.5;               // 對齊時間（層級影響）

  const dragTime = baseTime + visualSearchTime + scrollTime + alignmentTime;

  // 工具時間 = 2.5秒（使用搜尋）或 3.5秒（瀏覽選單）
  const toolTime = usedSearch ? 2.5 : 3.5;

  // 節省時間 = max(0, 拖動時間 - 工具時間)
  const timeSaved = Math.max(0, dragTime - toolTime);

  return {
    dragTime: Math.round(dragTime * 10) / 10,  // 四捨五入到小數點一位
    toolTime: Math.round(toolTime * 10) / 10,
    timeSaved: Math.round(timeSaved * 10) / 10
  };
}

// ============================================================================
// 時間節省追蹤類
// ============================================================================

/**
 * TimeSavingsTracker - 追蹤並持久化時間節省統計
 * 使用 chrome.storage.local API 來代替 localStorage
 */
class TimeSavingsTracker {
  constructor() {
    this.storageKey = 'categoryMoveStats';
    this.stats = this.loadStats();
  }

  /**
   * 從 chrome.storage.local 載入統計數據（同步初始化，返回預設值）
   * 實際的非同步載入應該在外部調用 loadStatsAsync()
   */
  loadStats() {
    // 返回預設值；實際載入在 loadStatsAsync() 進行
    return {
      totalMoves: 0,
      totalTimeSaved: 0,
      lastReset: new Date().toISOString()
    };
  }

  /**
   * 異步載入統計數據 - 必須在初始化時調用
   * @returns {Promise<Object>} 載入的統計數據
   */
  async loadStatsAsync() {
    try {
      if (!window.StorageClient) {
        console.warn('[TimeSavingsTracker] StorageClient not available');
        return this.stats;
      }

      const result = await window.StorageClient.get(this.storageKey);
      if (result && result[this.storageKey]) {
        this.stats = result[this.storageKey];
        console.log('[TimeSavingsTracker] Stats loaded:', this.stats);
        return this.stats;
      }
    } catch (error) {
      console.warn('[TimeSavingsTracker] 異步載入統計失敗:', error);
    }

    // 預設值
    return {
      totalMoves: 0,
      totalTimeSaved: 0,
      lastReset: new Date().toISOString()
    };
  }

  /**
   * 儲存統計數據到 chrome.storage.local
   * @returns {Promise<void>}
   */
  async saveStats() {
    try {
      if (!window.StorageClient) {
        console.warn('[TimeSavingsTracker] StorageClient not available for saving');
        return;
      }

      await window.StorageClient.set(this.storageKey, this.stats);
      console.log('[TimeSavingsTracker] Stats saved:', this.stats);
    } catch (error) {
      console.warn('[TimeSavingsTracker] 儲存統計失敗:', error);
    }
  }

  /**
   * 記錄單次移動並更新統計
   *
   * @param {number} categoryCount - 分類總數
   * @param {number} targetLevel - 目標層級
   * @param {boolean} usedSearch - 是否使用搜尋
   * @returns {Promise<{thisMove: number, totalMoves: number, totalTime: number}>}
   */
  async recordMove(categoryCount, targetLevel, usedSearch) {
    const result = calculateTimeSaved(categoryCount, targetLevel, usedSearch);

    this.stats.totalMoves += 1;
    this.stats.totalTimeSaved += result.timeSaved;
    await this.saveStats();

    return {
      thisMove: result.timeSaved,
      totalMoves: this.stats.totalMoves,
      totalTime: this.stats.totalTimeSaved
    };
  }

  /**
   * 取得格式化的統計數據
   *
   * @returns {{totalMoves: number, totalSeconds: number, totalMinutes: number, avgPerMove: number, startDate: string}}
   */
  getStats() {
    const totalSeconds = Math.round(this.stats.totalTimeSaved * 10) / 10;
    const totalMinutes = Math.round((this.stats.totalTimeSaved / 60) * 10) / 10;
    const avgPerMove = this.stats.totalMoves > 0
      ? Math.round((this.stats.totalTimeSaved / this.stats.totalMoves) * 10) / 10
      : 0;

    return {
      totalMoves: this.stats.totalMoves,
      totalSeconds,
      totalMinutes,
      avgPerMove,
      startDate: this.stats.lastReset.split('T')[0] // 只取日期部分
    };
  }

  /**
   * 顯示格式化的統計訊息（用於 alert）
   * @returns {string} 格式化的統計訊息
   */
  showStats() {
    const stats = this.getStats();
    const minutes = Math.floor(stats.totalSeconds / 60);
    const seconds = Math.round(stats.totalSeconds % 60);

    return `━━━━━━━━━━━━━━━━
📊 時間節省統計
────────────────
總移動次數: ${stats.totalMoves} 次
節省時間: ${minutes} 分 ${seconds} 秒
平均每次: ${stats.avgPerMove} 秒
開始日期: ${stats.startDate}
━━━━━━━━━━━━━━━━`;
  }

  /**
   * 重置所有統計數據
   * @returns {Promise<void>}
   */
  async resetStats() {
    this.stats = {
      totalMoves: 0,
      totalTimeSaved: 0,
      lastReset: new Date().toISOString()
    };
    await this.saveStats();
  }
}

// ============================================================================
// 分類管理工具類
// ============================================================================

/**
 * CategoryManager - 管理 Shopline 分類的主要邏輯類
 * 
 * 核心功能：
 * 1. 分類搜尋和查詢（按名稱、ID、層級等）
 * 2. 分類樹結構操作和驗證
 * 3. 時間節省追蹤
 * 4. UI 按鈕注入和事件處理
 */
class CategoryManager {
  // ============================================================================
  // 常數定義 (Issue #10: 移除魔法數字)
  // ============================================================================
  
  static SEARCH_DEBOUNCE_MS = 300;           // 搜尋 debounce 延遲（毫秒）
  static BINDING_STALENESS_MS = 30000;       // 綁定陳舊性閾值（30秒）
  static TOAST_SUCCESS_DURATION_MS = 3500;   // 成功訊息顯示時間
  static TOAST_ERROR_DURATION_MS = 3000;     // 錯誤訊息顯示時間
  static TOAST_WARNING_DURATION_MS = 4000;   // 警告訊息顯示時間
  static TOAST_Z_INDEX = 2000;               // 訊息提示 Z-index
  static DROPDOWN_Z_INDEX = 10000;           // 下拉菜單 Z-index（須高於 toast）
  static UI_INIT_TIMEOUT_MS = 5000;          // UI 初始化超時（毫秒）
  static TREE_NODES_TIMEOUT_MS = 15000;      // 樹節點載入超時（毫秒）
  static WAIT_ELEMENT_TIMEOUT_MS = 10000;    // 等待元素超時預設值（毫秒）
  static BUTTON_MARGIN_RIGHT_PX = '8px';     // 按鈕間距

  /**
   * 初始化 CategoryManager
   * @param {Object} scope - AngularJS scope 物件（來自頁面）
   */
  constructor(scope) {
    this.scope = scope;
    this.categories = scope.categories || [];
    this.posCategories = scope.posCategories || [];
    this.isMoving = false;
    this.buttonCategoryMap = new WeakMap();
    
    // Issue #5: 儲存 MutationObserver 實例以便清理
    this.domObserver = null;

    // 初始化時間追蹤器
    this.tracker = new TimeSavingsTracker();

    // 搜尋使用標記
    this._lastMoveUsedSearch = false;

    console.log('[CategoryManager] Initialized with', {
      categoryCount: this.categories.length,
      posCategoryCount: this.posCategories.length
    });
  }

  /**
   * 清理分類名稱以防止 XSS (Issue #4: XSS protection)
   * 移除可能有害的字符如 < >
   * @param {string} name - 原始名稱
   * @returns {string} 清理後的名稱
   */
  sanitizeCategoryName(name) {
    if (!name || typeof name !== 'string') {
      return name;
    }
    // 移除 < > 字符以防止 HTML 注入
    return name.replace(/[<>]/g, '');
  }

  /**
   * 取得分類的顯示名稱
   * 優先級: name > name_translations > seo_title_translations > _id/id
   * @param {Object} category - 分類物件
   * @returns {string} 顯示名稱
   */
  getCategoryDisplayName(category) {
    let displayName = null;
    
    // 優先使用 name 屬性
    if (category.name) {
      displayName = category.name;
    }
    // 其次使用 name_translations
    else if (category.name_translations) {
      // 優先繁體中文
      if (category.name_translations['zh-hant']) {
        displayName = category.name_translations['zh-hant'];
      }
      // 其次英文
      else if (category.name_translations['en']) {
        displayName = category.name_translations['en'];
      }
      // 其他語言
      else {
        // Issue #3: 強化驗證 - Object.keys() 前確保物件存在且有效
        if (category.name_translations && typeof category.name_translations === 'object') {
          const firstLang = Object.keys(category.name_translations)[0];
          if (firstLang && category.name_translations[firstLang]) {
            displayName = category.name_translations[firstLang];
          }
        }
      }
    }
    // 備選：使用 seo_title_translations
    else if (category.seo_title_translations) {
      if (category.seo_title_translations['zh-hant']) {
        displayName = category.seo_title_translations['zh-hant'];
      } else if (category.seo_title_translations['en']) {
        displayName = category.seo_title_translations['en'];
      }
    }

    // 最後的備選：使用 ID
    if (!displayName) {
      displayName = category._id || category.id || 'Unknown';
    }

    // Issue #4: 清理分類名稱以防止 XSS
    return this.sanitizeCategoryName(displayName);
  }

  /**
   * 通用分類搜尋方法 (Issue #9: 提取重複搜尋邏輯)
   * @param {Function} matcher - 匹配函數，返回 true 表示找到
   * @param {String} searchType - 搜尋類型（'name' 或 'id'）用於日誌
   * @returns {Object|null} {category, array, arrayName} 或 null
   */
  _searchCategories(matcher, searchType = 'unknown') {
    if (!matcher || typeof matcher !== 'function') {
      console.warn('[CategoryManager] _searchCategories: matcher function is invalid');
      return null;
    }

    const findInArray = (arr, arrayName, parentPath = '', depth = 0) => {
      if (!arr || !Array.isArray(arr)) {
        return null;
      }

      for (const item of arr) {
        const itemName = this.getCategoryDisplayName(item);
        const currentPath = parentPath ? `${parentPath} > ${itemName}` : itemName;

        // 使用 matcher 函數進行匹配
        if (matcher(item)) {
          console.log(`[CategoryManager] [搜尋${searchType}] 找到:`, {
            name: itemName,
            path: currentPath,
            arrayName: arrayName,
            depth: depth,
            hasId: !!(item._id || item.id),
          });
          return { category: item, array: arr, arrayName: arrayName };
        }

        if (item.children && Array.isArray(item.children)) {
          const found = findInArray(item.children, arrayName, currentPath, depth + 1);
          if (found) return found;
        }
      }
      return null;
    };

    // 先搜尋 categories
    let result = findInArray(this.categories, 'categories');
    if (result) return result;

    // 再搜尋 posCategories
    if (this.posCategories && this.posCategories.length > 0) {
      result = findInArray(this.posCategories, 'posCategories');
      if (result) return result;
    }

    console.warn(`[CategoryManager] [搜尋${searchType}] 未找到`);
    return null;
  }

  /**
   * 根據名稱查詢分類物件
   * @param {string} categoryName - 分類名稱
   * @returns {Object|null} 分類訊息物件或 null
   */
  findCategoryByName(categoryName) {
    if (!categoryName) {
      console.warn('[CategoryManager] findCategoryByName: categoryName is empty');
      return null;
    }

    return this._searchCategories(
      (item) => this.getCategoryDisplayName(item) === categoryName,
      'by name'
    );
  }

  /**
   * 根據 ID 查詢分類物件
   * @param {string} categoryId - 分類 ID (_id 或 id)
   * @returns {Object|null} 分類物件或 null
   */
  findCategoryById(categoryId) {
    if (!categoryId) {
      console.warn('[CategoryManager] findCategoryById: categoryId is empty');
      return null;
    }

    const result = this._searchCategories(
      (item) => item._id === categoryId || item.id === categoryId,
      'by id'
    );

    // 返回分類物件本身（如果有結果）
    if (result && result.category) {
      return result.category;
    }

    return null;
  }

  /**
   * 取得所有 Level 1 分類（根目錄的直接子項）
   * @param {Object} excludeCategory - 要排除的分類（通常是當前分類）
   * @param {string} filterArrayName - 限制只返回指定陣列的分類，避免跨陣列移動
   * @returns {Array} Level 1 分類陣列，每個元素含 {category, name, arrayName}
   */
  getLevel1Categories(excludeCategory = null, filterArrayName = null) {
    const results = [];
    const excludeId = excludeCategory?._id || excludeCategory?.id;

    // 從 categories 陣列取得 Level 1
    if ((!filterArrayName || filterArrayName === 'categories') &&
        this.categories && Array.isArray(this.categories)) {
      for (const cat of this.categories) {
        // 排除系統分類（key 屬性為 true）
        if (cat.key) continue;
        // 排除當前分類
        if (excludeId && (cat._id === excludeId || cat.id === excludeId)) continue;

        results.push({
          category: cat,
          name: this.getCategoryDisplayName(cat),
          arrayName: 'categories'
        });
      }
    }

    // 從 posCategories 陣列取得 Level 1
    if ((!filterArrayName || filterArrayName === 'posCategories') &&
        this.posCategories && Array.isArray(this.posCategories)) {
      for (const cat of this.posCategories) {
        if (cat.key) continue;
        if (excludeId && (cat._id === excludeId || cat.id === excludeId)) continue;

        results.push({
          category: cat,
          name: this.getCategoryDisplayName(cat),
          arrayName: 'posCategories'
        });
      }
    }

    console.log('[CategoryManager] [Search] Level 1 categories:', results.length,
      filterArrayName ? `(filtered to ${filterArrayName})` : '(all arrays)');
    return results;
  }

  /**
   * 根據關鍵字過濾分類（模糊匹配）
   * @param {string} keyword - 搜尋關鍵字
   * @param {Array} categories - 要過濾的分類陣列
   * @returns {Array} 符合的分類陣列
   */
  filterCategoriesByKeyword(keyword, categories) {
    if (!keyword || keyword.trim() === '') {
      return categories; // 空白關鍵字返回全部
    }

    const lowerKeyword = keyword.toLowerCase().trim();

    const filtered = categories.filter(item => {
      const name = String(item.name ?? '').toLowerCase();
      return name.includes(lowerKeyword);
    });

    console.log('[CategoryManager] [Search] Filtered by "' + keyword + '":', filtered.length, 'results');
    return filtered;
  }

  /**
   * 初始化分類管理器
   * 進行必要的初始化操作和 UI 注入
   */
  initialize() {
    console.log('[CategoryManager] 初始化分類管理器');
    this.injectUI();
  }

  /**
   * 清理資源 (Issue #5: MutationObserver cleanup)
   * 頁面離開或組件銷毀時調用此方法
   */
  destroy() {
    console.log('[CategoryManager] 清理資源...');
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
      console.log('[CategoryManager] ✅ MutationObserver 已斷開');
    }
  }

  /**
   * 在頁面中注入「移動到」按鈕 UI
   */
  injectUI() {
    try {
      const treeContainer = document.querySelector('.angular-ui-tree');
      if (!treeContainer) {
        console.error('[CategoryManager] 找不到樹容器');
        return;
      }

      // Issue #5: 清理舊的觀察器以防止記憶體洩漏
      if (this.domObserver) {
        console.log('[CategoryManager] 斷開舊的 MutationObserver');
        this.domObserver.disconnect();
      }

      // 監聽 DOM 變化，動態注入按鈕
      this.domObserver = new MutationObserver(() => {
        this.attachButtonsToCategories();
      });

      this.domObserver.observe(treeContainer, {
        childList: true,
        subtree: true,
      });

      // 初始化按鈕注入
      this.attachButtonsToCategories();
      console.log('[CategoryManager] UI 注入完成 (MutationObserver 已建立)');
    } catch (error) {
      console.error('[CategoryManager] 注入 UI 時出錯:', error);
    }
  }

  /**
   * 在每個分類行上附加「移動到」按鈕
   */
  attachButtonsToCategories() {
    const categoryNodes = document.querySelectorAll('.angular-ui-tree-node');
    console.log(`[CategoryManager] 找到 ${categoryNodes.length} 個分類節點`);

    categoryNodes.forEach((node, index) => {
      // 找到操作按鈕區
      const rowEl = Array.from(node.children).find(
        (child) => child.classList?.contains('ui-tree-row')
      );
      const buttonArea = rowEl
        ? rowEl.querySelector('.col-xs-5.text-right')
        : node.querySelector('.col-xs-5.text-right');
      
      if (!buttonArea) {
        return;
      }
      
      if (buttonArea.closest('.angular-ui-tree-node') !== node) {
        return;
      }

      // 避免重複注入
      if (buttonArea.querySelector('[data-move-button]')) {
        return;
      }

      const nameEl = rowEl?.querySelector('.cat-name');
      const domCategoryName = nameEl?.textContent?.trim();

      if (!domCategoryName) {
        console.warn(`[CategoryManager] 無法取得第 ${index} 個節點的分類名稱`);
        return;
      }

      // 嘗試查找分類
      let categoryInfo = this.findCategoryByName(domCategoryName);

      if (!categoryInfo) {
        console.warn(`[CategoryManager] 無法找到分類: ${domCategoryName}`);
        return;
      }

      // Issue #3: 驗證 categoryInfo.category 存在再訪問屬性
      if (!categoryInfo?.category) {
        console.error('[CategoryManager] categoryInfo.category is null or undefined');
        return;
      }

      // 建立「移動到」按鈕
      const moveButton = document.createElement('button');
      moveButton.textContent = '📁 移動到 ▼';
      moveButton.setAttribute('data-move-button', 'true');
      moveButton.className = 'btn btn-sm btn-default';
      moveButton.style.marginRight = CategoryManager.BUTTON_MARGIN_RIGHT_PX;
      moveButton.type = 'button';

      // 將分類訊息存儲在 DOM dataset 中
      const categoryId = categoryInfo.category._id || categoryInfo.category.id;
      const categoryName = this.getCategoryDisplayName(categoryInfo.category);
      const arrayName = categoryInfo.arrayName;

      if (categoryId) {
        moveButton.dataset.categoryId = categoryId;
        moveButton.dataset.categoryName = categoryName;
        moveButton.dataset.arrayName = arrayName;
        moveButton.dataset.createdAt = Date.now().toString();
        console.log('[CategoryManager] Button dataset stored:', {
          categoryId: categoryId,
          categoryName: categoryName,
          arrayName: arrayName
        });
      } else {
        console.warn('[CategoryManager] Category has no ID');
      }

      // 檢查分類是否應該禁用按鈕（特殊分類）
      if (categoryInfo.category?.key) {
        moveButton.disabled = true;
        moveButton.title = '特殊分類不支援移動';
      }

      // 附加按鈕到 DOM
      buttonArea.appendChild(moveButton);
      console.log(`[CategoryManager] Button injected to category: ${categoryName}`);
    });
  }
}

// ============================================================================
// 導出模組
// ============================================================================

// 如果在 content script 環境中，掛載到 window 物件
if (typeof window !== 'undefined') {
  window.CategoryManager = CategoryManager;
  window.TimeSavingsTracker = TimeSavingsTracker;
  window.getAllDescendants = getAllDescendants;
  window.getCategoryLevel = getCategoryLevel;
  window.getCategoryDescendants = getCategoryDescendants;
  window.isDescendant = isDescendant;
  window.calculateTimeSaved = calculateTimeSaved;
  console.log('[category-manager.js] Module loaded and attached to window object');
}

// 如果在模組環境中（Node.js/bundler），導出物件
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CategoryManager,
    TimeSavingsTracker,
    getAllDescendants,
    getCategoryLevel,
    getCategoryDescendants,
    isDescendant,
    calculateTimeSaved
  };
}
