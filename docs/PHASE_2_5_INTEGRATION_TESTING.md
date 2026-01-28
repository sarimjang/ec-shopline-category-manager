# Phase 2.5: Integration Testing - Storage & Message Processing

**Project**: Shopline Category Manager Chrome Extension  
**Phase**: 2.5 (Integration Testing)  
**Task ID**: lab_20260107_chrome-extension-shopline-category-ksh  
**Date**: 2026-01-28  
**Status**: In Progress  
**Estimated Time**: 1 hour  

---

## Objective

Verify that Phase 2 implementation (Export/Import functionality) integrates correctly with the underlying storage system and message handlers. Ensure:

1. Storage isolation is working correctly
2. Message handlers properly process all operations
3. Data persistence works across page reloads
4. Invalid inputs are properly rejected
5. Concurrent operations don't cause conflicts
6. No legacy `_scm_storage` global is being used
7. Console is clean of errors and warnings

---

## Setup & Prerequisites

### 1. Environment Verification

Before starting tests, verify the following:

```bash
# Check Chrome extension is loaded
- Open chrome://extensions/
- Search for "Shopline Category Manager"
- Verify extension is enabled
- Note the extension ID (will be needed for testing)

# Check Shopline site is accessible
- Navigate to https://app.shopline.tw/admin/*/categories (replace * with store ID)
- Verify AngularJS is loaded
- Verify category tree is visible
```

### 2. Clear Previous State

```javascript
// Execute in DevTools Console (on Shopline page)
chrome.storage.local.clear();
console.log('Storage cleared for fresh start');

// Verify clear was successful
chrome.storage.local.get(null, (data) => {
  console.log('Current storage:', data);
});
```

### 3. Open DevTools

```
Press F12 on the Shopline categories page
→ Open "Console" tab
→ Keep console visible throughout all tests
```

---

## Test Suite

### Test 1: Basic Storage Operations (Read, Write, Delete)

**Objective**: Verify that basic CRUD operations work on chrome.storage.local

**Preconditions**:
- Extension loaded and enabled
- Shopline page open with DevTools console visible
- Storage cleared

**Steps**:

1. **Test Write Operation**:
   ```javascript
   chrome.storage.local.set(
     { testKey: { value: 'test-data', timestamp: Date.now() } },
     () => {
       console.log('✓ Write operation completed');
       if (chrome.runtime.lastError) {
         console.error('✗ Write failed:', chrome.runtime.lastError);
       }
     }
   );
   ```

2. **Test Read Operation**:
   ```javascript
   chrome.storage.local.get(['testKey'], (result) => {
     if (result.testKey && result.testKey.value === 'test-data') {
       console.log('✓ Read operation successful:', result.testKey);
     } else {
       console.error('✗ Read operation failed');
     }
   });
   ```

3. **Test Delete Operation**:
   ```javascript
   chrome.storage.local.remove(['testKey'], () => {
     chrome.storage.local.get(['testKey'], (result) => {
       if (!result.testKey) {
         console.log('✓ Delete operation successful');
       } else {
         console.error('✗ Delete operation failed');
       }
     });
   });
   ```

**Expected Results**:
- All three operations complete without errors
- Console shows success messages
- No chrome.runtime.lastError messages
- Data is correctly stored and retrieved

**Pass Criteria**:
- ✅ All CRUD operations succeed
- ✅ No console errors
- ✅ Data matches expected values

---

### Test 2: Data Persistence Across Page Reload

**Objective**: Verify that stored data persists when page is reloaded

**Preconditions**:
- Previous test completed successfully
- Shopline page still open

**Steps**:

1. **Store Test Data**:
   ```javascript
   const testData = {
     moveHistory: [
       { timestamp: '2026-01-28T12:00:00Z', category: 'test1', timeSaved: 10 },
       { timestamp: '2026-01-28T12:05:00Z', category: 'test2', timeSaved: 15 }
     ],
     stats: { totalMoves: 2, totalTimeSaved: 25 }
   };
   
   chrome.storage.local.set(testData, () => {
     console.log('✓ Test data stored before reload');
   });
   ```

2. **Reload Page**:
   ```
   Press F5 or Ctrl+R to reload page
   Wait for page to fully load
   Open DevTools Console again
   ```

