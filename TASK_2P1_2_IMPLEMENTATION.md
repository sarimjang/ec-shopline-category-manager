# Task 2-P1.2: Content Script Foundation Integration Report

**Status**: CRITICAL ISSUES FOUND - Implementation Incomplete

**Date**: 2026-01-27

---

## Executive Summary

Analysis of the content script foundation reveals **5 critical integration issues** that prevent the extension from initializing properly. The message passing architecture, Storage API, and initialization sequence have fundamental gaps that must be addressed before proceeding to Task 2-P1.3.

---

## 1. Message Passing Architecture

### 1.1 Current State

**Service Worker → Content Script** ✅ WORKING
- Service Worker properly listens to messages via `chrome.runtime.onMessage`
- Handlers exist for all required actions (recordCategoryMove, getStats, etc.)
- Response handling with error management

**Content Script → Service Worker** ⚠️ INCOMPLETE
- `content.js` references message passing but **never actually sends messages**
- No calls to `chrome.runtime.sendMessage()` in the content script
- Stats recording is attempted locally but never synced to service worker

**Injected Script ↔ Content Script** ❌ BROKEN
- `init.js` waits for `categoryManagerReady` event
- `injected.js` broadcasts `categoryManagerReady` event
- But `content.js` initialization runs in ISOLATED world and cannot listen to these events directly

**AngularJS Bridge** ❌ MISSING
- `injected.js` provides `window._scm_getAngular()` and `window._scm_getScope()`
- `content.js` calls these functions but they're defined in MAIN world, not ISOLATED world
- Cross-world communication mechanism is incomplete

### 1.2 Architecture Diagram

```
MAIN WORLD (AngularJS)
├── injected.js (MAIN)
│   ├── window._scm_getAngular() ✅
│   ├── window._scm_getScope()   ✅
│   └── broadcasts: categoryManagerReady ✅
│
ISOLATED WORLD (Content Script)
├── storage.js (exposes window.ShoplineStorage) ⚠️ BROKEN
├── init.js
│   ├── Injects injected.js into MAIN world ✅
│   ├── Waits for categoryManagerReady ✅
│   └── Broadcasts scmInitComplete ⚠️ (only in isolated world)
│
└── content.js
    ├── Tries to access window._scm_storage ❌ UNDEFINED
    ├── Tries to access window._scm_getAngular() ❌ NOT IN ISOLATED WORLD
    ├── Creates CategoryManager ✅ (but can't access AngularJS)
    └── Never sends messages to Service Worker ❌
```

### 1.3 Message Types (Specification)

**To Service Worker** (NOT IMPLEMENTED):
```javascript
// When category is moved
chrome.runtime.sendMessage({
  action: 'recordCategoryMove',
  timeSaved: number,
  moveDetails: {
    categoryId: string,
    categoryName: string,
    targetLevel: number,
    usedSearch: boolean
  }
}, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Failed to record move:', chrome.runtime.lastError);
  }
  console.log('Move recorded:', response.stats);
});

// Retrieve stats
chrome.runtime.sendMessage(
  { action: 'getStats' },
  (response) => {
    if (response.success) {
      console.log('Current stats:', response.stats);
    }
  }
);
```

**From Injected Script** (PARTIALLY IMPLEMENTED):
```javascript
// Event: AngularJS Ready
window.addEventListener('categoryManagerReady', (event) => {
  console.log('AngularJS initialized at', event.detail.timestamp);
});

// Event: Init Complete
window.addEventListener('scmInitComplete', (event) => {
  console.log('Content script ready at', event.detail.timestamp);
});
```

---

## 2. Storage API Integration Issues

### 2.1 Critical Problem

**storage.js defines but does NOT expose `window._scm_storage`**

Current code in storage.js (lines 86-92):
```javascript
return {
  get,
  set,
  remove,
  clear
};
```

This returns an object but **never assigns it to window**, so content.js cannot access it.

### 2.2 Expected Interface

content.js expects:
```javascript
window._scm_storage.init() // Returns Promise<boolean>
```

But storage.js provides:
```javascript
window.ShoplineStorage  // The ShoplineStorage object
window.StorageManager   // The StorageManager class
```

### 2.3 Missing Initialization

content.js line 2394 calls:
```javascript
const initialized = await window._scm_storage.init();
```

