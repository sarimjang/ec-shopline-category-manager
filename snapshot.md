## 專案目錄結構

```text
├── .claude
│   └── settings.local.json
├── .github
│   └── workflows
├── .releases
│   └── updates.json
├── .serena
│   ├── cache
│   │   └── typescript
│   │       ├── document_symbols.pkl
│   │       └── raw_document_symbols.pkl
│   ├── memories
│   │   └── tampermonkey-sandbox-angularjs-fix.md
│   ├── .gitignore
│   └── project.yml
├── docs
│   ├── DEVELOPMENT.md
│   └── INSTALL.md
├── openspec
│   ├── changes
│   │   ├── tampermonkey-sandbox-fix
│   │   │   ├── CHANGELOG-draft.md
│   │   │   ├── metadata.json
│   │   │   ├── PREPARATION-SUMMARY.md
│   │   │   ├── README-update-draft.md
│   │   │   ├── spec.md
│   │   │   ├── tasks.md
│   │   │   └── testing-checklist.md
│   │   ├── time-calculation-nonlinear
│   │   │   ├── metadata.json
│   │   │   ├── README.md
│   │   │   ├── spec.md
│   │   │   └── tasks.md
│   │   └── time-savings-tracker
│   │       ├── metadata.json
│   │       ├── spec.md
│   │       └── tasks.md
│   ├── openspec
│   │   └── changes
│   │       └── tampermonkey-sandbox-fix
│   └── specs
├── scripts
│   ├── bump-version.js
│   ├── README.md
│   ├── sync-prod-ast.js
│   ├── sync-prod.sh
│   └── update-releases.js
├── src
│   ├── shopline-category-manager.prod.user.js
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T05-18-49
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T05-25-24
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T06-23-04
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T06-45-23
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T07-08-23
│   └── shopline-category-manager.user.js
├── .gitignore
├── CHANGELOG.md
├── package.json
├── README.md
├── snapshot.md
└── test-time-calculation.js
```

## 函式清單 / 檔案摘要

### 語言分佈
- **JavaScript/TypeScript**: 6 檔案，367 函式

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

#### src/shopline-category-manager.prod.user.js
- purpose: ==UserScript== @name         Shopline 分類管理 - 快速移動 (Production) @namespace    https://github.com/sarimjang/shopline-category-manager @version      0.2.1 @description  在 Shopline 分類管理頁面添加「移動到」按鈕，支援快速分類重...
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
- purpose: ==UserScript== @name         Shopline 分類管理 - 快速移動 @namespace    http://tampermonkey.net/ @version      0.2.1 @description  在 Shopline 分類管理頁面添加「移動到」按鈕，支援快速分類重新整理 @author       Development Team @match  ...
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

#### test-time-calculation.js
- purpose: 舊算法
##### 函式
- **for(let i = 1; i < testCases.length; i++)**
- **if(curr.dragTime < prev.dragTime)**
- **if(result.dragTime < 0 || result.toolTime < 0 || result.timeSaved < 0)**
- **if(currDiff < prevDiff - 0.5)**
- **calculateTimeSavedOld(categoryCount, targetLevel, usedSearch)**
- **calculateTimeSavedNew(categoryCount, targetLevel, usedSearch)**

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

- 檔案數：6
- 函式數：367
- 依賴數：1
- 語言/副檔名分佈：
  - .js: 6
