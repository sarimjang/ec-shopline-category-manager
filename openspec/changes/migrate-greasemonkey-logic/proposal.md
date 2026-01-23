# Change: Migrate Greasemonkey Logic to Chrome Extension

## Why

The initial Phase 1 MVP created a simplified Chrome Extension architecture that **did not preserve the complete feature set** from the production Greasemonkey script. Critical functionality is missing:

1. **Interactive Category Search** - Users cannot search parent categories in real-time (debounced, 300ms)
2. **Intelligent Category Detection** - 3-layer priority lookup (DOM Dataset → Scope → WeakMap) prevents misidentification
3. **Time Savings Tracking** - Sophisticated calculation model (drag time + scroll delay + layer adjustment = net savings)
4. **Complete Error Handling** - Scope misalignment detection, network failure recovery, full rollback on API failure
5. **Advanced Move Validation** - 8-step move process with pre/post verification, ancestor cycle detection

The Greasemonkey script (~2700 lines) contains **battle-tested production code** with:
- 2000+ lines of CategoryManager class
- 150+ lines of TimeSavingsTracker
- 8 distinct move validation steps
- Network error classification (network-error, pure-server-failure, client-error)
- Full scope misalignment logging for analytics

**Current impact**: Extension users get basic category moving only. Power users lose the interactive search, time statistics, and error recovery they depend on.

## What Changes

### Complete Logic Migration (No Feature Cuts)
- **Copy CategoryManager class** (complete, all methods) to `src/content/content.js`
- **Copy TimeSavingsTracker class** (persistence logic) to `src/content/content.js`
- **Copy all utility functions** (tree operations, time calculation, validation helpers)
- **Adapt only storage layer** - localStorage → chrome.storage.local with message passing
- **Preserve all UI behavior** - search, dropdown, tooltip, error toast notifications

### Technical Substitutions (Minimum Changes)
- Replace `localStorage.getItem/setItem` with `chrome.storage.local`
- Replace direct AngularJS scope access with message passing to Service Worker
- Keep all business logic, validation, and UI identical

## Impact

### Affected Specs
- `extension-core` - MODIFIED: Content script now hosts complete CategoryManager
- `category-operations` - MODIFIED: All 8 validation steps and move types now supported
- `category-search` - ADDED: Real-time search with debounce and result filtering
- `time-tracking` - ADDED: Time savings calculation and statistics persistence

### Affected Code
- `src/content/content.js` - MODIFIED: Add full CategoryManager + TimeSavingsTracker
- `src/background/service-worker.js` - MODIFIED: Add storage listeners for sync
- `src/popup/popup.js` - MODIFIED: Fetch stats from chrome.storage.local

### NOT Breaking
- ✅ User behavior unchanged (same buttons, dropdowns, search)
- ✅ API calls identical (same PUT endpoint, same payload)
- ✅ Storage schema compatible (add fields, don't remove)

## Success Criteria

- ✅ All Greasemonkey CategoryManager methods work identically in Extension
- ✅ Search input appears above dropdown with debounced filtering
- ✅ Time savings calculated and displayed in popup
- ✅ Scope misalignment detection logs warnings
- ✅ Network errors classified and recovery offered
- ✅ All 8 move validation steps execute in correct order
- ✅ No decrease in user-visible features vs Greasemonkey version

## Related Documents

- `src/shopline-category-manager.prod.user.js.backup.2026-01-15T07-08-23` - Complete reference implementation
- `.planning/phases/01-extension-mvp/01-04-SUMMARY.md` - Current incomplete Phase 1 state