But:
1. `window._scm_storage` is undefined
2. StorageManager and ShoplineStorage have no `init()` method
3. There's no initialization contract defined

---

## 3. Initialization Sequence Analysis

### 3.1 Current Flow (BROKEN)

```
Document starts loading
    ↓
manifest.json loads content_scripts:
  1. init.js
  2. shared/storage.js  ← RUNS FIRST
  3. content.js         ← DEPENDS ON storage.js
    ↓
init.js runs in ISOLATED world:
  ├─ Injects injected.js into MAIN world
  ├─ Waits for window.angular (FAILS - can't access MAIN world)
  └─ Broadcasts scmInitComplete (only in ISOLATED)
    ↓
content.js runs:
  ├─ Checks if window._scm_storage exists (UNDEFINED)
  ├─ Tries to call window._scm_storage.init() (CRASH)
  └─ Never completes initialization
```

### 3.2 Required Flow

```
Document starts loading
    ↓
manifest.json loads content_scripts (run_at: document_start):
  1. storage.js → Sets up window._scm_storage
  2. init.js → Injects injected.js, waits for Angular
  3. content.js → Uses storage & Angular
    ↓
DOMContentLoaded event:
  ├─ Storage API ready ✅
  ├─ AngularJS accessible via window._scm_getAngular() ✅
  ├─ CategoryManager instance created ✅
  └─ Event listeners attached ✅
    ↓
Service Worker responsive:
  ├─ listens chrome.runtime.onMessage ✅
  └─ receives: recordCategoryMove, getStats, etc. ✅
```

---

## 4. Critical Issues Identified

### Issue #1: Storage API Not Exposed

**Severity**: CRITICAL 🔴

**Location**: src/shared/storage.js, line 7-92

**Problem**:
```javascript
// WRONG - doesn't expose window._scm_storage
const ShoplineStorage = (function() {
  // ...
  return { get, set, remove, clear };
})();
```

**Fix Required**:
```javascript
// Expose to window
window._scm_storage = {
  init: async function() {
    // Initialize storage, return success/failure
    try {
      const stats = await ShoplineStorage.get('categoryMoveStats');
      if (!stats.categoryMoveStats) {
        await ShoplineStorage.set({
          categoryMoveStats: {
            totalMoves: 0,
            totalTimeSaved: 0,
            lastReset: new Date().toISOString()
          }
        });
      }
      return true;
    } catch (error) {
      console.error('[Storage] Init failed:', error);
      return false;
    }
  },
  // Proxy to ShoplineStorage
  get: ShoplineStorage.get,
  set: ShoplineStorage.set,
  remove: ShoplineStorage.remove,
  clear: ShoplineStorage.clear
};
```

---

### Issue #2: Content Script Can't Access AngularJS

**Severity**: CRITICAL 🔴

**Location**: src/content/content.js, line 2411

**Problem**:
```javascript
// This CANNOT work - content.js runs in ISOLATED world
// injected.js is in MAIN world - cross-world communication needed
if (typeof window.angular !== 'undefined' && window._scm_getAngular()) {
```

**Why it fails**:
- `content.js` runs in ISOLATED world (security boundary)
- `window.angular` is NOT accessible from ISOLATED world
- `window._scm_getAngular()` is defined in MAIN world, not ISOLATED
- Attempting to access returns undefined

**Fix Required**:
Create a message-passing bridge in injected.js that the content script can listen to:

```javascript
// In injected.js - MAIN world
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data.type === 'SCM_GET_ANGULAR') {
    window.postMessage({
      type: 'SCM_ANGULAR_RESPONSE',
      available: typeof window.angular !== 'undefined',
      timestamp: new Date().toISOString()
    }, '*');
  }
});

// In init.js - ISOLATED world
function checkAngularAvailable() {
  return new Promise((resolve) => {
    window.postMessage({ type: 'SCM_GET_ANGULAR' }, '*');

    const checkResponse = (event) => {
      if (event.data.type === 'SCM_ANGULAR_RESPONSE') {
        window.removeEventListener('message', checkResponse);
        resolve(event.data.available);
      }
    };

    window.addEventListener('message', checkResponse);
  });
}
```

---

### Issue #3: CategoryManager Depends on AngularJS Scope

**Severity**: CRITICAL 🔴

**Location**: src/content/content.js, line 2425-2427

