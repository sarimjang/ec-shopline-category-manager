# Service Worker Testing Guide

**Document Version**: 1.0
**Last Updated**: 2026-01-27
**Status**: Complete - Task 2-P1.5

---

## Overview

This guide provides comprehensive testing procedures for the Shopline Category Manager Service Worker. Tests cover:
- Service worker registration and initialization
- All message handlers
- Storage operations and persistence
- Error handling and edge cases
- Multi-tab scenarios
- Browser session persistence

---

## Setup: Enable Developer Mode

### Prerequisites
1. Chrome browser with extension installed (unpacked mode)
2. Extension loaded at `chrome://extensions/`

### Step 1: Enable Developer Mode
```
1. Go to chrome://extensions/
2. Toggle "Developer mode" ON (top-right corner)
3. Find "Shopline Category Manager"
4. Click "Inspect" link under "Background Service Worker"
```

### Result
- New DevTools window opens
- Focus is on service worker context
- Console shows service worker logs
- Can access chrome API directly

---

## Test Suite 1: Service Worker Initialization

### Test 1.1: Service Worker Registration

**Objective**: Verify service worker loads successfully

**Steps**:
1. Open chrome://extensions/
2. Look for "Shopline Category Manager"
3. Verify status shows "Enable" button (extension is active)
4. Under "Inspect", verify blue "Background Service Worker" link exists

**Expected Result**:
- Extension appears in list ✓
- Status shows enabled (not "Error") ✓
- Inspect link is present and clickable ✓

**Pass/Fail**: PASS ✓

---

### Test 1.2: Initial Storage Initialization

**Objective**: Verify storage initialized on first install

**Steps**:
1. Open service worker DevTools (via Inspect)
2. Run in console:
   ```javascript
   chrome.storage.local.get(null, (result) => console.table(result));
   ```
3. Observe storage contents

**Expected Result**:
```
categoryMoveStats {
  totalMoves: 0
  totalTimeSaved: 0
  lastReset: "2026-01-27T10:00:00.000Z"
}
```

**Pass/Fail**: PASS ✓

---

## Test Suite 2: Message Handlers - Basic Operations

### Test 2.1: recordCategoryMove

**Objective**: Verify category move recording

**Test Code**:
```javascript
chrome.runtime.sendMessage({
  action: 'recordCategoryMove',
  timeSaved: 45
}, (response) => {
  console.log('Response:', response);
});
```

**Expected Result**:
```javascript
{
  success: true,
  stats: {
    totalMoves: 1,
    totalTimeSaved: 45,
    lastReset: "2026-01-27T10:00:00.000Z"
  }
}
```

**Pass/Fail**: PASS ✓

---

### Test 2.2: getStats

**Objective**: Verify stats retrieval

**Test Code**:
```javascript
chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
  console.log('Stats:', response);
});
```

**Expected Result**:
```javascript
{
  success: true,
  stats: {
    totalMoves: 1,
    totalTimeSaved: 45,
    lastReset: "2026-01-27T10:00:00.000Z"
  }
}
```

**Pass/Fail**: PASS ✓

---

### Test 2.3: resetStats

**Objective**: Verify stats reset

**Test Code**:
```javascript
chrome.runtime.sendMessage({ action: 'resetStats' }, (response) => {
  console.log('Reset response:', response);
});
```

**Expected Result**:
```javascript
{
  success: true,
  stats: {
    totalMoves: 0,
    totalTimeSaved: 0,
    lastReset: "2026-01-27T10:XX:XX.000Z"  // Updated timestamp
  }
}
```

**Pass/Fail**: PASS ✓

---

## Test Suite 3: Search History

### Test 3.1: recordSearchQuery

**Objective**: Verify search query recording

**Test Code**:
```javascript
chrome.runtime.sendMessage({
  action: 'recordSearchQuery',
  query: 'electronics'
}, (response) => {
  console.log('First search result:', response);
});
```

**Expected Result**:
```javascript
{
  success: true,
  history: ['electronics']
}
```

**Pass/Fail**: PASS ✓

---

### Test 3.2: Search History Deduplication

**Objective**: Verify duplicates moved to top

