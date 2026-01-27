# Sub-task 1.5 Test Plan: Verify Search, Validation, and UI Features

## Overview
This document outlines the comprehensive test cases for verifying all migrated Greasemonkey logic works correctly in the Chrome Extension environment.

## Test Environment Setup

### Prerequisites
- Chrome browser with unpacked extension installed
- Shopline admin access to categories page
- DevTools open for console monitoring
- Extension should be fully initialized

### Console Log Markers
All tests should check for these console markers:
- Content script: `[content.js]` or `[TimeSavingsTracker]` or `[Shopline Category Manager]`
- Service Worker: `[SERVICE_WORKER]`
- Injected script: `[injected.js]` or `[_scm_getAngular]`

## Test Cases

### 1. Interactive Search with Debounce (300ms)

**Location**: `src/content/content.js:273` - `SEARCH_DEBOUNCE_MS = 300`

**Feature Description**:
- When user opens category dropdown, search input appears
- Typing in search filters categories in real-time
- Search is debounced at 300ms to reduce lag

**Test Steps**:
1. Open Shopline categories admin page
2. Click on a category to show move options
3. A search dropdown should appear
4. Type slowly in search field: `t`, `e`, `s`, `t` (one letter per second)
5. Watch console for `[搜尋name]` messages

**Expected Result**: ✓
- Search filters results correctly
- Debounce function called predictably
- No lag in UI response

**Verification Checklist**:
- [ ] Search dropdown appears when category selected
- [ ] Typing filters categories
- [ ] Console shows debounce behavior

### 2. Smart Category Detection (3-Level Priority)

**Feature Description**:
Three-tier detection strategy:
1. Level 1 (DOM): Extract from DOM elements
2. Level 2 (Scope): Extract from AngularJS scope
3. Level 3 (WeakMap): Fall back to cached WeakMap

**Test Steps**:
1. Open DevTools → Console
2. Try moving categories
3. Monitor console for detection logs

**Expected Result**: ✓
- Console shows successful detection at appropriate level
- Move operations work regardless of detection level

**Verification Checklist**:
- [ ] Scope detection works (primary method)
- [ ] Fallback detection methods exist as backup
- [ ] Categories are correctly identified

### 3. 8-Step Move Process and Rollback

**Feature Description**:
Category move follows structured validation and rollback mechanism.

**Test Steps**:
1. Navigate to categories with 2+ levels
2. Try moving a category to a child (should fail - rollback)
3. Try moving a category to a valid location (should succeed)
4. Watch console for step-by-step logs

**Expected Result**: ✓
- Invalid moves are rejected
- Valid moves succeed
- Stats are recorded only for successful moves

**Verification Checklist**:
- [ ] Move validation prevents circular references
- [ ] Success toast appears for valid moves
- [ ] Error toast appears for invalid moves
- [ ] Stats update only on successful moves

### 4. Time Savings Statistics Calculation

**Feature Description**:
Time savings formula considers category size, depth change, and search usage.

**Test Steps**:
1. Move categories of different sizes
2. Move to different depth levels
3. Monitor `TimeSavingsTracker.recordMove()` calls
4. Check both local and Service Worker stats

**Expected Results**: ✓
- Time calculation consistent across moves
- Service Worker receives `recordCategoryMove` message
- Stats in `chrome.storage.local` increment correctly

**Verification Checklist**:
- [ ] Time calculation varies with category size
- [ ] Service Worker message sent
- [ ] Stats display in DevTools correctly
- [ ] Total time accumulated correctly

### 5. Error Toast Notifications

**Feature Description**:
- Error toast appears on failures
- Positioned: bottom-right
- Red background color
- Auto-dismisses after timeout

**Test Steps**:
1. Try invalid move operations (move to child)
2. Try operations on non-existent categories
3. Watch for error toast notifications

**Expected Result**: ✓
- Red toast appears
- Shows descriptive error message
- Auto-dismisses without user action

**Verification Checklist**:
- [ ] Toast appears at bottom-right
- [ ] Message is descriptive
- [ ] Toast styling correct
- [ ] Auto-dismiss after timeout

### 6. Popup Statistics Display

**Status**: 🔄 Blocked (requires popup UI implementation in Task 2-P1.4)

**Test Placeholder**:
```javascript
// Manual test via console:
chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
  console.log('Stats:', response.stats);
});
```

## Integration Test: Full Workflow

**Scenario**: Complete user journey from page load to move completion

### Expected Console Output Sequence:
```
[content.js] Content script fully initialized
[Shopline Category Manager] Category manager initialized
[Shopline Category Manager] Click handler attached
[Shopline Category Manager] [搜尋name] 找到: {...}
[Shopline Category Manager] 已移動 ...
[TimeSavingsTracker] Move recorded in service worker
[SERVICE_WORKER] Message received from content script
[SERVICE_WORKER] Category move recorded
```

## Test Completion Criteria

All six features tested:
- ✓ Interactive search with debounce
- ✓ Smart category detection
- ✓ 8-step move process
- ✓ Time savings calculation
- ✓ Error toast notifications
- ⏳ Popup statistics (blocked)

Regression test passed:
- ✓ No console errors
- ✓ All API calls working
- ✓ Storage persisting correctly

**Last Updated**: 2026-01-27
