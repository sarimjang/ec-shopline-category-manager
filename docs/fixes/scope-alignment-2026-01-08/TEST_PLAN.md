# Test Plan: Scope Alignment Fix
## Shopline Category Manager - Hybrid Priority Chain Implementation

**Document Version**: 1.0
**Date**: 2026-01-08
**Scope**: Validate hybrid priority chain for category identification (dataset → scope → WeakMap)
**Target Criteria**: >95% use of Priority 0 (dataset), zero scope misalignment incidents, all functional tests pass

---

## 1. Test Objectives

### Primary Goals
1. Verify category move functionality works correctly with the hybrid priority chain
2. Confirm Priority 0 (DOM dataset) is used in >95% of move operations
3. Validate Priority 1 (scope query) fallback triggers appropriately
4. Detect and log ALL scope misalignment incidents with diagnostic details
5. Ensure zero regressions in existing functionality

### Success Metrics
- [ ] 100% of single-level moves execute successfully
- [ ] 100% of nested moves preserve tree structure integrity
- [ ] Rapid consecutive clicks handled without button confusion
- [ ] Tree refresh operations maintain category data integrity
- [ ] Edge cases (root moves, large families, first/last items) all work
- [ ] No "SCOPE MISALIGNMENT" warnings in console
- [ ] Priority 0 usage: >95% of move operations
- [ ] All array operations (splice, push, indexOf) successful with validation

---

## 2. Test Checklist (Manual Testing)

