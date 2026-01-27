# Content Script Integration - Critical Issues Summary

## Quick Reference

### Status: 🔴 BLOCKED - 5 Critical Issues Found

| Issue | Severity | File | Line | Impact |
|-------|----------|------|------|--------|
| Storage API Not Exposed | 🔴 P0 | storage.js | 7-92 | Extension won't initialize |
| AngularJS Access Broken | 🔴 P0 | init.js + content.js | 2411 | Cannot access scope |
| CategoryManager No Scope | 🔴 P0 | content.js | 2425 | Crashes on $apply() |
| No Message Passing | 🟠 P1 | content.js | - | Stats not recorded |
| Event Listeners Missing | 🟡 P2 | content.js | 2431 | UI not interactive |

---

## The 5 Critical Issues

### 1️⃣ Storage API Not Exposed to Window

**The Problem**:
```javascript
// storage.js currently does this:
const ShoplineStorage = (function() {
  return { get, set, remove, clear };  // ← Returned but NOT exposed
})();

// Result: window._scm_storage is UNDEFINED
// Expected: window._scm_storage should be an object with init() method
```

**Where It Breaks**:
```javascript
// content.js line 2388-2394
if (!window._scm_storage) {
  console.error('[content.js] Storage API not available');  // ← THIS ERROR
  return;
}

const initialized = await window._scm_storage.init();  // ← CRASHES HERE
```

**The Fix** (5 lines needed):
```javascript
// At end of storage.js, expose window._scm_storage
window._scm_storage = {
  init: async function() { /* ... */ },
  get: ShoplineStorage.get.bind(ShoplineStorage),
  set: ShoplineStorage.set.bind(ShoplineStorage),
  // ...
};
```

**Status**: ❌ NOT FIXED

---

### 2️⃣ AngularJS Access Broken (Cross-World Boundary)

**The Problem**:

```
MAIN WORLD (AngularJS Lives Here)
  └─ injected.js defines window._scm_getAngular()

ISOLATED WORLD (Content Script Lives Here)
  └─ content.js tries to call window._scm_getAngular()
     ↓
     FAILS: Can't cross the security boundary!
```

**Where It Breaks**:
```javascript
// content.js line 2411
while (!angularReady && attempts < maxAttempts) {
  if (typeof window.angular !== 'undefined' && window._scm_getAngular()) {
    // ↑ Both of these are UNDEFINED in ISOLATED world
    angularReady = true;
  }
}
```

**Why It Fails**:
- `window.angular` doesn't exist in ISOLATED world
- `window._scm_getAngular()` is defined in MAIN world, unreachable from ISOLATED
- Security sandbox prevents direct access

**The Fix** (needs messaging bridge):
```javascript
// In injected.js (MAIN world)
window.addEventListener('message', (event) => {
  if (event.data.type === 'SCM_GET_ANGULAR') {
    window.postMessage({
      type: 'SCM_ANGULAR_RESPONSE',
      available: typeof window.angular !== 'undefined'
    }, '*');
  }
});

// In init.js (ISOLATED world)
function checkAngularAvailable() {
  return new Promise((resolve) => {
    window.postMessage({ type: 'SCM_GET_ANGULAR' }, '*');

    const handler = (event) => {
      if (event.data.type === 'SCM_ANGULAR_RESPONSE') {
        window.removeEventListener('message', handler);
        resolve(event.data.available);
      }
    };
    window.addEventListener('message', handler);
  });
}
```

**Status**: ❌ NOT FIXED

---

### 3️⃣ CategoryManager No AngularJS Scope

**The Problem**:

```javascript
// content.js line 2425-2427
window._scm_manager = new CategoryManager();  // ← No scope passed!
```

CategoryManager expects scope but doesn't get it:
```javascript
// What CategoryManager needs
this.scope.categories       // ← undefined
this.scope.$apply()         // ← undefined (crashes)
this.scope.$rootScope       // ← undefined
```

**Where It Breaks**:
```javascript
// In CategoryManager.moveCategoryUsingScope() line 2218
if (this.scope.$apply) {
  this.scope.$apply();      // ← CRASH: this.scope is undefined
}
```

**The Fix**:
```javascript
// In content.js initialization
const scope = await getAngularScope();  // Need to implement this
window._scm_manager = new CategoryManager(scope);

// Update CategoryManager constructor
constructor(scope = null) {
  this.scope = scope;
  this.categories = scope?.categories || [];
  // ...
}
```

**Status**: ❌ NOT FIXED

---

### 4️⃣ No Message Passing to Service Worker

**The Problem**:

Service Worker is ready to receive:
```javascript
// service-worker.js line 119-121
case 'recordCategoryMove':
  handleRecordCategoryMove(request, sendResponse);
  break;
```

But content.js never sends it:
```bash
$ grep -n "chrome.runtime.sendMessage" src/content/content.js
# Result: 0 matches ← NOTHING!
```

**Result**:
- Stats are calculated but never recorded
- Service Worker stats stay at 0
- Popup shows no data

**The Fix**:

After successful move, add:
```javascript
chrome.runtime.sendMessage({
  action: 'recordCategoryMove',
  timeSaved: timeSaved,  // From calculateTimeSaved()
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
    console.log('[Content] Stats updated:', response.stats);
  }
});
```

**Status**: ❌ NOT FIXED

---