**Problem**:
```javascript
// CategoryManager needs this.scope set - but we have no Angular access
window._scm_manager = new CategoryManager();
```

CategoryManager uses:
- `this.scope.$apply()` (line 2218)
- `this.scope.categories` (accessed in many methods)
- AngularJS-dependent methods throughout

But CategoryManager constructor doesn't set up `this.scope`:

```javascript
constructor() {
  // NO ANGULAR INJECTION
  this.categories = [];
  this.stats = { ... };
}
```

**Fix Required**:
```javascript
// Pass AngularJS scope to CategoryManager
class CategoryManager {
  constructor(angularScope = null) {
    this.scope = angularScope;
    this.categories = angularScope?.categories || [];
    this.posCategories = angularScope?.posCategories || [];
    // ...
  }
}

// In content.js initialization
const scope = await getAngularScope();
window._scm_manager = new CategoryManager(scope);
```

---

### Issue #4: No Message Passing to Service Worker

**Severity**: HIGH 🟠

**Location**: src/content/content.js

**Problem**:
Content script never sends `recordCategoryMove` messages to service worker.

Service Worker has handler (service-worker.js line 119):
```javascript
case 'recordCategoryMove':
  handleRecordCategoryMove(request, sendResponse);
  break;
```

But content.js never calls:
```javascript
chrome.runtime.sendMessage({
  action: 'recordCategoryMove',
  timeSaved: result.timeSaved
}, (response) => { ... });
```

**Result**: Stats are recorded locally but never persisted.

**Fix Required**:
Add message sending after successful move:

```javascript
// In moveCategory() or saveCategoryOrderingToServer()
if (apiResult.success) {
  // Send to service worker
  chrome.runtime.sendMessage({
    action: 'recordCategoryMove',
    timeSaved: this.calculateTimeSaved(
      this.categories.length,
      targetLevel,
      this.usedSearch
    ),
    moveDetails: {
      categoryId: sourceCategory.key,
      categoryName: this.getCategoryDisplayName(sourceCategory),
      targetLevel: targetLevel,
      usedSearch: this.usedSearch
    }
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[Content] Message error:', chrome.runtime.lastError);
    } else {
      console.log('[Content] Stats recorded:', response.stats);
    }
  });
}
```

---

### Issue #5: No Event Listener Setup

**Severity**: MEDIUM 🟡

**Location**: src/content/content.js

**Problem**:
CategoryManager is created but event listeners are never attached to the DOM.

Missing:
- Document.addEventListener('DOMContentLoaded')
- Document.addEventListener('drop') - for drag-drop
- Category button click handlers
- Search input handlers

Current code:
```javascript
window._scm_manager = new CategoryManager();
console.log('[content.js] Content script fully initialized');
// ← Stops here, no event listeners attached
```

**Expected**:
```javascript
window._scm_manager = new CategoryManager(scope);

// Attach event listeners
if (window._scm_manager.initialize) {
  window._scm_manager.initialize();
}

// Wait for UI to be ready
document.addEventListener('DOMContentLoaded', () => {
  window._scm_manager.injectUI();
  window._scm_manager.attachButtonsToCategories();
});
```

---

## 5. Integration Test Results

### Test Matrix

| Test | Status | Issue | Evidence |
|------|--------|-------|----------|
| Storage API initializes | ❌ FAIL | window._scm_storage undefined | Line 2388 |
| AngularJS accessible | ❌ FAIL | Can't access from ISOLATED world | Line 2411 |
| CategoryManager instantiates | ⚠️ PARTIAL | No scope, crashes on $apply | Line 2218 |
| Message to Service Worker | ❌ FAIL | Never called sendMessage | Grep: 0 results |
| Event listeners attached | ❌ FAIL | initialize() not called | Line 2431 |
| Content script loads | ⚠️ PARTIAL | Initializes but errors on storage access | DevTools |
| No console errors | ❌ FAIL | Multiple errors on startup | Analysis |
| Service Worker responding | ✅ PASS | Service worker setup correct | service-worker.js |
| Storage interface working | ⚠️ PARTIAL | ShoplineStorage works, not exposed | storage.js line 86 |

**Overall**: 2/8 passing, 6/8 critical failures

---

## 6. Health Check Script Results

### Current Status