3. **Verify Data Persisted**:
   ```javascript
   chrome.storage.local.get(['moveHistory', 'stats'], (result) => {
     if (result.moveHistory && result.moveHistory.length === 2 &&
         result.stats && result.stats.totalMoves === 2) {
       console.log('✓ Data persisted after reload:', result);
     } else {
       console.error('✗ Data not persisted:', result);
     }
   });
   ```

**Expected Results**:
- Data is available after page reload
- All fields match original values
- No data corruption or loss

**Pass Criteria**:
- ✅ All stored data present after reload
- ✅ Data integrity maintained
- ✅ No console errors

---

### Test 3: Invalid Input Rejection

**Objective**: Verify that invalid data is properly rejected by validation layer

**Preconditions**:
- Storage cleared
- Shopline page open

**Steps**:

1. **Test Invalid JSON in Import**:
   ```javascript
   // Simulate invalid JSON
   const invalidJSON = '{ invalid json not quoted }';
   
   // Try to validate (assuming validator is available)
   if (window.ShoplineImportValidator) {
     const result = window.ShoplineImportValidator.validateImportData(invalidJSON);
     if (!result.valid) {
       console.log('✓ Invalid JSON rejected:', result.errors);
     } else {
       console.error('✗ Invalid JSON was not rejected');
     }
   }
   ```

2. **Test Missing Required Fields**:
   ```javascript
   const incompleteData = JSON.stringify({
     moveHistory: [],
     stats: { totalMoves: 0 }
     // Missing: searchHistory, errorLog, etc.
   });
   
   if (window.ShoplineImportValidator) {
     const result = window.ShoplineImportValidator.validateImportData(incompleteData);
     if (!result.valid && result.errors.length > 0) {
       console.log('✓ Missing fields detected:', result.errors);
     } else {
       console.error('✗ Missing fields not detected');
     }
   }
   ```

3. **Test Type Mismatch**:
   ```javascript
   const wrongTypeData = JSON.stringify({
     moveHistory: 'should be array',  // Wrong: should be array
     stats: { totalMoves: 'should be number' },  // Wrong: should be number
     searchHistory: [],
     errorLog: []
   });
   
   if (window.ShoplineImportValidator) {
     const result = window.ShoplineImportValidator.validateImportData(wrongTypeData);
     if (!result.valid) {
       console.log('✓ Type mismatches detected:', result.errors);
     } else {
       console.error('✗ Type mismatches not detected');
     }
   }
   ```

**Expected Results**:
- Invalid JSON is rejected
- Missing fields are detected
- Type mismatches are caught
- Clear error messages provided

**Pass Criteria**:
- ✅ All invalid inputs rejected
- ✅ Error messages are clear and specific
- ✅ No data corruption from invalid input

---

### Test 4: Concurrent Storage Operations

**Objective**: Verify that concurrent operations don't cause conflicts or data loss

**Preconditions**:
- Storage cleared
- Shopline page open

**Steps**:

1. **Setup: Create Initial Data**:
   ```javascript
   const initialData = {
     moveHistory: [
       { id: 1, timestamp: '2026-01-28T12:00:00Z' },
       { id: 2, timestamp: '2026-01-28T12:05:00Z' }
     ],
     stats: { totalMoves: 2, totalTimeSaved: 30 }
   };
   
   chrome.storage.local.set(initialData, () => {
     console.log('✓ Initial data set');
   });
   ```

2. **Execute Concurrent Writes**:
   ```javascript
   // Simulate concurrent operations
   const promises = [];
   
   for (let i = 3; i <= 5; i++) {
     const promise = new Promise((resolve) => {
       const updateData = {
         moveHistory: [
           ...initialData.moveHistory,
           { id: i, timestamp: new Date().toISOString() }
         ]
       };
       
       chrome.storage.local.set(updateData, () => {
         console.log(`✓ Concurrent write ${i} completed`);
         resolve();
       });
     });
     promises.push(promise);
   }
   
   // Wait for all to complete
   Promise.all(promises).then(() => {
     console.log('✓ All concurrent writes completed');
   });
   ```

