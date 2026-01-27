# Import Execution Workflow

**Status**: Completed
**Version**: 1.0
**Date**: 2026-01-27

## Overview

The import execution workflow manages the complete lifecycle of importing data:
1. File selection and validation
2. Preview display and user confirmation
3. Backup creation (optional)
4. Data merge and import execution
5. Storage update and verification
6. Success reporting and UI refresh

## Complete Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ USER OPENS POPUP                                                │
└────────────────────────────┬──────────────────────────────────┘
                             │
                    Clicks "匯入資料" Button
                             │
                             ▼
         ┌──────────────────────────────────────┐
         │ File Selector Opens                  │
         │ Accept: .json files only             │
         └────────────┬─────────────────────────┘
                      │
              User Selects File
                      │
                      ▼
         ┌──────────────────────────────────────┐
         │ [POPUP.JS] handleFileImport()        │
         │ - Read file content                  │
         │ - Show loading status                │
         └────────────┬─────────────────────────┘
                      │
                      ▼
         ┌──────────────────────────────────────┐
         │ [SERVICE-WORKER.JS]                  │
         │ validateImportData()                 │
         │ - Parse JSON                         │
         │ - Validate schema                    │
         │ - Check data types                   │
         │ - Detect conflicts                   │
         │ - Merge data if needed               │
         └────────────┬─────────────────────────┘
                      │
                      ▼
         ┌──────────────────────────────────────┐
         │ Validation Result Returned           │
         │ isValid: true/false                  │
         │ conflicts: [...]                    │
         │ mergedData: {...}                   │
         └────────────┬─────────────────────────┘
                      │
            ┌─────────┴──────────┐
            │                    │
        (Valid)            (Invalid)
            │                    │
            ▼                    ▼
        Show Preview        Show Error
        Panel               & Cancel
            │                    │
            │                    └──────────┐
            │                               │
            ▼                               ▼
    ┌─────────────────────┐         User Retries or
    │ PREVIEW PANEL       │         Closes Popup
    │ - Data Summary      │
    │ - Conflicts (if any)│
    │ - Merge Strategy    │
    │ - Impact Preview    │
    │                     │
    │ [Cancel] [Backup]   │
    │ [Import]            │
    └─────────┬───────────┘
              │
    ┌─────────┴──────────────┬─────────────┐
    │                        │             │
 (Cancel)            (Backup)        (Import)
    │                        │             │
    ▼                        ▼             ▼
 Close             Export Current    Show Progress
 Panel             Data & Return      Start Import
    │              │                   │
    │              ▼                   ▼
    │           [Success or        Execute Import
    │           Error Message]     on Service Worker
    │                   │             │
    │                   │             ▼
    │                   │     ┌──────────────────────────┐
    │                   │     │ executeImportData()      │
    │                   │     │ - Validate data struct   │
    │                   │     │ - Get existing data      │
    │                   │     │ - Calculate changes      │
    │                   │     │ - Apply size limits      │
    │                   │     │ - Set to storage         │
    │                   │     └──────────┬───────────────┘
    │                   │                │
    │                   │                ▼
    │                   │     ┌──────────────────────────┐
    │                   │     │ Success Response         │
    │                   │     │ - recordsAdded: #        │
    │                   │     │ - timestamp              │
    │                   │     └──────────┬───────────────┘
    │                   │                │
    │                   │                ▼
    │                   │     Update Progress (100%)
    │                   │                │
    │                   │                ▼
    │                   │     Refresh Statistics
    │                   │     & Display Success
    │                   │                │
    │                   │                ▼
    │                   │     Close Preview Panel
    │                   │                │
    └───────────────────┴────────────────┤
                                        │
                                        ▼
                    ┌──────────────────────────────┐
                    │ POPUP UI UPDATED             │
                    │ - Stats refresh in 2 seconds │
                    │ - Success message shown      │
                    │ - Import history recorded    │
                    └──────────────────────────────┘
```

## Detailed Steps

### Phase 1: File Selection & Initial Validation

**Step 1.1: User Initiates Import**
```javascript
// In popup.js
handleImport() {
  document.getElementById('importFile').click();
}
```
- Opens native file selector
- Filters for .json files only
- User selects a JSON export file

**Step 1.2: File Reading**
```javascript
// In handleFileImport()
const content = await file.text();
previewState.selectedFile = file;
showStatus('正在驗證匯入檔案...', 'loading');
```
- Read file as text
- Save file reference for later
- Show loading indicator

### Phase 2: Server-Side Validation

**Step 2.1: Send Validation Request**
```javascript
// To background service worker
chrome.runtime.sendMessage(
  { action: 'validateImportData', jsonString: content },
  callback
);
```

**Step 2.2: Service Worker Validation**
```javascript
// In service-worker.js: handleValidateImportData()
1. Check JSON format
   - Parse JSON
   - Validate structure
   - Check required fields

