# Technical Design: Greasemonkey Logic Migration

## Context

The Greasemonkey script is a **single-world JavaScript application** (main world via `@grant`):
- Direct access to `window.angular`
- Direct access to AngularJS scope objects
- localStorage for persistence
- No background service worker concept

The Chrome Extension must work within **isolated worlds** (content script ≠ main world):
- Content script (isolated world) cannot see `window.angular`
- Main world access requires a separate injected script
- chrome.storage.local for persistence
- Service worker for background tasks

## Goals

- **Complete Feature Parity** - Not one missing method from CategoryManager
- **Minimal Code Changes** - Copy-paste + adapt storage only
- **Clear Data Flow** - Message passing between script contexts, not shared state

Non-goals:
- Refactoring for extensibility
- Adding new features beyond Greasemonkey version
- Changing move algorithm or validation logic

## Decisions

### Decision 1: Where to Host CategoryManager?
**Choice: Content Script (isolated world)**

Rationale:
- CategoryManager needs to inject UI elements into the main DOM (buttons, dropdowns)
- Content scripts have full DOM access; injected scripts do worse with MutationObserver registration
- Keep CategoryManager close to DOM, let injected script handle AngularJS-only operations

Alternative Rejected: Injected Script
- Would require passing DOM elements across worlds (fragile)
- Loses scope isolation benefits

Alternative Rejected: Service Worker
- No DOM access
- Cannot listen to MutationObserver

### Decision 2: How to Access window.angular?
**Choice: Injected script provides getAngular() via window.**

```javascript
// In injected.js (main world)
window._scm_getAngular = () => window.angular;

// In content.js (isolated world)
const ng = window._scm_getAngular?.();
```

Rationale:
- Injected script runs in main world, has native access to window.angular
- Content script calls the function to get reference
- Simple, one-way communication

Alternative Rejected: Message passing for every AngularJS call
- Would be 10-20 messages per move operation (slow)
- Unnecessary complexity

### Decision 3: How to Handle Storage?
**Choice: Content script uses chrome.storage.local, messages Service Worker when stats change.**

```javascript
// In CategoryManager
this.tracker.recordMove(categoryCount, targetLevel, usedSearch);
// Internally uses chrome.storage.local

// Also sends message for analytics/logging
chrome.runtime.sendMessage({action: 'recordCategoryMove', ...});
```

Rationale:
- CategoryManager uses storage directly (like localStorage in Greasemonkey)
- No API change needed; internal `localStorage.getItem/setItem` become `chrome.storage.local.get/set`
- Service Worker receives messages for long-term logging/stats

### Decision 4: Which Methods Must Be Exact Copies?
**All public methods of CategoryManager and TimeSavingsTracker:**

```
CategoryManager:
- initialize()
- injectUI()
- attachButtonsToCategories()
- getCategoryFromElement()
- showMoveDropdown()
- moveCategory() [8-step process]
- saveCategoryOrderingToServer()
- ... (30+ methods total)

TimeSavingsTracker:
- recordMove()
- getStats()
- resetStats()
- saveStats()
- loadStats()
```

Rationale:
- User-facing behavior must be identical
- Even internal validation logic must match (prevents new bugs)
- Greasemonkey version is production-tested; trust it

### Decision 5: What About Scope Misalignment Detection?
**Keep it exactly as is, logged to console for analytics.**

The Greasemonkey script tracks `scope.$id` and logs detailed diagnostics when scope bindings don't match DOM:

```javascript
// Keep in content.js
const misalignmentData = {
  domName, scopeName, scopeId, timestamp,
  severity: 'CRITICAL'
};
this.scopeMisalignmentLog.push(misalignmentData);
console.error('[Shopline Category Manager] ⚠️⚠️⚠️ [SCOPE MISALIGNMENT DETECTED]', misalignmentData);
```

Rationale:
- Helps diagnose AngularJS framework bugs on user's Shopline instance
- No performance impact
- Valuable diagnostic data for future improvements

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| **Copy-paste errors** | Line-by-line verification using diff tool; unit test key methods |
| **localStorage → chrome.storage.local mismatch** | Create wrapper function `getStorageValue(key)` to unify API |
| **AngularJS reference becomes null** | Injected script runs earlier; verify order in manifest.json |
| **Message passing overload** | Only high-level operations (recordCategoryMove) message; internal calls are local |
| **XSS vulnerability in sanitizeCategoryName()** | Keep exact implementation; regex patterns tested in production |

## Migration Plan

1. **Prepare content.js**
   - Copy CategoryManager class (lines 255-2361 from Greasemonkey)
   - Copy TimeSavingsTracker class (lines 139-249)
   - Copy utility functions (lines 32-130)
   - Replace `localStorage` with `chrome.storage.local`

2. **Update injected.js**
   - Add `window._scm_getAngular = () => window.angular;`
   - Minimal helper for CategoryManager to access AngularJS

3. **Update manifest.json**
   - Ensure `injected.js` loads before `content.js`
   - Verify content script runs on correct URL patterns

4. **Update Service Worker**
   - Listen for `recordCategoryMove` messages
   - Log to chrome.storage.local for persistence

5. **Test**
   - Category search works (debounce visible)
   - Time savings display in popup
   - Move operations succeed with scope misalignment logs
   - Error handling works (network failure, API error, validation failure)

## Open Questions

- Should we keep `scopeMisalignmentLog` indefinitely or rotate it?
- Do we need analytics dashboard for misalignment tracking?
- Should time savings calculation be user-configurable (currently hardcoded)?

## Rollback Plan

If issues arise:
1. Keep Greasemonkey version deployed in parallel
2. Users can disable Extension, re-enable UserScript
3. Data in chrome.storage.local is preserved
4. No server-side changes required