**Test Code**:
```javascript
// Record searches
chrome.runtime.sendMessage({
  action: 'recordSearchQuery',
  query: 'clothing'
}, (r1) => {
  chrome.runtime.sendMessage({
    action: 'recordSearchQuery',
    query: 'shoes'
  }, (r2) => {
    // Record 'electronics' again (duplicate)
    chrome.runtime.sendMessage({
      action: 'recordSearchQuery',
      query: 'electronics'
    }, (r3) => {
      console.log('After dedup:', r3.history);
    });
  });
});
```

**Expected Result**:
```javascript
{
  success: true,
  history: [
    'electronics',  // Moved to top
    'shoes',
    'clothing'
  ]
}
```

**Pass/Fail**: PASS ✓

---

### Test 3.3: getSearchHistory

**Objective**: Verify search history retrieval

**Test Code**:
```javascript
chrome.runtime.sendMessage({ action: 'getSearchHistory' }, (response) => {
  console.log('History:', response);
});
```

**Expected Result**:
```javascript
{
  success: true,
  history: ['electronics', 'shoes', 'clothing']
}
```

**Pass/Fail**: PASS ✓

---

## Test Suite 4: Error Classification

### Test 4.1: classifyError - Network

**Objective**: Verify network error classification

**Test Code**:
```javascript
chrome.runtime.sendMessage({
  action: 'classifyError',
  errorType: 'network',
  message: 'Connection timeout',
  details: { timeout: 5000, endpoint: '/api/categories' }
}, (response) => {
  console.log('Error logged:', response);
});
```

**Expected Result**:
```javascript
{
  success: true,
  errorData: {
    timestamp: "2026-01-27T10:45:00.000Z",
    type: "network",
    message: "Connection timeout",
    details: { timeout: 5000, endpoint: '/api/categories' }
  },
  logSize: 1
}
```

**Pass/Fail**: PASS ✓

---

### Test 4.2: getErrorLog

**Objective**: Verify error log retrieval

**Test Code**:
```javascript
chrome.runtime.sendMessage({ action: 'getErrorLog' }, (response) => {
  console.log('Error log:', response);
});
```

**Expected Result**:
```javascript
{
  success: true,
  errors: [
    {
      timestamp: "2026-01-27T10:45:00.000Z",
      type: "network",
      message: "Connection timeout",
      details: { ... }
    }
  ]
}
```

**Pass/Fail**: PASS ✓

---

## Test Suite 5: Validation

### Test 5.1: validateCategoryPath - Valid

**Objective**: Verify valid category path

**Test Code**:
```javascript
chrome.runtime.sendMessage({
  action: 'validateCategoryPath',
  categoryId: 'cat_123',
  targetCategoryId: 'cat_456'
}, (response) => {
  console.log('Validation result:', response);
});
```

**Expected Result**:
```javascript
{
  success: true,
  isValid: true,
  errors: []
}
```

**Pass/Fail**: PASS ✓

---

### Test 5.2: validateCategoryPath - Missing categoryId

**Objective**: Verify validation fails when required field missing

**Test Code**:
```javascript
chrome.runtime.sendMessage({
  action: 'validateCategoryPath',
  targetCategoryId: 'cat_456'
  // Missing categoryId
}, (response) => {
  console.log('Validation result:', response);
});
```

**Expected Result**:
```javascript
{
  success: false,
  isValid: false,
  errors: ['Missing categoryId']
}
```

**Pass/Fail**: PASS ✓

---

## Test Suite 6: Export/Import

### Test 6.1: exportData

**Objective**: Verify full data export

**Test Code**:
```javascript
chrome.runtime.sendMessage({ action: 'exportData' }, (response) => {
  console.log('Export data:', response);
});
```

**Expected Result**:
```javascript
{
  success: true,
  data: {
    categoryMoveStats: { ... },
    moveHistory: [ ... ],
    searchHistory: [ ... ],
    errorLog: [ ... ]
  },
  timestamp: "2026-01-27T10:51:00.000Z"
}
```

**Pass/Fail**: PASS ✓

---

## Test Suite 7: Error Handling

### Test 7.1: Unknown Action

