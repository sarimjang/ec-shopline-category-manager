## 專案目錄結構

```text
├── .claude
│   ├── commands
│   │   └── openspec
│   │       ├── apply.md
│   │       ├── archive.md
│   │       └── proposal.md
│   └── settings.local.json
├── .github
│   └── workflows
├── .planning
│   ├── phases
│   │   └── 01-extension-mvp
│   │       ├── 01-01-PLAN.md
│   │       ├── 01-01-SUMMARY.md
│   │       ├── 01-02-PLAN.md
│   │       ├── 01-02-SUMMARY.md
│   │       ├── 01-03-PLAN.md
│   │       ├── 01-03-SUMMARY.md
│   │       ├── 01-04-PLAN.md
│   │       └── 01-04-SUMMARY.md
│   ├── PROJECT.md
│   ├── ROADMAP.md
│   └── STATE.md
├── .releases
│   └── updates.json
├── .serena
│   ├── cache
│   │   └── typescript
│   │       ├── document_symbols.pkl
│   │       └── raw_document_symbols.pkl
│   ├── memories
│   │   ├── shopline-chrome-extension-phase1-status.md
│   │   └── tampermonkey-sandbox-angularjs-fix.md
│   ├── .gitignore
│   └── project.yml
├── docs
│   ├── DEVELOPMENT.md
│   └── INSTALL.md
├── openspec
│   ├── changes
│   │   ├── add-chrome-extension-export-import
│   │   │   ├── specs
│   │   │   │   ├── category-operations
│   │   │   │   │   └── spec.md
│   │   │   │   ├── data-export-import
│   │   │   │   │   └── spec.md
│   │   │   │   └── extension-core
│   │   │   │       └── spec.md
│   │   │   ├── design.md
│   │   │   ├── proposal.md
│   │   │   ├── README.md
│   │   │   └── tasks.md
│   │   └── archive
│   ├── openspec
│   │   └── changes
│   │       └── tampermonkey-sandbox-fix
│   ├── specs
│   ├── AGENTS.md
│   └── project.md
├── scripts
│   ├── bump-version.js
│   ├── README.md
│   ├── release.sh
│   ├── sync-prod-ast.js
│   ├── sync-prod.sh
│   └── update-releases.js
├── src
│   ├── assets
│   │   ├── icon-128.png
│   │   ├── icon-16.png
│   │   └── icon-48.png
│   ├── background
│   │   └── service-worker.js
│   ├── content
│   │   ├── content.js
│   │   └── injected.js
│   ├── popup
│   │   ├── popup.css
│   │   ├── popup.html
│   │   └── popup.js
│   ├── shared
│   │   ├── constants.js
│   │   ├── logger.js
│   │   └── storage.js
│   ├── manifest.json
│   ├── shopline-category-manager.prod.user.js
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T05-18-49
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T05-25-24
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T06-23-04
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T06-45-23
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T07-08-23
│   └── shopline-category-manager.user.js
├── .gitignore
├── AGENTS.md
├── BATCH_OPERATIONS_ANALYSIS.md
├── CHANGELOG.md
├── CLAUDE.md
├── EXTENSION_ARCHITECTURE.md
├── lesson-learn.md
├── package.json
├── README.md
├── RELEASING.md
└── snapshot.md
```

## 函式清單 / 檔案摘要

### 語言分佈
- **JavaScript/TypeScript**: 12 檔案，444 函式

### JavaScript/TypeScript

#### scripts/bump-version.js
##### 函式
- **if(!match)**
- **for(const filePath of FILES_TO_UPDATE)**
- **parseVersion(versionString)**
- **bumpVersion(version, bumpType = 'patch')**
- **getCurrentVersion()**
- **updateVersionInFile(filePath, oldVersion, newVersion)**
- **bumpVersionNumber()**

#### scripts/sync-prod-ast.js
- purpose: 顏色輸出
##### 函式
- **if(metadataEnd === -1)**
- **if(!devValidation.valid)**
- **if(!newValidation.valid)**
- **if(backups.length > 5)**
- **log(color, ...args)**
- **extractMetadata(code)**
- **validateSyntax(code, filename)**
- **syncFiles()**

