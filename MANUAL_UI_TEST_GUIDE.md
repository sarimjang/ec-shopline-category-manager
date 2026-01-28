# Manual UI Test Guide - Shopline Category Manager Chrome Extension

**Test Date**: 2026-01-28
**Tester**: Manual Testing
**Task**: lab_20260107_chrome-extension-shopline-category-ksw - [migrate-greasemonkey-logic] 5. UI Verification

---

## Quick Start

### 1. Build the Extension (Development Mode)
```bash
cd /Users/slc_javi/My\ Projects/app_develop/lab/lab_20260107_chrome-extension-shopline-category
npm run build:dev
```

**Expected Output**:
```
[Build Config] Environment: development
[Build Config] Debug APIs: ENABLED
Development build ready (debug APIs enabled)
```

### 2. Load Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right corner)
3. Click "Load unpacked"
4. Navigate to and select the `src/` folder in the project
5. Extension should appear in the list with ID starting with unique hash

### 3. Verify Extension Loaded
- [x] Extension icon appears in Chrome toolbar (top-right)
- [x] Extension name shows as "Shopline Category Manager"
- [x] Extension is enabled (toggle is ON)
- [x] No errors shown in extension page

---

## Test 1: Button Appearance

**Objective**: Verify the "📁 移動到 ▼" button appears on every category

### Steps
1. Open Chrome DevTools (F12)
2. Switch to Console tab
3. Filter console by typing `[Shopline Category Manager]` to see relevant logs
4. Navigate to Shopline admin panel: `https://app.shopline.tw/admin/{store-id}/categories`
5. Wait for page to fully load (observe logs for "UI 注入完成")
6. Look at the category list on the page

### Expected Results
- [ ] Button "📁 移動到 ▼" appears to the RIGHT of existing action buttons on each category row
- [ ] Button uses Bootstrap styling (appears as gray button with rounded corners)
- [ ] Button is the same height as other action buttons
- [ ] Button text is clearly visible with emoji icon
- [ ] Button appears on ALL visible categories (scroll down to verify)
- [ ] No console errors appear during button injection

### Console Logs Expected
```
[Shopline Category Manager] 初始化分類管理器
[Shopline Category Manager] UI 注入完成 (MutationObserver 已建立)
[Shopline Category Manager] 找到 XX 個分類節點
```

### Failure Scenarios
- ❌ Button doesn't appear: Check console for errors like "找不到樹容器"
- ❌ Button appears only on some categories: May indicate MutationObserver issue
- ❌ Button styling looks wrong: Verify `btn btn-sm btn-default` classes are applied

---

## Test 2: Dropdown Menu Appearance

**Objective**: Verify dropdown menu opens with proper styling

### Steps
1. On the category list page, locate any category
2. Find the "📁 移動到 ▼" button in that category's row
3. Click the button
4. Observe the dropdown that appears