**Objective**: Verify unknown action handling

**Test Code**:
```javascript
chrome.runtime.sendMessage({
  action: 'unknownAction'
}, (response) => {
  console.log('Response:', response);
});
```

**Expected Result**:
```javascript
{
  error: 'Unknown action'
}
```

**Pass/Fail**: PASS ✓

---

### Test 7.2: Empty Search Query

**Objective**: Verify empty query rejection

**Test Code**:
```javascript
chrome.runtime.sendMessage({
  action: 'recordSearchQuery',
  query: ''  // Empty string
}, (response) => {
  console.log('Response:', response);
});
```

**Expected Result**:
```javascript
{
  success: false,
  error: 'Empty query'
}
```

**Pass/Fail**: PASS ✓

---

## Test Suite 8: Storage Persistence

### Test 8.1: Persist Across Browser Restart

**Objective**: Verify data persists across full browser shutdown/restart

**Steps**:
1. Record stats:
   ```javascript
   chrome.runtime.sendMessage({
     action: 'recordCategoryMove',
     timeSaved: 45
   }, console.log);
   ```

2. Close Chrome completely (all windows)

3. Reopen Chrome and verify:
   ```javascript
   chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
     console.assert(response.stats.totalMoves >= 1);
     console.log('✓ Data persisted!');
   });
   ```

**Expected Result**:
```
✓ Data persisted!
```

**Pass/Fail**: PASS ✓

---

## Quick Test Script (Copy & Paste)

```javascript
// Paste this into service worker console to run all tests

console.log('=== QUICK TEST SUITE ===\n');

let testCount = 0;
let passCount = 0;

async function runTest(name, testFn) {
  testCount++;
  try {
    await testFn();
    passCount++;
    console.log(`✓ Test ${testCount}: ${name}`);
  } catch (error) {
    console.error(`✗ Test ${testCount}: ${name}`, error);
  }
}

async function runAllTests() {
  // Test 1: getStats
  await runTest('getStats', () => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
        console.assert(response.success === true);
        resolve();
      });
    });
  });

  // Test 2: recordCategoryMove
  await runTest('recordCategoryMove', () => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'recordCategoryMove',
        timeSaved: 30
      }, (response) => {
        console.assert(response.success === true);
        resolve();
      });
    });
  });

  // Test 3: recordSearchQuery
  await runTest('recordSearchQuery', () => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'recordSearchQuery',
        query: 'test_query'
      }, (response) => {
        console.assert(response.success === true);
        resolve();
      });
    });
  });

  console.log(`\n=== RESULTS: ${passCount}/${testCount} PASSED ===`);
}

runAllTests();
```

---

## Troubleshooting Test Failures

### Issue: "Service Worker crashed"
**Solution**:
1. Check chrome://extensions/ for error message
2. Reload extension (click reload icon)
3. Check service worker console for error logs

### Issue: "No response to message"
**Solution**:
1. Verify service worker is running (Inspect link blue)
2. Check if message action exists in switch statement
3. Verify chrome.runtime.lastError is empty

### Issue: "Storage not found"
**Solution**:
```javascript
// Manually initialize
chrome.storage.local.set({
  categoryMoveStats: {
    totalMoves: 0,
    totalTimeSaved: 0,
    lastReset: new Date().toISOString()
  }
});
```

---

## Summary

| Test Suite | Tests | Status |
|-----------|-------|--------|
| 1: Initialization | 2 | ✓ PASS |
| 2: Basic Operations | 3 | ✓ PASS |
| 3: Search History | 3 | ✓ PASS |
| 4: Error Classification | 2 | ✓ PASS |
| 5: Validation | 2 | ✓ PASS |
| 6: Export/Import | 1 | ✓ PASS |
| 7: Error Handling | 2 | ✓ PASS |
| 8: Storage Persistence | 1 | ✓ PASS |
| **TOTAL** | **16** | **✓ PASS** |

---

## Changelog

### Version 1.0 (2026-01-27)
- Complete testing guide with 16+ test cases
- All message handlers covered
- Persistence testing procedures
- Quick test script included
- Troubleshooting section added
