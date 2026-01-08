# Implementation Guide: Scope Alignment Fix

## Overview

This document details the exact code changes needed to implement the hybrid approach (Option B) for fixing the category move scope misalignment issue.

---

## Change 1: Store Category Info in DOM Attributes

### File
`src/shopline-category-manager.user.js`

### Function
`attachButtonsToCategories()` (lines 186-319)

### Current Code (Problematic)
```javascript
const moveButton = document.createElement('button');
moveButton.className = 'shopline-move-btn btn btn-outline-secondary btn-sm';
moveButton.textContent = '移動到';

// Store in WeakMap (problematic - captures stale data)
this.buttonCategoryMap.set(moveButton, categoryInfo);

// Register click handler
moveButton.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();

  // Relies on WeakMap (may have stale scope)
  const boundCategoryInfo = this.buttonCategoryMap.get(moveButton);
  // ...
});
```

### New Code (Fixed)
```javascript
const moveButton = document.createElement('button');
moveButton.className = 'shopline-move-btn btn btn-outline-secondary btn-sm';
moveButton.textContent = '移動到';

// 新增：將分類資訊存儲在 DOM attributes
moveButton.dataset.categoryId = categoryInfo.category.id;
moveButton.dataset.categoryName = this.getCategoryDisplayName(categoryInfo.category);
moveButton.dataset.categoryArray = categoryInfo.arrayName;

// Store in WeakMap (still keep as fallback)
this.buttonCategoryMap.set(moveButton, categoryInfo);

// Register click handler
moveButton.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();

  // ... rest of handler
});
```

### Why This Works
- DOM attributes are stable and don't depend on Angular scope
- Even if scope is misaligned, attributes contain the correct category info
- Attributes persist through tree updates

### Verification
```bash
# In browser DevTools console:
document.querySelectorAll('.shopline-move-btn').forEach(btn => {
  console.log({
    categoryId: btn.dataset.categoryId,
    categoryName: btn.dataset.categoryName,
    categoryArray: btn.dataset.categoryArray
  });
});
```

---

## Change 2: Prioritize DOM Attributes in Click Handler

### File
`src/shopline-category-manager.user.js`

### Function
Button click event handler (lines 254-304)

### Current Code (Problematic)
```javascript
moveButton.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();

  let categoryInfo = null;
  const button = e.currentTarget;
  const treeNode = button.closest('.angular-ui-tree-node');

  // Only queries scope (potentially misaligned)
  if (treeNode) {
    const scope = angular.element(treeNode).scope();
    if (scope && scope.item) {
      // ...
    }
  }

  // Fallback to WeakMap
  if (!categoryInfo) {
    const boundCategoryInfo = this.buttonCategoryMap.get(button);
    categoryInfo = boundCategoryInfo || this.getCategoryFromElement(button);
  }
});
```

### New Code (Fixed)
```javascript
moveButton.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();

  let categoryInfo = null;
  const button = e.currentTarget;

  // 🆕 優先級 1: 嘗試從 DOM attributes 讀取（穩定、不受 scope 影響）
  const categoryId = button.dataset.categoryId;
  const categoryName = button.dataset.categoryName;
  const categoryArray = button.dataset.categoryArray;

  if (categoryId && categoryName && categoryArray) {
    // 從 dataset 直接構造 categoryInfo
    const category = this.findCategoryById(categoryId);
    if (category) {
      categoryInfo = {
        category: category,
        array: this[categoryArray],  // e.g., this.categories or this.posCategories
        arrayName: categoryArray,
      };
      console.log('[Shopline Category Manager] [INFO] Using DOM attributes:', {
        method: 'DOM attributes',
        categoryName: categoryName,
        categoryId: categoryId,
      });
    }
  }

  // 🆕 優先級 2: 如果 dataset 失敗，嘗試從 scope 查詢（備用）
  if (!categoryInfo) {
    const treeNode = button.closest('.angular-ui-tree-node');
    if (treeNode) {
      const scope = angular.element(treeNode).scope();
      if (scope && scope.item) {
        const arrayInfo = this.detectCategoryArray(scope.item);
        categoryInfo = {
          category: scope.item,
          array: arrayInfo.array,
          arrayName: arrayInfo.arrayName,
        };
        console.log('[Shopline Category Manager] [WARN] Fallback to scope query:', {
          method: 'scope query (fallback)',
          categoryName: this.getCategoryDisplayName(scope.item),
        });
      }
    }
  }

  // 🆕 優先級 3: 最後才用 WeakMap（舊方法，最不可信）
  if (!categoryInfo) {
    const boundCategoryInfo = this.buttonCategoryMap.get(button);
    categoryInfo = boundCategoryInfo || this.getCategoryFromElement(button);
    if (categoryInfo) {
      console.log('[Shopline Category Manager] [WARN] Fallback to WeakMap:', {
        method: 'WeakMap',
        categoryName: this.getCategoryDisplayName(categoryInfo.category),
      });
    }
  }

  // 驗證是否成功獲取分類資訊
  if (!categoryInfo) {
    console.error('[Shopline Category Manager] ❌ Failed to identify category after all attempts');
    return;
  }

  // 接下來的邏輯繼續...
  this.showMoveDropdown(button, categoryInfo);
});
```