2. Validate data types
   - categoryMoveStats: Object
   - moveHistory: Array
   - searchHistory: Array
   - errorLog: Array

3. Get existing data
   chrome.storage.local.get(null, existingData)

4. Detect conflicts
   ShoplineConflictDetector.detectConflicts(
     importedData,
     existingData
   )

5. Apply merge strategy
   - Moves: MERGE (deduplicate by key)
   - Searches: DEDUPLICATE (unique set)
   - Errors: MERGE (deduplicate by type+timestamp)
   - Stats: RECALCULATE (from merged data)
```

**Step 2.3: Return Validation Result**
```javascript
{
  success: true,
  isValid: true,
  data: {...},
  errors: [],
  warnings: [],
  summary: {...},
  conflictDetected: false,
  conflicts: [],
  mergeStrategy: {...},
  mergedData: {...}
}
```

### Phase 3: Display Preview

**Step 3.1: Show Preview Panel**
```javascript
// In popup.js: showImportPreview()
- Update data summary (moves, searches, errors, file size)
- Display conflicts if any (with severity icons)
- Show merge strategy for each data type
- Display impact preview (what will be added/skipped)
- Show control buttons
```

**Step 3.2: Handle User Actions**

**Option A: Cancel**
```javascript
closePreviewPanel() {
  // Hide modal
  // Clear preview state
  // Restore body scroll
}
```

**Option B: Save Backup**
```javascript
handleSaveBackupBeforeImport() {
  // Trigger handleExport()
  // Show success message
  // Keep preview panel open
}
```

**Option C: Confirm Import**
```javascript
handleConfirmImport() {
  // Show progress section
  // Update progress (0%)
  // Send executeImportData to service worker
}
```

### Phase 4: Execute Import

**Step 4.1: Send Execute Request**
```javascript
// In handleConfirmImport()
chrome.runtime.sendMessage(
  { action: 'executeImportData', data: dataToImport },
  callback
);
```
- Data is either raw (no conflicts) or merged (with conflicts)
- Service worker executes asynchronously

**Step 4.2: Service Worker Executes Import**
```javascript
// In service-worker.js: handleExecuteImportData()

1. Validate input
   - Check data exists
   - Check it's an object

2. Get existing data
   chrome.storage.local.get(null, existingData)

3. Calculate impact
   - oldMoveCount vs newMoveCount
   - oldSearchCount vs newSearchCount
   - oldErrorCount vs newErrorCount
   - movedAdded = max(0, new - old)

4. Prepare import data
   - Limit moveHistory to 500 records
   - Limit searchHistory to 50 records
   - Limit errorLog to 100 records
   - Add importTimestamp

5. Write to storage
   chrome.storage.local.set(importData, callback)

6. Handle success
   return {
     success: true,
     summary: {
       recordsAdded: #,
       movesAdded: #,
       searchesAdded: #,
       errorsAdded: #,
       timestamp: ISO8601
     }
   }
```

### Phase 5: Complete & Refresh

**Step 5.1: Update Progress**
```javascript
updateImportProgress(100, '匯入完成！');
```
- Set progress bar to 100%
- Show completion message

**Step 5.2: Refresh Statistics**
```javascript
await loadAndDisplayStats();
// Fetches stats from storage
// Updates all stat displays
// Clears auto-refresh timer
// Restarts auto-refresh
```

**Step 5.3: Show Success Message**
```javascript
showStatus(
  '匯入成功！已匯入 25 筆移動記錄、10 個搜尋',
  'success'
);
```

**Step 5.4: Close Preview Panel**
```javascript
closePreviewPanel();
// Hide modal and overlay
// Clear preview state
// Restore scroll
```

## Error Handling

### Validation Errors

**Error**: JSON parse failure
```javascript
if (!formatResult.isValid) {
  return { success: false, isValid: false, errors: [...] }
}
```
- Show error message in status area
- File input is cleared
- User can retry with new file

**Error**: Missing required fields
```javascript
if (missingFields.length > 0) {
  errors.push({
    severity: 'ERROR',
    type: 'MISSING_FIELDS',
    message: 'Missing: categoryMoveStats, moveHistory'
  })
}
```

**Error**: Type validation failures
```javascript
if (data.moveHistory && !Array.isArray(data.moveHistory)) {
  errors.push('moveHistory must be an array')
}
```

### Import Errors

**Error**: Storage access failure
```javascript
if (chrome.runtime.lastError) {
  return { success: false, error: 'Storage error: ...' }
}
```

**Error**: Data structure invalid
```javascript
if (!data || typeof data !== 'object') {
  return { success: false, error: 'Invalid data structure' }
}
```

**Error**: Import execution failure
```javascript
try {
  chrome.storage.local.set(importData, callback)
} catch (error) {
  return { success: false, error: error.message }
}
```

### Recovery Strategies

1. **Show Error Message**: Display clear error in status area
2. **Keep Preview Open**: Allow user to review and retry
3. **Suggest Action**: Provide specific next steps
4. **Log Details**: Log full error stack for debugging

## Data Limits & Safeguards

### Storage Limits Applied During Import

| Data Type | Max Records | Action |
|-----------|------------|--------|
| moveHistory | 500 | Slice to last 500 |
| searchHistory | 50 | Slice to last 50 |
| errorLog | 100 | Slice to last 100 |

### Merge Deduplication Keys

| Data Type | Dedup Key | Method |
|-----------|----------|--------|
| moveHistory | categoryId + timestamp | Map key |
| searchHistory | query string | Set |
| errorLog | type + timestamp | Map key |

### Data Integrity Checks

```javascript
// Verify arrays are valid
if (!Array.isArray(data.moveHistory)) {
  data.moveHistory = [];
}