3. **Verify Final State**:
   ```javascript
   setTimeout(() => {
     chrome.storage.local.get(['moveHistory'], (result) => {
       const moves = result.moveHistory || [];
       if (moves.length >= 5) {
         console.log(`✓ All ${moves.length} records preserved`);
       } else {
         console.error(`✗ Data loss detected: expected >=5, got ${moves.length}`);
       }
     });
   }, 1000);
   ```

**Expected Results**:
- All concurrent operations complete without errors
- No data loss or corruption
- Final state is consistent

**Pass Criteria**:
- ✅ All concurrent writes succeed
- ✅ No data loss
- ✅ Final state is consistent

---

### Test 5: Global Storage API Verification

**Objective**: Verify that the storage API is properly exposed and old global `_scm_storage` is not being used

**Preconditions**:
- Shopline page open with DevTools console

**Steps**:

1. **Check Modern Storage API (chrome.storage.local)**:
   ```javascript
   if (chrome && chrome.storage && chrome.storage.local) {
     console.log('✓ Modern chrome.storage.local API available');
   } else {
     console.error('✗ chrome.storage.local API not available');
   }
   ```

2. **Verify Old Global Not in Use**:
   ```javascript
   // Check if old _scm_storage global exists
   if (typeof window._scm_storage !== 'undefined') {
     console.warn('⚠️ Legacy window._scm_storage global exists');
     console.warn('Note: This should not be used - use chrome.storage.local instead');
   } else {
     console.log('✓ Old _scm_storage global not found (good)');
   }
   ```

3. **Check Storage.js Wrapper**:
   ```javascript
   if (typeof window.ShoplineStorage !== 'undefined') {
     console.log('✓ ShoplineStorage wrapper available');
     
     // Test the wrapper
     window.ShoplineStorage.get('categoryMoveStats').then(result => {
       console.log('✓ ShoplineStorage.get() works:', result);
     }).catch(error => {
       console.error('✗ ShoplineStorage.get() failed:', error);
     });
   } else {
     console.warn('⚠️ ShoplineStorage wrapper not found');
   }
   ```

4. **Check StorageManager Class**:
   ```javascript
   if (typeof window.StorageManager !== 'undefined') {
     console.log('✓ StorageManager class available');
     
     // Test instantiation
     const mgr = new window.StorageManager();
     mgr.getStats().then(stats => {
       console.log('✓ StorageManager.getStats() works:', stats);
     }).catch(error => {
       console.error('✗ StorageManager.getStats() failed:', error);
     });
   } else {
     console.warn('⚠️ StorageManager class not found');
   }
   ```

**Expected Results**:
- Modern chrome.storage.local API is available
- Old `_scm_storage` global is not being used
- Storage wrappers are properly available
- All storage operations complete successfully

**Pass Criteria**:
- ✅ Modern API is being used
- ✅ Old global not in use
- ✅ Wrappers function correctly

---

### Test 6: Message Handler Integration

**Objective**: Verify that Service Worker properly handles storage-related messages

**Preconditions**:
- Extension loaded
- Shopline page open
- DevTools console visible

**Steps**:

1. **Test categoryMoveStats Message**:
   ```javascript
   chrome.runtime.sendMessage(
     {
       action: 'getCategoryMoveStats'
     },
     response => {
       if (response && response.stats) {
         console.log('✓ getCategoryMoveStats message handled:', response.stats);
       } else {
         console.error('✗ getCategoryMoveStats message failed:', response);
       }
     }
   );
   ```

2. **Test setStats Message**:
   ```javascript
   chrome.runtime.sendMessage(
     {
       action: 'setStats',
       stats: { totalMoves: 100, totalTimeSaved: 5000, lastReset: new Date().toISOString() }
     },
     response => {
       if (response && response.success) {
         console.log('✓ setStats message handled successfully');
       } else {
         console.error('✗ setStats message failed:', response);
       }
     }
   );
   ```

3. **Test Export Data Message**:
   ```javascript
   chrome.runtime.sendMessage(
     {
       action: 'exportData'
     },
     response => {
       if (response && response.data) {
         console.log('✓ exportData message handled:', {
           hasStats: !!response.data.stats,
           hasMoveHistory: Array.isArray(response.data.moveHistory),
           recordCount: response.data.moveHistory?.length || 0
         });
       } else {
         console.error('✗ exportData message failed:', response);
       }
     }
   );
   ```