### Key Changes
1. Try DOM attributes first (most reliable)
2. Fall back to scope query if attributes missing
3. Fall back to WeakMap if scope query fails
4. Log which method was used for debugging
5. Add explicit success/failure check

### Why This Works
- DOM attributes are always correct (set at button creation)
- If attributes work, we never touch problematic scope
- If attributes fail (edge case), scope query is available
- Logging helps diagnose which path was taken

---

## Change 3: Add Scope Misalignment Detection

### File
`src/shopline-category-manager.user.js`

### Function
`getCategoryFromElement()` (lines 325-382)

### Current Code (Partial Implementation)
```javascript
if (scope && scope.item) {
  const itemName = this.getCategoryDisplayName(scope.item);
  const domCategoryName = nodeNameEl?.textContent?.trim() || '';

  // Basic validation exists
  if (domCategoryName && itemName !== domCategoryName) {
    console.error('[Shopline Category Manager] ⚠️⚠️⚠️ [SCOPE MISALIGNMENT] Scope 錯位偵測！', {
      domName: domCategoryName,
      scopeName: itemName,
      scopeId: scope.$id,
      nodeClass: nodeEl.className,
      reason: 'DOM 節點的名稱與 AngularJS scope 返回的分類名稱不符',
    });
  }
  return scope.item;
}
```

### Enhanced Code (More Detailed)
```javascript
/**
 * 從 DOM 元素查詢分類（帶驗證層）
 * 檢測 scope 是否與 DOM 對齊
 */
getCategoryFromElement(element) {
  const nodeEl = element.closest('.angular-ui-tree-node');
  const nodeNameEl = nodeEl?.querySelector('.node-label');

  if (!nodeEl || !nodeNameEl) {
    console.warn('[Shopline Category Manager] Cannot find tree node');
    return null;
  }

  const scope = angular.element(nodeEl).scope();
  if (scope && scope.item) {
    const itemName = this.getCategoryDisplayName(scope.item);
    const domCategoryName = nodeNameEl.textContent?.trim() || '';

    // 🆕 詳細的對齊驗證
    if (domCategoryName && itemName !== domCategoryName) {
      const misalignmentData = {
        domName: domCategoryName,
        scopeName: itemName,
        scopeId: scope.$id,
        nodeClass: nodeEl.className,
        nodeId: nodeEl.id,
        reason: 'DOM 節點的名稱與 AngularJS scope 返回的分類名稱不符',
        timestamp: new Date().toISOString(),
        severity: 'CRITICAL',  // 標記為嚴重
      };

      // 🆕 記錄詳細的 misalignment 信息
      this.scopeMisalignmentLog = this.scopeMisalignmentLog || [];
      this.scopeMisalignmentLog.push(misalignmentData);

      // 🆕 發出警告（但不阻止操作）
      console.error(
        '[Shopline Category Manager] ⚠️⚠️⚠️ [SCOPE MISALIGNMENT DETECTED]',
        misalignmentData
      );

      // 🆕 如果是從 DOM attributes 補救的情況，記錄補救信息
      console.warn(
        `[Shopline Category Manager] Scope misalignment but DOM attributes rescued us. ` +
        `Expected: "${domCategoryName}", Got from scope: "${itemName}"`
      );

      // 不返回错误的 scope，因为我们已经用 DOM attributes 了
      // 這行代碼實際上可能不會被執行（因為我們優先用 DOM attributes）
      // 但保留作為備用
    }

    return scope.item;
  }

  return null;
}
```