// Ensure stats are calculated
if (strategy.stats === 'RECALCULATE') {
  stats.totalMoves = merged.moveHistory.length;
  stats.totalTimeSaved = merged.moveHistory.reduce(...);
}

// Add timestamp
importData.importTimestamp = new Date().toISOString();
```

## Progress Tracking

### Progress Updates

| Phase | Progress | Message |
|-------|----------|---------|
| Start | 0% | '開始匯入...' |
| Processing | 25% | '驗證資料...' |
| Merging | 50% | '合併重複記錄...' |
| Storing | 75% | '保存到儲存空間...' |
| Complete | 100% | '匯入完成！' |

### Progress Callback (Future Enhancement)

```javascript
// For large imports, send progress updates
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'importProgress') {
    updateImportProgress(request.percentage, request.message);
  }
});
```

## Success Reporting

### Import Summary

```javascript
{
  success: true,
  recordsAdded: 35,           // Total new records
  movesAdded: 25,              // Move history additions
  searchesAdded: 10,           // Search query additions
  errorsAdded: 5,              // Error log additions
  totalRecords: 250,           // Total after import
  timestamp: '2026-01-27T...'  // When import completed
}
```

### UI Success Feedback

1. **Status Message**: "匯入成功！已匯入 25 筆移動記錄、10 個搜尋"
2. **Statistics Update**: Visible numbers change in main popup
3. **Auto Close**: Preview panel closes after 1 second
4. **Auto Refresh**: Statistics auto-update every 2 seconds
5. **History Recording**: Import entry added to storage

## Testing Scenarios

### Test 1: Simple Import (No Conflicts)
- File with 10 move records
- File with 5 search queries
- File with 2 error logs
- Expected: Direct import without conflicts shown

### Test 2: Import with Conflicts
- Duplicate move records
- Duplicate searches
- Version mismatch
- Expected: Conflicts shown, merged data used

### Test 3: Large Import (100+ records)
- File with 150 move records (trimmed to 500)
- Expected: Progress bar visible, successful import

### Test 4: Error Handling
- Malformed JSON file
- Missing required fields
- Invalid data types
- Expected: Validation errors shown, user can retry

### Test 5: Storage Quota
- Many records already stored
- Additional records to import
- Expected: Handle gracefully, trim oldest records

## Performance Considerations

### Timing

| Operation | Duration | Note |
|-----------|----------|------|
| File read | <100ms | Depends on file size |
| JSON parse | <50ms | Standard operation |
| Validation | <100ms | Schema checks |
| Conflict detection | <200ms | Array comparisons |
| Storage set | <500ms | Chrome API call |
| UI refresh | <200ms | DOM updates |

### Optimization Strategies

1. **Asynchronous operations**: Use async/await
2. **Batched updates**: Set all data at once
3. **Lazy rendering**: Only render visible conflicts
4. **Debounced refresh**: Auto-refresh every 2 seconds max
5. **Service worker caching**: Reuse validators in memory

## Logging & Debugging

### Log Points

```javascript
logger.log('[Popup] 匯入預覽面板已顯示');
logger.log('[Popup] 驗證完成，請檢查匯入預覽');
logger.log('[Popup] 預覽面板已關閉');
logger.log('[SERVICE_WORKER] Conflict detection complete');
logger.log('[SERVICE_WORKER] Import execution completed successfully');
```

### Debug Interface

```javascript
// Access via browser console
window._popupDebug = {
  getStorageManager,
  showStatus,
  loadAndDisplayStats,
  // ... other functions
}

window._swDebug = {
  getValidationResult,
  getImportSummary,
  // ... other functions
}
```

## Summary

The import workflow provides:
✅ Robust file validation
✅ Clear conflict detection
✅ User-friendly preview
✅ Conflict resolution strategies
✅ Optional backup creation
✅ Progress tracking
✅ Complete error handling
✅ Data integrity checks
✅ Success reporting
✅ Automatic UI refresh

All operations complete without data corruption, and users have full visibility into the import process.
