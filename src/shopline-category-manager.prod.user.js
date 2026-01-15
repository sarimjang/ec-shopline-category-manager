// ==UserScript==
// @name         Shopline 分類管理 - 快速移動 (Production)
// @namespace    https://github.com/sarimjang/shopline-category-manager
// @version      0.2.1
// @description  在 Shopline 分類管理頁面添加「移動到」按鈕，支援快速分類重新整理
// @author       Development Team
// @match        https://admin.shoplineapp.com/admin/*/categories*
// @match        https://*.shopline.tw/admin/*/categories*
// @match        https://*.shopline.app/admin/*/categories*
// @grant        none
// @run-at       document-end
// @homepage     https://github.com/sarimjang/shopline-category-manager
// @supportURL   https://github.com/sarimjang/shopline-category-manager/issues
// @updateURL    https://raw.githubusercontent.com/sarimjang/shopline-category-manager/main/.releases/updates.json
// @downloadURL  https://github.com/sarimjang/shopline-category-manager/releases/download/v0.2.1/shopline-category-manager.prod.user.js
// ==/UserScript==

/**
 * Shopline 分類管理器 - 快速移動功能 (Production Build)
 *
 * 核心職責：
 * 1. 按鈕注入 - 在每個分類的操作區新增「移動到」按鈕
 * 2. 下拉選單 UI - 顯示樹狀目標分類選擇
 * 3. 移動邏輯 - 操作 AngularJS scope 進行分類重新排列
 * 4. 層級驗證 - 確保分類移動不違反 3 層限制
 *
 * Production Notes:
 * - Debug 訊息已關閉
 * - 僅保留關鍵錯誤訊息
 */