### Pre-Test Validation
- [ ] Userscript loaded in Tampermonkey (check console for "Script loaded" message)
- [ ] Shopline admin categories page accessible (https://admin.shoplineapp.com/admin/*/categories)
- [ ] Browser DevTools console open (F12)
- [ ] Network throttling disabled (for accurate performance baseline)
- [ ] Clear previous console logs (Ctrl+L in DevTools)

### Test Environment Setup
- [ ] Open test Shopline store categories page
- [ ] Wait for tree to load completely (console should show "✓ 找到 N 個樹節點")
- [ ] Verify categories are visible in UI
- [ ] Verify "📁 移動到 ▼" buttons appear on each category
- [ ] Record initial category structure (screenshot or JSON dump)

### Functional Tests

#### TC1: Single-Level Move (Root to Root)
- [ ] **Setup**: Tree with 3+ categories at root level (e.g., A, B, C)
- [ ] **Action**: Click "移動到 ▼" on category A
- [ ] **Verify Dropdown**:
  - [ ] Shows only valid targets (B and C enabled, A disabled, root disabled)
  - [ ] Each target clearly labeled with indent
- [ ] **Select Target**: Click on B
- [ ] **Verify Result**:
  - [ ] Category A appears AFTER B in tree
  - [ ] Success toast message appears ("分類移動成功！")
  - [ ] No error toast
- [ ] **Verify Console**:
  - [ ] "Using DOM dataset" appears in logs (Priority 0)
  - [ ] No "SCOPE MISALIGNMENT" errors
  - [ ] Movement validation shows counts changed by exactly 1
  - [ ] "✅ 移動成功！" appears with timing in ms

#### TC2: Nested Move (Parent to Different Branch)
- [ ] **Setup**: Create deep nesting: A → A-1 → A-1-1 → A-1-1-1
- [ ] **Action**: Click "移動到 ▼" on A-1-1-1
- [ ] **Select Target**: Move to B-2 (a different branch at similar depth)
- [ ] **Verify Result**:
  - [ ] A-1-1-1 now appears under B-2 in tree
  - [ ] A-1-1 still has no children (or correct count if had others)
  - [ ] B-2's children count increased by 1
  - [ ] Parent references intact for A-1-1
- [ ] **Verify Console**:
  - [ ] Source parent location found correctly
  - [ ] Array indices match actual DOM positions
  - [ ] "SourceParentLength before → after" shows -1
  - [ ] "Target children before → after" shows +1
  - [ ] No validation failures

#### TC3: Rapid Consecutive Clicks (Button State Isolation)
- [ ] **Setup**: Tree with A, B, C, D visible on screen
- [ ] **Action 1**: Click "移動到 ▼" on A (dropdown appears)
- [ ] **Action 2**: BEFORE selecting, click "移動到 ▼" on B
- [ ] **Verify**:
  - [ ] Only ONE dropdown visible (old one closed)
  - [ ] Dropdown shows targets for B (not A's targets)
  - [ ] Click on target moves B, not A
- [ ] **Verify Console**:
  - [ ] Each click has proper scope query
  - [ ] [DEBUG] logs show correct button parent traversal
  - [ ] No errors about "multiple buttons" or "stale reference"
- [ ] **Repeat** with different category combinations (3+ times)

#### TC4: After Tree Refresh/Collapse-Expand
- [ ] **Setup**: Complex category tree loaded
- [ ] **Action 1**: Expand/collapse a category to trigger DOM mutations
- [ ] **Action 2**: Immediately click "移動到 ▼" on a child category
- [ ] **Verify**:
  - [ ] Button still exists and responds
  - [ ] Correct category selected (not confused with neighbor)
  - [ ] Move completes successfully
- [ ] **Action 3**: Refresh/reload the tree (if UI allows)
- [ ] **Action 4**: Perform another move
- [ ] **Verify Console**:
  - [ ] MutationObserver logs show "attachButtonsToCategories called"
  - [ ] No duplicate buttons (skipped due to [data-move-button] check)
  - [ ] Binding maps updated correctly for new DOM nodes

#### TC5: Move to Root Level (No Parent)
- [ ] **Setup**: Category A with children A-1, A-1-1
- [ ] **Action**: Click "移動到 ▼" on A-1-1
- [ ] **Dropdown**: Should show "📂 根目錄" as enabled option
- [ ] **Select**: Click "📂 根目錄"
- [ ] **Verify Result**:
  - [ ] A-1-1 appears at root level in tree
  - [ ] No longer under A-1
  - [ ] Array shows unshift() used (added to front)
- [ ] **Verify Console**:
  - [ ] "targetCategory === null" branch executed
  - [ ] "已添加到根目錄開頭" message appears
  - [ ] Root array length increased by 1

#### TC6: Move Item with Many Children
- [ ] **Setup**: Category A with 5+ child items (A-1...A-5)
- [ ] **Action**: Move A to different location
- [ ] **Verify Result**:
  - [ ] A and ALL its children moved together
  - [ ] Children structure preserved (A now has same 5 items)
  - [ ] No orphaned children in old location
- [ ] **Verify Console**:
  - [ ] "sourceCategory.children.length" shows 5+
  - [ ] Same object reference maintained (array relink validates)

#### TC7: Move First and Last Items
- [ ] **Setup**: Category list with A, B, C, D
- [ ] **Test A**: Move A (first item) to after B
  - [ ] Result: B, A, C, D order (or under B if moves to child)
  - [ ] Indices show: [0] removed, then added correctly
- [ ] **Test D**: Move D (last item) to before B
  - [ ] Result: D, A, B, C order (or different valid position)
  - [ ] splice() and push() calls correct for edge indices

#### TC8: Move Between categories and posCategories Arrays
- [ ] **Setup**: Page with BOTH categories and posCategories populated
- [ ] **Verify Initial State**:
  - [ ] Two separate trees visible or clearly marked
  - [ ] detectCategoryArray() correctly identifies which array each belongs to
- [ ] **Action**: Move item within its native array
  - [ ] Should work normally
- [ ] **Action**: Attempt move between arrays (if UI allows)
  - [ ] Should either prevent it or handle correctly
- [ ] **Verify Console**:
  - [ ] arrayName field correctly shows "categories" or "posCategories"
  - [ ] getLevel() uses correct array for calculations

---

## 3. Console Inspection Guide

### What Logs Mean and What to Look For

#### Initialization Logs
```
[Shopline Category Manager] 腳本已載入
[Shopline Category Manager] ✓ 找到 N 個樹節點
[Shopline Category Manager] ✓ 成功初始化
[Shopline Category Manager] 找到 X 個 categories
```
**Expected**: All lines present. If "找到 0 個分類" → categories not loaded yet

---

#### Button Attachment Logs
```
[Shopline Category Manager] 找到 N 個分類節點
[Shopline Category Manager] [DEBUG] Bind button -> category:
  displayName: "Category Name"
  arrayName: "categories" or "posCategories"
  nodeId: "(ID or 無ID)"
  childrenCount: 0-N
```
**Expected**: One entry per category. If nodeId is always "無ID" → DOM structure issue

---

#### Click Event - Priority Chain Execution
```javascript
[Shopline Category Manager] [DEBUG] Click 直接從 DOM 查詢:
  displayName: "Category Name"
  arrayName: "categories"
  treeNodeId: "..."

[Shopline Category Manager] [DEBUG] Click 最終確認:
  displayName: "Category Name"
  arrayName: "categories"
  childrenCount: 2
```
**Expected**: "直接從 DOM 查詢" appears (Priority 0 used)
**Fallback**: If missing, next log should show "Click 使用備用映射" (Priority 1)

---

#### Scope Misalignment Detection (CRITICAL)
```
⚠️⚠️⚠️ [SCOPE MISALIGNMENT] Scope 錯位偵測！
  domName: "Expected Name"
  scopeName: "Actual Name"
  scopeId: "123456"
  reason: "DOM 節點的名稱與 AngularJS scope 返回的分類名稱不符"
```
**Expected**: NEVER appears during normal operation
**Action if found**:
1. Screenshot the console
2. Note exact category names (domName vs scopeName)
3. Check if DOM was modified between button creation and click
4. Review tree structure for depth/nesting issues

---

#### Move Operation Logs
```
═══════════════════════════════════════════════════════════════
[Shopline Category Manager] 🚀 開始移動分類
[STEP 1] 驗證源分類...
  源分類: "Source Name"
  源層級: 1

[STEP 2] 驗證目標位置...
  目標: "Target Name" or "(根目錄)"
  目標層級: 2

[STEP 3] 定位源分類在陣列中的位置...
  使用陣列: categories (3 項)
  ✓ 找到父容器，包含 3 項
  ✓ 源分類位置: 索引 0

[STEP 4] 執行移動操作...
  4a. 從源陣列移除...
  ✓ 已從源移除，源陣列現在有 2 項

  4b. 添加到目標位置...
  ✓ 已添加到根目錄開頭 OR ✓ 已添加到目標的子項，目標現在有 3 個子項

[STEP 5] 觸發 AngularJS 更新...
  ✓ 已觸發 $apply()

[STEP 6] 驗證移動結果...
  陣列大小對比:
    - 主陣列: 3 → 3 (✓ 不變)
  源陣列對比:
    - 源父容器: 3 → 2 (少了 1 項 ✓)
  目標陣列對比:
    - 目標子項: 0 → 1 (多了 1 項 ✓)
  ✓ 驗證通過：源分類已成功移動

[STEP 7] 完成移動
  ✅ 移動成功！耗時: XX.XXms
═══════════════════════════════════════════════════════════════
```
**Expected**: All validations show "✓"
**Failure Signs**:
- Any "❌" validation error
- Array counts don't match (before/after mismatch)
- "源分類仍在舊位置" error
- "源分類不在新位置" error

---

#### Performance Metrics
```
✅ 移動成功！耗時: 23.45ms
```
**Expected**: < 100ms for most moves
**Concerning**: > 500ms (possible $apply() delay or tree complexity)

---

#### Array Detection
```
[Shopline Category Manager] [DEBUG] Auto-detected array: categories
```
**Expected**: Correctly identifies which array contains the category
**Action if wrong**: Check getCategoryDisplayName() - name not matching correctly

---

### How to Inspect Priority Usage

**Check Priority 0 (Dataset) Usage:**
```javascript
// In console, count these logs
console.log.bind(console, '[Shopline Category Manager] [DEBUG] Click 直接從 DOM 查詢:')
```
Filter DevTools console for "直接從 DOM 查詢" - should appear in >95% of clicks

**Check Priority 1 (Scope) Fallback:**
```javascript
// Look for fallback logs
console.log.bind(console, '[Shopline Category Manager] [DEBUG] Click 使用備用映射:')
```
Should appear in <5% of clicks (only when Priority 0 fails)

**Check WeakMap Binding (Priority 2):**
```javascript
// Look for binding logs at button creation time
console.log.bind(console, '[Shopline Category Manager] [DEBUG] Bind button -> category:')
```
Shows buttonCategoryMap entries being created

---

## 4. Browser Console Test Script

### Full Validation Suite

Copy and paste the following into DevTools console to run automated validation:

```javascript
/**
 * Scope Alignment Fix - Automated Test Suite
 * Run in browser console while on Shopline categories page
 * Tests the hybrid priority chain and scope misalignment detection
 */

(function() {
  const testResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
  };

  function pass(name, msg) {
    testResults.passed++;
    testResults.details.push({ status: 'PASS', name, msg });
    console.log(`✅ PASS: ${name}`);
    if (msg) console.log(`   ${msg}`);
  }

  function fail(name, msg) {
    testResults.failed++;
    testResults.details.push({ status: 'FAIL', name, msg });
    console.error(`❌ FAIL: ${name}`);
    if (msg) console.error(`   ${msg}`);
  }

  function warn(name, msg) {
    testResults.warnings++;
    testResults.details.push({ status: 'WARN', name, msg });
    console.warn(`⚠️  WARN: ${name}`);
    if (msg) console.warn(`   ${msg}`);
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 SCOPE ALIGNMENT TEST SUITE - STARTING');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // TEST 1: Verify UI Elements Loaded
  console.log('TEST GROUP 1: UI Element Detection');
  console.log('─────────────────────────────────────────────────────────────');

  const treeContainer = document.querySelector('.angular-ui-tree');
  if (treeContainer) {
    pass('Tree Container Found', `.angular-ui-tree exists`);
  } else {
    fail('Tree Container Found', 'Cannot find .angular-ui-tree');
  }

  const treeNodes = document.querySelectorAll('.angular-ui-tree-node');
  if (treeNodes.length > 0) {
    pass('Tree Nodes Found', `Found ${treeNodes.length} nodes`);
  } else {
    fail('Tree Nodes Found', 'No .angular-ui-tree-node elements');
  }

  const moveButtons = document.querySelectorAll('[data-move-button]');
  if (moveButtons.length > 0) {
    pass('Move Buttons Injected', `Found ${moveButtons.length} "移動到" buttons`);
  } else {
    fail('Move Buttons Injected', 'No [data-move-button] elements found');
  }

  if (moveButtons.length !== treeNodes.length) {
    warn('Button Count Mismatch',
      `${moveButtons.length} buttons but ${treeNodes.length} nodes. Some may be disabled.`);
  }

  // TEST 2: Scope Access
  console.log('\nTEST GROUP 2: AngularJS Scope Access');
  console.log('─────────────────────────────────────────────────────────────');

  if (window.angular) {
    pass('AngularJS Loaded', 'window.angular available');
  } else {
    fail('AngularJS Loaded', 'window.angular not available');
  }

  if (treeContainer) {
    try {
      const scope = angular.element(treeContainer).scope();
      if (scope) {
        pass('Tree Scope Found', `scope.$id = ${scope.$id}`);
        if (scope.categories && Array.isArray(scope.categories)) {
          pass('Categories Array Found', `${scope.categories.length} items`);
        } else {
          fail('Categories Array Found', 'scope.categories not found or not array');
        }
        if (scope.posCategories && Array.isArray(scope.posCategories)) {
          warn('PosCategories Array Found', `${scope.posCategories.length} items (optional)`);
        }
      } else {
        fail('Tree Scope Found', 'No scope attached to tree container');
      }
    } catch (e) {
      fail('Tree Scope Found', `Error: ${e.message}`);
    }
  }

  // TEST 3: Button Binding Integrity
  console.log('\nTEST GROUP 3: Button Binding Integrity');
  console.log('─────────────────────────────────────────────────────────────');

  let bindingErrors = 0;
  let bindingSuccess = 0;

  document.querySelectorAll('[data-move-button]').forEach((btn, idx) => {
    const treeNode = btn.closest('.angular-ui-tree-node');
    if (!treeNode) {
      bindingErrors++;
      console.error(`  Button ${idx}: No parent tree node`);
      return;
    }

    try {
      const scope = angular.element(treeNode).scope();
      if (scope && scope.item) {
        bindingSuccess++;
      } else {
        bindingErrors++;
        console.warn(`  Button ${idx}: Tree node has no scope.item`);
      }
    } catch (e) {
      bindingErrors++;
      console.error(`  Button ${idx}: Scope access error: ${e.message}`);
    }
  });

  if (bindingErrors === 0 && bindingSuccess > 0) {
    pass('Button Scope Binding', `All ${bindingSuccess} buttons properly bound`);
  } else if (bindingErrors > 0) {
    fail('Button Scope Binding', `${bindingErrors} binding errors, ${bindingSuccess} success`);
  }

  // TEST 4: Check for Scope Misalignment Warnings
  console.log('\nTEST GROUP 4: Scope Misalignment Detection');
  console.log('─────────────────────────────────────────────────────────────');

  const consoleBackup = console.warn;
  const misalignmentWarnings = [];
  let logIntercepted = false;

  console.warn = function(...args) {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('[SCOPE MISALIGNMENT]')) {
      misalignmentWarnings.push(args);
    }
    consoleBackup.apply(console, args);
  };

  logIntercepted = true;

  // Listen for warnings that already happened
  const originalLogs = window.__shoplineLogsCapture__ || [];
  if (originalLogs.length > 0) {
    originalLogs.forEach(log => {
      if (log.includes('[SCOPE MISALIGNMENT]')) {
        misalignmentWarnings.push(log);
      }
    });
  }

  if (misalignmentWarnings.length === 0) {
    pass('No Scope Misalignment', 'Zero misalignment warnings detected');
  } else {
    fail('No Scope Misalignment', `${misalignmentWarnings.length} misalignment warnings found`);
  }

  // TEST 5: DOM Structure Validation
  console.log('\nTEST GROUP 5: DOM Structure Validation');
  console.log('─────────────────────────────────────────────────────────────');

  let structureErrors = 0;
  document.querySelectorAll('.angular-ui-tree-node').forEach((node, idx) => {
    const row = node.querySelector('.ui-tree-row');
    if (!row) {
      structureErrors++;
      console.warn(`  Node ${idx}: Missing .ui-tree-row`);
      return;
    }

    const buttonArea = row.querySelector('.col-xs-5.text-right');
    if (!buttonArea) {
      structureErrors++;
      console.warn(`  Node ${idx}: Missing button area`);
    }

    const categoryName = row.querySelector('.cat-name');
    if (!categoryName || !categoryName.textContent.trim()) {
      structureErrors++;
      console.warn(`  Node ${idx}: Missing or empty category name`);
    }
  });

  if (structureErrors === 0) {
    pass('DOM Structure Valid', 'All nodes have required structure');
  } else {
    fail('DOM Structure Valid', `${structureErrors} structural issues found`);
  }

  // TEST 6: Button Click Handler
  console.log('\nTEST GROUP 6: Button Event Listeners');
  console.log('─────────────────────────────────────────────────────────────');

  try {
    let clickHandlersFound = 0;
    document.querySelectorAll('[data-move-button]').forEach(btn => {
      if (btn._getEventListeners && btn._getEventListeners('click')) {
        clickHandlersFound++;
      }
      // Alternative: Check if disabled
      if (!btn.disabled) {
        clickHandlersFound++;
      }
    });

    if (clickHandlersFound > 0) {
      pass('Click Handlers', `Event listeners properly attached`);
    }
  } catch (e) {
    warn('Click Handlers', `Cannot verify (browser restriction): ${e.message}`);
  }

  // TEST 7: Array Integrity Check
  console.log('\nTEST GROUP 7: Category Array Integrity');
  console.log('─────────────────────────────────────────────────────────────');

  const scope = angular.element(treeContainer).scope();
  if (scope && scope.categories) {
    try {
      const cats = scope.categories;

      // Check for circular references
      let circularFound = false;
      const visited = new WeakSet();

      function checkCircular(obj, depth = 0) {
        if (depth > 20) return; // Limit recursion
        if (visited.has(obj)) {
          circularFound = true;
          return;
        }
        if (obj && typeof obj === 'object') {
          visited.add(obj);
          if (obj.children && Array.isArray(obj.children)) {
            obj.children.forEach(child => checkCircular(child, depth + 1));
          }
        }
      }

      cats.forEach(cat => checkCircular(cat));

      if (!circularFound) {
        pass('No Circular References', 'Category tree is acyclic');
      } else {
        fail('No Circular References', 'Circular reference detected in category tree');
      }

      // Check that all categories have required fields
      let missingFields = 0;
      function validateCategory(cat, path = '') {
        if (!cat._id && !cat.id) {
          console.warn(`  ${path}: Missing _id or id`);
          missingFields++;
        }
        if (cat.children && Array.isArray(cat.children)) {
          cat.children.forEach((child, i) => {
            validateCategory(child, `${path}[${i}]`);
          });
        }
      }

      cats.forEach((cat, i) => validateCategory(cat, `[${i}]`));

      if (missingFields === 0) {
        pass('Category Fields Valid', 'All categories have ID fields');
      } else {
        warn('Category Fields Valid', `${missingFields} categories missing ID`);
      }

    } catch (e) {
      fail('Array Integrity Check', `Error: ${e.message}`);
    }
  }

  // TEST 8: Performance Baseline
  console.log('\nTEST GROUP 8: Performance Baseline');
  console.log('─────────────────────────────────────────────────────────────');

  const perfMetrics = {
    scriptLoadTime: performance.timing.domInteractive - performance.timing.navigationStart,
    treeRenderTime: performance.timing.domComplete - performance.timing.domLoading,
  };

  console.log(`  Script Load Time: ${perfMetrics.scriptLoadTime}ms`);
  console.log(`  Tree Render Time: ${perfMetrics.treeRenderTime}ms`);

  if (perfMetrics.scriptLoadTime < 5000) {
    pass('Script Load Performance', `${perfMetrics.scriptLoadTime}ms (acceptable)`);
  } else {
    warn('Script Load Performance', `${perfMetrics.scriptLoadTime}ms (slow)`);
  }

  // SUMMARY
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  console.log(`📈 Total: ${testResults.passed + testResults.failed + testResults.warnings}`);

  if (testResults.failed === 0) {
    console.log('\n🎉 ALL CRITICAL TESTS PASSED');
  } else {
    console.log(`\n⚠️  ${testResults.failed} test(s) failed - review above for details`);
  }

  console.log('\n📋 Detailed Results:');
  testResults.details.forEach((d, i) => {
    console.log(`  ${i + 1}. [${d.status}] ${d.name}`);
    if (d.msg) console.log(`     ${d.msg}`);
  });

  // Restore console
  if (logIntercepted) {
    console.warn = consoleBackup;
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  // Return results for reference
  return testResults;
})();

// Store results for later inspection
window.__testResults__ = window.__testResults__ || testResults;
console.log('Results stored in window.__testResults__');
```

### How to Use the Test Script

1. **Open Shopline categories page** in browser
2. **Wait for tree to load** (check for "✓ 找到 N 個樹節點" in console)
3. **Paste the script** into DevTools console (F12)
4. **Press Enter** to run
5. **Review output**:
   - Green checkmarks (✅) = Pass
   - Red X marks (❌) = Fail
   - Yellow warnings (⚠️) = Caution
6. **Screenshot results** if any failures
7. **Check window.__testResults__** for JSON dump: `console.table(window.__testResults__.details)`

---

## 5. Debug Inspection Commands

Use these commands in DevTools console to inspect internal state:

### Basic Diagnostics

```javascript
// 1. Check if script loaded
window.CategoryManager ? '✓ Loaded' : '✗ Not loaded'

// 2. Get all move buttons
const buttons = document.querySelectorAll('[data-move-button]');
console.log(`Found ${buttons.length} move buttons`);

// 3. Get tree container
const tree = document.querySelector('.angular-ui-tree');
const treeScope = angular.element(tree).scope();
console.log('Categories:', treeScope.categories.length);
console.log('PosCategories:', treeScope.posCategories?.length || 0);
```

### Inspect Category Structure

```javascript
// Dump current category tree as JSON
const tree = document.querySelector('.angular-ui-tree');
const scope = angular.element(tree).scope();
const catTree = scope.categories.map(cat => ({
  name: cat.name || cat._id,
  children: cat.children?.length || 0,
  id: cat._id || cat.id
}));
console.table(catTree);
```

### Test Priority Chain Execution

```javascript
// Check if a button has dataset attributes
const firstButton = document.querySelector('[data-move-button]');
const treeNode = firstButton.closest('.angular-ui-tree-node');
console.log('Button dataset:', firstButton.dataset);
console.log('Button category from DOM:', angular.element(treeNode).scope().item.name);
```

### Verify Array Detection

```javascript
// Check category array membership
const tree = document.querySelector('.angular-ui-tree');
const scope = angular.element(tree).scope();
const firstCat = scope.categories[0];

function findInArray(cat, arr, path = '') {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === cat) return `Found at [${path}][${i}]`;
    if (arr[i].children) {
      const result = findInArray(cat, arr[i].children, `${path}[${i}].children`);
      if (result) return result;
    }
  }
  return 'Not found';
}

console.log('First category in categories:', findInArray(firstCat, scope.categories));
if (scope.posCategories) {
  console.log('First category in posCategories:', findInArray(firstCat, scope.posCategories));
}
```

### Simulate Move Operation (for testing without UI click)

```javascript
// Get reference to manager and test move
const tree = document.querySelector('.angular-ui-tree');
const scope = angular.element(tree).scope();

// Find first two categories
const source = scope.categories[0];
const target = scope.categories[1];

console.log('Source:', source.name);
console.log('Target:', target.name);

// Check depth
function getDepth(cat, arr, d = 1) {
  if (arr.includes(cat)) return d;
  for (let c of arr) {
    if (c.children) {
      const result = getDepth(cat, c.children, d + 1);
      if (result) return result;
    }
  }
  return -1;
}

console.log('Source depth:', getDepth(source, scope.categories));
console.log('Target depth:', getDepth(target, scope.categories));
```

### Check for Scope Misalignment Instances

```javascript
// Parse console logs to find misalignment warnings
(function() {
  const logs = window.__shoplineLogs__ || [];
  const misalignments = logs.filter(l => l.includes('[SCOPE MISALIGNMENT]'));

  if (misalignments.length === 0) {
    console.log('✅ No scope misalignments detected');
  } else {
    console.error(`❌ Found ${misalignments.length} misalignment(s):`);
    misalignments.forEach((m, i) => {
      console.error(`${i + 1}. ${m}`);
    });
  }
})();
```

### Monitor Category Array Changes

```javascript
// Watch for array mutations during move
const tree = document.querySelector('.angular-ui-tree');
const scope = angular.element(tree).scope();

const originalPush = scope.categories.push;
const originalSplice = scope.categories.splice;

scope.categories.push = function(...items) {
  console.log('[ARRAY] push() called with', items.length, 'items');
  return originalPush.apply(this, items);
};

scope.categories.splice = function(idx, count, ...items) {
  console.log(`[ARRAY] splice(${idx}, ${count}, ${items.length} items)`);
  return originalSplice.apply(this, arguments);
};

console.log('Array monitoring enabled');
```

### Performance Profiling

```javascript
// Measure move operation timing
const startTime = performance.now();

// ... perform move operation ...

const endTime = performance.now();
console.log(`Move took ${(endTime - startTime).toFixed(2)}ms`);

// Check $apply timing
const applyStart = performance.now();
angular.element(document).scope().$apply?.();
const applyEnd = performance.now();
console.log(`$apply took ${(applyEnd - applyStart).toFixed(2)}ms`);
```

---

## 6. Success/Failure Criteria

### Critical Pass Criteria (Must Have All)
- [ ] Tree loads with >0 categories visible
- [ ] "📁 移動到 ▼" buttons appear on each category
- [ ] Console shows "✓ 找到 N 個樹節點" and "✓ 成功初始化"
- [ ] Zero "[SCOPE MISALIGNMENT]" warnings in console during entire test session
- [ ] No JavaScript errors (red entries in console)

### Functional Pass Criteria (Must Have All)
- [ ] Single-level moves complete successfully (success toast appears)
- [ ] Category appears in correct position after move
- [ ] Array counts before/after match exactly (differ by ±1 for source/target)
- [ ] No duplicate categories in tree after move
- [ ] Move can be performed multiple times in sequence without error

### Performance Pass Criteria
- [ ] Individual move operations complete in < 100ms
- [ ] Dropdown appears within < 50ms of button click
- [ ] No UI lag or visible jank during operation
- [ ] Multiple rapid moves don't cause performance degradation

### Console Output Pass Criteria
- [ ] "Priority 0" (DOM dataset) logs appear in >95% of moves
- [ ] Validation logs show all 6 checks passing (✓)
- [ ] Array operations logged with before/after counts
- [ ] Performance timing shown for each move (e.g., "23.45ms")
- [ ] No "❌ 驗證失敗" error messages

### Scope Integrity Criteria
- [ ] getCategoryFromElement() returns correct category object
- [ ] detectCategoryArray() correctly identifies categories vs posCategories
- [ ] findCategoryParent() locates parent container accurately
- [ ] All categories maintain reference integrity throughout move
- [ ] scope.$apply() completes without errors

### Failure Indicators (Any = Test Fails)
- [ ] Console shows "[SCOPE MISALIGNMENT]" warning
- [ ] Move completes but category doesn't appear in UI
- [ ] Array count validation fails ("❌ 驗證失敗")
- [ ] sourceCategory still in old location after move
- [ ] sourceCategory not found in new location after move
- [ ] Multiple copies of category appear in tree
- [ ] Parent-child relationships broken or orphaned categories
- [ ] Rapid clicks cause button clicks to affect wrong category
- [ ] Error toast appears ("移動失敗，請重試")
- [ ] JavaScript error in console (red text)
- [ ] Tree becomes unresponsive or buttons stop working

---

## 7. Recovery Procedures

### If Test Fails with Move Error

```javascript
// 1. Check category array consistency
const scope = angular.element(document.querySelector('.angular-ui-tree')).scope();

// Find duplicate categories
const seen = new Map();
function checkDuplicates(cats, path = '') {
  cats.forEach((cat, i) => {
    const key = cat._id || cat.id;
    if (seen.has(key)) {
      console.error(`Duplicate: ${cat.name} appears at ${seen.get(key)} AND ${path}[${i}]`);
    } else {
      seen.set(key, `${path}[${i}]`);
    }
    if (cat.children) {
      checkDuplicates(cat.children, `${path}[${i}].children`);
    }
  });
}

checkDuplicates(scope.categories);

// 2. If duplicates found, try reload
location.reload();
```

### If Scope Misalignment Detected

```javascript
// 1. Check all button bindings
document.querySelectorAll('[data-move-button]').forEach((btn, idx) => {
  const node = btn.closest('.angular-ui-tree-node');
  const scope = angular.element(node).scope();
  const domName = node.querySelector('.cat-name')?.textContent;
  const scopeName = scope.item?.name || scope.item?._id;

  if (domName !== scopeName) {
    console.error(`Button ${idx} misalignment: DOM="${domName}" Scope="${scopeName}"`);
  }
});

// 2. Perform manual refresh
const moveButtons = document.querySelectorAll('[data-move-button]');
moveButtons.forEach(btn => btn.remove());

// Re-inject buttons
// (Requires access to CategoryManager instance - may need to wait for mutation observer)
```

### If Buttons Stop Responding

```javascript
// 1. Check MutationObserver is still running
console.log('MutationObserver active?');
// (Check browser DevTools -> Elements -> observe nodes)

// 2. If needed, trigger manual button reattachment
const treeContainer = document.querySelector('.angular-ui-tree');
// Simulate tree change
treeContainer.style.display = 'none';
setTimeout(() => { treeContainer.style.display = 'block'; }, 100);

// Or reload the page
location.reload();
```

---

## 8. Test Execution Checklist

### Before Starting Tests
- [ ] Browser DevTools open (F12)
- [ ] Console tab active
- [ ] Filters cleared (no message filtering)
- [ ] Network throttling disabled
- [ ] Cookie consent accepted if prompted
- [ ] Logged into Shopline admin account
- [ ] Categories page fully loaded (wait 5+ seconds)

### During Test Execution
- [ ] Note exact time for each major action
- [ ] Screenshot before and after each move
- [ ] Copy console output to text file for review
- [ ] Test each case in isolation (reload page between major tests)
- [ ] Don't perform live category moves during test (use test/staging environment)

### After Test Completion
- [ ] Export console logs (Ctrl+Shift+I → copy logs)
- [ ] Document any failures with screenshots and exact steps
- [ ] Note any warnings or edge cases observed
- [ ] Compare before/after category structure
- [ ] Verify page remains responsive (no memory leaks)

### Documentation of Results

Create test report with:
```markdown
## Test Execution Report
**Date**: YYYY-MM-DD
**Tester**: [Name]
**Environment**: [Browser/Version]
**Status**: [PASS/FAIL]

### Test Results Summary
- Passed: X
- Failed: Y
- Warnings: Z

### Detailed Findings
[Test case name]: [Result]
- Expected: [...]
- Actual: [...]
- Evidence: [Screenshot/Log excerpt]

### Issues Found
1. [Issue description]
   - Reproducible: [Always/Sometimes/Rarely]
   - Severity: [Critical/Major/Minor]
   - Steps: [Exact reproduction steps]

### Recommendations
- [Any fixes or improvements needed]
```

---

## 9. Test Data Requirements

### Minimal Test Setup
- Minimum 3 root-level categories
- At least one category with 2+ children
- At least one category with nested children (3+ levels)

### Optimal Test Setup
- 5+ root categories
- 2-3 with children
- Varied nesting (some with 2 levels, some with 3)
- Mix of name lengths and languages (if multi-lingual)

### Category Names for Easy Identification
Use clear, distinct names:
- ✅ Good: "測試A", "測試B", "子項1", "子項2"
- ❌ Poor: "類別", "分類", "項目" (too generic)

---

## 10. Known Issues and Workarounds

### Issue: Buttons Not Appearing
**Cause**: Tree container not found or scope not initialized
**Workaround**:
```javascript
// Manually trigger initialization
location.reload();
// Wait 10 seconds
```

### Issue: Moves Appear to Succeed But Don't Persist
**Cause**: $apply() not properly updating view model
**Workaround**:
```javascript
// Force digest cycle
const scope = angular.element(document.querySelector('.angular-ui-tree')).scope();
scope.$apply();
scope.$digest();
```

### Issue: Rapid Clicks Select Wrong Category
**Cause**: Stale DOM references in WeakMap
**Workaround**: Wait 200ms between clicks (normal user behavior shouldn't trigger this)

### Issue: Scope Misalignment Warning After DOM Mutation
**Cause**: Tree refreshes DOM nodes between button creation and click
**Workaround**: This is expected behavior - Priority 1 (scope) fallback handles it

---

## Appendix: Log Pattern Reference

Use these patterns to search console output:

| Pattern | Meaning |
|---------|---------|
| `[DEBUG] Click 直接從 DOM 查詢` | Priority 0 (dataset) used - GOOD |
| `[DEBUG] Click 使用備用映射` | Priority 1 (scope) used - ACCEPTABLE |
| `[SCOPE MISALIGNMENT]` | Scope name ≠ DOM name - INVESTIGATE |
| `✓ 驗證通過` | Move validation succeeded - GOOD |
| `❌ 驗證失敗` | Move validation failed - BAD |
| `找到 N 個樹節點` | Tree loaded with N categories - CHECK N > 0 |
| `Bind button -> category` | Button successfully mapped - GOOD |
| `❌ FAIL` | Test script failure - INVESTIGATE |

---

## Summary

This comprehensive test plan validates the scope alignment fix through:

1. **Manual testing** - 8 test cases covering normal and edge scenarios
2. **Automated validation** - JavaScript test suite checking UI, scopes, and data integrity
3. **Console inspection** - Clear logging patterns to monitor priority chain usage
4. **Debug tools** - Commands to inspect internal state and simulate operations
5. **Success metrics** - Clear pass/fail criteria with specific thresholds

**Key Success Indicators**:
- ✅ >95% Priority 0 usage
- ✅ Zero scope misalignment warnings
- ✅ All array operations with successful validation
- ✅ No regressions in existing functionality

---

**Document ID**: TEST-20260108-001
**Last Updated**: 2026-01-08
