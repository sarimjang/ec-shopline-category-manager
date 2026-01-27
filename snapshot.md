## 專案目錄結構

```text
├── .beads
│   ├── export-state
│   │   └── b8777a759c312083.json
│   ├── .gitignore
│   ├── .local_version
│   ├── beads.db
│   ├── beads.db-shm
│   ├── beads.db-wal
│   ├── config.yaml
│   ├── daemon.lock
│   ├── daemon.pid
│   ├── interactions.jsonl
│   ├── issues.jsonl
│   ├── last-touched
│   ├── metadata.json
│   └── README.md
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
│   │       ├── 01-04-SUMMARY.md
│   │       ├── 01-05-PLAN.md
│   │       └── 01-05-SUMMARY.md
│   ├── agent-history.json
│   ├── EXEC_LOG.md
│   ├── PROJECT.md
│   ├── ROADMAP.md
│   ├── STATE.md
│   └── TESTING.md
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
│   ├── CONFLICT_RESOLUTION_GUIDE.md
│   ├── DEVELOPMENT.md
│   ├── DEVELOPMENT_REFERENCE.md
│   ├── EXPORT_FUNCTIONALITY.md
│   ├── EXPORT_QUICK_REFERENCE.md
│   ├── IMPORT_EXECUTION_WORKFLOW.md
│   ├── IMPORT_PREVIEW_SPEC.md
│   ├── IMPORT_PREVIEW_UI_IMPLEMENTATION.md
│   ├── IMPORT_VALIDATION_SPEC.md
│   ├── INSTALL.md
│   ├── POPUP_UI_SPECIFICATION.md
│   ├── REGRESSION_TEST.md
│   ├── SERVICE_WORKER_API.md
│   ├── SERVICE_WORKER_LIFECYCLE.md
│   ├── SERVICE_WORKER_TESTING.md
│   ├── STORAGE_IMPLEMENTATION.md
│   ├── STORAGE_QUICK_REFERENCE.md
│   ├── STORAGE_SPEC.md
│   ├── TASK_2P1_3_STORAGE_COMPLETION.md
│   ├── TASK_2P1_4_POPUP_COMPLETION.md
│   ├── TASK_2P1_5_COMPLETION.md
│   ├── TASK_2P2_1_COMPLETION.md
│   ├── TASK_2P2_3_COMPLETION.md
│   ├── TASK_2P2_3_COMPLETION_REPORT.md
│   ├── TEST_PLAN.md
│   ├── TEST_PLAN_TASK_1.5.md
│   ├── TROUBLESHOOTING_GUIDE.md
│   └── USAGE_GUIDE.md
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
│   │   ├── archive
│   │   ├── harden-api-isolation
│   │   │   ├── specs
│   │   │   │   ├── cross-world-communication
│   │   │   │   │   └── spec.md
│   │   │   │   ├── extension-api-protection
│   │   │   │   │   └── spec.md
│   │   │   │   └── storage-isolation
│   │   │   │       └── spec.md
│   │   │   ├── design.md
│   │   │   ├── proposal.md
│   │   │   ├── README.md
│   │   │   └── tasks.md
│   │   └── migrate-greasemonkey-logic
│   │       ├── specs
│   │       │   ├── category-operations
│   │       │   │   └── spec.md
│   │       │   ├── category-search
│   │       │   │   └── spec.md
│   │       │   ├── extension-core
│   │       │   │   └── spec.md
│   │       │   └── time-tracking
│   │       │       └── spec.md
│   │       ├── design.md
│   │       ├── proposal.md
│   │       └── tasks.md
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
│   │   ├── init.js
│   │   └── injected.js
│   ├── popup
│   │   ├── popup.css
│   │   ├── popup.html
│   │   └── popup.js
│   ├── shared
│   │   ├── conflict-detector.js
│   │   ├── constants.js
│   │   ├── csv-export.js
│   │   ├── export-formats.js
│   │   ├── import-validator.js
│   │   ├── logger.js
│   │   ├── storage-schema.js
│   │   └── storage.js
│   ├── manifest.json
│   ├── shopline-category-manager.prod.user.js
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T05-18-49
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T05-25-24
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T06-23-04
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T06-45-23
│   ├── shopline-category-manager.prod.user.js.backup.2026-01-15T07-08-23
│   └── shopline-category-manager.user.js
├── tests
│   └── import-validator.test.js
├── .gitattributes
├── .gitignore
├── AGENTS.md
├── BATCH_OPERATIONS_ANALYSIS.md
├── CHANGELOG.md
├── CLAUDE.md
├── DELIVERABLES.txt
├── DEPLOYMENT_CHECKLIST.md
├── DEVELOPER_GUIDE.md
├── EXTENSION_ARCHITECTURE.md
├── FINAL_STATUS_REPORT.md
├── IMPLEMENTATION_COMPLETE.md
├── IMPLEMENTATION_SUMMARY.md
├── INTEGRATION_ISSUES_SUMMARY.md
├── lesson-learn.md
├── MESSAGE_PASSING_SPEC.md
├── package.json
├── PROJECT_STRUCTURE_FINAL.txt
├── README.md
├── RELEASING.md
├── SETUP_TASK_2P1_1_RESULTS.md
├── snapshot.md
├── TASK_1_SUMMARY.md
├── TASK_2P1_1_CHECKLIST.md
├── TASK_2P1_1_EXECUTIVE_SUMMARY.md
├── TASK_2P1_1_INDEX.md
├── TASK_2P1_2_COMPLETION_REPORT.md
├── TASK_2P1_2_FINAL_SUMMARY.txt
├── TASK_2P1_2_FIXES_APPLIED.md
├── TASK_2P1_2_IMPLEMENTATION.md
├── TASK_2P1_5_VERIFICATION.md
├── TASK_2P2_2_IMPLEMENTATION.md
├── USER_GUIDE.md
└── verify_structure.sh
```