(function() {
  'use strict';

  // ============================================================================
  // 生產環境設定
  // ============================================================================
  const DEBUG = false;  // 設為 true 開啟除錯訊息

  // Logger 工具 - 根據 DEBUG 設定決定是否輸出
  const Logger = {
    log: (...args) => DEBUG && console.log('[Shopline Category Manager]', ...args),
    warn: (...args) => DEBUG && console.warn('[Shopline Category Manager]', ...args),
    error: (...args) => console.error('[Shopline Category Manager]', ...args),  // 錯誤始終顯示
    debug: (...args) => DEBUG && console.log('[Shopline Category Manager] [DEBUG]', ...args),
  };

  // ============================================================================
  // DOM 安全工具函數
  // ============================================================================

  /**
   * 安全清空元素內容（避免 innerHTML 安全風險）
   */
  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  // ============================================================================
  // 工具函數：樹結構操作
  // ============================================================================

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

  function isDescendant(potentialAncestor, potentialDescendant) {
    const descendants = getAllDescendants(potentialAncestor);
    return descendants.some((category) => category === potentialDescendant);
  }

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
      this.categories = scope.categories || [];
      this.posCategories = scope.posCategories || [];
      this.isMoving = false;
      this.buttonCategoryMap = new WeakMap();
    }

    getCategoryDisplayName(category) {
      if (category.name) {
        return category.name;
      }

      if (category.name_translations) {
        if (category.name_translations['zh-hant']) {
          return category.name_translations['zh-hant'];
        }
        if (category.name_translations['en']) {
          return category.name_translations['en'];
        }
        const firstLang = Object.keys(category.name_translations)[0];
        if (firstLang && category.name_translations[firstLang]) {
          return category.name_translations[firstLang];
        }
      }

      if (category.seo_title_translations) {
        if (category.seo_title_translations['zh-hant']) {
          return category.seo_title_translations['zh-hant'];
        }
        if (category.seo_title_translations['en']) {
          return category.seo_title_translations['en'];
        }
      }

      return category._id || category.id || 'Unknown';
    }

    findCategoryByName(categoryName) {
      if (!categoryName) {
        Logger.warn('findCategoryByName: categoryName is empty');
        return null;
      }

      const findInArray = (arr, arrayName, parentPath = '') => {
        if (!arr || !Array.isArray(arr)) return null;

        for (const item of arr) {
          const itemName = this.getCategoryDisplayName(item);

          if (itemName === categoryName) {
            Logger.debug('findCategoryByName found:', itemName);
            return { category: item, array: arr, arrayName: arrayName };
          }

          if (item.children && Array.isArray(item.children)) {
            const found = findInArray(item.children, arrayName, parentPath);
            if (found) return found;
          }
        }
        return null;
      };

      let result = findInArray(this.categories, 'categories');
      if (result) return result;

      if (this.posCategories && this.posCategories.length > 0) {
        result = findInArray(this.posCategories, 'posCategories');
        if (result) return result;
      }

      Logger.warn('findCategoryByName not found:', categoryName);
      return null;
    }

    getLevel1Categories(excludeCategory = null, filterArrayName = null) {
      const results = [];
      const excludeId = excludeCategory?._id || excludeCategory?.id;

      if ((!filterArrayName || filterArrayName === 'categories') &&
          this.categories && Array.isArray(this.categories)) {
        for (const cat of this.categories) {
          if (cat.key) continue;
          if (excludeId && (cat._id === excludeId || cat.id === excludeId)) continue;

          results.push({
            category: cat,
            name: this.getCategoryDisplayName(cat),
            arrayName: 'categories'
          });
        }
      }

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

      Logger.debug('Level 1 categories:', results.length);
      return results;
    }

    filterCategoriesByKeyword(keyword, categories) {
      if (!keyword || keyword.trim() === '') {
        return categories;
      }

      const lowerKeyword = keyword.toLowerCase().trim();

      const filtered = categories.filter(item => {
        const name = String(item.name ?? '').toLowerCase();
        return name.includes(lowerKeyword);
      });

      Logger.debug('Filtered by "' + keyword + '":', filtered.length, 'results');
      return filtered;
    }

    debounce(func, wait) {
      let timeout;
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

    findCategoryById(categoryId) {
      if (!categoryId) {
        Logger.warn('findCategoryById: categoryId is empty');
        return null;
      }

      const findInArray = (arr, depth = 0) => {
        if (!arr || !Array.isArray(arr)) {
          return null;
        }

        for (const item of arr) {
          if (item._id === categoryId || item.id === categoryId) {
            Logger.debug('Found at depth', depth);
            return item;
          }

          if (item.children && Array.isArray(item.children)) {
            const found = findInArray(item.children, depth + 1);
            if (found) return found;
          }
        }
        return null;
      };

      let result = findInArray(this.categories);
      if (result) return result;

      if (this.posCategories && this.posCategories.length > 0) {
        result = findInArray(this.posCategories);
        if (result) return result;
      }

      Logger.warn('Category not found:', categoryId);
      return null;
    }

    initialize() {
      Logger.log('初始化分類管理器');
      this.injectUI();
    }

    injectUI() {
      try {
        const treeContainer = document.querySelector('.angular-ui-tree');
        if (!treeContainer) {
          Logger.error('找不到樹容器');
          return;
        }

        const observer = new MutationObserver(() => {
          this.attachButtonsToCategories();
        });

        observer.observe(treeContainer, {
          childList: true,
          subtree: true,
        });

        this.attachButtonsToCategories();
        Logger.log('UI 注入完成');
      } catch (error) {
        Logger.error('注入 UI 時出錯:', error);
      }
    }

    attachButtonsToCategories() {
      const categoryNodes = document.querySelectorAll('.angular-ui-tree-node');
      Logger.debug(`找到 ${categoryNodes.length} 個分類節點`);

      categoryNodes.forEach((node, index) => {
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
        const nameEl = rowEl?.querySelector('.cat-name');

        if (buttonArea.querySelector('[data-move-button]')) {
          return;
        }

        const domCategoryName = nameEl?.textContent?.trim();

        let categoryInfo = this.getCategoryFromElement(node);

        if (!categoryInfo && domCategoryName) {
          categoryInfo = this.findCategoryByName(domCategoryName);
        }

        if (categoryInfo && domCategoryName) {
          const scopeCategoryName = this.getCategoryDisplayName(categoryInfo.category);
          if (scopeCategoryName !== domCategoryName) {
            const correctedInfo = this.findCategoryByName(domCategoryName);
            if (correctedInfo) {
              categoryInfo = correctedInfo;
            }
          }
        }

        if (!categoryInfo) {
          Logger.warn(`無法從第 ${index} 個節點取得分類物件`);
          return;
        }

        const moveButton = document.createElement('button');
        moveButton.textContent = '📁 移動到 ▼';
        moveButton.setAttribute('data-move-button', 'true');
        moveButton.className = 'btn btn-sm btn-default';
        moveButton.style.marginRight = '8px';
        moveButton.type = 'button';

        const categoryId = categoryInfo.category._id || categoryInfo.category.id;
        const categoryName = this.getCategoryDisplayName(categoryInfo.category);
        const arrayName = categoryInfo.arrayName;

        if (categoryId) {
          moveButton.dataset.categoryId = categoryId;
          moveButton.dataset.categoryName = categoryName;
          moveButton.dataset.arrayName = arrayName;
        }

        if (categoryInfo.category?.key) {
          moveButton.disabled = true;
          moveButton.title = '特殊分類不支援移動';
        } else {
          moveButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            let categoryInfo = null;
            const button = e.currentTarget;

            const categoryId = button.dataset.categoryId;
            const arrayName = button.dataset.arrayName;

            if (categoryId && arrayName) {
              const category = this.findCategoryById(categoryId);

              if (category) {
                const targetArray = arrayName === 'posCategories' ? this.posCategories : this.categories;
                categoryInfo = {
                  category: category,
                  array: targetArray,
                  arrayName: arrayName,
                };
              } else {
                Logger.error('Category not found by ID:', categoryId);
              }
            }

            if (!categoryInfo) {
              const treeNode = button.closest('.angular-ui-tree-node');
              if (treeNode) {
                const scope = angular.element(treeNode).scope();

                if (scope && scope.item) {
                  const arrayInfo = this.detectCategoryArray(scope.item);
                  categoryInfo = {
                    category: scope.item,
                    array: arrayInfo.array,
                    arrayName: arrayInfo.arrayName,
                  };
                }
              }
            }

            if (!categoryInfo) {
              const boundCategoryInfo = this.buttonCategoryMap.get(button);

              if (boundCategoryInfo) {
                categoryInfo = boundCategoryInfo;
              }
            }

            if (!categoryInfo || !categoryInfo.category) {
              Logger.error('Failed to identify category');
              this.showErrorMessage('無法識別分類，請重新整理頁面');
              return;
            }

            this.showMoveDropdown(
              categoryInfo.category,
              e.currentTarget,
              categoryInfo.array,
              categoryInfo.arrayName
            );
          });
        }

        this.buttonCategoryMap.set(moveButton, categoryInfo);
        buttonArea.insertBefore(moveButton, buttonArea.firstChild);
      });
    }

    getCategoryFromElement(element) {
      try {
        let nodeEl = element.closest?.('.angular-ui-tree-node');
        if (!nodeEl) {
          return null;
        }

        let nodeNameEl = nodeEl.querySelector(':scope > .ui-tree-row .cat-name, :scope > .angular-ui-tree-handle .cat-name');

        if (element.classList?.contains('angular-ui-tree-node')) {
          nodeEl = element;
          nodeNameEl = nodeEl.querySelector(':scope > .ui-tree-row .cat-name, :scope > .angular-ui-tree-handle .cat-name');
        }

        const scope = angular.element(nodeEl).scope();
        if (scope && scope.item) {
          const itemName = this.getCategoryDisplayName(scope.item);
          const domCategoryName = nodeNameEl?.textContent?.trim() || '';

          if (domCategoryName && itemName !== domCategoryName) {
            if (!this.scopeMisalignmentLog) {
              this.scopeMisalignmentLog = [];
            }
            this.scopeMisalignmentLog.push({
              domName: domCategoryName,
              scopeName: itemName,
              timestamp: new Date().toISOString(),
            });

            return null;
          }

          const arrayInfo = this.detectCategoryArray(scope.item);
          return { category: scope.item, array: arrayInfo.array, arrayName: arrayInfo.arrayName };
        }
      } catch (error) {
        Logger.warn('無法從 scope 取得分類:', error);
      }
      return null;
    }

    detectCategoryArray(category) {
      if (this.posCategories.length > 0) {
        const inPosCategories = this.findCategoryInArray(category, this.posCategories);
        if (inPosCategories) {
          return { array: this.posCategories, arrayName: 'posCategories' };
        }
      }

      if (this.categories.length > 0) {
        const inCategories = this.findCategoryInArray(category, this.categories);
        if (inCategories) {
          return { array: this.categories, arrayName: 'categories' };
        }
      }

      return { array: this.categories, arrayName: 'categories' };
    }

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

    showMoveDropdown(category, button, categoriesArray = null, arrayName = 'categories') {
      this.removeExistingDropdown();

      if (!categoriesArray) {
        const arrayInfo = this.detectCategoryArray(category);
        categoriesArray = arrayInfo.array;
        arrayName = arrayInfo.arrayName;
      }

      const dropdown = this.createDropdownContainer();

      const searchSection = this.createSearchSection(category, categoriesArray, arrayName);
      dropdown.appendChild(searchSection);
      this.attachSearchEventListeners(searchSection);

      const treeContainer = document.createElement('div');
      treeContainer.setAttribute('data-tree-container', 'true');
      const options = this.getValidMoveTargets(category, categoriesArray);
      this.populateDropdownOptions(treeContainer, options, category, categoriesArray, arrayName);
      dropdown.appendChild(treeContainer);

      this.positionDropdown(dropdown, button);
      document.body.appendChild(dropdown);

      this.attachDropdownEventListeners(dropdown, button);
    }

    removeExistingDropdown() {
      const existingDropdown = document.querySelector('[data-move-dropdown]');
      if (existingDropdown) {
        const searchSection = existingDropdown.querySelector('[data-search-section]');
        if (searchSection && searchSection._debouncedSearch && searchSection._debouncedSearch.cancel) {
          searchSection._debouncedSearch.cancel();
        }
        existingDropdown.remove();
      }
    }

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

    populateDropdownOptions(dropdown, options, currentCategory, categoriesArray = null, arrayName = 'categories') {
      options.forEach((option) => {
        const item = this.createDropdownItem(option, currentCategory, categoriesArray, arrayName);
        dropdown.appendChild(item);
      });
    }

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

      const labelContainer = document.createElement('span');
      labelContainer.style.cssText = 'display: flex; align-items: center;';

      if (option.indent > 0) {
        const levelIndicator = document.createElement('span');

        if (option.indent === 1) {
          levelIndicator.textContent = '├─ ';
          levelIndicator.style.cssText = 'color: #bbb; font-weight: normal;';
        } else if (option.indent === 2) {
          levelIndicator.textContent = '  └─ ';
          levelIndicator.style.cssText = 'color: #ddd; font-weight: normal;';
        } else {
          levelIndicator.textContent = '    └─ ';
          levelIndicator.style.cssText = 'color: #eee; font-weight: normal;';
        }

        labelContainer.appendChild(levelIndicator);
      }

      const nameSpan = document.createElement('span');
      nameSpan.textContent = option.label;
      nameSpan.style.cssText = `
        font-size: 14px;
        color: ${option.disabled ? '#999' : '#333'};
      `;
      labelContainer.appendChild(nameSpan);

      item.appendChild(labelContainer);

      this.attachItemEventListeners(item, option, currentCategory, categoriesArray, arrayName);

      return item;
    }

    attachItemEventListeners(item, option, currentCategory, categoriesArray = null, arrayName = 'categories') {
      if (!option.disabled) {
        item.addEventListener('mouseover', () => {
          item.style.backgroundColor = '#f5f5f5';
        });
        item.addEventListener('mouseout', () => {
          item.style.backgroundColor = 'transparent';
        });
        item.addEventListener('click', () => {
          this.moveCategory(currentCategory, option.target, categoriesArray, arrayName);
          this.removeExistingDropdown();
        });
      } else {
        item.addEventListener('mouseover', () => {
          item.style.backgroundColor = '#fafafa';
        });
        item.addEventListener('mouseout', () => {
          item.style.backgroundColor = '#fafafa';
        });
      }
    }

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

    positionDropdown(dropdown, button) {
      const rect = button.getBoundingClientRect();
      let left = rect.left;
      let top = rect.bottom + 5;

      const dropdownWidth = 300;
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 10;
      }

      const dropdownHeight = 400;
      if (top + dropdownHeight > window.innerHeight) {
        top = rect.top - dropdownHeight - 5;
      }

      left = Math.max(10, left);
      top = Math.max(10, top);

      dropdown.style.left = left + 'px';
      dropdown.style.top = top + 'px';
    }

    // ═══════════════════════════════════════════════════════════════
    // 搜尋過濾功能 UI 方法
    // ═══════════════════════════════════════════════════════════════

    createSearchSection(currentCategory, categoriesArray, arrayName) {
      const section = document.createElement('div');
      section.setAttribute('data-search-section', 'true');
      section.style.cssText = `
        padding: 10px;
        border-bottom: 2px solid #e0e0e0;
        background: #fafafa;
      `;

      const input = this.createSearchInput();
      section.appendChild(input);

      const resultsList = this.createSearchResultsList();
      section.appendChild(resultsList);

      const confirmBtn = this.createConfirmButton();
      section.appendChild(confirmBtn);

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

      section._searchInput = input;
      section._resultsList = resultsList;
      section._confirmBtn = confirmBtn;
      section._currentCategory = currentCategory;
      section._categoriesArray = categoriesArray;
      section._arrayName = arrayName;
      section._selectedCategory = null;

      return section;
    }

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

      input.addEventListener('focus', () => {
        input.style.borderColor = '#4a90d9';
      });
      input.addEventListener('blur', () => {
        input.style.borderColor = '#ddd';
      });

      return input;
    }

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

    renderSearchResults(resultsList, categories, searchSection) {
      // 安全清空元素（避免 innerHTML 安全風險）
      clearElement(resultsList);

      if (categories.length === 0) {
        const empty = document.createElement('div');
        empty.style.cssText = 'padding: 12px; text-align: center; color: #999;';
        empty.textContent = '無符合項目';
        resultsList.appendChild(empty);
        return;
      }

      categories.forEach(item => {
        const row = document.createElement('div');
        row.className = 'scm-search-result-row';
        row.style.cssText = `
          padding: 10px 12px;
          cursor: pointer;
          border-bottom: 1px solid #f0f0f0;
          display: flex;
          align-items: center;
          transition: background 0.2s;
        `;

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
        label.textContent = item.name;
        label.style.fontSize = '14px';

        row.appendChild(radio);
        row.appendChild(label);

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

        row.addEventListener('click', () => {
          this.handleSearchItemSelect(item, row, radio, searchSection);
        });

        row._item = item;
        row._radio = radio;
        resultsList.appendChild(row);
      });
    }

    handleSearchItemSelect(item, row, radio, searchSection) {
      const resultsList = searchSection._resultsList;

      const allRows = resultsList.querySelectorAll('.scm-search-result-row');
      allRows.forEach(r => {
        r.style.background = 'white';
        if (r._radio) {
          r._radio.style.borderColor = '#ccc';
          r._radio.style.background = 'white';
        }
      });

      if (searchSection._selectedCategory === item) {
        searchSection._selectedCategory = null;
        this.updateConfirmButtonState(searchSection._confirmBtn, false);
      } else {
        searchSection._selectedCategory = item;
        row.style.background = '#e3f2fd';
        radio.style.borderColor = '#4a90d9';
        radio.style.background = '#4a90d9';
        this.updateConfirmButtonState(searchSection._confirmBtn, true);
      }
    }

    attachSearchEventListeners(searchSection) {
      const input = searchSection._searchInput;
      const resultsList = searchSection._resultsList;
      const confirmBtn = searchSection._confirmBtn;
      const currentCategory = searchSection._currentCategory;
      const categoriesArray = searchSection._categoriesArray;
      const arrayName = searchSection._arrayName;

      const allLevel1 = this.getLevel1Categories(currentCategory, arrayName);

      this.renderSearchResults(resultsList, allLevel1, searchSection);

      const debouncedSearch = this.debounce((keyword) => {
        const filtered = this.filterCategoriesByKeyword(keyword, allLevel1);
        this.renderSearchResults(resultsList, filtered, searchSection);
        searchSection._selectedCategory = null;
        this.updateConfirmButtonState(confirmBtn, false);
      }, 200);

      searchSection._debouncedSearch = debouncedSearch;

      input.addEventListener('input', (e) => {
        debouncedSearch(e.target.value);
      });

      confirmBtn.addEventListener('click', () => {
        if (searchSection._selectedCategory) {
          const targetCategory = searchSection._selectedCategory.category;
          this.moveCategory(currentCategory, targetCategory, categoriesArray, arrayName);
          this.removeExistingDropdown();
        }
      });
    }

    getValidMoveTargets(category, categoriesArray = null) {
      if (!categoriesArray) {
        const arrayInfo = this.detectCategoryArray(category);
        categoriesArray = arrayInfo.array;
      }

      const options = [];
      const currentLevel = this.getLevel(category, categoriesArray);

      const rootDisabled = currentLevel === 1;
      options.push({
        label: '📂 根目錄',
        target: null,
        indent: 0,
        disabled: rootDisabled,
      });

      this.addTargetCategoriesRecursively(categoriesArray, category, options, 0);

      return options;
    }

    addTargetCategoriesRecursively(categories, currentCategory, options, depth) {
      categories.forEach((cat) => {
        const displayName = this.getCategoryDisplayName(cat);

        if (cat === currentCategory) {
          return;
        }

        if (isDescendant(cat, currentCategory)) {
          return;
        }

        const targetLevel = this.getLevel(cat);
        const isLevel3 = targetLevel === 3;

        options.push({
          label: displayName,
          target: cat,
          indent: depth,
          disabled: isLevel3,
        });

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

    async moveCategory(sourceCategory, targetCategory, categoriesArray = null, arrayName = 'categories') {
      if (this.isMoving) {
        return;
      }

      this.isMoving = true;

      try {
        if (!categoriesArray) {
          const arrayInfo = this.detectCategoryArray(sourceCategory);
          categoriesArray = arrayInfo.array;
          arrayName = arrayInfo.arrayName;
        }

        const success = await this.moveCategoryUsingScope(sourceCategory, targetCategory, categoriesArray, arrayName);

        if (success) {
          this.showSuccessMessage('分類移動成功！');
        } else {
          this.showErrorMessage('移動失敗，請重試');
        }
      } catch (error) {
        Logger.error('移動時出錯:', error);
        this.showErrorMessage('移動失敗，請重試');
      } finally {
        this.isMoving = false;
      }
    }

    async moveCategoryUsingScope(sourceCategory, targetCategory, categoriesArray = null, arrayName = 'categories') {
      try {
        if (targetCategory) {
          const targetLevel = this.getLevel(targetCategory, categoriesArray);
          if (targetLevel === 3) {
            Logger.error('目標已是最深層級，不能添加子項');
            return false;
          }
        }

        if (!categoriesArray) {
          const arrayInfo = this.detectCategoryArray(sourceCategory);
          categoriesArray = arrayInfo.array;
          arrayName = arrayInfo.arrayName;
        }

        const sourceParent = this.findCategoryParent(sourceCategory, categoriesArray);
        if (!sourceParent) {
          Logger.error('找不到源分類的父容器');
          return false;
        }

        const sourceIndex = sourceParent.indexOf(sourceCategory);
        if (sourceIndex === -1) {
          Logger.error('找不到源分類在陣列中的位置');
          return false;
        }

        const backupData = {
          sourceParent,
          sourceIndex,
          targetChildrenBefore: targetCategory?.children?.length || 0,
          categoriesArray,
          arrayName,
        };

        // 從源移除
        sourceParent.splice(sourceIndex, 1);

        // 添加到目標
        if (targetCategory === null) {
          categoriesArray.unshift(sourceCategory);
        } else {
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

          // 驗證移動結果
          const sourceStillInOldLocation = sourceParent.indexOf(sourceCategory) !== -1;
          if (sourceStillInOldLocation) {
            this.rollbackMove(sourceCategory, targetCategory, backupData);
            return false;
          }

          let sourceInNewLocation = false;
          if (targetCategory === null) {
            sourceInNewLocation = categoriesArray.indexOf(sourceCategory) !== -1;
          } else {
            sourceInNewLocation = targetCategory.children?.indexOf(sourceCategory) !== -1;
          }

          if (!sourceInNewLocation) {
            this.rollbackMove(sourceCategory, targetCategory, backupData);
            return false;
          }

          return true;

        } catch (applyError) {
          Logger.error('更新失敗，正在回滾:', applyError);
          this.rollbackMove(sourceCategory, targetCategory, backupData);
          return false;
        }
      } catch (error) {
        Logger.error('移動失敗:', error);
        return false;
      }
    }

    rollbackMove(sourceCategory, targetCategory, backupData) {
      try {
        const { sourceParent, sourceIndex, previousChildren, categoriesArray } = backupData;

        if (targetCategory === null) {
          const idx = categoriesArray.indexOf(sourceCategory);
          if (idx !== -1) categoriesArray.splice(idx, 1);
        } else {
          if (targetCategory.children) {
            const idx = targetCategory.children.indexOf(sourceCategory);
            if (idx !== -1) targetCategory.children.splice(idx, 1);
            if (previousChildren === undefined && targetCategory.children.length === 0) {
              delete targetCategory.children;
            }
          }
        }

        sourceParent.splice(sourceIndex, 0, sourceCategory);

        try {
          if (this.scope.$apply) {
            this.scope.$apply();
          }
        } catch (e) {
          Logger.error('回滾時 $apply 也失敗:', e);
        }
      } catch (error) {
        Logger.error('回滾時出錯:', error);
      }
    }

    findCategoryParent(category, categoriesArray = null) {
      if (!categoriesArray) {
        const arrayInfo = this.detectCategoryArray(category);
        categoriesArray = arrayInfo.array;
      }

      if (categoriesArray.indexOf(category) !== -1) {
        return categoriesArray;
      }

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

      return search(categoriesArray);
    }

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

    getLevel(category, categoriesArray = null) {
      if (!categoriesArray) {
        const arrayInfo = this.detectCategoryArray(category);
        categoriesArray = arrayInfo.array;
      }
      return getCategoryLevel(categoriesArray, category);
    }

    getAllDescendants(category) {
      return getCategoryDescendants(category);
    }
  }

  // ============================================================================
  // 初始化函數
  // ============================================================================

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

  function getAngularScope(element) {
    if (!window.angular) {
      return null;
    }

    try {
      const scope = angular.element(element).scope();
      if (!scope) {
        return null;
      }
      return scope;
    } catch (error) {
      return null;
    }
  }

  function findCategoriesScope(element) {
    let scope = getAngularScope(element);
    if (scope && scope.categories && Array.isArray(scope.categories)) {
      return scope;
    }

    const treeContainer = element.closest?.('.angular-ui-tree') ||
                         element.querySelector?.('.angular-ui-tree') ||
                         element;

    scope = getAngularScope(treeContainer);
    if (scope && scope.categories && Array.isArray(scope.categories)) {
      return scope;
    }

    const treeNode = treeContainer.querySelector?.('.angular-ui-tree-node');
    if (treeNode) {
      const nodeScope = getAngularScope(treeNode);
      if (nodeScope && nodeScope.categories && Array.isArray(nodeScope.categories)) {
        return nodeScope;
      }
    }

    return null;
  }

  function waitForTreeNodes(timeout = 15000) {
    return new Promise((resolve, reject) => {
      const checkNodes = () => {
        const nodes = document.querySelectorAll('.angular-ui-tree-node');
        if (nodes.length > 0) {
          return true;
        }
        return false;
      };

      if (checkNodes()) {
        resolve();
        return;
      }

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

  async function init() {
    try {
      Logger.log('正在初始化...');

      try {
        await waitForTreeNodes(15000);
      } catch (error) {
        // 靜默處理超時
      }

      let treeContainer;
      try {
        treeContainer = await waitForElement('.angular-ui-tree', 5000);
      } catch (error) {
        treeContainer = document.querySelector('[ui-tree]');
        if (!treeContainer) {
          treeContainer = document.querySelector('.category-list .angular-ui-tree');
        }
        if (!treeContainer) {
          treeContainer = document.querySelector('.angular-ui-tree-nodes');
        }

        if (!treeContainer) {
          Logger.error('無法找到樹容器');
          return;
        }
      }

      const scope = findCategoriesScope(treeContainer);
      if (!scope) {
        const containerScope = getAngularScope(treeContainer);
        if (containerScope) {
          if (containerScope.categories && Array.isArray(containerScope.categories)) {
            const categoryManager = new CategoryManager(containerScope);
            categoryManager.initialize();
            return;
          }

          if (containerScope.posCategories && Array.isArray(containerScope.posCategories)) {
            const categoryManager = new CategoryManager(containerScope);
            categoryManager.initialize();
            return;
          }
        }

        Logger.error('初始化失敗：無法找到 categories 陣列');
        return;
      }

      Logger.log('✓ 成功初始化');

      const categoryManager = new CategoryManager(scope);
      categoryManager.initialize();
    } catch (error) {
      Logger.error('初始化錯誤:', error);
    }
  }

  // ============================================================================
  // 啟動應用
  // ============================================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      init();
    });
  } else {
    init();
  }
})();
