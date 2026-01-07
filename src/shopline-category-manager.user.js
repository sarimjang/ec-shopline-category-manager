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
    constructor(scope) {
      this.scope = scope;
      this.categories = scope.categories;
      this.isMoving = false;
    }

    initialize() {
      console.log('[Shopline Category Manager] 初始化分類管理器');
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

        // 監聽 DOM 變化，動態注入按鈕
        const observer = new MutationObserver(() => {
          this.attachButtonsToCategories();
        });

        observer.observe(treeContainer, {
          childList: true,
          subtree: true,
        });

        // 初始化按鈕注入
        this.attachButtonsToCategories();
        console.log('[Shopline Category Manager] UI 注入完成');
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
        // 找到操作按鈕區
        const buttonArea = node.querySelector('.col-xs-5.text-right');
        if (!buttonArea) {
          return;
        }

        // 避免重複注入
        if (buttonArea.querySelector('[data-move-button]')) {
          return;
        }

        const category = this.getCategoryFromElement(node);
        if (!category) {
          console.warn(`[Shopline Category Manager] 無法從第 ${index} 個節點取得分類物件`);
          return;
        }

        // 建立「移動到」按鈕
        const moveButton = document.createElement('button');
        moveButton.textContent = '📁 移動到 ▼';
        moveButton.setAttribute('data-move-button', 'true');
        moveButton.className = 'btn btn-sm btn-default';
        moveButton.style.marginRight = '8px';
        moveButton.type = 'button';

        // 檢查分類是否應該禁用按鈕（特殊分類）
        if (category.key) {
          moveButton.disabled = true;
          moveButton.title = '特殊分類不支援移動';
        } else {
          moveButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showMoveDropdown(category, moveButton);
          });
        }

        // 在按鈕區最前面插入按鈕
        buttonArea.insertBefore(moveButton, buttonArea.firstChild);
      });
    }

    /**
     * 從 DOM 元素中提取對應的分類物件
     */
    getCategoryFromElement(element) {
      // 嘗試從 AngularJS scope 中取得分類
      try {
        const scope = angular.element(element).scope();
        if (scope && scope.item) {
          return scope.item;
        }
      } catch (error) {
        console.warn('[Shopline Category Manager] 無法從 scope 取得分類:', error);
      }
      return null;
    }

    /**
     * 顯示「移動到」下拉選單（協調器）
     */
    showMoveDropdown(category, button) {
      this.removeExistingDropdown();

      const dropdown = this.createDropdownContainer();
      const options = this.getValidMoveTargets(category);

      this.populateDropdownOptions(dropdown, options, category);
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
        existingDropdown.remove();
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
        z-index: 10000;
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
    populateDropdownOptions(dropdown, options, currentCategory) {
      options.forEach((option) => {
        const item = this.createDropdownItem(option, currentCategory);
        dropdown.appendChild(item);
      });
    }

    /**
     * 建立單一下拉選單項目
     */
    createDropdownItem(option, currentCategory) {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 10px 12px;
        cursor: ${option.disabled ? 'not-allowed' : 'pointer'};
        border-bottom: 1px solid #f0f0f0;
        user-select: none;
        transition: background-color 0.2s ease;
        opacity: ${option.disabled ? '0.5' : '1'};
        background-color: ${option.disabled ? '#fafafa' : 'transparent'};
      `;

      // 建立標籤（支援樹狀縮排）
      const labelContainer = document.createElement('span');
      labelContainer.style.cssText = 'display: flex; align-items: center;';

      // 添加縮排符號
      if (option.indent > 0) {
        for (let i = 0; i < option.indent; i++) {
          const indent = document.createElement('span');
          indent.textContent = '├─ ';
          indent.style.cssText = 'color: #999; margin-right: 4px;';
          labelContainer.appendChild(indent);
        }
      }

      // 添加分類名稱
      const nameSpan = document.createElement('span');
      nameSpan.textContent = option.label;
      labelContainer.appendChild(nameSpan);

      item.appendChild(labelContainer);

      // 附加項目事件監聽
      this.attachItemEventListeners(item, option, currentCategory);

      return item;
    }

    /**
     * 附加下拉選單項目的事件監聽
     */
    attachItemEventListeners(item, option, currentCategory) {
      if (!option.disabled) {
        item.addEventListener('mouseover', () => {
          item.style.backgroundColor = '#f5f5f5';
        });
        item.addEventListener('mouseout', () => {
          item.style.backgroundColor = 'transparent';
        });
        item.addEventListener('click', () => {
          this.moveCategory(currentCategory, option.target);
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

    /**
     * 取得有效的移動目標
     */
    getValidMoveTargets(category) {
      const options = [];
      const currentLevel = this.getLevel(category);

      // 根目錄選項
      options.push({
        label: '📂 根目錄',
        target: null,
        indent: 0,
        disabled: currentLevel === 1,
      });

      // 遞迴添加所有可用的目標分類
      this.addTargetCategoriesRecursively(this.categories, category, options, 0);

      return options;
    }

    /**
     * 遞迴添加目標分類選項
     */
    addTargetCategoriesRecursively(categories, currentCategory, options, depth) {
      categories.forEach((cat) => {
        // 排除自己
        if (cat === currentCategory) {
          return;
        }

        // 排除自己的子孫（防止迴圈）
        if (isDescendant(currentCategory, cat)) {
          return;
        }

        // 取得目標分類的層級
        const targetLevel = this.getLevel(cat);

        // 排除 Level 3 分類（最深層級，不能再有子分類）
        const isLevel3 = targetLevel === 3;

        // 添加選項
        options.push({
          label: cat.name,
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
    async moveCategory(sourceCategory, targetCategory) {
      if (this.isMoving) {
        return;
      }

      this.isMoving = true;

      try {
        console.log('[Shopline Category Manager] 開始移動分類...');

        const success = await this.moveCategoryUsingScope(sourceCategory, targetCategory);

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
      }
    }

    /**
     * 使用 AngularJS scope 移動分類（主方案）
     */
    async moveCategoryUsingScope(sourceCategory, targetCategory) {
      try {
        // 預先驗證
        const sourceParent = this.findCategoryParent(sourceCategory);
        if (!sourceParent) {
          console.error('[Shopline Category Manager] 找不到源分類的父容器');
          return false;
        }

        const sourceIndex = sourceParent.indexOf(sourceCategory);
        if (sourceIndex === -1) {
          console.error('[Shopline Category Manager] 找不到源分類在陣列中的位置');
          return false;
        }

        // 備份狀態以供回滾
        const backupData = {
          sourceParent,
          sourceIndex,
          previousChildren: targetCategory?.children?.length,
        };

        // 執行移動操作
        sourceParent.splice(sourceIndex, 1);

        if (targetCategory === null) {
          // 移到根目錄
          this.categories.unshift(sourceCategory);
        } else {
          // 移到目標分類的子分類下
          if (!targetCategory.children) {
            targetCategory.children = [];
          }
          targetCategory.children.push(sourceCategory);
        }

        // 觸發 AngularJS 更新
        try {
          if (this.scope.$apply) {
            this.scope.$apply();
          }
          return true;
        } catch (applyError) {
          console.error('[Shopline Category Manager] $apply 失敗，正在回滾:', applyError);
          this.rollbackMove(sourceCategory, targetCategory, backupData);
          return false;
        }
      } catch (error) {
        console.error('[Shopline Category Manager] scope 移動失敗:', error);
        return false;
      }
    }

    /**
     * 回滾移動操作
     */
    rollbackMove(sourceCategory, targetCategory, backupData) {
      try {
        const { sourceParent, sourceIndex, previousChildren } = backupData;

        // 從目標移除
        if (targetCategory === null) {
          // 從根目錄移除
          const idx = this.categories.indexOf(sourceCategory);
          if (idx !== -1) this.categories.splice(idx, 1);
        } else {
          // 從目標分類的子分類移除
          if (targetCategory.children) {
            const idx = targetCategory.children.indexOf(sourceCategory);
            if (idx !== -1) targetCategory.children.splice(idx, 1);
            // 如果之前沒有子分類，恢復到未定義狀態
            if (previousChildren === undefined && targetCategory.children.length === 0) {
              delete targetCategory.children;
            }
          }
        }

        // 恢復到原位置
        sourceParent.splice(sourceIndex, 0, sourceCategory);

        // 嘗試再次觸發 AngularJS 更新
        try {
          if (this.scope.$apply) {
            this.scope.$apply();
          }
        } catch (e) {
          console.error('[Shopline Category Manager] 回滾時 $apply 也失敗:', e);
        }

        console.log('[Shopline Category Manager] 移動操作已回滾');
      } catch (error) {
        console.error('[Shopline Category Manager] 回滾時出錯:', error);
      }
    }

    /**
     * 找到分類物件在陣列結構中的父容器
     */
    findCategoryParent(category) {
      // 檢查根陣列
      if (this.categories.indexOf(category) !== -1) {
        return this.categories;
      }

      // 遞迴搜尋子分類
      const search = (categories) => {
        for (const cat of categories) {
          if (cat.children && cat.children.indexOf(category) !== -1) {
            return cat.children;
          }

          if (cat.children && Array.isArray(cat.children)) {
            const result = search(cat.children);
            if (result) {
              return result;
            }
          }
        }
        return null;
      };

      return search(this.categories);
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
        z-index: 2000;
        font-size: 14px;
      `;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 2000);
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
        z-index: 2000;
        font-size: 14px;
      `;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 3000);
    }

    /**
     * 計算分類的層級
     */
    getLevel(category) {
      return getCategoryLevel(this.categories, category);
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
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      const observer = new MutationObserver(() => {
        const element = document.querySelector(selector);
        if (element) {
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
    // 嘗試直接從元素的 scope 取得
    let scope = getAngularScope(element);
    if (scope && scope.categories && Array.isArray(scope.categories)) {
      return scope;
    }

    // 嘗試從 $parent scope 取得
    if (scope && scope.$parent) {
      if (scope.$parent.categories && Array.isArray(scope.$parent.categories)) {
        return scope.$parent;
      }
    }

    // 嘗試從 $parent.$parent scope 取得
    if (scope && scope.$parent && scope.$parent.$parent) {
      if (scope.$parent.$parent.categories && Array.isArray(scope.$parent.$parent.categories)) {
        return scope.$parent.$parent;
      }
    }

    // 最後的手段：搜尋樹中的所有 scope，尋找 categories 陣列
    const nodes = element.querySelectorAll('[ng-scope]');
    for (const node of nodes) {
      const nodeScope = getAngularScope(node);
      if (nodeScope && nodeScope.categories && Array.isArray(nodeScope.categories)) {
        console.log('[Shopline Category Manager] 在節點 scope 中找到 categories');
        return nodeScope;
      }
    }

    return null;
  }

  /**
   * 初始化應用
   */
  async function init() {
    try {
      console.log('[Shopline Category Manager] 正在初始化...');

      // 等待樹容器載入
      const treeContainer = await waitForElement('.angular-ui-tree', 10000);
      console.log('[Shopline Category Manager] 樹容器已載入');

      // 尋找包含 categories 的 scope
      const scope = findCategoriesScope(treeContainer);
      if (!scope) {
        console.error('[Shopline Category Manager] 初始化失敗：無法找到 categories 陣列');
        console.log('[Shopline Category Manager] 診斷資訊：');
        console.log('- 樹容器:', treeContainer);
        console.log('- 直接 scope:', getAngularScope(treeContainer));
        return;
      }

      console.log('[Shopline Category Manager] 成功初始化');
      console.log('[Shopline Category Manager] 找到', scope.categories.length, '個根分類');

      // 初始化分類管理工具
      const categoryManager = new CategoryManager(scope);
      categoryManager.initialize();
    } catch (error) {
      console.error('[Shopline Category Manager] 初始化錯誤:', error);
    }
  }

  // ============================================================================
  // 啟動應用
  // ============================================================================

  // 頁面載入完成後初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