### 5️⃣ Event Listeners Not Attached

**The Problem**:

CategoryManager is created but never "started":
```javascript
// content.js line 2425-2431
window._scm_manager = new CategoryManager();
console.log('[content.js] Content script fully initialized');
// ← Stops here! No listeners attached!
```

Missing initialization steps:
```javascript
// Should call but doesn't:
window._scm_manager.initialize()      // ← Initialize DOM observer
window._scm_manager.injectUI()        // ← Inject move buttons
window._scm_manager.attachButtonsToCategories()  // ← Attach click handlers
```

**Result**:
- No "Move To" buttons appear
- Search doesn't work
- Click handlers not active
- DOM observer not monitoring

**The Fix**:
```javascript
// After CategoryManager creation
window._scm_manager = new CategoryManager(scope);

// Call initialization
if (window._scm_manager.initialize) {
  window._scm_manager.initialize();
  console.log('[content.js] CategoryManager initialized');
}

// Attach event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (window._scm_manager.injectUI) {
    window._scm_manager.injectUI();
  }
  if (window._scm_manager.attachButtonsToCategories) {
    window._scm_manager.attachButtonsToCategories();
  }
});
```

**Status**: ❌ NOT FIXED

---

## Initialization Sequence (Current vs Expected)

### ❌ Current (BROKEN)

```
1. Document loads
2. manifest.json loads content scripts
   ├─ storage.js → Creates ShoplineStorage (not exposed!)
   ├─ init.js → Tries to check window.angular (FAILS)
   └─ content.js → Crashes on window._scm_storage check
3. Extension doesn't initialize
4. Error in DevTools console
```

### ✅ Expected (TO BE IMPLEMENTED)

```
1. Document loads (document_start)
2. storage.js runs
   ├─ Initializes ShoplineStorage
   ├─ Exposes window._scm_storage ← FIX #1
   └─ Ready for use
3. init.js runs
   ├─ Injects injected.js into MAIN world
   ├─ Uses postMessage to check AngularJS ← FIX #2
   └─ Broadcasts scmInitComplete
4. content.js runs
   ├─ Calls window._scm_storage.init() ✅ NOW WORKS
   ├─ Waits for AngularJS ✅ NOW WORKS
   ├─ Gets Angular scope ← FIX #3
   └─ Creates CategoryManager with scope ✅ NOW WORKS
5. DOMContentLoaded event
   ├─ Calls manager.initialize() ← FIX #5
   ├─ Injects UI
   └─ Attaches event listeners ✅ NOW WORKS
6. User clicks "Move To"
   ├─ Move executes
   ├─ Calls chrome.runtime.sendMessage() ← FIX #4
   └─ Service Worker records stats ✅ NOW WORKS
```

---

## Impact Analysis

### What Works Now ✅
- Service Worker listens for messages
- Storage API basic functions (get, set, clear)
- Manifest configuration
- Icon & popup setup

### What's Broken ❌
- **Extension won't initialize** (Storage not exposed)
- **Scope not accessible** (AngularJS boundary)
- **Stats not recorded** (No message sending)
- **UI not interactive** (Listeners not attached)

### User Experience Impact 🚀→💥
1. User installs extension
2. Visits Shopline categories page
3. Extension fails to load silently
4. Console shows errors
5. No "Move To" buttons appear
6. User uninstalls extension

---

## Fix Priority & Time Estimates

| # | Issue | Priority | Time | Complexity |
|---|-------|----------|------|------------|
| 1 | Storage API | 🔴 P0 | 15 min | LOW |
| 2 | AngularJS Access | 🔴 P0 | 30 min | MEDIUM |
| 3 | CategoryManager Scope | 🔴 P0 | 10 min | LOW |
| 4 | Message Passing | 🟠 P1 | 20 min | LOW |
| 5 | Event Listeners | 🟡 P2 | 45 min | MEDIUM |

**Total Estimated Fix Time**: 2-3 hours

---

## Testing Checklist

After fixes, verify:

- [ ] Extension loads without console errors
- [ ] window._scm_storage exists and initializes
- [ ] window._scm_manager exists with valid scope
- [ ] "Move To" buttons appear on categories
- [ ] Search input works
- [ ] Moving category sends message to service worker
- [ ] Stats update in popup
- [ ] No memory leaks (DevTools → Memory)
- [ ] No infinite loops (DevTools → Performance)
- [ ] Service Worker console clean

---

## Code Files Affected

1. **src/shared/storage.js** - Add window._scm_storage exposure
2. **src/content/init.js** - Fix AngularJS detection using postMessage
3. **src/content/injected.js** - Add message handlers for AngularJS queries
4. **src/content/content.js** - Multiple fixes:
   - Fix AngularJS access
   - Pass scope to CategoryManager
   - Add message sending to service worker
   - Attach event listeners

---

## Next Actions

1. **Fix storage.js** → Expose window._scm_storage
2. **Fix init.js + injected.js** → Handle cross-world communication
3. **Fix content.js** → Pass scope, send messages, attach listeners
4. **Test all 5 issues** → Verify fixes work
5. **Update documentation** → Mark Task 2-P1.2 complete
6. **Proceed to Task 2-P1.3** → Implement remaining features

---

**Document Generated**: 2026-01-27
**Status**: NEEDS IMPLEMENTATION
**Ready for Production**: NO
