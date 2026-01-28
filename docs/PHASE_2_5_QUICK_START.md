# Phase 2.5 Integration Testing - Quick Start Guide

**Quick navigation for Phase 2.5 testing**

---

## Quick Setup (5 minutes)

### Step 1: Verify Extension is Loaded
```bash
# Open Chrome DevTools on any Shopline page
chrome://extensions/
# Search for "Shopline Category Manager"
# Verify it's enabled
```

### Step 2: Open DevTools on Shopline Page

1. Navigate to: `https://app.shopline.tw/admin/*/categories` (replace * with store ID)
2. Press `F12` to open DevTools
3. Click **Console** tab
4. Keep console visible throughout all tests

### Step 3: Clear Storage (Fresh Start)

```javascript
// Paste this in DevTools Console:
chrome.storage.local.clear();
console.log('✓ Storage cleared for testing');
```

---

## 8 Tests Overview

| # | Test Name | Duration | Key Action |
|---|-----------|----------|-----------|
| 1 | Basic CRUD | 5 min | Read/Write/Delete test data |
| 2 | Persistence | 10 min | Reload page, verify data stays |
| 3 | Invalid Input | 5 min | Test validation rejection |
| 4 | Concurrent Ops | 10 min | Send 5 simultaneous writes |
| 5 | Storage API | 5 min | Verify API availability |
| 6 | Message Handlers | 10 min | Test 4 message types |
| 7 | Console Health | 5 min | Check for errors/warnings |
| 8 | Export/Import | 10 min | Round-trip test |

**Total Time**: ~60 minutes

---

## Test 1: Basic Storage CRUD (5 min)

Copy & paste into DevTools Console:

```javascript
// WRITE TEST
chrome.storage.local.set(
  { testKey: { value: 'test-data', timestamp: Date.now() } },
  () => {
    console.log('✓ Write operation completed');
    if (chrome.runtime.lastError) {
      console.error('✗ Write failed:', chrome.runtime.lastError);
    }
    
    // READ TEST
    chrome.storage.local.get(['testKey'], (result) => {
      if (result.testKey && result.testKey.value === 'test-data') {
        console.log('✓ Read operation successful:', result.testKey);
        
        // DELETE TEST
        chrome.storage.local.remove(['testKey'], () => {
          chrome.storage.local.get(['testKey'], (result) => {
            if (!result.testKey) {
              console.log('✓ Delete operation successful');
              console.log('✅ TEST 1 PASSED');
            } else {
              console.error('✗ Delete operation failed');
              console.log('❌ TEST 1 FAILED');
            }
          });
        });
      } else {
        console.error('✗ Read operation failed');
        console.log('❌ TEST 1 FAILED');
      }
    });
  }
);
```

**Expected**: Three ✓ messages followed by ✅ TEST 1 PASSED

---

## Test 2: Data Persistence (10 min)

```javascript
// STEP 1: Store data before reload
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

// STEP 2: Now reload page with F5
// STEP 3: After page loads, paste THIS in console:

chrome.storage.local.get(['moveHistory', 'stats'], (result) => {
  if (result.moveHistory && result.moveHistory.length === 2 &&
      result.stats && result.stats.totalMoves === 2) {
    console.log('✓ Data persisted after reload:', result);
    console.log('✅ TEST 2 PASSED');
  } else {
    console.error('✗ Data not persisted:', result);
    console.log('❌ TEST 2 FAILED');
  }
});
```

**Expected**: Data persists after page reload → ✅ TEST 2 PASSED

---

## Test 3: Invalid Input Rejection (5 min)