### Why This Helps
- Documents misalignment incidents with full context
- Enables trend analysis (how often does it happen?)
- Helps prepare Option A decision (if misalignment is frequent)
- Provides ammunition for bug reporting if needed

---

## Change 4: Add Helper Function to Find Category by ID

### File
`src/shopline-category-manager.user.js`

### New Function (Add before `attachButtonsToCategories`)
```javascript
/**
 * 根據 ID 查詢分類
 * 搜尋 this.categories 和 this.posCategories
 */
findCategoryById(categoryId) {
  // 搜尋主分類陣列
  const findInArray = (arr) => {
    if (!arr) return null;
    for (const item of arr) {
      if (item.id === categoryId) return item;
      if (item.children) {
        const found = findInArray(item.children);
        if (found) return found;
      }
    }
    return null;
  };

  // 優先搜尋 this.categories
  let result = findInArray(this.categories);
  if (result) return result;

  // 再搜尋 this.posCategories
  result = findInArray(this.posCategories);
  if (result) return result;

  return null;
}
```

### Why This Works
- ID-based lookup is stable (doesn't depend on DOM or scope)
- Recursive search handles any nesting level
- Returns actual object reference for manipulation

---

## Implementation Sequence

### Step 1: Add Helper Function
1. Add `findCategoryById()` function
2. Test in console: `this.findCategoryById(someId)` works

### Step 2: Modify `attachButtonsToCategories()`
1. Add `moveButton.dataset.*` assignments
2. Keep existing WeakMap for compatibility
3. Log to verify attributes are set

### Step 3: Modify Click Handler
1. Reorder logic to prioritize DOM attributes
2. Add fallback chain (attributes → scope → WeakMap)
3. Add detailed logging for each path
4. Test clicking buttons, check console logs

### Step 4: Enhance Scope Detection
1. Enhance `getCategoryFromElement()` with better validation
2. Add misalignment tracking
3. Test by triggering moves, watch for warnings

### Step 5: Test Thoroughly
1. Run test cases TC1-TC4
2. Verify no console errors
3. Verify moves work correctly
4. Check for misalignment warnings

---

## Rollback Plan

If implementation has issues:

### Quick Rollback
```bash
git diff src/shopline-category-manager.user.js  # Review changes
git checkout -- src/shopline-category-manager.user.js  # Revert
```

### Decision Points
- ✓ If DOM attributes work consistently: Stay with this approach
- ⚠️ If scope fallback needed frequently: Prepare Option A
- ❌ If major issues found: Activate Option A (complete bypass)

---

## Success Criteria

### Code Quality
- [ ] All changes follow existing code style
- [ ] Console logs are informative but not spammy
- [ ] Error handling is defensive (never crashes)
- [ ] No breaking changes to existing functionality

### Functionality
- [ ] Child items move to correct destination
- [ ] Parent items stay in place
- [ ] Multiple array types work (categories, posCategories)
- [ ] Tree structure maintained after move

### Debugging
- [ ] Clear logs showing which method was used
- [ ] Scope misalignment detected and logged
- [ ] Easy to trace problems to specific code path
- [ ] Enough info to make Option A decision

---

## Next Steps

1. ✅ Review this guide with user
2. ⏳ Implement Change 1 (DOM attributes)
3. ⏳ Implement Change 2 (click handler reordering)
4. ⏳ Implement Change 3 (scope detection)
5. ⏳ Implement Change 4 (helper function)
6. ⏳ Run full test suite
7. ⏳ Commit with detailed message

---

## Questions to Clarify

- Should we log every single click, or only on misalignment?
- How many misalignment incidents before we activate Option A?
- Should we add a user-facing message if scope is misaligned?
- Any specific testing environment requirements?
