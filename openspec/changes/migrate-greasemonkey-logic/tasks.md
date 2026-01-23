# Implementation Tasks: Greasemonkey Logic Migration

## 1. Content Script Migration

- [ ] 1.1 Copy TimeSavingsTracker class from Greasemonkey (lines 139-249)
- [ ] 1.2 Copy all utility functions from Greasemonkey (lines 32-130): getAllDescendants, isDescendant, getCategoryLevel, getCategoryDescendants, calculateTimeSaved
- [ ] 1.3 Copy CategoryManager class from Greasemonkey (lines 255-2361)
- [ ] 1.4 Replace all `localStorage.getItem()` with `chrome.storage.local.get()`
- [ ] 1.5 Replace all `localStorage.setItem()` with `chrome.storage.local.set()`
- [ ] 1.6 Update getAngular() to call `window._scm_getAngular?.()` from injected script
- [ ] 1.7 Add console logging for diagnostics: operation start/end, validation results
- [ ] 1.8 Test that CategoryManager initializes on page load (verify MutationObserver registers)

## 2. Injected Script Setup

- [ ] 2.1 Update `src/content/injected.js` to provide `window._scm_getAngular = () => window.angular;`
- [ ] 2.2 Verify injected.js loads before content.js in manifest.json (content_scripts order)
- [ ] 2.3 Test that content.js can call `window._scm_getAngular()` and get AngularJS reference

## 3. Storage API Integration

- [ ] 3.1 Create wrapper function `getCategoryMoveStats()` that reads from chrome.storage.local
- [ ] 3.2 Create wrapper function `saveCategoryMoveStats(stats)` that writes to chrome.storage.local
- [ ] 3.3 Verify old localStorage data is migrated (check if user had previous stats)
- [ ] 3.4 Test that statistics persist after page reload

## 4. Service Worker Message Handling

- [ ] 4.1 Add listener in service-worker.js for `recordCategoryMove` action
- [ ] 4.2 Extract stats from message and log to console
- [ ] 4.3 Optionally store move history for analytics (timestamp, categoryName, targetLevel)
- [ ] 4.4 Test that stats appear in popup after move operation

## 5. UI Verification

- [ ] 5.1 Load extension as unpacked in chrome://extensions
- [ ] 5.2 Navigate to Shopline categories page
- [ ] 5.3 Verify "📁 移動到 ▼" buttons appear on each category
- [ ] 5.4 Click a button and verify dropdown appears with search field at top
- [ ] 5.5 Type in search field and verify results filter in real-time (debounced)
- [ ] 5.6 Select a target and click "確認移動"
- [ ] 5.7 Verify category moved in DOM
- [ ] 5.8 Open popup and verify stats updated (Moves Today, Time Saved)

## 6. Error Handling Verification

- [ ] 6.1 Trigger scope misalignment (via browser console, inspect scope.$id vs DOM)
- [ ] 6.2 Verify misalignment warning appears in console with full diagnostic data
- [ ] 6.3 Simulate network error (use DevTools Network throttle)
- [ ] 6.4 Verify user sees network error toast ("網路連線失敗...")
- [ ] 6.5 Simulate API error (mock 500 response)
- [ ] 6.6 Verify rollback succeeds and UI reverts to pre-move state
- [ ] 6.7 Verify console shows full error classification (network-error, pure-server-failure, client-error)

## 7. Move Operation Validation

- [ ] 7.1 Test move to root directory (targetCategory = null)
- [ ] 7.2 Test move to Level 2 parent
- [ ] 7.3 Test move to Level 1 parent
- [ ] 7.4 Verify cannot move to Level 3 (option disabled in dropdown)
- [ ] 7.5 Verify cannot move category to itself (validation blocks)
- [ ] 7.6 Verify cannot move ancestor (isDescendant() check prevents cycle)
- [ ] 7.7 Verify all 8 move steps log correctly to console

## 8. Time Savings Calculation

- [ ] 8.1 Verify time saved = max(0, dragTime - toolTime)
- [ ] 8.2 Test with different category counts (5, 50, 500 categories)
- [ ] 8.3 Test time savings for moves to different levels (1, 2, 3)
- [ ] 8.4 Test time savings with vs without search (2.5s vs 3.5s tool time)
- [ ] 8.5 Verify total time displayed in popup (formatted as "X min Y sec")

## 9. Documentation & Testing

- [ ] 9.1 Document any differences in behavior between Greasemonkey and Extension
- [ ] 9.2 Create test checklist for QA (10-15 manual test cases)
- [ ] 9.3 Add console logging to help diagnose future issues
- [ ] 9.4 Update README.md with Extension installation instructions

## 10. Deployment Prep

- [ ] 10.1 Run manifest validation (chrome extension linter)
- [ ] 10.2 Verify no console errors on page load
- [ ] 10.3 Test on 2-3 different Shopline instances (staging, if available)
- [ ] 10.4 Get approval from code review before merging
- [ ] 10.5 Archive this change proposal after deployment
