// ==UserScript==
// @name         Shopline 分類管理 - 快速移動
// @namespace    http://tampermonkey.net/
// @version      0.2.1
// @description  在 Shopline 分類管理頁面添加「移動到」按鈕，支援快速分類重新整理
// @author       Development Team
// @match        https://admin.shoplineapp.com/admin/*/categories*
// @match        https://*.shopline.tw/admin/*/categories*
// @match        https://*.shopline.app/admin/*/categories*
// @grant        none
// ==/UserScript==

/**
 * Shopline 分類管理器 - 快速移動功能
 *
 * 核心職責：
 * 1. 按鈕注入 - 在每個分類的操作區新增「移動到」按鈕
 * 2. 下拉選單 UI - 顯示樹狀目標分類選擇
 * 3. 移動邏輯 - 操作 AngularJS scope 進行分類重新排列
 * 4. 層級驗證 - 確保分類移動不違反 3 層限制
 */

(function() {
  'use strict';

  // ============================================================================
  // 工具函數：樹結構操作
  // ============================================================================

  /**
   * 取得分類的所有後代分類（遞迴）
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
   */
  function isDescendant(potentialAncestor, potentialDescendant) {
    const descendants = getAllDescendants(potentialAncestor);
    return descendants.some((category) => category === potentialDescendant);
  }

  /**
   * 遞迴計算分類的層級（1 = 根層級）
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
   * 取得分類的所有子孫（遞迴）
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

  // ============================================================================
  // 分類管理工具類
  // ============================================================================

  class CategoryManager {
    // Issue #10: 定義常數以移除魔法數字
    static SEARCH_DEBOUNCE_MS = 300;           // 搜尋 debounce 延遲（毫秒）
    static BINDING_STALENESS_MS = 30000;       // 綁定陳舊性閾值（30秒）
    static TOAST_SUCCESS_DURATION_MS = 2000;   // 成功訊息顯示時間
    static TOAST_ERROR_DURATION_MS = 3000;     // 錯誤訊息顯示時間
    static TOAST_WARNING_DURATION_MS = 4000;   // 警告訊息顯示時間
    static TOAST_Z_INDEX = 2000;               // 訊息提示 Z-index
    static DROPDOWN_Z_INDEX = 10000;           // 下拉菜單 Z-index（須高於 toast）
    static UI_INIT_TIMEOUT_MS = 5000;          // UI 初始化超時（毫秒）
    static TREE_NODES_TIMEOUT_MS = 15000;      // 樹節點載入超時（毫秒）
    static WAIT_ELEMENT_TIMEOUT_MS = 10000;    // 等待元素超時預設值（毫秒）
    static BUTTON_MARGIN_RIGHT_PX = '8px';     // 按鈕間距

    constructor(scope) {
      this.scope = scope;
      this.categories = scope.categories || [];
      this.posCategories = scope.posCategories || [];
      this.isMoving = false;
      this.buttonCategoryMap = new WeakMap();
      // Issue #5: 儲存 MutationObserver 實例以便清理
      this.domObserver = null;
    }

    /**
    /**
     * 清理分類名稱以防止 XSS（Issue #4: XSS protection）
     * 移除可能有害的字符如 < > 
     */
    sanitizeCategoryName(name) {
      if (!name || typeof name !== 'string') {
        return name;
      }
      // 移除 < > 字符以防止 HTML 注入
      return name.replace(/[<>]/g, '');
    }

     * 取得分類的顯示名稱
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
    /**
     * 通用分類搜尋方法（Issue #9: Extract duplicate search logic）
     * @param {Function} matcher - 匹配函數，返回 true 表示找到
     * @param {String} searchType - 搜尋類型（'name' 或 'id'）用於日誌
     * @returns {Object|null} 找到的分類對象或 null
     */
    _searchCategories(matcher, searchType = 'unknown') {
      if (!matcher || typeof matcher !== 'function') {
        console.warn('[Shopline Category Manager] _searchCategories: matcher function is invalid');
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
            console.log(`[Shopline Category Manager] [搜尋${searchType}] 找到:`, {
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

      console.warn(`[Shopline Category Manager] [搜尋${searchType}] 未找到`);
      return null;
    }

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
     * 🆕 [FIX 2026-01-08] 根據名稱查詢分類物件（繞過 Angular scope）
     * 這是最可靠的查找方式，因為 DOM 名稱永遠正確
     */
    findCategoryByName(categoryName) {
      if (!categoryName) {
        console.warn('[Shopline Category Manager] findCategoryByName: categoryName is empty');
        return null;
      }

      // Issue #9: 使用通用搜尋方法
      return this._searchCategories(
        (item) => this.getCategoryDisplayName(item) === categoryName,
        'by name'
      );
    }

    /**
     * 🆕 取得所有 Level 1 分類（根目錄的直接子項）
     * @param {Object} excludeCategory - 要排除的分類（通常是當前分類）
     * @param {string} filterArrayName - 🔧 FIX: 限制只返回指定陣列的分類，避免跨陣列移動
     * @returns {Array} Level 1 分類陣列
     */
    getLevel1Categories(excludeCategory = null, filterArrayName = null) {
      const results = [];
      const excludeId = excludeCategory?._id || excludeCategory?.id;

      // 從 categories 陣列取得 Level 1
      // 🔧 FIX: 若有指定 filterArrayName，只處理該陣列
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
      // 🔧 FIX: 若有指定 filterArrayName，只處理該陣列
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

      console.log('[Shopline Category Manager] [Search] Level 1 categories:', results.length,
        filterArrayName ? `(filtered to ${filterArrayName})` : '(all arrays)');
      return results;
    }

    /**
     * 🆕 根據關鍵字過濾分類（模糊匹配）
     * @param {string} keyword - 搜尋關鍵字
     * @param {Array} categories - 要過濾的分類陣列（來自 getLevel1Categories）
     * @returns {Array} 符合的分類陣列
     */
    filterCategoriesByKeyword(keyword, categories) {
      if (!keyword || keyword.trim() === '') {
        return categories; // 空白關鍵字返回全部
      }

      const lowerKeyword = keyword.toLowerCase().trim();

      // 🔧 FIX: Safe string coercion for item.name (might be non-string)
      const filtered = categories.filter(item => {
        const name = String(item.name ?? '').toLowerCase();
        return name.includes(lowerKeyword);
      });

      console.log('[Shopline Category Manager] [Search] Filtered by "' + keyword + '":', filtered.length, 'results');
      return filtered;
    }

    /**
     * 🆕 Debounce 工具函數
     * @param {Function} func - 要延遲執行的函數
     * @param {number} wait - 延遲毫秒數
     * @returns {Object} 包含 fn（debounced 函數）和 cancel（取消方法）
     */
    debounce(func, wait) {
      let timeout;
      // 🔧 FIX: Return object with cancel method to prevent stale callbacks
      const debouncedFn = (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      };
      debouncedFn.cancel = () => {
        clearTimeout(timeout);
        timeout = null;
      };
      return debouncedFn;
    }

    /**
     * 🆕 [CHANGE 2] 根據 ID 查詢分類物件
     * ✅ FIX #2: Check both _id and id properties
     */
    findCategoryById(categoryId) {
      if (!categoryId) {
        console.warn('[Shopline Category Manager] [CHANGE 2] findCategoryById: categoryId is empty');
        return null;
      }

      // Issue #9: 使用通用搜尋方法
      // 需要返回單個分類而非完整信息，所以需要轉換結果
      const result = this._searchCategories(
        (item) => item._id === categoryId || item.id === categoryId,
        'by id'
      );

      // 如果是完整的 categoryInfo 對象，返回分類部分
      if (result && result.category) {
        return result.category;
      }

      // 否則直接返回結果（用於向後相容）
      return result;

      console.warn('[Shopline Category Manager] [CHANGE 2] Category not found:', categoryId);
      return null;
    }

    initialize() {
      console.log('[Shopline Category Manager] 初始化分類管理器');

    /**
     * 清理資源（Issue #5: MutationObserver cleanup）
     * 頁面離開或組件銷毀時調用此方法
     */
    destroy() {
      console.log('[Shopline Category Manager] 清理資源...');
      if (this.domObserver) {
        this.domObserver.disconnect();
        this.domObserver = null;
        console.log('[Shopline Category Manager] ✅ MutationObserver 已斷開');
      }
    }
      this.injectUI();
    }

    /**
     * 在頁面中注入「移動到」按鈕和下拉選單 UI
     */
    injectUI() {
      try {
        const treeContainer = document.querySelector('.angular-ui-tree');
        if (!treeContainer) {
          console.error('[Shopline Category Manager] 找不到樹容器');
          return;
        }

        // Issue #5: 清理舊的觀察器以防止記憶體洩漏
        if (this.domObserver) {
          console.log('[Shopline Category Manager] 斷開舊的 MutationObserver');
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
        console.log('[Shopline Category Manager] UI 注入完成 (MutationObserver 已建立)');
      } catch (error) {
        console.error('[Shopline Category Manager] 注入 UI 時出錯:', error);
      }
    }

    /**
     * 在每個分類行上附加「移動到」按鈕
     */
    attachButtonsToCategories() {
      const categoryNodes = document.querySelectorAll('.angular-ui-tree-node');
      console.log(`[Shopline Category Manager] 找到 ${categoryNodes.length} 個分類節點`);

      categoryNodes.forEach((node, index) => {
        // 找到操作按鈕區（只取本節點的 row，避免抓到子節點的按鈕區）
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
          console.warn('[Shopline Category Manager] [DEBUG] Skip button area (belongs to another node)', {
            nodeName: this.getCategoryDisplayName(this.getCategoryFromElement(node)?.category || {}),
          });
          return;
        }
        const nameEl = rowEl?.querySelector('.cat-name');
        console.log('[Shopline Category Manager] [DEBUG] Node bind context:', {
          index,
          nodeTag: node.tagName,
          nodeClass: node.className,
          rowTag: rowEl?.tagName || '(none)',
          rowClass: rowEl?.className || '(none)',
          nameText: nameEl?.textContent?.trim() || '(none)',
        });

        // 避免重複注入
        if (buttonArea.querySelector('[data-move-button]')) {
          return;
        }

        // 🆕 [FIX 2026-01-08] DOM 名稱優先策略
        // Step 1: 從 DOM 取得分類名稱（永遠正確）
        const domCategoryName = nameEl?.textContent?.trim();

        // Step 2: 嘗試 scope-based lookup
        let categoryInfo = this.getCategoryFromElement(node);

        // Step 3: 如果 scope 失敗，使用 DOM 名稱查找（繞過 Angular scope）
        if (!categoryInfo && domCategoryName) {
          console.log('[Shopline Category Manager] [FIX] Scope failed, using DOM name fallback:', domCategoryName);
          categoryInfo = this.findCategoryByName(domCategoryName);
        }

        // Step 4: 額外驗證：如果 scope 返回的名稱與 DOM 名稱不符，使用 DOM 名稱重新查找
        if (categoryInfo && domCategoryName) {
          const scopeCategoryName = this.getCategoryDisplayName(categoryInfo.category);
          if (scopeCategoryName !== domCategoryName) {
            console.warn('[Shopline Category Manager] ⚠️ [FIX] Scope mismatch detected!', {
              domName: domCategoryName,
              scopeName: scopeCategoryName,
              action: 'Using DOM name to find correct category',
            });
            const correctedInfo = this.findCategoryByName(domCategoryName);
            if (correctedInfo) {
              categoryInfo = correctedInfo;
              console.log('[Shopline Category Manager] ✓ [FIX] Corrected to:', domCategoryName);
            }
          }
        }

        if (!categoryInfo) {
          console.warn(`[Shopline Category Manager] 無法從第 ${index} 個節點取得分類物件 (DOM名稱: ${domCategoryName || 'unknown'})`);
          return;
        }

        // 建立「移動到」按鈕
        const moveButton = document.createElement('button');
        moveButton.textContent = '📁 移動到 ▼';
        moveButton.setAttribute('data-move-button', 'true');
        moveButton.className = 'btn btn-sm btn-default';
        moveButton.style.marginRight = '8px';
        moveButton.type = 'button';

        // 🆕 [CHANGE 1] 將分類資訊存儲在 DOM dataset 中
        // ✅ FIX #1: Use _id (primary) with id as fallback
        // Issue #3: 驗證 categoryInfo.category 存在再訪問屬性
        if (!categoryInfo?.category) {
          console.error('[Shopline Category Manager] categoryInfo.category is null or undefined');
          continue;
        }
        
        const categoryId = categoryInfo.category._id || categoryInfo.category.id;
        const categoryName = this.getCategoryDisplayName(categoryInfo.category);
        const arrayName = categoryInfo.arrayName;

        if (categoryId) {
          moveButton.dataset.categoryId = categoryId;
          moveButton.dataset.categoryName = categoryName;
          moveButton.dataset.arrayName = arrayName;
          // Issue #2: 添加綁定時間戳用於檢測陳舊綁定
          moveButton.dataset.createdAt = Date.now().toString();
          console.log('[Shopline Category Manager] [CHANGE 1] Dataset stored:', {
            categoryId: categoryId,
            categoryName: categoryName,
            arrayName: arrayName,
            createdAt: moveButton.dataset.createdAt
          });
        } else {
          console.warn('[Shopline Category Manager] [CHANGE 1] WARNING: Category has no ID');
        }

        // 🔍 診斷：驗證按鈕所在的節點是否與預期的 categoryInfo 一致
        const buttonNodeName = this.getCategoryDisplayName(categoryInfo.category);
        const actualScopeItem = angular.element(node).scope()?.item;
        const actualName = this.getCategoryDisplayName(actualScopeItem);
        if (buttonNodeName !== actualName) {
          console.warn('[Shopline Category Manager] ⚠️  按鈕綁定檢查失敗:', {
            expectedName: buttonNodeName,
            actualName: actualName,
            nodeId: node.id,
            index: index,
          });
        }

        // 檢查分類是否應該禁用按鈕（特殊分類）
        if (categoryInfo.category?.key) {
          moveButton.disabled = true;
          moveButton.title = '特殊分類不支援移動';
        } else {
          moveButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Issue #2: 檢查綁定是否陳舊（30秒閾值）
            const button = e.currentTarget;
            const bindingCreatedAt = parseInt(button.dataset.createdAt, 10);
            const bindingAge = Date.now() - bindingCreatedAt;

            // Issue #10: 使用常數而非魔法數字
            if (bindingAge > CategoryManager.BINDING_STALENESS_MS) {
              console.warn('[Shopline Category Manager] ⚠️  綁定已過期 (年齡: ' + bindingAge + 'ms)');
              console.warn('[Shopline Category Manager] 按鈕綁定超過 30 秒，可能在頁面更新時變得陳舊');
              this.showErrorMessage('綁定已過期，請重新整理頁面重試');
              return;
            }

            let categoryInfo = null;
            let lookupMethod = 'unknown';

            // ═══════════════════════════════════════════════════════════════
            // 🆕 [CHANGE 3] Priority 0: DOM Dataset Attributes (HIGHEST)
            // ═══════════════════════════════════════════════════════════════
            const categoryId = button.dataset.categoryId;
            const categoryName = button.dataset.categoryName;
            const arrayName = button.dataset.arrayName;

            if (categoryId && arrayName) {
              console.log('[Shopline Category Manager] [Priority 0] Trying dataset lookup:', {
                categoryId: categoryId,
                categoryName: categoryName,
                arrayName: arrayName
              });

              const category = this.findCategoryById(categoryId);

              if (category) {
                const targetArray = arrayName === 'posCategories' ? this.posCategories : this.categories;
                categoryInfo = {
                  category: category,
                  array: targetArray,
                  arrayName: arrayName,
                };
                lookupMethod = 'DOM dataset (Priority 0)';
                console.log('[Shopline Category Manager] ✓ [Priority 0] SUCCESS:', {
                  method: lookupMethod,
                  categoryName: this.getCategoryDisplayName(category),
                });
              } else {
                // ✅ FIX #4: Validate dataset succeeded
                console.error('[Shopline Category Manager] ❌ [Priority 0] FAILED - Dataset had ID but category not found:', categoryId);
                // Don't fall back to Priority 1 (which is broken with scope misalignment)
                // Instead, treat this as error - may indicate deleted category
                console.error('[Shopline Category Manager] BLOCKING: Category may have been deleted, not falling back to potentially misaligned scope');
              }
            } else {
              console.log('[Shopline Category Manager] [Priority 0] SKIPPED - Dataset incomplete:', {
                hasCategoryId: !!categoryId,
                hasArrayName: !!arrayName
              });
            }

            // ═══════════════════════════════════════════════════════════════
            // Priority 1: Scope Query (fallback if dataset missing)
            // ═══════════════════════════════════════════════════════════════
            if (!categoryInfo) {
              const treeNode = button.closest('.angular-ui-tree-node');
              if (treeNode) {
                console.log('[Shopline Category Manager] [Priority 1] Trying scope query (FALLBACK)...');
                const scope = angular.element(treeNode).scope();

                if (scope && scope.item) {
                  const arrayInfo = this.detectCategoryArray(scope.item);
                  categoryInfo = {
                    category: scope.item,
                    array: arrayInfo.array,
                    arrayName: arrayInfo.arrayName,
                  };
                  lookupMethod = 'Angular scope query (Priority 1 - FALLBACK)';
                  console.log('[Shopline Category Manager] ⚠️ [Priority 1] Using scope (dataset was missing):', {
                    method: lookupMethod,
                    categoryName: this.getCategoryDisplayName(scope.item),
                    warning: '⚠️ Scope may be misaligned - this is a fallback'
                  });
                }
              }
            }

            // ═══════════════════════════════════════════════════════════════
            // Priority 2: WeakMap (last resort)
            // ═══════════════════════════════════════════════════════════════
            if (!categoryInfo) {
              console.log('[Shopline Category Manager] [Priority 2] Trying WeakMap (LAST RESORT)...');
              const boundCategoryInfo = this.buttonCategoryMap.get(button);

              if (boundCategoryInfo) {
                categoryInfo = boundCategoryInfo;
                lookupMethod = 'WeakMap (Priority 2 - LAST RESORT)';
                console.log('[Shopline Category Manager] ⚠️⚠️ [Priority 2] Using WeakMap:', {
                  method: lookupMethod,
                  warning: '⚠️⚠️ Both dataset and scope failed'
                });
              }
            }

            // ═══════════════════════════════════════════════════════════════
            // Final validation
            // ═══════════════════════════════════════════════════════════════
            if (!categoryInfo || !categoryInfo.category) {
              console.error('[Shopline Category Manager] ❌ CRITICAL: Failed to identify category after all attempts');
              this.showErrorMessage('無法識別分類，請重新整理頁面');
              return;
            }

            console.log('[Shopline Category Manager] ✅ Final category confirmed:', {
              lookupMethod: lookupMethod,
              displayName: this.getCategoryDisplayName(categoryInfo.category),
            });

            this.showMoveDropdown(
              categoryInfo.category,
              e.currentTarget,
              categoryInfo.array,
              categoryInfo.arrayName
            );
          });
        }

        // 綁定分類資訊到按鈕，避免點擊時取錯節點
        this.buttonCategoryMap.set(moveButton, categoryInfo);
        console.log('[Shopline Category Manager] [DEBUG] Bind button -> category:', {
          displayName: this.getCategoryDisplayName(categoryInfo.category),
          arrayName: categoryInfo.arrayName,
          nodeId: node.id || '(無ID)',
          childrenCount: categoryInfo.category?.children?.length || 0,
        });

        // 在按鈕區最前面插入按鈕
        buttonArea.insertBefore(moveButton, buttonArea.firstChild);
      });
    }

    /**
     * 從 DOM 元素中提取對應的分類物件及其所屬陣列
     * @returns {{category: Object, array: Array, arrayName: string}|null}
     */
    getCategoryFromElement(element) {
      // 嘗試從 AngularJS scope 中取得分類
      try {
        console.log('[Shopline Category Manager] [DEBUG] getCategoryFromElement called with element:', element.tagName, element.className);

        // ✅ 關鍵改進：先用 closest() 定位最近的樹節點
        let nodeEl = element.closest?.('.angular-ui-tree-node');
        if (!nodeEl) {
          console.warn('[Shopline Category Manager] 找不到樹節點元素');
          return null;
        }

        console.log('[Shopline Category Manager] [DEBUG] Found tree node element:', nodeEl.tagName, nodeEl.className);

        // 🆕 [FIX 2026-01-08] 使用 let 而非 const，以便在 nodeEl 更新後重新捕獲
        // 使用 :scope > 確保只選擇直接子元素的 row，避免選到嵌套節點
        let nodeNameEl = nodeEl.querySelector(':scope > .ui-tree-row .cat-name, :scope > .angular-ui-tree-handle .cat-name');
        console.log('[Shopline Category Manager] [DEBUG] Node name from DOM:', nodeNameEl?.textContent?.trim() || '(none)');

        // ✅ 新增驗證：確保找到的節點不是更深層的嵌套節點的父節點
        // 檢查傳入元素本身是否就是樹節點，如果是就用它
        if (element.classList?.contains('angular-ui-tree-node')) {
          console.log('[Shopline Category Manager] [DEBUG] Input element is already a tree node, using it directly');
          nodeEl = element;
          // 🆕 [FIX 2026-01-08] 重新捕獲 nodeNameEl，確保使用正確節點的名稱
          nodeNameEl = nodeEl.querySelector(':scope > .ui-tree-row .cat-name, :scope > .angular-ui-tree-handle .cat-name');
          console.log('[Shopline Category Manager] [DEBUG] Re-captured node name from updated nodeEl:', nodeNameEl?.textContent?.trim() || '(none)');
        }

        // ✅ 從樹節點本身的 scope 獲取 item（確保獲取到的是該節點對應的分類）
        const scope = angular.element(nodeEl).scope();
        console.log('[Shopline Category Manager] [DEBUG] Node scope info:', {
          hasScope: !!scope,
          scopeId: scope?.$id,
          hasItem: !!scope?.item,
          scopeKeys: scope ? Object.keys(scope).slice(0, 8) : [],
        });
        if (scope && scope.item) {
          const itemName = this.getCategoryDisplayName(scope.item);
          const domCategoryName = nodeNameEl?.textContent?.trim() || '';

          // 🆕 [CHANGE 4] Enhanced scope misalignment detection
          // ✅ FIX #3: Return null if misalignment detected (don't return wrong category)
          if (domCategoryName && itemName !== domCategoryName) {
            // Build detailed misalignment report
            const misalignmentData = {
              domName: domCategoryName,
              scopeName: itemName,
              scopeId: scope.$id,
              nodeClass: nodeEl.className,
              nodeId: nodeEl.id || '(no ID)',
              timestamp: new Date().toISOString(),
              severity: 'CRITICAL',
            };

            // Track misalignments for analytics
            if (!this.scopeMisalignmentLog) {
              this.scopeMisalignmentLog = [];
            }
            this.scopeMisalignmentLog.push(misalignmentData);

            // Log the misalignment
            console.error(
              '[Shopline Category Manager] ⚠️⚠️⚠️ [SCOPE MISALIGNMENT DETECTED]',
              misalignmentData
            );
            console.error(
              '[Shopline Category Manager] DOM shows: "' + domCategoryName + '" but scope returns: "' + itemName + '"'
            );

            // ✅ FIX #3: CRITICAL - Return null instead of wrong category
            // This forces caller to use fallback methods (Priority 0 dataset if available)
            console.warn(
              '[Shopline Category Manager] Blocking misaligned scope, returning null to force dataset lookup'
            );

            if (this.scopeMisalignmentLog.length >= 5) {
              console.error(
                '[Shopline Category Manager] ⚠️ CRITICAL: ' + this.scopeMisalignmentLog.length +
                ' misalignment incidents! Consider Option A (full scope bypass)'
              );
            }

            return null;  // 🔴 KEY FIX: Don't return wrong category
          }

          // Scope validation passed, continue normally
          const arrayInfo = this.detectCategoryArray(scope.item);
          console.log('[Shopline Category Manager] ✓ Scope validation passed:', itemName, '(陣列:', arrayInfo.arrayName + ')');
          return { category: scope.item, array: arrayInfo.array, arrayName: arrayInfo.arrayName };
        }

        // ✅ 如果樹節點的 scope 沒有 item，返回 null，不要向上遍歷
        console.warn('[Shopline Category Manager] ✗ 樹節點 scope 沒有 item');
        if (scope) {
          console.log('[Shopline Category Manager] Scope 結構:', {
            hasItem: !!scope.item,
            scopeKeys: Object.keys(scope).slice(0, 10),
          });
        }
      } catch (error) {
        console.warn('[Shopline Category Manager] 無法從 scope 取得分類:', error);
      }
      return null;
    }

    /**
     * 偵測分類物件屬於哪個陣列（categories 或 posCategories）
     * @returns {{array: Array, arrayName: string}}
     */
    detectCategoryArray(category) {
      // 檢查是否在 posCategories 中
      if (this.posCategories.length > 0) {
        const inPosCategories = this.findCategoryInArray(category, this.posCategories);
        if (inPosCategories) {
          return { array: this.posCategories, arrayName: 'posCategories' };
        }
      }

      // 檢查是否在 categories 中
      if (this.categories.length > 0) {
        const inCategories = this.findCategoryInArray(category, this.categories);
        if (inCategories) {
          return { array: this.categories, arrayName: 'categories' };
        }
      }

      // 預設返回 categories（備選）
      return { array: this.categories, arrayName: 'categories' };
    }

    /**
     * 檢查分類是否在指定的陣列中（包括子分類）
     */
    findCategoryInArray(category, categoriesArray) {
      if (!categoriesArray || !Array.isArray(categoriesArray)) {
        return false;
      }

      const search = (categories) => {
        for (const cat of categories) {
          if (cat === category) {
            return true;
          }
          if (cat.children && Array.isArray(cat.children)) {
            if (search(cat.children)) {
              return true;
            }
          }
        }
        return false;
      };

      return search(categoriesArray);
    }

    /**
     * 顯示「移動到」下拉選單（協調器）
     * 🆕 新增搜尋區塊在頂部
     */
    showMoveDropdown(category, button, categoriesArray = null, arrayName = 'categories') {
      this.removeExistingDropdown();

      // 如果未指定陣列，使用預設的偵測方法
      if (!categoriesArray) {
        const arrayInfo = this.detectCategoryArray(category);
        categoriesArray = arrayInfo.array;
        arrayName = arrayInfo.arrayName;
      }

      const dropdown = this.createDropdownContainer();

      // 🆕 新增搜尋區塊（在樹狀選單上方）
      const searchSection = this.createSearchSection(category, categoriesArray, arrayName);
      dropdown.appendChild(searchSection);
      this.attachSearchEventListeners(searchSection);

      // 原有樹狀選單
      const treeContainer = document.createElement('div');
      treeContainer.setAttribute('data-tree-container', 'true');
      const options = this.getValidMoveTargets(category, categoriesArray);
      this.populateDropdownOptions(treeContainer, options, category, categoriesArray, arrayName);
      dropdown.appendChild(treeContainer);

      this.positionDropdown(dropdown, button);
      document.body.appendChild(dropdown);

      this.attachDropdownEventListeners(dropdown, button);
    }

    /**
     * 移除現存的下拉選單
     */
    removeExistingDropdown() {
      const existingDropdown = document.querySelector('[data-move-dropdown]');
      if (existingDropdown) {
        // Issue #7: 增強 debounce cleanup 以防止競態條件
        const searchSection = existingDropdown.querySelector('[data-search-section]');
        
        // 使用可選鏈安全訪問 debounce cancel 方法
        try {
          // Issue #3: 修復拼字錯誤 ?.._debouncedSearch → ?._debouncedSearch
          if (searchSection?._debouncedSearch?.cancel?.()) {
            console.log('[Shopline Category Manager] ✓ Debounce 計時器已取消');
          } else if (searchSection && searchSection._debouncedSearch) {
            // 如果 cancel 不存在，直接嘗試調用
            searchSection._debouncedSearch.cancel?.();
            console.log('[Shopline Category Manager] ✓ 嘗試取消 debounce');
          }
        } catch (e) {
          console.warn('[Shopline Category Manager] ⚠️  無法取消 debounce (可能已清理):', e.message);
        }
        
        // Issue #7: 清理所有 searchSection 引用
        if (searchSection) {
          // 清理事件監聽器
          searchSection._searchInput?.removeEventListener?.('input', searchSection._inputHandler);
          searchSection._resultsList?.innerHTML = '';
          
          // 清理對象引用
          delete searchSection._debouncedSearch;
          delete searchSection._searchInput;
          delete searchSection._resultsList;
          delete searchSection._selectedCategory;
          delete searchSection._confirmBtn;
          delete searchSection._inputHandler;
        }
        
        existingDropdown.remove();
        console.log('[Shopline Category Manager] ✓ Dropdown 及所有引用已清理');
      }
    }

    /**
     * 建立下拉選單容器 DOM 元素
     */
    createDropdownContainer() {
      const dropdown = document.createElement('div');
      dropdown.setAttribute('data-move-dropdown', 'true');
      dropdown.style.cssText = `
        position: fixed;
        background: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: ${CategoryManager.DROPDOWN_Z_INDEX};
        min-width: 220px;
        max-width: 300px;
        max-height: 400px;
        overflow-y: auto;
      `;
      return dropdown;
    }

    /**
     * 填充下拉選單選項
     */
    populateDropdownOptions(dropdown, options, currentCategory, categoriesArray = null, arrayName = 'categories') {
      options.forEach((option) => {
        const item = this.createDropdownItem(option, currentCategory, categoriesArray, arrayName);
        dropdown.appendChild(item);
      });
    }

    /**
     * 建立單一下拉選單項目
     */
    createDropdownItem(option, currentCategory, categoriesArray = null, arrayName = 'categories') {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 10px 12px;
        cursor: ${option.disabled ? 'not-allowed' : 'pointer'};
        border-bottom: 1px solid #f0f0f0;
        user-select: none;
        transition: background-color 0.2s ease;
        opacity: ${option.disabled ? '0.5' : '1'};
        background-color: ${option.disabled ? '#fafafa' : 'transparent'};
        padding-left: ${12 + option.indent * 16}px;
        position: relative;
      `;

      // 建立標籤容器
      const labelContainer = document.createElement('span');
      labelContainer.style.cssText = 'display: flex; align-items: center;';

      // 添加縮排符號（改進視覺效果）
      if (option.indent > 0) {
        // 先添加層級指示符
        const levelIndicator = document.createElement('span');

        // 根據層級決定符號和樣式
        if (option.indent === 1) {
          levelIndicator.textContent = '├─ ';
          levelIndicator.style.cssText = 'color: #bbb; font-weight: normal;';
        } else if (option.indent === 2) {
          levelIndicator.textContent = '  └─ ';
          levelIndicator.style.cssText = 'color: #ddd; font-weight: normal;';
        } else {
          // 更深的層級
          levelIndicator.textContent = '    └─ ';
          levelIndicator.style.cssText = 'color: #eee; font-weight: normal;';
        }

        labelContainer.appendChild(levelIndicator);
      }

      // 添加分類名稱
      const nameSpan = document.createElement('span');
      nameSpan.textContent = option.label;
      nameSpan.style.cssText = `
        font-size: 14px;
        color: ${option.disabled ? '#999' : '#333'};
      `;
      labelContainer.appendChild(nameSpan);

      item.appendChild(labelContainer);

      // 附加項目事件監聽
      this.attachItemEventListeners(item, option, currentCategory, categoriesArray, arrayName);

      return item;
    }

    /**
     * 附加下拉選單項目的事件監聽
     */
    attachItemEventListeners(item, option, currentCategory, categoriesArray = null, arrayName = 'categories') {
      if (!option.disabled) {
        item.addEventListener('mouseover', () => {
          item.style.backgroundColor = '#f5f5f5';
        });
        item.addEventListener('mouseout', () => {
          item.style.backgroundColor = 'transparent';
        });
        item.addEventListener('click', () => {
          console.log('[Shopline Category Manager] [DEBUG] Dropdown click:', {
            sourceName: this.getCategoryDisplayName(currentCategory),
            targetName: option.target ? this.getCategoryDisplayName(option.target) : '(根目錄)',
            sourceLevel: this.getLevel(currentCategory, categoriesArray),
            targetLevel: option.target ? this.getLevel(option.target, categoriesArray) : 1,
            arrayName,
          });
          this.moveCategory(currentCategory, option.target, categoriesArray, arrayName);
          this.removeExistingDropdown();
        });
      } else {
        // 禁用項目不需要互動
        item.addEventListener('mouseover', () => {
          item.style.backgroundColor = '#fafafa';
        });
        item.addEventListener('mouseout', () => {
          item.style.backgroundColor = '#fafafa';
        });
      }
    }

    /**
     * 附加下拉選單的全域事件監聽（點擊外部、Esc 鍵）
     */
    attachDropdownEventListeners(dropdown, button) {
      const closeDropdown = (e) => {
        if (e.target !== button && !dropdown.contains(e.target)) {
          dropdown.remove();
          document.removeEventListener('click', closeDropdown);
          document.removeEventListener('keydown', handleEscapeKey);
        }
      };

      const handleEscapeKey = (e) => {
        if (e.key === 'Escape') {
          dropdown.remove();
          document.removeEventListener('click', closeDropdown);
          document.removeEventListener('keydown', handleEscapeKey);
        }
      };

      document.addEventListener('click', closeDropdown);
      document.addEventListener('keydown', handleEscapeKey);
    }

    /**
     * 定位下拉選單到合適的位置
     */
    positionDropdown(dropdown, button) {
      const rect = button.getBoundingClientRect();
      let left = rect.left;
      let top = rect.bottom + 5;

      // 檢查是否超出右邊界
      const dropdownWidth = 300;
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 10;
      }

      // 檢查是否超出下邊界
      const dropdownHeight = 400;
      if (top + dropdownHeight > window.innerHeight) {
        top = rect.top - dropdownHeight - 5;
      }

      // 確保不超出左邊界
      left = Math.max(10, left);
      top = Math.max(10, top);

      dropdown.style.left = left + 'px';
      dropdown.style.top = top + 'px';
    }

    // ═══════════════════════════════════════════════════════════════
    // 🆕 搜尋過濾功能 UI 方法
    // ═══════════════════════════════════════════════════════════════

    /**
     * 🆕 建立搜尋區塊（輸入框 + 結果列表 + 確認按鈕）
     */
    createSearchSection(currentCategory, categoriesArray, arrayName) {
      const section = document.createElement('div');
      section.setAttribute('data-search-section', 'true');
      section.style.cssText = `
        padding: 10px;
        border-bottom: 2px solid #e0e0e0;
        background: #fafafa;
      `;

      // 搜尋輸入框
      const input = this.createSearchInput();
      section.appendChild(input);

      // 搜尋結果列表
      const resultsList = this.createSearchResultsList();
      section.appendChild(resultsList);

      // 確認按鈕
      const confirmBtn = this.createConfirmButton();
      section.appendChild(confirmBtn);

      // 分隔說明
      const separator = document.createElement('div');
      separator.style.cssText = `
        text-align: center;
        padding: 8px;
        color: #999;
        font-size: 12px;
        border-top: 1px solid #eee;
        margin-top: 10px;
      `;
      separator.textContent = '─── 或從樹狀結構選擇 ───';
      section.appendChild(separator);

      // 儲存參考以便後續使用
      section._searchInput = input;
      section._resultsList = resultsList;
      section._confirmBtn = confirmBtn;
      section._currentCategory = currentCategory;
      section._categoriesArray = categoriesArray;
      section._arrayName = arrayName;
      section._selectedCategory = null;

      return section;
    }

    /**
     * 🆕 建立搜尋輸入框
     */
    createSearchInput() {
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = '🔍 搜尋父項目...';
      input.setAttribute('data-search-input', 'true');
      input.style.cssText = `
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.2s;
      `;

      // Focus 樣式
      input.addEventListener('focus', () => {
        input.style.borderColor = '#4a90d9';
      });
      input.addEventListener('blur', () => {
        input.style.borderColor = '#ddd';
      });

      return input;
    }

    /**
     * 🆕 建立搜尋結果列表容器
     */
    createSearchResultsList() {
      const list = document.createElement('div');
      list.setAttribute('data-search-results', 'true');
      list.style.cssText = `
        max-height: 150px;
        overflow-y: auto;
        margin-top: 8px;
        border: 1px solid #eee;
        border-radius: 4px;
        background: white;
      `;
      return list;
    }

    /**
     * 🆕 建立確認移動按鈕
     */
    createConfirmButton() {
      const btn = document.createElement('button');
      btn.textContent = '確認移動';
      btn.setAttribute('data-confirm-btn', 'true');
      btn.disabled = true;
      btn.style.cssText = `
        width: 100%;
        padding: 10px;
        margin-top: 10px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        cursor: not-allowed;
        background: #ccc;
        color: white;
        transition: all 0.2s;
      `;
      return btn;
    }

    /**
     * 🆕 更新確認按鈕狀態
     */
    updateConfirmButtonState(btn, enabled) {
      btn.disabled = !enabled;
      if (enabled) {
        btn.style.background = '#4a90d9';
        btn.style.cursor = 'pointer';
      } else {
        btn.style.background = '#ccc';
        btn.style.cursor = 'not-allowed';
      }
    }

    /**
     * 🆕 渲染搜尋結果到列表
     */
    renderSearchResults(resultsList, categories, searchSection) {
      // Issue #3: 驗證 categories 參數有效性
      if (!categories || !Array.isArray(categories)) {
        console.warn('[Shopline Category Manager] renderSearchResults: categories is null or not an array');
        return;
      }
      
      resultsList.innerHTML = '';

      if (categories.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding: 12px; text-align: center; color: #999;';
        empty.textContent = '無符合項目';
        resultsList.appendChild(empty);
        return;
      }

      categories.forEach(item => {
        const row = document.createElement('div');
        // 🔧 FIX: Add CSS class for reliable querying
        row.className = 'scm-search-result-row';
        row.style.cssText = `
          padding: 10px 12px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          align-items: center;
          transition: background 0.2s;
        `;

        // Radio 按鈕樣式
        const radio = document.createElement('span');
        radio.style.cssText = `
          width: 16px;
          height: 16px;
          border: 2px solid #ccc;
          border-radius: 50%;
          margin-right: 10px;
          display: inline-block;
          box-sizing: border-box;
        `;

        const label = document.createElement('span');
        // Issue #3: 使用可選鏈防護 item.name 可能為 undefined
        label.textContent = item?.name || this.getCategoryDisplayName(item) || '(未命名)';
        label.style.fontSize = '14px';

        row.appendChild(radio);
        row.appendChild(label);

        // Hover 效果
        row.addEventListener('mouseenter', () => {
          if (searchSection._selectedCategory !== item) {
            row.style.background = '#f5f5f5';
          }
        });
        row.addEventListener('mouseleave', () => {
          if (searchSection._selectedCategory !== item) {
            row.style.background = 'white';
          }
        });

        // 點擊選擇
        row.addEventListener('click', () => {
          this.handleSearchItemSelect(item, row, radio, searchSection);
        });

        row._item = item;
        row._radio = radio;
        resultsList.appendChild(row);
      });
    }

    /**
     * 🆕 處理搜尋項目選擇
     */
    handleSearchItemSelect(item, row, radio, searchSection) {
      // Issue #3: 驗證 searchSection 和 resultsList 有效性
      if (!searchSection || !searchSection._resultsList) {
        console.error('[Shopline Category Manager] handleSearchItemSelect: searchSection or resultsList is null');
        return;
      }
      
      const resultsList = searchSection._resultsList;

      // 清除之前的選擇
      // 🔧 FIX: Use CSS class instead of brittle inline style query
      const allRows = resultsList.querySelectorAll('.scm-search-result-row');
      allRows.forEach(r => {
        r.style.background = 'white';
        if (r._radio) {
          r._radio.style.borderColor = '#ccc';
          r._radio.style.background = 'white';
        }
      });

      // 設定新選擇
      if (searchSection._selectedCategory === item) {
        // 點擊已選中的項目 = 取消選擇
        searchSection._selectedCategory = null;
        this.updateConfirmButtonState(searchSection._confirmBtn, false);
      } else {
        // 選中新項目
        searchSection._selectedCategory = item;
        row.style.background = '#e3f2fd';
        radio.style.borderColor = '#4a90d9';
        radio.style.background = '#4a90d9';
        this.updateConfirmButtonState(searchSection._confirmBtn, true);
      }

      console.log('[Shopline Category Manager] [Search] Selected:',
        searchSection._selectedCategory?.name || '(none)');
    }

    /**
     * 🆕 綁定搜尋區塊事件監聽器
     */
    attachSearchEventListeners(searchSection) {
      const input = searchSection._searchInput;
      const resultsList = searchSection._resultsList;
      const confirmBtn = searchSection._confirmBtn;
      const currentCategory = searchSection._currentCategory;
      const categoriesArray = searchSection._categoriesArray;
      const arrayName = searchSection._arrayName;

      // 取得所有 Level 1 分類
      // 🔧 FIX: Pass arrayName to filter results to same array, preventing cross-array moves
      const allLevel1 = this.getLevel1Categories(currentCategory, arrayName);

      // 初始顯示所有 Level 1
      this.renderSearchResults(resultsList, allLevel1, searchSection);

      // 即時搜尋（debounce 200ms）
      // Issue #10: 使用常數而非魔法數字
      const debouncedSearch = this.debounce((keyword) => {
        const filtered = this.filterCategoriesByKeyword(keyword, allLevel1);
        this.renderSearchResults(resultsList, filtered, searchSection);
        // 清除選擇
        searchSection._selectedCategory = null;
        this.updateConfirmButtonState(confirmBtn, false);
      }, CategoryManager.SEARCH_DEBOUNCE_MS);

      // 🔧 FIX: Store debounced function for cleanup on dropdown close
      searchSection._debouncedSearch = debouncedSearch;

      input.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
      });

      // 確認按鈕點擊
      confirmBtn.addEventListener('click', () => {
        if (searchSection._selectedCategory) {
          // Issue #3: 驗證 selectedCategory.category 屬性存在
          const targetCategory = searchSection._selectedCategory?.category;
          if (!targetCategory) {
            console.error('[Shopline Category Manager] [Search] targetCategory is null or undefined');
            return;
          }

          console.log('[Shopline Category Manager] [Search] Confirm move to:',
            searchSection._selectedCategory.name);

          // 執行移動（移動到目標分類作為子項）
          this.moveCategory(currentCategory, targetCategory, categoriesArray, arrayName);

          // 關閉 dropdown
          this.removeExistingDropdown();
        }
      });
    }

    /**
     * 取得有效的移動目標
     */
    getValidMoveTargets(category, categoriesArray = null) {
      // 如果未指定陣列，使用預設的偵測方法
      if (!categoriesArray) {
        const arrayInfo = this.detectCategoryArray(category);
        categoriesArray = arrayInfo.array;
      }

      const options = [];
      const currentLevel = this.getLevel(category, categoriesArray);
      const sourceHasChildren = category.children && category.children.length > 0;

      console.log('═══════════════════════════════════════════════════════════════');
      console.log('[Shopline Category Manager] 📋 開始構建移動目標選單');
      console.log('─────────────────────────────────────────────────────────────');
      console.log('[DEBUG] 來源分類:', {
        name: this.getCategoryDisplayName(category),
        currentLevel: currentLevel,
        hasChildren: sourceHasChildren,
        childrenCount: category.children?.length || 0,
      });
      console.log('[DEBUG] 陣列信息:', {
        arraySize: categoriesArray.length,
        firstItems: categoriesArray.slice(0, 3).map(c => this.getCategoryDisplayName(c)),
      });

      // 根目錄選項
      const rootDisabled = currentLevel === 1;
      options.push({
        label: '📂 根目錄',
        target: null,
        indent: 0,
        disabled: rootDisabled,
      });
      console.log('[DEBUG] 根目錄選項:', { disabled: rootDisabled, reason: rootDisabled ? '已在根層級' : '可用' });

      // 遞迴添加所有可用的目標分類
      this.addTargetCategoriesRecursively(categoriesArray, category, options, 0);

      console.log('[DEBUG] 選單生成完成:', { totalOptions: options.length, enabledCount: options.filter(o => !o.disabled).length });
      console.log('═══════════════════════════════════════════════════════════════');
      return options;
    }

    /**
     * 遞迴添加目標分類選項
     */
    addTargetCategoriesRecursively(categories, currentCategory, options, depth) {
      categories.forEach((cat) => {
        const displayName = this.getCategoryDisplayName(cat);

        // 排除自己
        if (cat === currentCategory) {
          console.log(`  [✗] 排除「${displayName}」: 不能移動到自己`);
          return;
        }

        // 排除自己的祖先（防止迴圈）- currentCategory 如果是 cat 的子孫，就不能把 cat 當成父容器
        if (isDescendant(cat, currentCategory)) {
          console.log(`  [✗] 排除「${displayName}」: 是源分類的祖先 (防止迴圈)`);
          return;
        }

        // 取得目標分類的層級
        const targetLevel = this.getLevel(cat);
        const isLevel3 = targetLevel === 3;

        // 添加選項
        if (isLevel3) {
          console.log(`  [✗] 排除「${displayName}」: Level ${targetLevel} (最深層級，不能再有子項)`);
        } else {
          console.log(`  [✓] 可用「${displayName}」: Level ${targetLevel}，深度 ${depth}`);
        }

        options.push({
          label: displayName,
          target: cat,
          indent: depth,
          disabled: isLevel3,
        });

        // 遞迴添加子分類（如果有且不是 Level 3）
        if (cat.children && Array.isArray(cat.children) && !isLevel3) {
          this.addTargetCategoriesRecursively(
            cat.children,
            currentCategory,
            options,
            depth + 1
          );
        }
      });
    }

    /**
     * 移動分類到目標位置
     */
    /**
     * 禁用或啟用所有移動按鈕（Issue #1: Race Condition Prevention）
     * @param {boolean} disabled - true 表示禁用，false 表示啟用
     */
    setAllMoveButtonsEnabled(enabled) {
      const moveButtons = document.querySelectorAll('[data-move-button="true"]');
      console.log(`[Shopline Category Manager] 設置所有移動按鈕 ${enabled ? '啟用' : '禁用'} (共 ${moveButtons.length} 個)`);
      
      moveButtons.forEach((button) => {
        button.disabled = !enabled;
        if (!enabled) {
          button.style.opacity = '0.5';
          button.style.cursor = 'not-allowed';
        } else {
          button.style.opacity = '1';
          button.style.cursor = 'pointer';
        }
      });
    }

    async moveCategory(sourceCategory, targetCategory, categoriesArray = null, arrayName = 'categories') {
      if (this.isMoving) {
        console.log('[Shopline Category Manager] ⚠️  移動已在進行中，忽略重複請求');
        return;
      }

      this.isMoving = true;
      
      // Issue #1: 禁用所有移動按鈕防止並發操作
      this.setAllMoveButtonsEnabled(false);
      console.log('[Shopline Category Manager] 禁用所有移動按鈕（防止競態條件）');

      try {
        console.log('[Shopline Category Manager] 開始移動分類...');

        // 如果未指定陣列，使用預設的偵測方法
        if (!categoriesArray) {
          const arrayInfo = this.detectCategoryArray(sourceCategory);
          categoriesArray = arrayInfo.array;
          arrayName = arrayInfo.arrayName;
        }

        const success = await this.moveCategoryUsingScope(sourceCategory, targetCategory, categoriesArray, arrayName);

        if (success) {
          this.showSuccessMessage('分類移動成功！');
          console.log('[Shopline Category Manager] 移動成功');
        } else {
          this.showErrorMessage('移動失敗，請重試');
          console.error('[Shopline Category Manager] 移動失敗');
        }
      } catch (error) {
        console.error('[Shopline Category Manager] 移動時出錯:', error);
        this.showErrorMessage('移動失敗，請重試');
      } finally {
        this.isMoving = false;
        // Issue #1: 重新啟用所有移動按鈕
        this.setAllMoveButtonsEnabled(true);
        console.log('[Shopline Category Manager] 重新啟用所有移動按鈕');
      }
    }

    /**
     * 使用 AngularJS scope 移動分類（主方案）
     */
    async moveCategoryUsingScope(sourceCategory, targetCategory, categoriesArray = null, arrayName = 'categories') {
      const moveStartTime = performance.now();
      try {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('[Shopline Category Manager] 🚀 開始移動分類');
        console.log('─────────────────────────────────────────────────────────────');

        // 📍 第1步：驗證源分類信息
        console.log('[STEP 1] 驗證源分類...');
        console.log('  源分類:', this.getCategoryDisplayName(sourceCategory));
        console.log('  源有子項:', sourceCategory?.children?.length || 0);
        const sourceLevel = this.getLevel(sourceCategory, categoriesArray);
        console.log('  源層級:', sourceLevel);

        // 📍 第2步：確定目標位置
        console.log('[STEP 2] 驗證目標位置...');
        const targetDisplay = targetCategory ? this.getCategoryDisplayName(targetCategory) : '(根目錄)';
        console.log('  目標:', targetDisplay);
        if (targetCategory) {
          const targetLevel = this.getLevel(targetCategory, categoriesArray);
          const targetChildrenBefore = targetCategory.children?.length || 0;
          console.log('  目標層級:', targetLevel);
          console.log('  目標當前子項數:', targetChildrenBefore);
          if (targetLevel === 3) {
            console.error('  ❌ 目標已是最深層級，不能添加子項!');
            return false;
          }
        }

        // 如果未指定陣列，使用預設的偵測方法
        if (!categoriesArray) {
          const arrayInfo = this.detectCategoryArray(sourceCategory);
          categoriesArray = arrayInfo.array;
          arrayName = arrayInfo.arrayName;
        }

        console.log('[STEP 3] 定位源分類在陣列中的位置...');
        console.log('  使用陣列:', arrayName, `(${categoriesArray.length} 項)`);

        // 預先驗證
        const sourceParent = this.findCategoryParent(sourceCategory, categoriesArray);
        if (!sourceParent) {
          console.error('  ❌ 找不到源分類的父容器');
          return false;
        }

        console.log('  ✓ 找到父容器，包含', sourceParent.length, '項');

        const sourceIndex = sourceParent.indexOf(sourceCategory);
        if (sourceIndex === -1) {
          console.error('  ❌ 找不到源分類在陣列中的位置');
          return false;
        }

        console.log('  ✓ 源分類位置: 索引', sourceIndex);
        console.log('  鄰近項目:', {
          前: sourceParent[sourceIndex - 1] ? this.getCategoryDisplayName(sourceParent[sourceIndex - 1]) : '(無)',
          現: this.getCategoryDisplayName(sourceParent[sourceIndex]),
          後: sourceParent[sourceIndex + 1] ? this.getCategoryDisplayName(sourceParent[sourceIndex + 1]) : '(無)',
        });

        // 備份狀態以供回滾
        const targetChildrenBefore = targetCategory?.children?.length || 0;
        // Issue #6: 關鍵 - 記錄目標分類移動前是否擁有子分類
        const targetHadChildren = targetCategory ? !!targetCategory.children : false;
        const arrayLengthBefore = categoriesArray.length;
        const sourceParentLengthBefore = sourceParent.length;

        // 📍 提前獲取舊的父級 ID（用於 API 調用）
        let oldParentId = null;
        const parentOfSource = this.findCategoryParent(sourceCategory, categoriesArray);
        if (parentOfSource && parentOfSource !== categoriesArray) {
          // 找到是誰的子項
          const findParentCategory = (cats) => {
            for (const cat of cats) {
              if (cat.children === parentOfSource) {
                return cat._id || cat.id;
              }
              if (cat.children) {
                const result = findParentCategory(cat.children);
                if (result) return result;
              }
            }
            return null;
          };
          oldParentId = findParentCategory(categoriesArray);
        }
        // 如果沒找到，說明在根陣列中，oldParentId 保持 null

        const backupData = {
          sourceParent,
          sourceIndex,
          targetChildrenBefore,
          // Issue #6: 添加 targetHadChildren 用於完整回滾
          targetHadChildren,
          categoriesArray,
          arrayName,
        };

        // 📍 第4步：執行移動操作
        console.log('[STEP 4] 執行移動操作...');

        // 4a. 從源移除
        console.log('  4a. 從源陣列移除...');
        sourceParent.splice(sourceIndex, 1);
        console.log('  ✓ 已從源移除，源陣列現在有', sourceParent.length, '項');


        // 4b. 添加到目標
        console.log('  4b. 添加到目標位置...');
        if (targetCategory === null) {
          // 移到根目錄
          categoriesArray.unshift(sourceCategory);
          console.log('  ✓ 已添加到根目錄開頭');
        } else {
          // 移到目標分類的子分類下
          if (!targetCategory.children) {
            targetCategory.children = [];
            console.log('  ✓ 目標首次初始化子項陣列');
          }
          targetCategory.children.push(sourceCategory);
          console.log('  ✓ 已添加到目標的子項，目標現在有', targetCategory.children.length, '個子項');
        }

        // 📍 第5步：觸發 AngularJS 更新
        console.log('[STEP 5] 觸發 AngularJS 更新...');
        let applyError = null;
        try {
          if (this.scope.$apply) {
            // 保護：檢查是否已在 digest 中
            // Issue #3: 驗證 $root 存在再訪問 $$phase
            if (!this.scope.$$phase && !this.scope.$root?.$$phase) {
              this.scope.$apply();
              console.log('  ✓ 已觸發 $apply()');
            } else {
              console.warn('  ⚠️  Already in digest phase，跳過 $apply()');
            }
          } else {
            console.warn('  ⚠️  無法找到 scope，跳過 $apply()');
          }
        } catch (e) {
          // $apply 失敗時記錄但不中斷，API 調用必須繼續執行
          console.warn('[Shopline Category Manager] ⚠️  $apply 觸發異常（非致命）:', e.message);
          applyError = e;
        }

        // 📍 第6步：驗證移動結果
        console.log('[STEP 6] 驗證移動結果...');
        const arrayLengthAfter = categoriesArray.length;
        const sourceParentLengthAfter = sourceParent.length;
        const targetChildrenAfter = targetCategory?.children?.length || 0;

        console.log('  陣列大小對比:');
        console.log('    - 主陣列:', arrayLengthBefore, '→', arrayLengthAfter, `(${arrayLengthBefore === arrayLengthAfter ? '✓ 不變' : '⚠️  變化'})`);
        console.log('  源陣列對比:');
        console.log('    - 源父容器:', sourceParentLengthBefore, '→', sourceParentLengthAfter, `(少了 ${sourceParentLengthBefore - sourceParentLengthAfter} 項 ${sourceParentLengthBefore - sourceParentLengthAfter === 1 ? '✓' : '❌'})`);
        if (targetCategory) {
          console.log('  目標陣列對比:');
          console.log('    - 目標子項:', targetChildrenBefore, '→', targetChildrenAfter, `(多了 ${targetChildrenAfter - targetChildrenBefore} 項 ${targetChildrenAfter - targetChildrenBefore === 1 ? '✓' : '❌'})`);
        }

        // 驗證源分類是否真的被移除
        const sourceStillInOldLocation = sourceParent.indexOf(sourceCategory) !== -1;
        if (sourceStillInOldLocation) {
          console.error('  ❌ 驗證失敗：源分類仍在舊位置!');
          this.rollbackMove(sourceCategory, targetCategory, backupData);
          return false;
        }

        // 驗證源分類是否已在新位置
        let sourceInNewLocation = false;
        if (targetCategory === null) {
          sourceInNewLocation = categoriesArray.indexOf(sourceCategory) !== -1;
        } else {
          sourceInNewLocation = targetCategory.children?.indexOf(sourceCategory) !== -1;
        }

        if (!sourceInNewLocation) {
          console.error('  ❌ 驗證失敗：源分類不在新位置!');
          this.rollbackMove(sourceCategory, targetCategory, backupData);
          return false;
        }

        console.log('  ✓ 驗證通過：源分類已成功移動');

        // 📍 第7步：調用 API 持久化保存（獨立的 try/catch，不受 $apply 影響）
        console.log('[STEP 7] 呼叫 API 保存到伺服器...');
        try {
          const apiResult = await this.saveCategoryOrderingToServer(
            sourceCategory,
            targetCategory,
            oldParentId
          );

          // Issue #8: 處理新的錯誤對象格式
          if (!apiResult.success) {
            console.warn('[Shopline Category Manager] ⚠️  API 調用失敗');
            console.warn('[Shopline Category Manager]   錯誤類型:', apiResult.type);
            console.warn('[Shopline Category Manager]   訊息:', apiResult.message);
            
            // 根據錯誤類型顯示不同的信息
            if (apiResult.type === 'network-error') {
              console.warn('[Shopline Category Manager] ⚠️  網路錯誤：連線問題或伺服器無法連接');
              this.showWarningMessage('網路連線失敗。分類已在本地更新，但未保存到伺服器。請檢查網際網路連線後重新整理頁面。');
            } else if (apiResult.type === 'pure-server-failure') {
              console.warn('[Shopline Category Manager] ⚠️  純伺服器端失敗：客戶端成功，伺服器拒絕');
              this.showWarningMessage('伺服器錯誤。分類已在本地更新，但未保存到伺服器。請稍後重試。');
            } else if (apiResult.type === 'client-error') {
              console.warn('[Shopline Category Manager] ⚠️  客戶端錯誤：無法準備請求');
              this.showErrorMessage(apiResult.message);
            }
          } else {
            console.log('[Shopline Category Manager] ✅ API 調用成功，分類已保存到伺服器');
          }
        } catch (apiError) {
          // API 調用異常時記錄但不中斷，客戶端數據已正確
          console.error('[Shopline Category Manager] [API] 調用異常（客戶端數據已更新）:', apiError.message);
          this.showWarningMessage('發生未預期的錯誤。分類已在本地更新，但未保存到伺服器。請重新整理頁面。');
        }

        const moveEndTime = performance.now();
        const duration = (moveEndTime - moveStartTime).toFixed(2);
        console.log('[STEP 8] 完成移動');
        console.log('  ✅ 移動成功！耗時:', duration, 'ms');
        console.log('═══════════════════════════════════════════════════════════════\n');
        return true;
      } catch (error) {
        const moveEndTime = performance.now();
        const duration = (moveEndTime - moveStartTime).toFixed(2);
        console.error('[Shopline Category Manager] ❌ 移動失敗 (耗時:', duration, 'ms):', error);
        return false;
      }
    }

    /**
     * 回滾移動操作
     */
    /**
     * 調用 Shopline API 保存分類排序到伺服器
     * 確保刷新頁面後分類排序仍然保留
     */
    async saveCategoryOrderingToServer(sourceCategory, targetCategory, oldParentId) {
      try {
        console.log('[Shopline Category Manager] [API] 開始調用 Shopline API...');

        // 📍 Step 1: 提取 shopId 從 URL
        const urlMatch = window.location.pathname.match(/\/admin\/([^/]+)/);
        if (!urlMatch || !urlMatch[1]) {
          console.error('[Shopline Category Manager] [API] ❌ 無法從 URL 提取 shopId');
          return { 
            success: false, 
            type: 'client-error', 
            message: '無法確定店鋪 ID，請重新整理頁面' 
          };
        }
        const shopId = urlMatch[1];
        console.log('[Shopline Category Manager] [API] ShopId:', shopId);

        // 📍 Step 2: 獲取分類 ID
        const categoryId = sourceCategory._id || sourceCategory.id;
        if (!categoryId) {
          console.error('[Shopline Category Manager] [API] ❌ 源分類缺少 ID');
          return { 
            success: false, 
            type: 'client-error', 
            message: '分類資訊不完整，請重新整理頁面後重試' 
          };
        }
        console.log('[Shopline Category Manager] [API] CategoryId:', categoryId);

        // 📍 Step 3: 獲取新的父級 ID（目標分類的 ID，如果移到根目錄則為 null）
        const newParentId = targetCategory ? (targetCategory._id || targetCategory.id) : null;
        console.log('[Shopline Category Manager] [API] NewParentId:', newParentId);
        console.log('[Shopline Category Manager] [API] OldParentId:', oldParentId);

        // 📍 Step 4: 獲取 CSRF Token（多個備用位置）
        let csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        // 備用方案 1: 檢查其他常見的 token meta tag
        if (!csrfToken) {
          csrfToken = document.querySelector('meta[name="csrf"]')?.getAttribute('content');
        }
        
        // 備用方案 2: 檢查 window 對象上的 token
        if (!csrfToken && window._csrf_token) {
          csrfToken = window._csrf_token;
        }
        
        if (!csrfToken) {
          console.warn('[Shopline Category Manager] [API] ⚠️  無法獲取 CSRF Token，API 調用可能失敗');
        }
        console.log('[Shopline Category Manager] [API] CSRF Token:', csrfToken ? `已取得 (${csrfToken.substring(0, 10)}...)` : '(缺失)');

        // 📍 Step 5: 構建請求體
        const requestPayload = {
          parent: newParentId,        // 新的父級分類 ID（null = 根目錄）
          ancestor: oldParentId,      // 舊的父級分類 ID（null = 根目錄）
          descendant: categoryId       // 被移動的分類 ID
        };
        console.log('[Shopline Category Manager] [API] 請求體:', JSON.stringify(requestPayload, null, 2));

        // 📍 Step 6: 調用 API
        // 使用相對路徑確保同域名請求，避免 CORS 問題
        const apiUrl = `/api/admin/v1/${shopId}/categories/${categoryId}/ordering`;
        console.log('[Shopline Category Manager] [API] 調用 PUT:', apiUrl);

        const response = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json;charset=UTF-8',
            'X-CSRF-Token': csrfToken || '',
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestPayload),
          credentials: 'include' // 包含 cookie（用於身份驗證）
        });

        // 📍 Step 7: 檢查響應
        console.log('[Shopline Category Manager] [API] 回應狀態:', response.status, response.statusText);

        // 特殊處理：Shopline API 有時返回 500 但實際執行了操作
        // 嘗試解析響應體來判斷是否真的失敗
        if (!response.ok) {
          const errorData = await response.text();
          console.warn('[Shopline Category Manager] [API] ⚠️  HTTP ' + response.status + ' 錯誤');
          console.log('  完整響應:', errorData);
          
          // 嘗試解析 JSON
          let isLikelySuccess = false;
          try {
            const responseJson = JSON.parse(errorData);
            console.log('[Shopline Category Manager] [API] 解析的回應:', JSON.stringify(responseJson, null, 2));
            
            // Shopline API 的響應格式為 { result: boolean, message: string, data: object }
            // 即使返回 500，如果包含這個結構，表示伺服器確實處理了請求
            if ('result' in responseJson || 'message' in responseJson || 'data' in responseJson) {
              console.warn('[Shopline Category Manager] [API] ⚠️  伺服器返回 HTTP 500，但看起來實際處理了請求');
              console.warn('[Shopline Category Manager] [API] ⚠️  (Shopline 伺服器可能有 bug，返回錯誤狀態碼但實際成功)');
              isLikelySuccess = true;
            }
          } catch (parseError) {
            // 不是 JSON 格式，確實失敗
            console.error('[Shopline Category Manager] [API] ❌ 無法解析響應為 JSON，API 調用失敗');
          }
          
          if (!isLikelySuccess) {
            // Issue #8: 返回詳細錯誤對象而不只是 false
            console.error('[Shopline Category Manager] [API] ❌ API 失敗（純伺服器端失敗）');
            return {
              success: false,
              type: 'pure-server-failure',
              httpStatus: response.status,
              message: `伺服器錯誤 (${response.status}): 請求失敗，請重試`
            };
          }
        }

        // 📍 Step 8: 解析響應
        let responseData;
        try {
          responseData = await response.json();
          console.log('[Shopline Category Manager] [API] ✅ API 調用成功！');
          console.log('[Shopline Category Manager] [API] 回應:', JSON.stringify(responseData, null, 2));
          return { success: true };
        } catch (parseError) {
          console.warn('[Shopline Category Manager] [API] ⚠️  無法解析 JSON 響應，但狀態碼為 200');
          console.log('[Shopline Category Manager] [API] 響應文本:', await response.text());
          return { success: true }; // 狀態碼 200，視為成功
        }

      } catch (error) {
        console.error('[Shopline Category Manager] [API] ❌ API 調用發生異常:', error);
        console.error('  錯誤訊息:', error.message);
        console.error('  堆棧:', error.stack);
        
        // Issue #8: 返回詳細錯誤對象區分錯誤類型
        return {
          success: false,
          type: 'network-error',
          message: error.message || '網路連線失敗，請檢查您的網際網路連線'
        };
      }
    }

    rollbackMove(sourceCategory, targetCategory, backupData) {
      try {
        const { sourceParent, sourceIndex, previousChildren, targetHadChildren, categoriesArray, arrayName } = backupData;

        console.log('[Shopline Category Manager] 回滾移動操作...');
        console.log('[Shopline Category Manager] 備份數據:', {
          sourceIndex,
          previousChildren,
          targetHadChildren,
          arrayName
        });

        // Issue #6: 完整回滾邏輯 - 從目標移除
        if (targetCategory === null) {
          // 從根目錄移除
          const idx = categoriesArray.indexOf(sourceCategory);
          if (idx !== -1) {
            categoriesArray.splice(idx, 1);
            console.log('[Shopline Category Manager] ✓ 從根目錄移除分類');
          }
        } else {
          // 從目標分類的子分類移除
          if (targetCategory.children) {
            const idx = targetCategory.children.indexOf(sourceCategory);
            if (idx !== -1) {
              targetCategory.children.splice(idx, 1);
              console.log('[Shopline Category Manager] ✓ 從目標分類子分類移除分類');
            }
            
            // Issue #6: 關鍵修復 - 恢復 targetCategory.children 的原始狀態
            // 如果目標之前沒有子分類，需要刪除 children 屬性
            if (!targetHadChildren && targetCategory.children && targetCategory.children.length === 0) {
              delete targetCategory.children;
              console.log('[Shopline Category Manager] ✓ 刪除 targetCategory.children (恢復原始狀態)');
            }
          }
        }

        // Issue #6: 恢復到原位置（保留原始數組引用）
        if (sourceParent && Array.isArray(sourceParent)) {
          sourceParent.splice(sourceIndex, 0, sourceCategory);
          console.log('[Shopline Category Manager] ✓ 分類已恢復到原位置 (索引:', sourceIndex + ')');
        } else {
          console.error('[Shopline Category Manager] ❌ 無法恢復：sourceParent 無效');
        }

        // 嘗試再次觸發 AngularJS 更新
        try {
          if (this.scope && this.scope.$apply) {
            this.scope.$apply();
            console.log('[Shopline Category Manager] ✓ AngularJS $apply 已觸發');
          }
        } catch (e) {
          console.error('[Shopline Category Manager] 回滾時 $apply 也失敗:', e);
        }

        console.log('[Shopline Category Manager] ✅ 移動操作已完全回滾（陣列:', arrayName + ')');
      } catch (error) {
        console.error('[Shopline Category Manager] ❌ 回滾時出錯:', error);
      }
    }

    /**
     * 顯示警告訊息（Issue #8: API error handling）
     */
    showWarningMessage(message) {
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #faad14;
        color: white;
        padding: 12px 16px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 2000;
        font-size: 14px;
      `;
      document.body.appendChild(toast);

      // Issue #10: 使用常數而非魔法數字
      setTimeout(() => {
        toast.remove();
      }, CategoryManager.TOAST_WARNING_DURATION_MS);
    }

    /**
     * 找到分類物件在陣列結構中的父容器
     */
    findCategoryParent(category, categoriesArray = null) {
      const categoryName = this.getCategoryDisplayName(category);
      console.log('[Shopline Category Manager] [DEBUG] findCategoryParent: searching for', categoryName);

      // 如果未指定陣列，使用預設的偵測方法
      if (!categoriesArray) {
        const arrayInfo = this.detectCategoryArray(category);
        categoriesArray = arrayInfo.array;
        console.log('[Shopline Category Manager] [DEBUG] Auto-detected array:', arrayInfo.arrayName);
      }

      // 檢查根陣列
      if (categoriesArray.indexOf(category) !== -1) {
        console.log('[Shopline Category Manager] [DEBUG] Found in root array');
        return categoriesArray;
      }

      // 遞迴搜尋子分類
      const search = (categories, depth = 0) => {
        console.log('[Shopline Category Manager] [DEBUG] Searching at depth', depth, 'with', categories.length, 'categories');
        for (const cat of categories) {
          const catName = this.getCategoryDisplayName(cat);
          if (cat.children && cat.children.indexOf(category) !== -1) {
            console.log('[Shopline Category Manager] [DEBUG] Found', categoryName, 'as child of', catName);
            return cat.children;
          }

          if (cat.children && Array.isArray(cat.children)) {
            const result = search(cat.children, depth + 1);
            if (result) {
              return result;
            }
          }
        }
        return null;
      };

      const result = search(categoriesArray);
      if (!result) {
        console.warn('[Shopline Category Manager] [DEBUG] Could not find parent for', categoryName);
      }
      return result;
    }

    /**
     * 顯示成功訊息
     */
    showSuccessMessage(message) {
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #52c41a;
        color: white;
        padding: 12px 16px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: ${CategoryManager.TOAST_Z_INDEX};
        font-size: 14px;
      `;
      document.body.appendChild(toast);

      // Issue #10: 使用常數而非魔法數字
      setTimeout(() => {
        toast.remove();
      }, CategoryManager.TOAST_SUCCESS_DURATION_MS);
    }

    /**
     * 顯示錯誤訊息
     */
    showErrorMessage(message) {
      const toast = document.createElement('div');
      toast.textContent = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #ff4d4f;
        color: white;
        padding: 12px 16px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: ${CategoryManager.TOAST_Z_INDEX};
        font-size: 14px;
      `;
      document.body.appendChild(toast);

      // Issue #10: 使用常數而非魔法數字
      setTimeout(() => {
        toast.remove();
      }, CategoryManager.TOAST_ERROR_DURATION_MS);
    }

    /**
     * 計算分類的層級
     */
    getLevel(category, categoriesArray = null) {
      // 如果未指定陣列，使用預設的偵測方法
      if (!categoriesArray) {
        const arrayInfo = this.detectCategoryArray(category);
        categoriesArray = arrayInfo.array;
      }
      return getCategoryLevel(categoriesArray, category);
    }

    /**
     * 取得分類的所有子孫
     */
    getAllDescendants(category) {
      return getCategoryDescendants(category);
    }
  }

  // ============================================================================
  // 初始化函數
  // ============================================================================

  /**
   * 等待指定的 DOM 元素出現
   */
  function waitForElement(selector, timeout = CategoryManager.WAIT_ELEMENT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      console.log(`[Shopline Category Manager] 等待元素: ${selector}`);

      const element = document.querySelector(selector);
      if (element) {
        console.log(`[Shopline Category Manager] ✓ 立即找到元素: ${selector}`);
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`[Shopline Category Manager] ✓ MutationObserver 找到元素: ${selector}`);
          observer.disconnect();
          resolve(element);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        console.error(`[Shopline Category Manager] ✗ 超時 (${timeout}ms) 未找到元素: ${selector}`);
        reject(new Error(`Timeout waiting for element: ${selector}`));
      }, timeout);
    });
  }

  /**
   * 取得 AngularJS scope
   */
  function getAngularScope(element) {
    if (!window.angular) {
      console.error('[Shopline Category Manager] AngularJS 不可用');
      return null;
    }

    try {
      const scope = angular.element(element).scope();
      if (!scope) {
        console.error('[Shopline Category Manager] 無法取得 scope');
        return null;
      }
      return scope;
    } catch (error) {
      console.error('[Shopline Category Manager] 取得 scope 時出錯:', error);
      return null;
    }
  }

  /**
   * 尋找包含 categories 陣列的 scope
   */
  function findCategoriesScope(element) {
    // 方式 1: 直接從傳入的元素本身取得（如果它是樹容器）
    let scope = getAngularScope(element);
    if (scope && scope.categories && Array.isArray(scope.categories)) {
      console.log('[Shopline Category Manager] ✓ 從傳入元素 scope 找到 categories');
      return scope;
    }

    // 方式 2: 嘗試找到最近的樹容器
    const treeContainer = element.closest?.('.angular-ui-tree') ||
                         element.querySelector?.('.angular-ui-tree') ||
                         element;

    scope = getAngularScope(treeContainer);
    if (scope && scope.categories && Array.isArray(scope.categories)) {
      console.log('[Shopline Category Manager] ✓ 從樹容器 scope 找到 categories');
      return scope;
    }

    // 方式 3: 如果樹容器本身沒有 categories，在樹節點上查找
    const treeNode = treeContainer.querySelector?.('.angular-ui-tree-node');
    if (treeNode) {
      const nodeScope = getAngularScope(treeNode);
      if (nodeScope && nodeScope.categories && Array.isArray(nodeScope.categories)) {
        console.log('[Shopline Category Manager] ✓ 從樹節點 scope 找到 categories');
        return nodeScope;
      }
    }

    console.warn('[Shopline Category Manager] ✗ 無法找到 categories 陣列');
    return null;
  }

  /**
   * 等待樹有實際的分類節點
   */
  function waitForTreeNodes(timeout = CategoryManager.TREE_NODES_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      console.log('[Shopline Category Manager] 等待樹節點載入...');

      // 檢查是否已有分類節點
      const checkNodes = () => {
        const nodes = document.querySelectorAll('.angular-ui-tree-node');
        if (nodes.length > 0) {
          console.log('[Shopline Category Manager] ✓ 找到', nodes.length, '個樹節點');
          return true;
        }
        return false;
      };

      if (checkNodes()) {
        resolve();
        return;
      }

      // 監聽 DOM 變化
      const observer = new MutationObserver(() => {
        if (checkNodes()) {
          observer.disconnect();
          resolve();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error('Timeout waiting for tree nodes'));
      }, timeout);
    });
  }

  /**
   * 初始化應用
   */
  async function init() {
    try {
      console.log('[Shopline Category Manager] 正在初始化...');

      // 首先等待實際的樹節點出現（表示分類已加載）
      try {
        await waitForTreeNodes(CategoryManager.TREE_NODES_TIMEOUT_MS);
      } catch (error) {
        console.error('[Shopline Category Manager] 樹節點超時:', error.message);
      }

      // 等待樹容器載入
      let treeContainer;
      try {
        treeContainer = await waitForElement('.angular-ui-tree', CategoryManager.UI_INIT_TIMEOUT_MS);
        console.log('[Shopline Category Manager] 樹容器已載入');
      } catch (error) {
        console.error('[Shopline Category Manager] 樹容器未找到:', error.message);
        console.log('[Shopline Category Manager] 嘗試備選選擇器...');

        // 嘗試備選選擇器
        treeContainer = document.querySelector('[ui-tree]');
        if (!treeContainer) {
          treeContainer = document.querySelector('.category-list .angular-ui-tree');
        }
        if (!treeContainer) {
          treeContainer = document.querySelector('.angular-ui-tree-nodes');
        }

        if (!treeContainer) {
          console.error('[Shopline Category Manager] 無法找到樹容器');
          return;
        }
        console.log('[Shopline Category Manager] ✓ 使用備選選擇器找到樹容器');
      }

      // 診斷樹容器狀態
      console.log('[Shopline Category Manager] 樹容器 HTML 長度:', treeContainer.innerHTML.length);
      console.log('[Shopline Category Manager] 樹容器 children:', treeContainer.children.length);

      // 尋找包含 categories 的 scope
      const scope = findCategoriesScope(treeContainer);
      if (!scope) {
        console.error('[Shopline Category Manager] 初始化失敗：無法找到 categories 陣列');
        console.log('[Shopline Category Manager] 診斷資訊：');
        console.log('- 樹容器:', treeContainer);
        console.log('- 樹容器 class:', treeContainer.className);
        console.log('- 直接 scope:', getAngularScope(treeContainer));
        console.log('- 樹容器內容:', treeContainer.innerHTML.substring(0, 300));

        console.log('[Shopline Category Manager] 嘗試從樹容器直接獲取 scope...');
        const containerScope = getAngularScope(treeContainer);
        if (containerScope) {
          console.log('[Shopline Category Manager] 樹容器 scope:', containerScope);

          if (containerScope.categories && Array.isArray(containerScope.categories)) {
            console.log('[Shopline Category Manager] ✓ 從樹容器 scope 找到 categories！');
            const categoryManager = new CategoryManager(containerScope);
            categoryManager.initialize();
            return;
          }

          if (containerScope.posCategories && Array.isArray(containerScope.posCategories)) {
            console.log('[Shopline Category Manager] ✓ 從樹容器 scope 找到 posCategories！');
            const categoryManager = new CategoryManager(containerScope);
            categoryManager.initialize();
            return;
          }
        }

        return;
      }

      if (!scope.categories || scope.categories.length === 0) {
        console.warn('[Shopline Category Manager] 警告：categories 陣列為空');
        console.log('[Shopline Category Manager] 這可能是頁面剛載入完成，分類數據可能稍後出現');
      }

      console.log('[Shopline Category Manager] ✓ 成功初始化');
      console.log('[Shopline Category Manager] 找到', scope.categories?.length || 0, '個 categories');

      // 檢查是否有 posCategories
      if (scope.posCategories && scope.posCategories.length > 0) {
        console.log('[Shopline Category Manager] 同時找到', scope.posCategories.length, '個 posCategories');
      }

      // 初始化分類管理工具（會自動檢測兩個陣列）
      const categoryManager = new CategoryManager(scope);
      categoryManager.initialize();
    } catch (error) {
      console.error('[Shopline Category Manager] 初始化錯誤:', error);
      console.error('[Shopline Category Manager] 錯誤堆棧:', error.stack);
    }
  }

  // ============================================================================
  // 啟動應用
  // ============================================================================

  console.log('[Shopline Category Manager] 腳本已載入，document.readyState:', document.readyState);

  // 頁面載入完成後初始化
  if (document.readyState === 'loading') {
    console.log('[Shopline Category Manager] 監聽 DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[Shopline Category Manager] DOMContentLoaded 觸發');
      init();
    });
  } else {
    console.log('[Shopline Category Manager] 頁面已載入，直接初始化...');
    init();
  }
})();