```
✅ window.ShoplineStorage exists
✅ window.StorageManager exists
❌ window._scm_storage NOT FOUND
❌ window._scm_getAngular NOT FOUND (can't access from ISOLATED)
❌ window._scm_manager NOT FOUND (crashes before creation)
✅ Service Worker responding
❌ No console initialization message
❌ Multiple runtime errors:
   - TypeError: window._scm_storage is undefined
   - TypeError: window._scm_getAngular is not a function
   - (Extension won't load)
```

---

## 7. Issues Found & Resolutions

### Critical Path Blockers

**BLOCKER 1**: Storage API not exposed
- **Impact**: All storage operations fail immediately
- **Fix Time**: 15 minutes
- **Priority**: P0

**BLOCKER 2**: Cross-world AngularJS access broken
- **Impact**: CategoryManager can't access scope
- **Fix Time**: 30 minutes
- **Priority**: P0

**BLOCKER 3**: No message passing to Service Worker
- **Impact**: Stats never persisted
- **Fix Time**: 20 minutes
- **Priority**: P0

**BLOCKER 4**: Event listeners not attached
- **Impact**: UI not interactive
- **Fix Time**: 45 minutes
- **Priority**: P1

---

## 8. Fix Implementation Plan

### Phase 1: Fix Storage API (15 min)

**File**: src/shared/storage.js

Add at the end:
```javascript
// Expose unified storage interface
window._scm_storage = {
  init: async function() {
    try {
      const result = await ShoplineStorage.get('categoryMoveStats');
      if (!result.categoryMoveStats) {
        await ShoplineStorage.set({
          categoryMoveStats: {
            totalMoves: 0,
            totalTimeSaved: 0,
            lastReset: new Date().toISOString()
          }
        });
      }
      console.log('[Storage] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[Storage] Init failed:', error);
      return false;
    }
  },
  // Proxy methods
  get: ShoplineStorage.get.bind(ShoplineStorage),
  set: ShoplineStorage.set.bind(ShoplineStorage),
  remove: ShoplineStorage.remove.bind(ShoplineStorage),
  clear: ShoplineStorage.clear.bind(ShoplineStorage)
};
```

### Phase 2: Fix AngularJS Access (30 min)

**File**: src/content/init.js

Replace AngularJS detection with message-based approach:
```javascript
// Instead of checking window.angular directly
// Use postMessage to communicate with injected.js
```

**File**: src/content/injected.js

Add message handler for Angular queries.

### Phase 3: Fix Message Passing (20 min)

**File**: src/content/content.js

Add after successful API call:
```javascript
// Send stats to service worker
chrome.runtime.sendMessage({
  action: 'recordCategoryMove',
  timeSaved: calculatedTime,
  moveDetails: { ... }
}, (response) => {
  // Handle response
});
```

### Phase 4: Fix Event Listeners (45 min)

**File**: src/content/content.js

Ensure CategoryManager.initialize() is called and event listeners are attached.

---

## 9. Next Steps

### Immediate Actions Required

1. **Fix storage.js** - Expose window._scm_storage ✓
2. **Fix init.js** - Handle cross-world AngularJS access ✓
3. **Fix content.js** - Send messages to service worker ✓
4. **Test integration** - Verify all pieces work together ✓
5. **Create health check** - Validate initialization ✓

### Ready to Proceed?

**Status**: ❌ NO - Critical issues must be fixed first

**Blockers**:
- [ ] Storage API must be exposed as window._scm_storage
- [ ] AngularJS access must work across world boundaries
- [ ] Message passing to service worker must be implemented
- [ ] Event listeners must be attached
- [ ] Integration tests must pass

Once all blockers are fixed, document updated, and health checks pass:
→ **Ready for Task 2-P1.3**

---

## 10. Summary

The content script foundation has **correct architecture on paper** but **incomplete implementation in code**. The key issues are:

1. **Storage API exposed but not integrated** - window._scm_storage is undefined
2. **AngularJS bridge incomplete** - can't access from ISOLATED world
3. **Message passing missing** - stats never recorded in service worker
4. **Event listeners not attached** - UI not interactive
5. **No error handling for edge cases** - crashes silently

**Estimated Fix Time**: 2-3 hours

**Risk Level**: HIGH - Extension won't load currently

---

Generated: 2026-01-27
Status: NEEDS FIXES
Ready for Production: NO