#### scripts/update-releases.js
##### 函式
- **if(versions.length === 0)**
- **for(const versionData of versions)**
- **if(existingIndex !== -1)**
- **extractVersionsFromChangelog()**
- **createVersionEntry(version, changelogData)**
- **updateReleases()**

#### src/background/service-worker.js
- purpose: Background Service Worker - Handles persistent background tasks
Manifest V3 requires service workers instead of background pages
##### 函式
- **if(details.reason === 'install')**
- **if(areaName === 'local')**
- **if(info.menuItemId === 'shopline-export')**
- **switch(request.action)**
- **log(msg, data)**
- **error(msg, err)**
- **addListener(function(request, _sender, sendResponse)**
- **handleGetCategories(request, sendResponse)**
- **get(['categories'], function(result)**
- **handleUpdateCategories(request, sendResponse)**
- **set({ categories: categories }, function()**
- **handleExportData(_request, sendResponse)**
- **get(null, function(result)**
- **handleImportData(request, sendResponse)**
- **set(data, function()**
- **handleRecordCategoryMove(request, sendResponse)**
- **get(['categoryMoveStats'], function(result)**
- **set({ categoryMoveStats: stats }, function()**
- **handleGetStats(request, sendResponse)**
- **handleResetStats(request, sendResponse)**
- **set({ categoryMoveStats: newStats }, function()**
- **addListener(function(_tab)**

#### src/content/content.js
- purpose: Content Script - Bridge between Extension context and Page context
Runs in isolated world, communicates with injected script in main world
架構:
1. Content script (isolated world) ← can access chrome.ru...
##### 函式
- **if(!isCorrectPath)**
- **if(type === 'CATEGORY_MOVED')**
- **if(request.type === 'GET_PAGE_STATE')**
- **function()**
- **isShoplineCategoryPage()**
- **addEventListener('categoryActionMessage', function(event)**
- **addListener(function(request, _sender, sendResponse)**

#### src/content/injected.js
- purpose: Injected Script - Runs in MAIN world with access to window.angular
Defines CategoryManager and communicates with content script
注意: 此腳本運行在頁面上下文（MAIN world），可直接存取 window.angular
##### 函式
- **moveCategory(categoryId, newParent, newPosition)**
- **if(!response.ok)**
- **extractShopIdFromUrl()**
- **callApiWithDelay(endpoint, payload)**
- **updateLocalState(categoryId, newParent, newPosition)**
- **getTargetLevel(parentId)**
- **calculateTimeSaved(categoryCount, targetLevel)**
- **broadcastStats()**
- **broadcastError(message)**
- **broadcastCategoryAction(type, data)**
- **if(!window.angular)**
- **if(document.readyState === 'loading')**
- **function()**
- **initializeCategoryManager()**

#### src/popup/popup.js
- purpose: Popup UI Script - Displays category move statistics and provides controls
Updates in real-time from content script events
##### 函式
- **function()**
- **addEventListener('DOMContentLoaded', function()**
- **initializePopup()**
- **loadStats()**
- **updateUI(stats)**
- **handleReset()**
- **handleSettings()**
- **showStatus(message, type = 'success')**

#### src/shared/constants.js
- purpose: Constants - Global configuration and constants for the extension
##### 函式
- **if(typeof window !== 'undefined')**

#### src/shared/logger.js
- purpose: Logger - Unified logging with optional storage of logs for debugging
##### 函式
- **if(logs.length > MAX_LOGS)**
- **if(process.env.DEBUG)**
- **if(typeof window !== 'undefined')**
- **function()**
- **formatMessage(level, message, data)**
- **storeLogs(logEntry)**
- **log(message, data)**
- **warn(message, data)**
- **error(message, err)**
- **debug(message, data)**
- **getLogs()**
- **clearLogs()**
- **exportLogs()**

#### src/shared/storage.js
- purpose: Storage API Abstraction - Provides unified interface for chrome.storage.local
Handles get, set, remove, clear operations with error handling
Includes StorageManager class for statistics and history ma...
##### 函式
- **if(chrome.runtime.lastError)**
- **getStats()**
- **setStats(stats)**
- **addMove(timeSaved)**
- **resetStats()**
- **getHistory(type)**
- **addToHistory(type, entry)**
- **if(history.length > 100)**
- **if(typeof window !== 'undefined')**
- **function()**
- **get(keys)**
- **get(keys, function(result)**
- **set(items)**
- **set(items, function()**
- **remove(keys)**
- **remove(keys, function()**
- **clear()**
- **clear(function()**

#### src/shopline-category-manager.prod.user.js
- purpose: ==UserScript== @name         Shopline 分類管理 - 快速移動 (Production) @namespace    https://github.com/sarimjang/ec-shopline-category-manager @version      0.2.1 @description  在 Shopline 分類管理頁面添加「移動到」按鈕，支援快速...
##### 函式
- **if(!category || !category.children)**
- **for(let child of category.children)**
- **for(const category of categories)**
- **if(category === targetCategory)**
- **if(level !== -1)**
- **loadStats()**
- **if(data)**
- **saveStats()**
- **recordMove(categoryCount, targetLevel, usedSearch)**
- **getStats()**
- **showStats()**
- **resetStats()**
- **sanitizeCategoryName(name)**
- **if(!name || typeof name !== 'string')**
- **getCategoryDisplayName(category)**
- **if(category.name)**
- **if(category.name_translations['zh-hant'])**
- **if(category.name_translations && typeof category.name_translations === 'object')**
- **if(firstLang && category.name_translations[firstLang])**
- **if(category.seo_title_translations['zh-hant'])**
- **if(!displayName)**
- **if(!matcher || typeof matcher !== 'function')**
- **for(const item of arr)**
- **if(this.posCategories && this.posCategories.length > 0)**
- **findCategoryByName(categoryName)**
- **if(!categoryName)**
- **getLevel1Categories(excludeCategory = null, filterArrayName = null)**
- **for(const cat of this.categories)**
- **for(const cat of this.posCategories)**
- **filterCategoriesByKeyword(keyword, categories)**
- **debounce(func, wait)**
- **findCategoryById(categoryId)**
- **if(!categoryId)**
- **if(result && result.category)**
- **initialize()**
- **destroy()**
- **if(this.domObserver)**
- **injectUI()**
- **if(!treeContainer)**
- **attachButtonsToCategories()**
- **if(!buttonArea)**
- **if(!categoryInfo && domCategoryName)**
- **if(categoryInfo && domCategoryName)**
- **if(scopeCategoryName !== domCategoryName)**
- **if(correctedInfo)**
- **if(!categoryInfo)**
- **if(!categoryInfo?.category)**
- **if(categoryId)**
- **if(!ng)**
- **if(buttonNodeName !== actualName)**
- **if(categoryInfo.category?.key)**
- **if(categoryId && arrayName)**
- **if(treeNode)**
- **if(scope && scope.item)**
- **if(boundCategoryInfo)**
- **if(!categoryInfo || !categoryInfo.category)**
- **getCategoryFromElement(element)**
- **if(!nodeEl)**
- **if(domCategoryName && itemName !== domCategoryName)**
- **if(!this.scopeMisalignmentLog)**
- **if(this.scopeMisalignmentLog.length >= 5)**
- **if(scope)**
- **detectCategoryArray(category)**
- **if(this.posCategories.length > 0)**
- **if(inPosCategories)**
- **if(this.categories.length > 0)**
- **if(inCategories)**
- **findCategoryInArray(category, categoriesArray)**
- **for(const cat of categories)**
- **if(cat === category)**
- **showMoveDropdown(category, button, categoriesArray = null, arrayName = 'categories')**
- **if(!categoriesArray)**
- **removeExistingDropdown()**
- **if(existingDropdown)**
- **if(searchSection)**
- **if(searchSection._resultsList)**
- **createDropdownContainer()**
- **populateDropdownOptions(dropdown, options, currentCategory, categoriesArray = null, arrayName = 'categories')**
- **createDropdownItem(option, currentCategory, categoriesArray = null, arrayName = 'categories')**
- **if(option.indent > 0)**
- **if(option.indent === 1)**
- **attachItemEventListeners(item, option, currentCategory, categoriesArray = null, arrayName = 'categories')**
- **if(!option.disabled)**
- **attachDropdownEventListeners(dropdown, button)**
- **if(e.key === 'Escape')**
- **positionDropdown(dropdown, button)**
- **if(left + dropdownWidth > window.innerWidth)**
- **if(top + dropdownHeight > window.innerHeight)**
- **createSearchSection(currentCategory, categoriesArray, arrayName)**
- **createSearchInput()**
- **createSearchResultsList()**
- **createConfirmButton()**
- **updateConfirmButtonState(btn, enabled)**
- **if(enabled)**
- **renderSearchResults(resultsList, categories, searchSection)**
- **if(categories.length === 0)**
- **if(searchSection._selectedCategory !== item)**
- **handleSearchItemSelect(item, row, radio, searchSection)**
- **if(!searchSection || !searchSection._resultsList)**
- **if(r._radio)**
- **if(searchSection._selectedCategory === item)**
- **attachSearchEventListeners(searchSection)**
- **if(!targetCategory)**
- **getValidMoveTargets(category, categoriesArray = null)**
- **addTargetCategoriesRecursively(categories, currentCategory, options, depth)**
- **if(isLevel3)**
- **setAllMoveButtonsEnabled(enabled)**
- **if(!enabled)**
- **moveCategory(sourceCategory, targetCategory, categoriesArray = null, arrayName = 'categories')**
- **if(this.isMoving)**
- **if(success)**
- **moveCategoryUsingScope(sourceCategory, targetCategory, categoriesArray = null, arrayName = 'categories')**
- **if(targetCategory)**
- **if(targetLevel === 3)**
- **if(!sourceParent)**
- **if(sourceIndex === -1)**
- **if(parentOfSource && parentOfSource !== categoriesArray)**
- **for(const cat of cats)**
- **if(cat.children === parentOfSource)**
- **if(!targetCategory.children)**
- **if(this.scope.$apply)**
- **if(!this.scope.$$phase && !this.scope.$root?.$$phase)**
- **if(sourceStillInOldLocation)**
- **if(!sourceInNewLocation)**
- **if(!apiResult.success)**
- **if(apiResult.type === 'network-error')**
- **saveCategoryOrderingToServer(sourceCategory, targetCategory, oldParentId)**
- **if(!urlMatch || !urlMatch[1])**
- **if(!csrfToken)**
- **if(!csrfToken && window._csrf_token)**
- **if(!response.ok)**
- **if('result' in responseJson || 'message' in responseJson || 'data' in responseJson)**
- **if(!isLikelySuccess)**
- **rollbackMove(sourceCategory, targetCategory, backupData)**
- **if(idx !== -1)**
- **if(targetCategory.children)**
- **if(!targetHadChildren && targetCategory.children && targetCategory.children.length === 0)**
- **if(this.scope && this.scope.$apply)**
- **showWarningMessage(message)**
- **findCategoryParent(category, categoriesArray = null)**
- **if(result)**
- **if(!result)**
- **showSuccessMessage(message)**
- **showErrorMessage(message)**
- **getLevel(category, categoriesArray = null)**
- **getAllDescendants(category)**
- **if(typeof unsafeWindow !== 'undefined' && unsafeWindow.angular)**
- **if(typeof window !== 'undefined' && window.angular)**
- **if(ng)**
- **if(element)**
- **if(!scope)**
- **if(nodes.length > 0)**
- **if(containerScope)**
- **if(!scope.categories || scope.categories.length === 0)**
- **if(scope.posCategories && scope.posCategories.length > 0)**
- **if(typeof GM_registerMenuCommand !== 'undefined')**
- **if(document.readyState === 'loading')**
- **function()**
- **isDescendant(potentialAncestor, potentialDescendant)**
- **getCategoryLevel(categories, targetCategory, currentLevel = 1)**
- **getCategoryDescendants(category)**
- **calculateTimeSaved(categoryCount, targetLevel, usedSearch)**
- **getAngular()**
- **waitForAngular(timeout = 10000)**
- **waitForElement(selector, timeout = CategoryManager.WAIT_ELEMENT_TIMEOUT_MS)**
- **getAngularScope(element)**
- **findCategoriesScope(element)**
- **waitForTreeNodes(timeout = CategoryManager.TREE_NODES_TIMEOUT_MS)**
- **init()**

#### src/shopline-category-manager.user.js
- purpose: ==UserScript== @name         Shopline 分類管理 - 快速移動 @namespace    http://tampermonkey.net/ @version      0.2.1 @description  在 Shopline 分類管理頁面添加「移動到」按鈕，支援快速分類重新整理 @author       sarimjang @match        h...
##### 函式
- **if(!category || !category.children)**
- **for(let child of category.children)**
- **for(const category of categories)**
- **if(category === targetCategory)**
- **if(level !== -1)**
- **loadStats()**
- **if(data)**
- **saveStats()**
- **recordMove(categoryCount, targetLevel, usedSearch)**
- **getStats()**
- **showStats()**
- **resetStats()**
- **sanitizeCategoryName(name)**
- **if(!name || typeof name !== 'string')**
- **getCategoryDisplayName(category)**
- **if(category.name)**
- **if(category.name_translations['zh-hant'])**
- **if(category.name_translations && typeof category.name_translations === 'object')**
- **if(firstLang && category.name_translations[firstLang])**
- **if(category.seo_title_translations['zh-hant'])**
- **if(!displayName)**
- **if(!matcher || typeof matcher !== 'function')**
- **for(const item of arr)**
- **if(this.posCategories && this.posCategories.length > 0)**
- **findCategoryByName(categoryName)**
- **if(!categoryName)**
- **getLevel1Categories(excludeCategory = null, filterArrayName = null)**
- **for(const cat of this.categories)**
- **for(const cat of this.posCategories)**
- **filterCategoriesByKeyword(keyword, categories)**
- **debounce(func, wait)**
- **findCategoryById(categoryId)**
- **if(!categoryId)**
- **if(result && result.category)**
- **initialize()**
- **destroy()**
- **if(this.domObserver)**
- **injectUI()**
- **if(!treeContainer)**
- **attachButtonsToCategories()**
- **if(!buttonArea)**
- **if(!categoryInfo && domCategoryName)**
- **if(categoryInfo && domCategoryName)**
- **if(scopeCategoryName !== domCategoryName)**
- **if(correctedInfo)**
- **if(!categoryInfo)**
- **if(!categoryInfo?.category)**
- **if(categoryId)**
- **if(!ng)**
- **if(buttonNodeName !== actualName)**
- **if(categoryInfo.category?.key)**
- **if(categoryId && arrayName)**
- **if(treeNode)**
- **if(scope && scope.item)**
- **if(boundCategoryInfo)**
- **if(!categoryInfo || !categoryInfo.category)**
- **getCategoryFromElement(element)**
- **if(!nodeEl)**
- **if(domCategoryName && itemName !== domCategoryName)**
- **if(!this.scopeMisalignmentLog)**
- **if(this.scopeMisalignmentLog.length >= 5)**
- **if(scope)**
- **detectCategoryArray(category)**
- **if(this.posCategories.length > 0)**
- **if(inPosCategories)**
- **if(this.categories.length > 0)**
- **if(inCategories)**
- **findCategoryInArray(category, categoriesArray)**
- **for(const cat of categories)**
- **if(cat === category)**
- **showMoveDropdown(category, button, categoriesArray = null, arrayName = 'categories')**
- **if(!categoriesArray)**
- **removeExistingDropdown()**
- **if(existingDropdown)**
- **if(searchSection)**
- **if(searchSection._resultsList)**
- **createDropdownContainer()**
- **populateDropdownOptions(dropdown, options, currentCategory, categoriesArray = null, arrayName = 'categories')**
- **createDropdownItem(option, currentCategory, categoriesArray = null, arrayName = 'categories')**
- **if(option.indent > 0)**
- **if(option.indent === 1)**
- **attachItemEventListeners(item, option, currentCategory, categoriesArray = null, arrayName = 'categories')**
- **if(!option.disabled)**
- **attachDropdownEventListeners(dropdown, button)**
- **if(e.key === 'Escape')**
- **positionDropdown(dropdown, button)**
- **if(left + dropdownWidth > window.innerWidth)**
- **if(top + dropdownHeight > window.innerHeight)**
- **createSearchSection(currentCategory, categoriesArray, arrayName)**
- **createSearchInput()**
- **createSearchResultsList()**
- **createConfirmButton()**
- **updateConfirmButtonState(btn, enabled)**
- **if(enabled)**
- **renderSearchResults(resultsList, categories, searchSection)**
- **if(categories.length === 0)**
- **if(searchSection._selectedCategory !== item)**
- **handleSearchItemSelect(item, row, radio, searchSection)**
- **if(!searchSection || !searchSection._resultsList)**
- **if(r._radio)**
- **if(searchSection._selectedCategory === item)**
- **attachSearchEventListeners(searchSection)**
- **if(!targetCategory)**
- **getValidMoveTargets(category, categoriesArray = null)**
- **addTargetCategoriesRecursively(categories, currentCategory, options, depth)**
- **if(isLevel3)**
- **setAllMoveButtonsEnabled(enabled)**
- **if(!enabled)**
- **moveCategory(sourceCategory, targetCategory, categoriesArray = null, arrayName = 'categories')**
- **if(this.isMoving)**
- **if(success)**
- **moveCategoryUsingScope(sourceCategory, targetCategory, categoriesArray = null, arrayName = 'categories')**
- **if(targetCategory)**
- **if(targetLevel === 3)**
- **if(!sourceParent)**
- **if(sourceIndex === -1)**
- **if(parentOfSource && parentOfSource !== categoriesArray)**
- **for(const cat of cats)**
- **if(cat.children === parentOfSource)**
- **if(!targetCategory.children)**
- **if(this.scope.$apply)**
- **if(!this.scope.$$phase && !this.scope.$root?.$$phase)**
- **if(sourceStillInOldLocation)**
- **if(!sourceInNewLocation)**
- **if(!apiResult.success)**
- **if(apiResult.type === 'network-error')**
- **saveCategoryOrderingToServer(sourceCategory, targetCategory, oldParentId)**
- **if(!urlMatch || !urlMatch[1])**
- **if(!csrfToken)**
- **if(!csrfToken && window._csrf_token)**
- **if(!response.ok)**
- **if('result' in responseJson || 'message' in responseJson || 'data' in responseJson)**
- **if(!isLikelySuccess)**
- **rollbackMove(sourceCategory, targetCategory, backupData)**
- **if(idx !== -1)**
- **if(targetCategory.children)**
- **if(!targetHadChildren && targetCategory.children && targetCategory.children.length === 0)**
- **if(this.scope && this.scope.$apply)**
- **showWarningMessage(message)**
- **findCategoryParent(category, categoriesArray = null)**
- **if(result)**
- **if(!result)**
- **showSuccessMessage(message)**
- **showErrorMessage(message)**
- **getLevel(category, categoriesArray = null)**
- **getAllDescendants(category)**
- **if(typeof unsafeWindow !== 'undefined' && unsafeWindow.angular)**
- **if(typeof window !== 'undefined' && window.angular)**
- **if(ng)**
- **if(element)**
- **if(!scope)**
- **if(nodes.length > 0)**
- **if(containerScope)**
- **if(!scope.categories || scope.categories.length === 0)**
- **if(scope.posCategories && scope.posCategories.length > 0)**
- **if(typeof GM_registerMenuCommand !== 'undefined')**
- **if(document.readyState === 'loading')**
- **function()**
- **isDescendant(potentialAncestor, potentialDescendant)**
- **getCategoryLevel(categories, targetCategory, currentLevel = 1)**
- **getCategoryDescendants(category)**
- **calculateTimeSaved(categoryCount, targetLevel, usedSearch)**
- **getAngular()**
- **waitForAngular(timeout = 10000)**
- **waitForElement(selector, timeout = CategoryManager.WAIT_ELEMENT_TIMEOUT_MS)**
- **getAngularScope(element)**
- **findCategoriesScope(element)**
- **waitForTreeNodes(timeout = CategoryManager.TREE_NODES_TIMEOUT_MS)**
- **init()**

## 依賴清單

### shopline-category-manager

#### devDependencies
```json
{
  "conventional-changelog-cli": "^4.1.0"
}
```

#### dependencies
無

## 摘要

- 檔案數：12
- 函式數：444
- 依賴數：1
- 語言/副檔名分佈：
  - .js: 12