4. **Test validateImportData Message**:
   ```javascript
   const validImportData = JSON.stringify({
     stats: { totalMoves: 50, totalTimeSaved: 2500, lastReset: new Date().toISOString() },
     moveHistory: [{ timestamp: new Date().toISOString(), category: 'test' }],
     searchHistory: ['test'],
     errorLog: []
   });
   
   chrome.runtime.sendMessage(
     {
       action: 'validateImportData',
       jsonString: validImportData
     },
     response => {
       if (response && response.valid) {
         console.log('✓ validateImportData message handled successfully');
       } else {
         console.error('✗ validateImportData message failed:', response);
       }
     }
   );
   ```

**Expected Results**:
- All messages are handled by Service Worker
- Responses include appropriate data
- No communication errors

**Pass Criteria**:
- ✅ All messages handled correctly
- ✅ Responses contain expected data
- ✅ No timeout or communication errors

---

### Test 7: Console Health Check

**Objective**: Verify that console is clean of errors and warnings

**Preconditions**:
- All previous tests completed
- DevTools console still visible

**Steps**:

1. **Count Console Errors**:
   ```javascript
   // This is visual - manually count red error messages in console
   // OR use this to check console history if available
   const checkConsoleHealth = () => {
     const originalError = console.error;
     let errorCount = 0;
     
     console.error = function(...args) {
       errorCount++;
       originalError.apply(console, args);
     };
     
     console.log(`Error tracking enabled. Current count: ${errorCount}`);
   };
   
   checkConsoleHealth();
   ```

2. **Verify No Uncaught Errors**:
   ```
   Visually inspect console for:
   - Red error messages (should be 0 or minimal)
   - Yellow warning messages about storage (should be 0)
   - Undefined variable errors (should be 0)
   ```

3. **Check for Specific Error Patterns**:
   ```javascript
   // Log summary of expected vs actual
   const expectedZeros = [
     'chrome.runtime.lastError',
     'undefined is not a function',
     'Cannot read property',
     'QuotaExceededError'
   ];
   
   console.log('✓ Console Health Check:');
   console.log('  - chrome.runtime.lastError: 0 (expected)');
   console.log('  - Undefined errors: 0 (expected)');
   console.log('  - Storage quota errors: 0 (expected)');
   console.log('  - Type errors: 0 (expected)');
   ```

**Expected Results**:
- No red error messages from extension
- No warnings about storage operations
- No undefined variable references
- No quota exceeded errors

**Pass Criteria**:
- ✅ Console contains no extension errors
- ✅ No storage-related warnings
- ✅ No uncaught exceptions

---

### Test 8: Export/Import Round-trip

**Objective**: Verify complete export and import cycle works correctly

**Preconditions**:
- Storage is populated with test data
- DevTools console visible

**Steps**:

1. **Setup Test Data**:
   ```javascript
   const testStats = {
     totalMoves: 50,
     totalTimeSaved: 2500,
     lastReset: new Date().toISOString(),
     movesByDepth: { '1': 10, '2': 20, '3': 20 },
     movesBySize: { 'small': 25, 'large': 25 }
   };
   
   chrome.storage.local.set({ categoryMoveStats: testStats }, () => {
     console.log('✓ Test stats stored');
   });
   ```

2. **Export Data**:
   ```javascript
   chrome.runtime.sendMessage(
     { action: 'exportData' },
     response => {
       if (response && response.data) {
         const exportedJSON = JSON.stringify(response.data);
         window.exportedData = exportedJSON;  // Store for import test
         console.log('✓ Data exported:', {
           size: exportedJSON.length,
           stats: response.data.stats
         });
       }
     }
   );
   ```

3. **Clear Storage**:
   ```javascript
   chrome.storage.local.clear();
   console.log('✓ Storage cleared for import test');
   ```

4. **Validate Import**:
   ```javascript
   chrome.runtime.sendMessage(
     {
       action: 'validateImportData',
       jsonString: window.exportedData
     },
     response => {
       if (response && response.valid) {
         console.log('✓ Import validation passed');
       } else {
         console.error('✗ Import validation failed:', response);
       }
     }
   );
   ```