## 函式清單 / 檔案摘要

### 語言分佈
- **JavaScript/TypeScript**: 19 檔案，811 函式

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
- **if(chrome.runtime.lastError)**
- **if(info.menuItemId === 'shopline-export')**
- **switch(request.action)**
- **if(index > -1)**
- **if(history.length > 50)**
- **if(errorLog.length > 100)**
- **if(!categoryId)**
- **if(targetCategoryId === undefined)**
- **if(!jsonString)**
- **if(typeof window.ShoplineImportValidator === 'undefined')**
- **if(!validationResult.isValid)**
- **if(typeof window.ShoplineConflictDetector === 'undefined')**
- **if(!data || typeof data !== 'object')**
- **log(msg, data)**
- **error(msg, err)**
- **addListener(function(request, _sender, sendResponse)**
- **handleGetCategories(_request, sendResponse)**
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
- **handleGetStats(_request, sendResponse)**
- **handleResetStats(_request, sendResponse)**
- **set({ categoryMoveStats: newStats }, function()**
- **handleGetSearchHistory(_request, sendResponse)**
- **get(['searchHistory'], function(result)**
- **handleRecordSearchQuery(request, sendResponse)**
- **set({ searchHistory: history }, function()**
- **handleClassifyError(request, sendResponse)**
- **get(['errorLog'], function(result)**
- **set({ errorLog: errorLog }, function()**
- **handleGetErrorLog(_request, sendResponse)**
- **handleValidateCategoryPath(request, sendResponse)**
- **handleGetMoveHistory(_request, sendResponse)**
- **get(['moveHistory'], function(result)**
- **addListener(function(_tab)**
- **handleValidateImportData(request, sendResponse)**
- **get(null, function(existingData)**
- **handleExecuteImportData(request, sendResponse)**
- **set(importData, function()**

#### src/content/content.js
- purpose: Shopline Category Manager - Content Script
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
- **if(chrome && chrome.runtime && chrome.runtime.sendMessage)**
- **if(chrome.runtime.lastError)**
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
- **if(!window._scm_storage)**
- **if(!initialized)**
- **while(!angularReady && attempts < maxAttempts)**
- **if(!angularReady)**
- **if(ng && ng.element)**
- **if(treeContainer)**
- **if(!scope)**
- **if(typeof manager.injectUI === 'function')**
- **if(typeof manager.attachButtonsToCategories === 'function')**
- **isDescendant(potentialAncestor, potentialDescendant)**
- **getCategoryLevel(categories, targetCategory, currentLevel = 1)**
- **getCategoryDescendants(category)**
- **calculateTimeSaved(categoryCount, targetLevel, usedSearch)**
- **initializeContentScript()**
- **apply()**

#### src/content/init.js
- purpose: Content Script Initializer - Runs in ISOLATED world
##### 函式
- **if(typeof window !== 'undefined' && window.angular)**
- **if(document.readyState === 'loading')**
- **function()**
- **injectScript()**
- **waitForCategoryManagerReady()**
- **addEventListener('categoryManagerReady', function(event)**
- **waitForAngular()**
- **initialize()**

#### src/content/injected.js
- purpose: Injected Script - Runs in MAIN world with access to window.angular
職責:
1. 提供 window._scm_getAngular() 供 content script 使用
2. 提供 window._scm_getScope() 供需要 AngularJS scope 的操作
3. 廣播 categoryManagerRead...
##### 函式
- **if(typeof window !== 'undefined' && window.angular)**
- **if(!ng)**
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
- **if(!injector)**
- **function()**
- **function(element)**
- **initializeCategoryManager()**
- **getStats()**
- **recordMove(timeSaved)**

#### src/popup/popup.js
- purpose: Popup UI Script - Shopline Category Manager Statistics Panel
Displays category move statistics and provides extension controls
Includes import preview UI and execution flow
##### 函式
- **if(totalMovesItem)**
- **if(totalMoves > 100)**
- **if(lastReset)**
- **if(diffDays > 0)**
- **if(autoRefreshInterval)**
- **if(!window.ShoplineExportFormats)**
- **if(downloadSuccess)**
- **if(!file)**
- **if(chrome.runtime.lastError)**
- **if(!validationResult.success)**
- **if(!validationResult.isValid)**
- **if(validationResult.conflictDetected && validationResult.conflicts.length > 0)**
- **if(!conflictsByType[conflict.type])**
- **if(!strategy)**
- **if(s.value)**
- **if(summary.moveRecords > 0)**
- **if(summary.searchQueries > 0)**
- **if(validationResult.conflictDetected && validationResult.conflictSummary)**
- **if(cs.duplicateMoves > 0)**
- **if(cs.duplicateSearches > 0)**
- **if(!previewState.validationResult)**
- **if(progressSection.style.display !== 'block')**
- **if(!errors || errors.length === 0)**
- **if(errors.length === 1)**
- **if(summary.duplicateMoves > 0)**
- **if(summary.duplicateSearches > 0)**
- **if(summary.duplicateErrors > 0)**
- **if(summary.versionMismatches > 0)**
- **if(summary.dataLossRisks > 0)**
- **if(strategy.moves)**
- **if(strategy.searches)**
- **if(strategy.errors)**
- **if(strategy.stats)**
- **if(type !== 'loading')**
- **if(statusEl.textContent === message)**
- **if(button)**
- **function()**
- **initializePopup()**
- **loadAndDisplayStats()**
- **updateStatsDisplay(stats)**
- **startAutoRefresh()**
- **stopAutoRefresh()**
- **handleResetStats()**
- **handleExport()**
- **handleImport()**
- **handleFileImport(event)**
- **performImport(data)**
- **showImportPreview(validationResult, fileSize)**
- **displayConflicts(conflicts)**
- **displayMergeStrategy(strategy)**
- **displayImpactPreview(validationResult)**
- **closePreviewPanel()**
- **handleSaveBackupBeforeImport()**
- **handleConfirmImport()**
- **updateImportProgress(percentage, message)**
- **formatFileSize(bytes)**
- **formatValidationErrors(errors)**
- **handleSettings()**
- **showStatus(message, type = 'success')**
- **setButtonLoading(buttonId, isLoading)**
- **getStorageManager()**

#### src/shared/conflict-detector.js
- purpose: Conflict Detector - Detects conflicts between imported and existing data
檢測匯入資料和現有資料之間的衝突
##### 函式
- **if(importedMove.categoryId === existingMove.categoryId &&
            importedMove.timestamp === existingMove.timestamp &&
            importedMove.timeSaved === existingMove.timeSaved)**
- **if(importedError.type === existingError.type &&
            importedError.message === existingError.message &&
            importedError.timestamp === existingError.timestamp)**
- **if(importedVersion !== existingVersion)**
- **if(existingData.moveHistory && existingData.moveHistory.length > 0)**
- **if(!importedData.moveHistory || importedData.moveHistory.length === 0)**
- **if(existingData.searchHistory && existingData.searchHistory.length > 0)**
- **if(!importedData.searchHistory || importedData.searchHistory.length === 0)**
- **if(strategy.moves === 'MERGE')**
- **if(strategy.errors === 'MERGE')**
- **if(strategy.stats === 'RECALCULATE')**
- **if(allConflicts.length > 0)**
- **if(typeof window !== 'undefined')**
- **function()**
- **detectDuplicateMoves(importedMoves, existingMoves)**
- **detectDuplicateSearches(importedQueries, existingQueries)**
- **detectDuplicateErrors(importedErrors, existingErrors)**
- **detectVersionConflicts(importedData, existingData)**
- **detectDataLossRisk(importedData, existingData)**
- **generateMergeStrategy(conflicts)**
- **mergeData(importedData, existingData, strategy)**
- **detectConflicts(importedData, existingData)**

#### src/shared/constants.js
- purpose: Constants - Global configuration and constants for the extension
##### 函式
- **if(typeof window !== 'undefined')**

#### src/shared/csv-export.js
- purpose: CSV Export Utility - Converts data to CSV format
Handles special characters, escaping, and formatting
##### 函式
- **if(field === null || field === undefined)**
- **if(!headers)**
- **if(typeof firstObj !== 'object')**
- **if(typeof window !== 'undefined')**
- **function()**
- **escapeField(field)**
- **arrayToCsv(data, headers = null)**
- **createCsvSheets(sheets)**
- **createMovesCsv(moveHistory)**
- **createSearchesCsv(searchHistory)**
- **createErrorsCsv(errorLog)**
- **createStatsCsv(stats)**

#### src/shared/export-formats.js
- purpose: Export Formats Handler - Manages different export formats (JSON, CSV)
Provides methods to export data in various formats with proper formatting
##### 函式
- **if(!window.ShoplineCsvExport)**
- **if(allData.categoryMoveStats)**
- **if(allData.moveHistory && allData.moveHistory.length > 0)**
- **if(allData.searchHistory && allData.searchHistory.length > 0)**
- **if(allData.errorLog && allData.errorLog.length > 0)**
- **if(typeof data === 'object')**
- **for(const [sheetName, csvData] of sheets)**
- **if(csvData && csvData.length > 0)**
- **if(typeof window !== 'undefined')**
- **function()**
- **getExportDate()**
- **createJsonExport(allData)**
- **createCsvExport(allData)**
- **formatFileSize(bytes)**
- **createBlob(data, mimeType)**
- **generateJsonExport(exportData)**
- **generateCsvExport(csvSheets, exportDate)**
- **triggerDownload(blob, filename)**
- **getExportSummary(exportData)**

#### src/shared/import-validator.js
- purpose: Import Validator - Comprehensive JSON validation and schema checking
驗證匯入資料的完整性、格式正確性和資料型別
##### 函式
- **if(typeof jsonString !== 'string')**
- **if(!trimmed)**
- **if(typeof data !== 'object' || data === null)**
- **for(const field of requiredFields)**
- **if(data.categoryMoveStats)**
- **if('totalMoves' in stats && typeof stats.totalMoves !== 'number')**
- **if('totalTimeSaved' in stats && typeof stats.totalTimeSaved !== 'number')**
- **if(data.categoryMoveStats && data.categoryMoveStats.lastReset)**
- **if(data.moveHistory && data.moveHistory.length > 500)**
- **if(data.searchHistory && data.searchHistory.length > 50)**
- **if(data.errorLog && data.errorLog.length > 100)**
- **if(!formatResult.isValid)**
- **if(!versionResult.compatible)**
- **if(missingFields.length > 0)**
- **if(typeErrors.length > 0)**
- **if(result.isValid && data.moveHistory && data.moveHistory.length > 500)**
- **if(result.isValid && data.searchHistory && data.searchHistory.length > 50)**
- **if(result.isValid && data.errorLog && data.errorLog.length > 100)**
- **if(typeof window !== 'undefined')**
- **function()**
- **validateJsonFormat(jsonString)**
- **validateRequiredFields(data)**
- **validateDataTypes(data)**
- **validateTimestampFormats(data)**
- **validateSchemaVersion(data)**
- **validateDataBoundaries(data)**
- **generateDataSummary(data)**
- **validateImportData(jsonString)**

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

#### src/shared/storage-schema.js
- purpose: Storage Schema Definition
定義所有儲存鍵、描述和預設值
此檔案作為文檔和類型檢查的參考
##### 函式
- **for(const oldKey of oldKeys)**
- **if(oldValue)**
- **if(oldKey === 'shopline_category_stats')**
- **if(migrationCount > 0)**
- **if(!STORAGE_SCHEMA[key])**
- **if(typeof defaults !== typeof value)**
- **if(schema.maxSize && value.length > schema.maxSize)**
- **if(typeof module !== 'undefined' && module.exports)**
- **migrate(oldData, storage)**
- **validateStorageValue(key, value)**
- **estimateStorageUsage(data)**
- **getQuotaPercentage(usedBytes)**

#### src/shared/storage.js
- purpose: Storage API Abstraction - Provides unified interface for chrome.storage.local
Handles get, set, remove, clear operations with error handling
Includes StorageManager class for statistics and history ma...
##### 函式
- **if(chrome.runtime.lastError)**
- **getStats()**
- **setStats(stats)**
- **addMove(timeSaved, moveDetails = {})**
- **if(moveHistory.length > 500)**
- **getMoveHistory()**
- **setMoveHistory(history)**
- **recordSearchQuery(query)**
- **if(index > -1)**
- **if(searchHistory.length > 50)**
- **getSearchHistory()**
- **setSearchHistory(history)**
- **recordError(errorData)**
- **if(errorLog.length > 100)**
- **getErrorLog()**
- **setErrorLog(log)**
- **resetStats()**
- **getHistory(type)**
- **addToHistory(type, entry)**
- **if(history.length > 100)**
- **if(typeof window !== 'undefined')**
- **if(!chrome || !chrome.storage || !chrome.storage.local)**
- **if(value !== null)**
- **if(chrome && chrome.storage && chrome.storage.local)**
- **function()**
- **get(keys)**
- **get(keys, function(result)**
- **set(items)**
- **set(items, function()**
- **remove(keys)**
- **remove(keys, function()**
- **clear()**
- **clear(function()**
- **init()**
- **getItem(key)**
- **setItem(key, value)**
- **removeItem(key)**
- **clear()**
- **length()**
- **keys()**

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

#### tests/import-validator.test.js
- purpose: Import Validator Tests
Test cases for validation functionality
##### 函式
- **if(typeof module !== 'undefined' && module.exports)**

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

- 檔案數：19
- 函式數：811
- 依賴數：1
- 語言/副檔名分佈：
  - .js: 19