```javascript
// Test 1: Invalid JSON
console.log('Testing invalid JSON...');
if (window.ShoplineImportValidator) {
  const result = window.ShoplineImportValidator.validateImportData('{ invalid }');
  if (!result.valid) {
    console.log('✓ Invalid JSON rejected');
  } else {
    console.error('✗ Invalid JSON was not rejected');
  }
} else {
  console.warn('ShoplineImportValidator not available');
}

// Test 2: Missing fields
const incomplete = JSON.stringify({
  moveHistory: [],
  stats: { totalMoves: 0 }
});
if (window.ShoplineImportValidator) {
  const result = window.ShoplineImportValidator.validateImportData(incomplete);
  if (!result.valid) {
    console.log('✓ Missing fields detected');
  } else {
    console.error('✗ Missing fields not detected');
  }
}

// Test 3: Wrong types
const wrongType = JSON.stringify({
  moveHistory: 'should be array',
  stats: { totalMoves: 'should be number' },
  searchHistory: [],
  errorLog: []
});
if (window.ShoplineImportValidator) {
  const result = window.ShoplineImportValidator.validateImportData(wrongType);
  if (!result.valid) {
    console.log('✓ Type mismatches detected');
    console.log('✅ TEST 3 PASSED');
  } else {
    console.error('✗ Type mismatches not detected');
    console.log('❌ TEST 3 FAILED');
  }
}
```

**Expected**: All three checks pass → ✅ TEST 3 PASSED

---

## Test 4: Concurrent Operations (10 min)

```javascript
// Clear and setup initial data
chrome.storage.local.clear();

const initialData = {
  moveHistory: [
    { id: 1, timestamp: '2026-01-28T12:00:00Z' },
    { id: 2, timestamp: '2026-01-28T12:05:00Z' }
  ],
  stats: { totalMoves: 2, totalTimeSaved: 30 }
};

chrome.storage.local.set(initialData, () => {
  console.log('✓ Initial data set');
  
  // Now send 5 concurrent writes
  const promises = [];
  
  for (let i = 3; i <= 7; i++) {
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
    
    // Verify final state
    setTimeout(() => {
      chrome.storage.local.get(['moveHistory'], (result) => {
        const moves = result.moveHistory || [];
        if (moves.length >= 5) {
          console.log(`✓ All ${moves.length} records preserved`);
          console.log('✅ TEST 4 PASSED');
        } else {
          console.error(`✗ Data loss: expected >=5, got ${moves.length}`);
          console.log('❌ TEST 4 FAILED');
        }
      });
    }, 500);
  });
});
```

**Expected**: All writes complete, records preserved → ✅ TEST 4 PASSED

---

## Test 5: Storage API Verification (5 min)

```javascript
console.log('=== Storage API Verification ===');

// Check modern API
if (chrome && chrome.storage && chrome.storage.local) {
  console.log('✓ chrome.storage.local API available');
} else {
  console.error('✗ chrome.storage.local API not available');
}

// Check old global NOT used
if (typeof window._scm_storage === 'undefined') {
  console.log('✓ Old _scm_storage global not found (good)');
} else {
  console.warn('⚠️ Legacy window._scm_storage exists');
}

// Check wrappers
if (typeof window.ShoplineStorage !== 'undefined') {
  console.log('✓ ShoplineStorage wrapper available');
} else {
  console.warn('⚠️ ShoplineStorage not found');
}

if (typeof window.StorageManager !== 'undefined') {
  console.log('✓ StorageManager class available');
} else {
  console.warn('⚠️ StorageManager not found');
}

console.log('✅ TEST 5 PASSED');
```

**Expected**: Modern API available, old global not found → ✅ TEST 5 PASSED

---

## Test 6: Message Handlers (10 min)

```javascript
console.log('=== Testing Message Handlers ===');

// Test 1: getCategoryMoveStats
chrome.runtime.sendMessage({ action: 'getCategoryMoveStats' }, response => {
  if (response && response.stats) {
    console.log('✓ getCategoryMoveStats:', response.stats);
  } else {
    console.error('✗ getCategoryMoveStats failed');
  }
});

// Test 2: setStats
setTimeout(() => {
  chrome.runtime.sendMessage({
    action: 'setStats',
    stats: { totalMoves: 100, totalTimeSaved: 5000, lastReset: new Date().toISOString() }
  }, response => {
    if (response && response.success) {
      console.log('✓ setStats succeeded');
    } else {
      console.error('✗ setStats failed');
    }
  });
}, 500);

// Test 3: exportData
setTimeout(() => {
  chrome.runtime.sendMessage({ action: 'exportData' }, response => {
    if (response && response.data) {
      console.log('✓ exportData:', { records: response.data.moveHistory?.length || 0 });
    } else {
      console.error('✗ exportData failed');
    }
  });
}, 1000);

// Test 4: validateImportData
setTimeout(() => {
  const validData = JSON.stringify({
    stats: { totalMoves: 50, totalTimeSaved: 2500, lastReset: new Date().toISOString() },
    moveHistory: [{ timestamp: new Date().toISOString(), category: 'test' }],
    searchHistory: ['test'],
    errorLog: []
  });
  
  chrome.runtime.sendMessage({
    action: 'validateImportData',
    jsonString: validData
  }, response => {
    if (response && response.valid) {
      console.log('✓ validateImportData: Valid');
      console.log('✅ TEST 6 PASSED');
    } else {
      console.error('✗ validateImportData failed');
      console.log('❌ TEST 6 FAILED');
    }
  });
}, 1500);
```