5. **Import Data**:
   ```javascript
   chrome.runtime.sendMessage(
     {
       action: 'importData',
       jsonString: window.exportedData
     },
     response => {
       if (response && response.success) {
         console.log('✓ Data imported successfully');
         
         // Verify imported data
         chrome.storage.local.get('categoryMoveStats', (result) => {
           const imported = result.categoryMoveStats;
           if (imported && imported.totalMoves === testStats.totalMoves) {
             console.log('✓ Imported data matches original:', imported);
           } else {
             console.error('✗ Imported data mismatch:', imported);
           }
         });
       } else {
         console.error('✗ Import failed:', response);
       }
     }
   );
   ```

**Expected Results**:
- Export completes successfully with valid JSON
- Import validation passes
- Data is correctly restored
- No data corruption or loss

**Pass Criteria**:
- ✅ Export-import cycle completes successfully
- ✅ Data integrity maintained
- ✅ All fields present in imported data

---

## Test Results Summary

### Test Execution Log

Fill in as you complete each test:

| Test # | Name | Date | Result | Issues | Notes |
|--------|------|------|--------|--------|-------|
| 1 | Basic Storage CRUD | | PASS/FAIL | | |
| 2 | Data Persistence | | PASS/FAIL | | |
| 3 | Invalid Input | | PASS/FAIL | | |
| 4 | Concurrent Ops | | PASS/FAIL | | |
| 5 | Storage API | | PASS/FAIL | | |
| 6 | Message Handlers | | PASS/FAIL | | |
| 7 | Console Health | | PASS/FAIL | | |
| 8 | Export/Import | | PASS/FAIL | | |

### Summary Statistics

After completing all tests:

```
Total Tests: 8
Passed: ___
Failed: ___
Pass Rate: ___%

Critical Issues: ___
Non-Critical Issues: ___

Console Errors: ___
Console Warnings: ___
```

---

## Troubleshooting

### Issue: chrome.storage.local Not Available

**Symptom**: Chrome storage API not accessible in DevTools console

**Solutions**:
1. Verify extension is loaded: chrome://extensions/
2. Check manifest.json has "storage" permission
3. Try reloading extension: click reload on extension card

### Issue: Storage.local Get Returns Empty

**Symptom**: Storage operations complete but return no data

**Solutions**:
1. Verify data was actually set with setItem call first
2. Check quota usage: `chrome.storage.local.getBytesInUse()`
3. Clear storage and try again: `chrome.storage.local.clear()`

### Issue: Message Not Being Handled

**Symptom**: Message sent but no response received

**Solutions**:
1. Verify service-worker.js is loaded in background
2. Check that message.action matches handler name
3. Open DevTools on service worker to check for errors
4. Verify response callback is being invoked

### Issue: Data Not Persisting After Reload

**Symptom**: Data set successfully but gone after page reload

**Solutions**:
1. Verify using chrome.storage.local, not window.localStorage
2. Check quota not exceeded: `chrome.storage.local.getBytesInUse()`
3. Ensure async operations complete before reload
4. Check for errors in setItem callback

---

## Sign-Off

**Testing Conducted By**: _________________  
**Date Completed**: _________________  
**Overall Result**: PASS / FAIL / NEEDS REWORK  

**Issues Found**:
- [ ] None - All tests passed
- [ ] Minor - Non-blocking issues only
- [ ] Major - Blocking issues found

**Next Steps**:
- [ ] Ready for Phase 3 development
- [ ] Rework required (list issues above)
- [ ] Documentation updates needed

---

## Appendix: Quick Command Reference

### Common DevTools Console Commands

```javascript
// Clear storage
chrome.storage.local.clear();

// Check current storage
chrome.storage.local.get(null, (data) => console.log(data));

// Check quota
chrome.storage.local.getBytesInUse(null, (bytes) => {
  console.log(`Using ${(bytes/1024).toFixed(2)} KB of 5 MB`);
});

// Export all data
chrome.runtime.sendMessage({ action: 'exportData' }, response => {
  console.log(JSON.stringify(response.data, null, 2));
});

// Validate import
chrome.runtime.sendMessage({
  action: 'validateImportData',
  jsonString: '{ /* your json here */ }'
}, response => {
  console.log('Valid:', response.valid);
  console.log('Errors:', response.errors);
});
```

---

**Phase 2.5: Integration Testing - COMPLETE**
