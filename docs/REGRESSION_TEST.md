# Sub-task 1.6: Regression Testing & Stability Verification

## Overview

Comprehensive regression testing to verify the Chrome Extension version maintains 100% feature parity with the original Greasemonkey version, with no functionality degradation.

## Pre-Test Checklist

- [ ] Both versions installed and accessible
  - GM version: userscript installed
  - Extension version: chrome://extensions (unpacked)
- [ ] Shopline account with test categories (multiple levels)
- [ ] DevTools open with console monitoring
- [ ] Network monitoring enabled
- [ ] Clear browser cache/cookies before starting
- [ ] Document test environment specs

## Test Categories

### 1. Core Functionality Parity

#### 1.1 Category Detection

**GM Version Behavior**:
- Detects categories at multiple levels
- Shows "已準備好" message in console
- Handles scope changes gracefully

**Extension Version Behavior**:
Expected to match GM version

**Test Steps**:
1. Open categories page
2. Allow ~2 seconds for initialization
3. Check console for initialization messages
4. Try selecting different category levels

**Pass Criteria**:
- [ ] All categories properly detected
- [ ] No "Could not find parent" errors
- [ ] Console shows initialization complete
- [ ] Scope detection successful

---

#### 1.2 Category Searching

**GM Version Behavior**:
- Search input appears in dropdown
- Real-time filtering as you type
- Debounce prevents UI lag
- Keyboard navigation works

**Extension Version Behavior**:
Expected to match GM version

**Test Steps**:
1. Click category to open dropdown
2. Type in search: `test` (slowly, 1 char/sec)
3. Verify filtered results
4. Use arrow keys to navigate results
5. Press Enter to select

**Pass Criteria**:
- [ ] Search dropdown appears
- [ ] Filtering works correctly
- [ ] No UI lag (debounce working)
- [ ] Keyboard navigation works
- [ ] Results match expected categories

---

#### 1.3 Category Moving

**GM Version Behavior**:
- Can move categories to different levels
- Validates moves (no circular refs)
- Shows success/error toast
- Updates UI after move
- Records statistics

**Extension Version Behavior**:
Expected to match GM version exactly

**Test Scenarios**:

**Scenario A: Valid Move (Sibling)**
- Move category to same-level sibling
- Expected: Success, stats updated

**Scenario B: Valid Move (Parent)**
- Move category to parent level
- Expected: Success, parent becomes new level

**Scenario C: Valid Move (Deep)**
- Move to deeply nested location
- Expected: Success, stats count all descendants

**Scenario D: Invalid Move (Child)**
- Attempt to move to child location
- Expected: Error toast, no stats change

**Scenario E: Invalid Move (Self)**
- Attempt to move to itself
- Expected: Error prevented or toast shown

**Pass Criteria**:
- [ ] All valid moves succeed
- [ ] All invalid moves rejected
- [ ] Success toast appears
- [ ] Error toast appears with message
- [ ] UI updates immediately
- [ ] Statistics recorded for valid moves only
- [ ] No JavaScript errors in console

---

### 2. Statistics Functionality

#### 2.1 Statistics Recording

**GM Version Behavior**:
- Records each successful move
- Tracks total moves count
- Calculates time saved per move
- Accumulates total time saved
- Persists stats in localStorage

**Extension Version Behavior**:
Expected to match GM version

**Test Steps**:
1. Open DevTools → Application → Local Storage → categoryMoveStats
2. Note initial stats (totalMoves, totalTimeSaved)
3. Perform 3-5 category moves
4. Check stats after each move
5. Verify Service Worker receives messages

**Pass Criteria**:
- [ ] Initial stats exist and valid
- [ ] totalMoves increments by 1 per move
- [ ] totalTimeSaved increases correctly
- [ ] Stats persist after page reload
- [ ] Service Worker console shows: "[SERVICE_WORKER] Category move recorded"
- [ ] Calculations match expected time savings

#### 2.2 Time Savings Calculation

**Formula Analysis**:
```
timeSaved = 
  (calculateTimeSaved logic in src/content/content.js)
  considers: descendants, target level, search used
```

**GM Version Results** (observed):
- Single category move: ~10-20 seconds
- Large subtree (5+ descendants): ~30-60 seconds
- Varies with depth change

**Extension Version**:
Expected to calculate identically

**Test Steps**:
1. Move single category: note time saved
2. Move large subtree: note time saved
3. Move with search vs. without
4. Compare results

**Pass Criteria**:
- [ ] Time calculations consistent
- [ ] Matches GM version results
- [ ] Accounts for all descendant counts
- [ ] Properly penalizes/rewards depth changes

---

#### 2.3 Statistics Reset

**GM Version Behavior**:
- Has reset button (if UI implemented)
- Clears all stats
- Sets lastReset to current date

**Extension Version**:
- Service Worker has handleResetStats
- Message: `{ action: 'resetStats' }`

**Pass Criteria**:
- [ ] Reset can be triggered
- [ ] totalMoves reset to 0
- [ ] totalTimeSaved reset to 0
- [ ] lastReset updated to current time
- [ ] UI reflects reset (when implemented)

---

### 3. Error Handling & Recovery

#### 3.1 API Failures

**Network Errors**:
```javascript
Test scenarios:
- Server unavailable (500 error)
- Timeout (no response)
- Malformed response
```

