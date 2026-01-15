## 專案目錄結構

```text
├── .claude
│   └── settings.local.json
├── .github
│   └── workflows
├── .releases
│   └── updates.json
├── .serena
│   └── cache
│       └── typescript
│           ├── document_symbols.pkl
│           └── raw_document_symbols.pkl
├── docs
│   ├── DEVELOPMENT.md
│   └── INSTALL.md
├── openspec
│   └── specs
├── scripts
│   ├── bump-version.js
│   └── update-releases.js
├── src
│   ├── shopline-category-manager.prod.user.js
│   └── shopline-category-manager.user.js
├── .gitignore
├── CHANGELOG.md
├── package.json
├── README.md
└── snapshot.md
```

## 函式清單 / 檔案摘要

### 語言分佈
- **JavaScript/TypeScript**: 4 檔案，299 函式

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
- **while(element.firstChild)**
- **if(!category || !category.children)**
- **for(let child of category.children)**
- **for(const category of categories)**
- **if(category === targetCategory)**
- **if(level !== -1)**
- **getCategoryDisplayName(category)**
- **if(category.name)**
- **if(category.name_translations)**
- **if(category.name_translations['zh-hant'])**
- **if(category.name_translations['en'])**
- **if(firstLang && category.name_translations[firstLang])**
- **if(category.seo_title_translations)**
- **if(category.seo_title_translations['zh-hant'])**
- **if(category.seo_title_translations['en'])**
- **findCategoryByName(categoryName)**
- **if(!categoryName)**
- **for(const item of arr)**
- **if(itemName === categoryName)**
- **if(this.posCategories && this.posCategories.length > 0)**
- **getLevel1Categories(excludeCategory = null, filterArrayName = null)**
- **for(const cat of this.categories)**
- **for(const cat of this.posCategories)**
- **filterCategoriesByKeyword(keyword, categories)**
- **debounce(func, wait)**
- **findCategoryById(categoryId)**
- **if(!categoryId)**
- **if(item._id === categoryId || item.id === categoryId)**
- **initialize()**
- **injectUI()**
- **if(!treeContainer)**
- **attachButtonsToCategories()**
- **if(!buttonArea)**
- **if(!categoryInfo && domCategoryName)**
- **if(categoryInfo && domCategoryName)**
- **if(scopeCategoryName !== domCategoryName)**
- **if(correctedInfo)**
- **if(!categoryInfo)**
- **if(categoryId)**
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
- **if(searchSection && searchSection._debouncedSearch && searchSection._debouncedSearch.cancel)**
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
- **if(r._radio)**
- **if(searchSection._selectedCategory === item)**
- **attachSearchEventListeners(searchSection)**
- **getValidMoveTargets(category, categoriesArray = null)**
- **addTargetCategoriesRecursively(categories, currentCategory, options, depth)**
- **moveCategory(sourceCategory, targetCategory, categoriesArray = null, arrayName = 'categories')**
- **if(this.isMoving)**
- **if(success)**
- **moveCategoryUsingScope(sourceCategory, targetCategory, categoriesArray = null, arrayName = 'categories')**
- **if(targetCategory)**
- **if(targetLevel === 3)**
- **if(!sourceParent)**
- **if(sourceIndex === -1)**
- **if(!targetCategory.children)**
- **if(this.scope.$apply)**
- **if(sourceStillInOldLocation)**
- **if(!sourceInNewLocation)**
- **rollbackMove(sourceCategory, targetCategory, backupData)**
- **if(targetCategory.children)**
- **if(previousChildren === undefined && targetCategory.children.length === 0)**
- **findCategoryParent(category, categoriesArray = null)**
- **if(result)**
- **showSuccessMessage(message)**
- **showErrorMessage(message)**
- **getLevel(category, categoriesArray = null)**
- **getAllDescendants(category)**
- **if(element)**
- **if(!window.angular)**
- **if(!scope)**
- **if(nodes.length > 0)**
- **if(containerScope)**
- **if(document.readyState === 'loading')**
- **function()**
- **log(...args)**
- **warn(...args)**
- **error(...args)**
- **debug(...args)**
- **clearElement(element)**
- **isDescendant(potentialAncestor, potentialDescendant)**
- **getCategoryLevel(categories, targetCategory, currentLevel = 1)**
- **getCategoryDescendants(category)**
- **waitForElement(selector, timeout = 10000)**
- **getAngularScope(element)**
- **findCategoriesScope(element)**
- **waitForTreeNodes(timeout = 15000)**
- **init()**

#### src/shopline-category-manager.user.js
- purpose: ==UserScript== @name         Shopline 分類管理 - 快速移動 @namespace    http://tampermonkey.net/ @version      0.2.1 @description  在 Shopline 分類管理頁面添加「移動到」按鈕，支援快速分類重新整理 @author       Development Team @match  ...
##### 函式
- **if(!category || !category.children)**
- **for(let child of category.children)**
- **for(const category of categories)**
- **if(category === targetCategory)**
- **if(level !== -1)**
- **sanitizeCategoryName(name)**
- **if(!name || typeof name !== 'string')**
- **getCategoryDisplayName(category)**
- **if(category.name)**
- **if(category.name_translations['zh-hant'])**
- **if(category.name_translations && typeof category.name_translations === 'object')**
- **if(firstLang && category.name_translations[firstLang])**
- **if(!matcher || typeof matcher !== 'function')**
- **for(const item of arr)**
- **if(this.posCategories && this.posCategories.length > 0)**
- **if(category.seo_title_translations['zh-hant'])**
- **if(!displayName)**
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
- **if(buttonNodeName !== actualName)**
- **if(categoryInfo.category?.key)**
- **if(bindingAge > CategoryManager.BINDING_STALENESS_MS)**
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
- **if(element)**
- **if(!window.angular)**
- **if(!scope)**
- **if(nodes.length > 0)**
- **if(containerScope)**
- **if(!scope.categories || scope.categories.length === 0)**
- **if(scope.posCategories && scope.posCategories.length > 0)**
- **if(document.readyState === 'loading')**
- **function()**
- **isDescendant(potentialAncestor, potentialDescendant)**
- **getCategoryLevel(categories, targetCategory, currentLevel = 1)**
- **getCategoryDescendants(category)**
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

- 檔案數：4
- 函式數：299
- 依賴數：1
- 語言/副檔名分佈：
  - .js: 4