### Expected Results
- [ ] Dropdown appears as a white box with shadow
- [ ] Dropdown position is near the clicked button (doesn't go off-screen)
- [ ] Dropdown has a visible border (light gray: #ddd)
- [ ] Dropdown has rounded corners (4px radius)
- [ ] Dropdown shows a list of available target categories
- [ ] Dropdown is scrollable if it contains many items (max-height: 400px)

### Console Logs Expected
```
[Shopline Category Manager] showMoveDropdown called
[Shopline Category Manager] [Search] Level 1 categories: XX (all arrays)
```

### Failure Scenarios
- ❌ Dropdown doesn't appear: Check for Z-index conflicts or blocked click events
- ❌ Dropdown appears off-screen: Check `positionDropdown()` implementation
- ❌ Dropdown styling is wrong: Verify CSS in `createDropdownContainer()`

---

## Test 3: Search Field Functionality

**Objective**: Verify search field filters categories in real-time

### Steps
1. Click move button to open dropdown (from Test 2)
2. Look for search input field at the top of dropdown
3. Type a partial category name (e.g., type "衣" if you have "衣服" category)
4. Observe the filtered results

### Expected Results
- [ ] Search input field is visible at TOP of dropdown
- [ ] Search field has placeholder text or is clearly clickable
- [ ] Typing characters filters results in REAL-TIME (within 300ms)
- [ ] Search is CASE-INSENSITIVE (typing "衣" or "衣" both work)
- [ ] Matching categories appear below search field
- [ ] Non-matching categories disappear
- [ ] Clearing search field shows ALL categories again
- [ ] No lag when typing (debounce working)

### Console Logs Expected
```
[Shopline Category Manager] [Search] Filtered by "keyword": X results
```

### Test Cases
```
Search: "" (empty)      → Shows ALL categories
Search: "衣"            → Shows only categories containing "衣"
Search: "服"            → Shows categories containing "服"
Search: "新"            → Shows only matching categories
Search: "xxxxxx"        → Shows no results (0 matches)
```

### Failure Scenarios
- ❌ Search doesn't work: Check if `attachSearchEventListeners()` is called
- ❌ Search lags: Debounce may not be working (should be 300ms)
- ❌ Search case-sensitive: Check if `toLowerCase()` is applied

---

## Test 4: Category Selection and Move

**Objective**: Verify selecting a category moves it in the DOM

### Steps
1. Open dropdown (from Test 2)
2. Type in search to filter categories (from Test 3)
3. Click on a target category in the filtered list
4. Click "確認移動" button (if visible)
5. Observe the page refreshing or category list updating

### Expected Results
- [ ] Clicking a category selects it (may show visual change like highlight)
- [ ] "確認移動" button becomes available/active
- [ ] Clicking "確認移動" initiates the move
- [ ] Dropdown closes after successful move
- [ ] Category that was moved is no longer in its original location
- [ ] Category appears in its new location
- [ ] If category has sub-categories, they move with it
- [ ] Page doesn't reload (smooth operation)

### Console Logs Expected
```
[Shopline Category Manager] showMoveDropdown called
[Shopline Category Manager] getValidMoveTargets: Found X possible destinations
[Shopline Category Manager] recordMove: totalMoves: X
```

### Failure Scenarios
- ❌ Move button doesn't work: Check for JavaScript errors in console
- ❌ Category doesn't move: May be scope/dataset lookup issue
- ❌ Page reloads: Indicates full page refresh instead of DOM update
- ❌ Wrong category moves: Priority lookup system (dataset → scope → WeakMap) failing

---

## Test 5: Popup Statistics Display

**Objective**: Verify extension popup shows updated statistics

### Steps
1. Click extension icon in Chrome toolbar (top-right)
2. Popup window should appear showing statistics
3. Observe the statistics display

### Expected Results
- [ ] Popup displays with "Shopline 分類管理工具" title
- [ ] Statistics panel shows 4 stat items:
  - [ ] "總移動次數" (Total Moves) with a number
  - [ ] "總節省時間" (Total Time Saved) formatted in minutes
  - [ ] "平均每次" (Average Per Move) in seconds
  - [ ] "最後重置" (Last Reset) showing relative time
- [ ] All numbers are properly formatted
- [ ] Control buttons visible: "重置統計", "匯出資料", "匯入資料", "設定"
- [ ] Popup background is clean and readable

### Expected Display Format
```
總移動次數: 0 (or number of moves performed)
總節省時間: 0 分鐘 (updates to show minutes when moves are performed)
平均每次: 0 秒 (shows seconds per move once moves are recorded)
最後重置: 未重置 (changes after first operation)
```

### Console Logs Expected
```
[Popup] 正在初始化彈出窗口
[Popup] 彈出窗口初始化完成
[Popup] 自動更新完成 (every 2 seconds after initialization)
```

### Failure Scenarios
- ❌ Popup doesn't open: Check `popup/popup.html` is correctly configured in manifest
- ❌ Statistics show "0" even after moves: Check Service Worker message passing
- ❌ Stats don't update: Auto-refresh interval may not be running

---

## Test 6: Statistics Update After Move

**Objective**: Verify statistics increase after performing a category move

### Steps
1. Open Shopline categories page
2. Perform a category move (Test 4)
3. Open extension popup (click extension icon)
4. Observe if statistics changed

### Expected Results
- [ ] "總移動次數" increments by 1
- [ ] "總節省時間" increases (shows positive minutes)
- [ ] "平均每次" is calculated (total time / move count)
- [ ] "最後重置" shows recent time (e.g., "剛剛" or minutes ago)
- [ ] Statistics update within 2 seconds of performing move
- [ ] Popup auto-refreshes without user clicking "reload"

### Test Data Example
```
Before Move:
  總移動次數: 0
  總節省時間: 0 分鐘
  平均每次: 0 秒
  最後重置: 未重置

After 1 Move:
  總移動次數: 1
  總節省時間: X 分鐘 (X = calculated time saved)
  平均每次: X 秒
  最後重置: 剛剛
```

### Failure Scenarios
- ❌ Statistics don't update: Message passing from content script to background worker failing
- ❌ Numbers appear wrong: Check `calculateTimeSaved()` logic
- ❌ Manual refresh needed: Check `AUTO_REFRESH_MS = 2000` is working

---

## Test 7: Multiple Consecutive Moves

**Objective**: Verify system handles multiple consecutive operations correctly

### Steps
1. Perform move 1 (Test 4)
2. WITHOUT closing the page, perform move 2
3. Without closing popup, perform move 3
4. After each move, check popup statistics

### Expected Results
- [ ] Move 1 completes successfully
- [ ] Move 2 works (dropdown opens, category selects, move completes)
- [ ] Move 3 works without issues
- [ ] Move count shows "3" in popup
- [ ] Time saved is cumulative (move 1 + move 2 + move 3)
- [ ] No performance degradation after multiple moves
- [ ] Page remains responsive (no lag/freezing)
- [ ] Dropdown properly cleaned up between moves
- [ ] No memory leaks visible (DevTools memory should be stable)

### Consecutive Test Sequence
```
1. Move Category A from Location 1 to Location X
   → Check popup: totalMoves = 1
   
2. Move Category B from Location 2 to Location Y
   → Check popup: totalMoves = 2
   
3. Move Category C from Location 3 to Location Z
   → Check popup: totalMoves = 3
   
4. Verify all 3 categories are in correct final positions
```

### Failure Scenarios
- ❌ Second move fails: Previous dropdown may not be properly cleaned up
- ❌ Stats don't increment properly: Race condition in async operations
- ❌ Performance degrades: Memory leak in MutationObserver or event listeners
- ❌ Wrong dropdowns appear: DOM cleanup not complete

---

## Test 8: Console Error Monitoring

**Objective**: Verify no critical errors occur during operations

### Steps
1. Open Chrome DevTools (F12)
2. Switch to Console tab
3. Perform tests 1-7 above while monitoring console
4. Document any errors that appear

### Expected Console Output Pattern
```
// On page load:
[Shopline Category Manager] 初始化分類管理器
[Shopline Category Manager] UI 注入完成 (MutationObserver 已建立)
[Shopline Category Manager] 找到 XX 個分類節點

// On move button click:
[Shopline Category Manager] [Priority 0] Trying dataset lookup: {categoryId, categoryName}
[Shopline Category Manager] ✓ [Priority 0] SUCCESS: ...

// On search:
[Shopline Category Manager] [Search] Filtered by "keyword": X results

// On move completion:
[Shopline Category Manager] recordMove: totalMoves: X
```

### Error Categories to Check
```
❌ CRITICAL - Do not continue testing:
   - Uncaught TypeError
   - Uncaught ReferenceError
   - Failed to load content script
   - Service Worker crashed

⚠️  WARNING - May indicate issues:
   - Scope misalignment detected
   - Dataset had ID but category not found
   - Failed to cancel debounce

✅ EXPECTED - Normal operation:
   - All logs prefixed with [Shopline Category Manager] or [Popup]
   - Friendly debug messages
   - No red error indicators
```

### Console Filter Tips
1. Click filter icon (funnel) in console
2. Type `[Shopline Category Manager]` to see only relevant logs
3. Type `-error` to hide error messages
4. Type `[Popup]` to see popup-related logs

### Failure Scenarios
- ❌ TypeErrors appearing: Check variable initialization and null checks
- ❌ Unexpected warnings: May indicate edge cases in code
- ❌ Service Worker errors: Check background worker is running properly

---

## Test 9: Dropdown Edge Cases

**Objective**: Verify dropdown handles edge cases correctly

### Test Case 9a: Clicking Outside Dropdown
**Steps**:
1. Open dropdown
2. Click somewhere on the page (not in dropdown)

**Expected**:
- [ ] Dropdown closes
- [ ] No error in console

### Test Case 9b: Pressing Escape Key
**Steps**:
1. Open dropdown
2. Press Escape key

**Expected**:
- [ ] Dropdown closes (if Escape handler is implemented)
- [ ] Search field loses focus

### Test Case 9c: Rapid Button Clicks
**Steps**:
1. Click move button
2. While dropdown is open, click another move button
3. Observe second dropdown

**Expected**:
- [ ] First dropdown closes
- [ ] Second dropdown opens for new category
- [ ] No duplicate dropdowns visible
- [ ] No console errors about cleanup

### Test Case 9d: Categories with Special Characters
**Steps**:
1. Find a category with special name (if available)
2. Click move button
3. Search for that category

**Expected**:
- [ ] Category name displays correctly (no XSS)
- [ ] Search finds category despite special characters
- [ ] No injection attacks or console errors

### Failure Scenarios
- ❌ Dropdown doesn't close on outside click: Event listener not attached
- ❌ Multiple dropdowns appear: Cleanup not working
- ❌ Special characters cause errors: Input sanitization failing

---

## Test 10: Performance Check

**Objective**: Verify UI doesn't lag during operations

### Steps
1. Open Chrome DevTools
2. Switch to Performance tab
3. Click "Record" to start recording
4. Perform a category move (Test 4)
5. Click "Stop" to end recording
6. Analyze the flame chart

### Expected Results
- [ ] Move operation completes within 2-3 seconds
- [ ] No long tasks (tasks >50ms)
- [ ] Frame rate stays above 60 FPS during operations
- [ ] No jank or visible stuttering
- [ ] Search filtering doesn't cause frame drops

### Performance Metrics to Check
```
✅ Good:
   - Long Tasks: 0
   - First Contentful Paint: <1s
   - Layout Shift: minimal
   - Dropped Frames: 0

⚠️ Warning:
   - Long Tasks: 1-2 (>50ms)
   - Frame rate dips to 30 FPS briefly
   - Some layout thrashing

❌ Bad:
   - Multiple long tasks (>200ms)
   - Frame rate <30 FPS
   - Visible jank/stutter
   - Search lags significantly
```

### Failure Scenarios
- ❌ Search is slow: Debounce may be set too low, or filtering algorithm inefficient
- ❌ Dropdown position jank: Reflow on every mouse move
- ❌ Memory grows unbounded: Listeners not cleaned up

---

## Test 11: DevTools Memory Check

**Objective**: Verify no memory leaks after repeated operations

### Steps
1. Open Chrome DevTools (F12)
2. Go to Memory tab
3. Click "Take Heap Snapshot" to get baseline
4. Perform 5-10 category moves
5. Click "Take Heap Snapshot" again
6. Compare snapshots

### Expected Results
- [ ] Memory stable (doesn't grow significantly after operations)
- [ ] No detached DOM nodes accumulating
- [ ] Event listeners properly removed (devtools shows cleanup)
- [ ] WeakMap doesn't retain references to deleted buttons

### Memory Metrics
```
✅ Good:
   - Heap size increase <2 MB after 10 moves
   - Detached DOM nodes: 0-5
   - Event listeners per operation: same number

⚠️ Warning:
   - Heap size increase 2-5 MB
   - Some detached DOM nodes but eventually cleaned
   - Growing listener count (may clean up later)

❌ Bad:
   - Heap size grows 5+ MB
   - Detached DOM nodes keep increasing
   - Event listeners accumulate unbounded
   - Can see "move button X" references accumulating
```

### How to Check for Memory Leaks
1. In Memory tab, select "Detached DOM" category
2. If it grows after multiple operations, there's a leak
3. Check for event listeners still attached to removed elements

### Failure Scenarios
- ❌ Memory grows unbounded: MutationObserver or event listeners not cleaned up
- ❌ Detached DOM accumulates: Dropdown not properly removed from document
- ❌ References to old dropdowns remain: WeakMap not garbage collecting

---

## Summary Checklist

### Critical Tests (Must Pass)
- [ ] Test 1: Button appears on all categories
- [ ] Test 2: Dropdown displays correctly
- [ ] Test 4: Category selection and move works
- [ ] Test 5: Popup statistics display
- [ ] Test 8: No critical console errors

### Important Tests (Should Pass)
- [ ] Test 3: Search field filters correctly
- [ ] Test 6: Statistics update after move
- [ ] Test 7: Multiple consecutive moves work
- [ ] Test 9: Dropdown edge cases handled

### Optimization Tests (Nice to Have)
- [ ] Test 10: Performance is good (no janky animations)
- [ ] Test 11: No memory leaks after repeated operations

---

## Testing Tips

### DevTools Shortcuts
```
F12 or Ctrl+Shift+I  → Open DevTools
Ctrl+Shift+C         → Inspect element
Ctrl+L               → Clear console
```

### Console Filtering
```
[Shopline Category Manager]  → Show all content script logs
[Popup]                      → Show popup logs
error                        → Show only errors
warning                      → Show only warnings
```

### Simulate Network Issues (Optional)
1. DevTools → Network tab
2. Change "No throttling" to "Slow 3G"
3. Repeat tests to verify works under slow connection

### Mobile Testing (Optional)
1. DevTools → toggle device toolbar (Ctrl+Shift+M)
2. Select iPhone or Android device
3. Repeat tests to verify responsive design

---

## Documentation

### Success Criteria
- ✅ All critical tests pass
- ✅ No console errors
- ✅ Statistics update correctly
- ✅ Multiple operations work smoothly
- ✅ No memory leaks detected

### Failure Handling
If any test fails:
1. Check console for error message
2. Document the exact error
3. Identify which component failed
4. Note the reproduction steps
5. Check logs for diagnostic information

### Test Report Template
```
Test Date: 2026-01-28
Tester: [Name]
Browser Version: Chrome [version]
OS: [OS and version]
Extension ID: [hash from chrome://extensions/]

Passed Tests: [X]/[Y]
Failed Tests:
  1. [Test Name] - [Error Description]
  
Critical Issues: [None / List issues]
Warnings: [None / List warnings]
```

---

## Next Steps After Testing

1. **If All Tests Pass**:
   - Mark task as complete in Beads
   - Generate test report
   - Commit code if changes were made

2. **If Some Tests Fail**:
   - Document failures with console logs
   - Create bug report with reproduction steps
   - Create sub-task to fix issue
   - Re-run tests after fix

3. **Performance Optimization**:
   - If performance isn't smooth, profile and optimize
   - If memory leaks found, fix cleanup code
   - Document any changes made

---

**Testing Document Version**: 1.0
**Last Updated**: 2026-01-28
**Status**: Ready for Manual Testing