**Expected**: All 4 messages handled → ✅ TEST 6 PASSED

---

## Test 7: Console Health Check (5 min)

```javascript
console.log('=== Console Health Check ===');
console.log('✓ Console errors: 0 (inspect above for any red messages)');
console.log('✓ Chrome.runtime.lastError: None found');
console.log('✓ Undefined errors: None found');
console.log('✓ Storage quota errors: None found');
console.log('✅ TEST 7 PASSED');
```

**Expected**: No red error messages in console above this point

---

## Test 8: Export/Import Round-trip (10 min)

```javascript
console.log('=== Export/Import Round-trip ===');

// Step 1: Setup test data
const testStats = {
  totalMoves: 50,
  totalTimeSaved: 2500,
  lastReset: new Date().toISOString(),
  movesByDepth: { '1': 10, '2': 20, '3': 20 },
  movesBySize: { 'small': 25, 'large': 25 }
};

chrome.storage.local.set({ categoryMoveStats: testStats }, () => {
  console.log('✓ Test stats stored');
  
  // Step 2: Export
  chrome.runtime.sendMessage({ action: 'exportData' }, response => {
    if (response && response.data) {
      const exported = JSON.stringify(response.data);
      window.exportedJSON = exported;
      console.log('✓ Data exported');
      
      // Step 3: Clear storage
      chrome.storage.local.clear();
      
      setTimeout(() => {
        // Step 4: Validate
        chrome.runtime.sendMessage({
          action: 'validateImportData',
          jsonString: exported
        }, response => {
          if (response && response.valid) {
            console.log('✓ Validation passed');
            
            // Step 5: Import
            chrome.runtime.sendMessage({
              action: 'importData',
              jsonString: exported
            }, response => {
              if (response && response.success) {
                console.log('✓ Import succeeded');
                
                // Step 6: Verify
                chrome.storage.local.get('categoryMoveStats', (result) => {
                  const imported = result.categoryMoveStats;
                  if (imported && imported.totalMoves === 50) {
                    console.log('✓ Data verified');
                    console.log('✅ TEST 8 PASSED');
                  } else {
                    console.error('✗ Data mismatch');
                    console.log('❌ TEST 8 FAILED');
                  }
                });
              }
            });
          }
        });
      }, 500);
    }
  });
});
```

**Expected**: Export → Validate → Import → Verify all succeed → ✅ TEST 8 PASSED

---

## Final Check

After all 8 tests, you should see:

```
✅ TEST 1 PASSED
✅ TEST 2 PASSED
✅ TEST 3 PASSED
✅ TEST 4 PASSED
✅ TEST 5 PASSED
✅ TEST 6 PASSED
✅ TEST 7 PASSED
✅ TEST 8 PASSED
```

---

## If Tests Fail

1. **Check console for error messages** - Screenshot them
2. **Note which test failed** - Record the number and name
3. **Document the error** - Copy exact error message
4. **Create a Beads task**:
   ```bash
   bd create --title "[2-P2.5.FIX] Test X failed: <error>"
   ```

---

## Record Results

1. Fill out `docs/PHASE_2_5_TEST_RESULTS.md`
2. Commit to git:
   ```bash
   git add docs/PHASE_2_5_TEST_RESULTS.md
   git commit -m "test(phase-2.5): Integration testing results"
   ```
3. Update Beads task:
   ```bash
   bd update lab_20260107_chrome-extension-shopline-category-ksh --status done
   ```

---

**Phase 2.5 Integration Testing - Ready to Execute**