**GM Version Behavior**:
- Shows error toast
- Attempts to recover/retry
- Doesn't crash

**Extension Version**:
Expected behavior

**Pass Criteria**:
- [ ] Error toast displays
- [ ] Error message is descriptive
- [ ] Application remains stable
- [ ] Can retry after error

#### 3.2 Scope Misalignment Detection

**Scenario**: AngularJS scope becomes out of sync with DOM

**GM Version Behavior**:
- Detects misalignment
- Handles gracefully with fallback
- Shows warning if critical

**Extension Version**:
Should detect and handle

**Pass Criteria**:
- [ ] Detects scope misalignment
- [ ] Falls back to alternate detection method
- [ ] Shows warning if needed
- [ ] Recovers without crashes

#### 3.3 Client-Side Errors

**Scenario**: Invalid category data, corrupt state

**Test Steps**:
1. Manually corrupt category data (DevTools)
2. Attempt move operation
3. Observe error handling

**Pass Criteria**:
- [ ] Validation catches bad data
- [ ] Error message shown
- [ ] Application remains stable
- [ ] No silent failures

---

### 4. Data Persistence

#### 4.1 Cross-Session Persistence

**GM Version Behavior**:
- Stats saved to localStorage
- Survive page reload
- Survive browser restart

**Extension Version Behavior**:
- Stats saved to chrome.storage.local
- Expected to survive reload and restart

**Test Steps**:
1. Record initial stats
2. Perform 2-3 moves
3. Note stats values
4. Reload page (F5)
5. Verify stats persist
6. Close and reopen browser
7. Verify stats still persist

**Pass Criteria**:
- [ ] Stats persist after page reload
- [ ] Stats persist after browser restart
- [ ] No data corruption
- [ ] Values remain accurate

#### 4.2 Multi-Tab Consistency

**GM Version Behavior**:
- Stats in one tab may not sync with another
- (or does it? document observed behavior)

**Extension Version Behavior**:
- Service Worker centralizes stats
- Multiple tabs might see different values if opened simultaneously

**Test Steps**:
1. Open 2 tabs with categories page
2. Make move in Tab 1
3. Check stats in Tab 1 (should be updated)
4. Check stats in Tab 2 (may need refresh)

**Pass Criteria**:
- [ ] Stats accurate in originating tab
- [ ] Stats consistent within tab
- [ ] Documented behavior for multi-tab

---

### 5. UI/UX Consistency

#### 5.1 Toast Notifications

**GM Version Behavior**:
- Success toast: green, bottom-right, 3 seconds
- Error toast: red, bottom-right, 3 seconds
- Includes descriptive message

**Extension Version**:
Should match

**Test Steps**:
1. Perform successful move → observe success toast
2. Attempt invalid move → observe error toast
3. Check positioning, color, timing

**Pass Criteria**:
- [ ] Success toast styling correct
- [ ] Error toast styling correct
- [ ] Messages are descriptive
- [ ] Auto-dismiss timing consistent

#### 5.2 Dropdown Interface

**GM Version Behavior**:
- Dropdown appears on category click
- Search section visible
- Category list scrollable
- Clean, unobtrusive styling

**Extension Version**:
Should match

**Pass Criteria**:
- [ ] Dropdown positioning correct
- [ ] Search section visible
- [ ] Categories list complete
- [ ] Scrolling works
- [ ] Styling matches original

---

## Known Differences to Document

(Fill in as discovered)

### Acceptable Differences:
- [ ] Chrome Extension storage vs localStorage (implementation detail)
- [ ] Service Worker async vs sync (transparent to user)
- [ ] Injected script pattern (required by Chrome Extension architecture)

### Unacceptable Differences:
- [ ] Missing features
- [ ] Different calculation results
- [ ] UI/UX changes
- [ ] Error handling gaps

---

## Test Results Summary

### Feature Matrix

| Feature | GM Version | Ext Version | Status | Notes |
|---------|-----------|------------|--------|-------|
| Category Detection | ✓ | ? | TBD | |
| Search Filtering | ✓ | ? | TBD | |
| Category Moving | ✓ | ? | TBD | |
| Valid Move Validation | ✓ | ? | TBD | |
| Invalid Move Rejection | ✓ | ? | TBD | |
| Success Toast | ✓ | ? | TBD | |
| Error Toast | ✓ | ? | TBD | |
| Stats Recording | ✓ | ? | TBD | |
| Time Calculation | ✓ | ? | TBD | |
| Data Persistence | ✓ | ? | TBD | |
| Cross-Session Sync | ✓ | ? | TBD | |
| Error Recovery | ✓ | ? | TBD | |
| Scope Detection | ✓ | ? | TBD | |
| API Failure Handling | ✓ | ? | TBD | |

### Test Coverage: ___% (X/Y tests passed)

### Critical Issues Found:
(List any show-stoppers)

### Minor Issues Found:
(List non-critical issues)

### Recommendations for Next Phase:
(Document improvements/enhancements)

---

## Sign-Off

- **Tester**: _______________
- **Date**: _______________
- **Result**: ☐ PASS ☐ PASS WITH NOTES ☐ FAIL

### Notes:
(Additional findings)

---

**Testing Protocol**: Created 2026-01-27
**Target Completion**: By end of Task 1
