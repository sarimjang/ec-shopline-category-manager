# Move Operation Validation Test Plan

**Task**: lab_20260107_chrome-extension-shopline-category-nq7
**Title**: [migrate-greasemonkey-logic] 7. Move Operation Validation
**Status**: In Progress
**Date**: 2026-01-28

## Overview

This test plan verifies all category move scenarios and edge cases to ensure the Shopline Category Manager correctly handles:
1. Moving to root directory (targetCategory = null)
2. Moving to Level 2 parent category
3. Moving to Level 1 parent category
4. Preventing moves to Level 3 (disabled options)
5. Preventing self-moves
6. Preventing ancestor-to-descendant moves (circular prevention)
7. All 8 move steps logged to console
8. Boundary conditions

---

## Key Code References

### isDescendant() - Line 36
Checks if a category is a descendant of another.

```javascript
function isDescendant(potentialAncestor, potentialDescendant) {
  const descendants = getAllDescendants(potentialAncestor);
  return descendants.some((category) => category === potentialDescendant);
}
```

**Purpose**: Prevents circular moves (moving ancestor to descendant)

### getLevel() - Line ~2000+
Returns the level of a category (1=root, 2=child of root, 3=grandchild, etc.)

```javascript
getLevel(category, categoriesArray = null) {
  if (!categoriesArray) {
    const arrayInfo = this.detectCategoryArray(category);
    categoriesArray = arrayInfo.array;
  }
  return getCategoryLevel(categoriesArray, category);
}
```

**Purpose**: Determines category depth for validation

### getValidMoveTargets() - Line 1623
Builds the dropdown menu of valid move targets with proper filtering.

```javascript
getValidMoveTargets(category, categoriesArray = null) {
  // Builds list of valid targets, excluding:
  // - Self
  // - Ancestors (prevents cycles)
  // - Level 3 categories (can't have children)
}
```

---

## Test Scenarios

### Test 1: Move to Root Directory (targetCategory = null)

**Setup**:
- Create a 3-level deep category structure:
  - Level 1: "Electronics"
    - Level 2: "Phones"
      - Level 3: "Smartphones"

**Action**:
- Click "Move" on "Smartphones" (Level 3)
- Select "📂 Root Directory" from dropdown

**Expected Results**:
1. Dropdown should show "📂 Root Directory" as an enabled option
2. Category is removed from "Phones" children
3. Category is added to root level (categoriesArray.unshift())
4. Console shows: `[STEP 2] ✓ 已添加到根目錄開頭`
5. AngularJS $apply() triggered to update UI
6. Move stats updated and broadcast to popup

**Verification Checklist**:
- [ ] UI reflects root-level position
- [ ] Console logs all 8 steps
- [ ] No errors in console
- [ ] Stats incremented

---

### Test 2: Move to Level 2 Parent Category

**Setup**:
- Existing category structure:
  - Level 1: "Electronics"
    - Level 2: "Phones"
      - Level 3: "Smartphones"
    - Level 2: "Tablets"

**Action**:
- Click "Move" on "Smartphones" (Level 3)
- Select "Tablets" (Level 2 sibling's parent)

**Expected Results**:
1. "Smartphones" removed from "Phones.children"
2. "Smartphones" added to "Tablets.children"
3. Level updates from 3 to 3 (still grandchild)
4. Console shows:
   - `[STEP 1] 驗證源分類` - sourceLevel = 3
   - `[STEP 2] 驗證目標位置` - targetLevel = 2 (parent is "Electronics")
   - `[STEP 4] 執行移動操作` - source removed, target updated

**Verification Checklist**:
- [ ] Category visible under "Tablets"
- [ ] No longer visible under "Phones"
- [ ] Level correctly computed
- [ ] Console logs proper step sequence

---

### Test 3: Move to Level 1 Parent Category

**Setup**:
- Same structure as Test 2

**Action**:
- Click "Move" on "Smartphones"
- Select "Electronics" (Level 1 root-level parent)

**Expected Results**:
1. "Smartphones" removed from "Phones.children"
2. "Smartphones" added to "Electronics.children"
3. Becomes a direct child of root (same as "Phones", "Tablets")
4. Console shows proper level transitions

**Verification Checklist**:
- [ ] Category shown as sibling to "Phones"
- [ ] At same indentation level
- [ ] Console logs correct levels

---

### Test 4: Prevent Move to Level 3 (Disabled Options)

**Setup**:
- Structure with Level 3 targets:
  - Level 1: "Electronics"
    - Level 2: "Phones"
      - Level 3: "Smartphones"
        - Level 4: "5G Phones" (if possible)

**Action**:
- Click "Move" on any category
- Look for Level 3 options in dropdown

**Expected Results**:
1. Dropdown inspection code from addTargetCategoriesRecursively (line 1722-1761):
   ```javascript
   const targetLevel = this.getLevel(cat);
   const isLevel3 = targetLevel === 3;

   if (isLevel3) {
     console.log(`  [✗] 排除「${displayName}」: Level ${targetLevel} (最深層級，不能再有子項)`);
   }

   options.push({
     ...
     disabled: isLevel3,  // ← KEY: Option is disabled
   });
   ```

2. Level 3 categories appear in dropdown with `disabled: true`
3. UI shows them grayed out/disabled
4. Clicking disabled option has no effect
5. Console shows exclusion reason

**Verification Checklist**:
- [ ] Level 3 items appear in dropdown
- [ ] Level 3 items are visually disabled
- [ ] Clicking disabled item does nothing
- [ ] Console logs "最深層級，不能再有子項"

---

### Test 5: Prevent Self-Move

**Setup**:
- Any category in the tree

**Action**:
- Click "Move" on category
- Try to select the same category (if possible in UI)

**Expected Results**:
From addTargetCategoriesRecursively code (line 1739-1741):
```javascript
if (cat === currentCategory) {
  console.log(`  [✗] 排除「${displayName}」: 不能移動到自己`);
  return; // ← Item never added to options
}
```

1. Category itself never appears in dropdown options
2. No option exists to move-to-self
3. Console shows exclusion reason

**Verification Checklist**:
- [ ] Self not in dropdown
- [ ] Console logs "不能移動到自己"

---

### Test 6: Prevent Ancestor-to-Descendant Moves (Circular Prevention)

**Setup**:
- Structure:
  - Level 1: "Electronics"
    - Level 2: "Phones"
      - Level 3: "Smartphones"

**Action**:
- Click "Move" on "Electronics" (Level 1)
- Try to move it to "Phones" or "Smartphones"

**Expected Results**:
From addTargetCategoriesRecursively code (line 1743-1746):
```javascript
if (isDescendant(cat, currentCategory)) {
  console.log(`  [✗] 排除「${displayName}」: 是源分類的祖先 (防止迴圈)`);
  return;
}
```

1. "Phones" and "Smartphones" do NOT appear in dropdown
2. Circular move is prevented at UI level
3. Console shows isDescendant check results

**Verification Checklist**:
- [ ] Descendants not in dropdown
- [ ] Console logs "是源分類的祖先 (防止迴圈)"

---

### Test 7: Verify All 8 Move Steps Logged

**Action**:
- Perform any valid move operation
- Check browser console

**Expected Steps** (from moveCategoryUsingScope, line ~1860+):
1. `[STEP 1] 驗證源分類` - Source validation
2. `[STEP 2] 驗證目標位置` - Target validation
3. `[STEP 3] 定位源分類在陣列中的位置` - Locate source in array
4. `[STEP 4] 執行移動操作` - Perform move
   - 4a. Remove from source
   - 4b. Add to target
5. `[STEP 5] 觸發 AngularJS $apply()` - Update DOM
6. `[STEP 6] 計算節省的時間` - Calculate time saved
7. `[STEP 7] 更新統計並存儲` - Update stats
8. `[STEP 8] 廣播統計到 popup` - Broadcast to popup

**Verification Checklist**:
- [ ] All 8 steps appear in console
- [ ] Steps appear in correct order
- [ ] No errors between steps
- [ ] Final broadcast message appears

---

### Test 8: Boundary Conditions

#### 8a: Move deep category with children
**Setup**:
- Level 2 category with 5+ children

**Action**:
- Move to different parent

**Verification**:
- [ ] All children move with parent
- [ ] Children structure intact
- [ ] No orphaned categories

#### 8b: Move between different category arrays
**Setup**:
- Both `categories` and `posCategories` populated

**Action**:
- Move category between arrays

**Verification**:
- [ ] Correct array detected
- [ ] Source and target arrays correct
- [ ] Console shows correct arrayName

#### 8c: Move when parent has no children yet
**Setup**:
- Target category with no children

**Action**:
- Move category to this target

**Expected Code Behavior** (line 1971-1975):
```javascript
if (!targetCategory.children) {
  targetCategory.children = [];
  console.log('  ✓ 目標首次初始化子項陣列');
}
targetCategory.children.push(sourceCategory);
```

**Verification**:
- [ ] children array created if needed
- [ ] Console logs initialization
- [ ] Move completes successfully

---

## Console Log Validation

### Expected Console Output Format

```
═══════════════════════════════════════════════════════════════
[Shopline Category Manager] 📋 開始構建移動目標選單
─────────────────────────────────────────────────────────────
[DEBUG] 來源分類: {name: "...", currentLevel: X, hasChildren: true/false, ...}
[DEBUG] 陣列信息: {arraySize: N, firstItems: [...]}
[DEBUG] 根目錄選項: {disabled: true/false, reason: "..."}
[DEBUG] 選單生成完成: {totalOptions: N, enabledCount: M}
═══════════════════════════════════════════════════════════════

[Move execution begins...]

═══════════════════════════════════════════════════════════════
[Shopline Category Manager] 🚀 開始移動分類
─────────────────────────────────────────────────────────────
[STEP 1] 驗證源分類...
  源分類: "..."
  源層級: X
[STEP 2] 驗證目標位置...
  目標: "..." or "(根目錄)"
  目標層級: Y
[STEP 3] 定位源分類在陣列中的位置...
[STEP 4] 執行移動操作...
  4a. 從源陣列移除...
  ✓ 已從源移除
  4b. 添加到目標位置...
  ✓ 已添加到目標
[STEP 5] 觸發 AngularJS $apply()...
  ✓ AngularJS $apply() 觸發
[STEP 6] 計算節省的時間...
  時間: X.XXs
[STEP 7] 更新統計並存儲...
  統計: {totalMoves: N, totalTimeSaved: X.XXs}
[STEP 8] 廣播統計到 popup...
  ✓ 廣播完成
═══════════════════════════════════════════════════════════════
```

---

## Test Results Summary

| Test # | Scenario | Status | Issues | Notes |
|--------|----------|--------|--------|-------|
| 1 | Move to root | ☐ | | |
| 2 | Move to L2 parent | ☐ | | |
| 3 | Move to L1 parent | ☐ | | |
| 4 | Prevent L3 moves | ☐ | | |
| 5 | Prevent self-move | ☐ | | |
| 6 | Prevent circular | ☐ | | |
| 7 | 8 steps logged | ☐ | | |
| 8a | Deep category | ☐ | | |
| 8b | Array detection | ☐ | | |
| 8c | Init children | ☐ | | |

---

## Code Validation Points

### Critical Validation Functions

1. **isDescendant()** (Line 36)
   - [ ] Returns true for descendants
   - [ ] Returns false for non-descendants
   - [ ] Handles null/undefined inputs
   - [ ] Used in getValidMoveTargets()

2. **getLevel()** (Line ~2000)
   - [ ] Returns 1 for root
   - [ ] Returns 2 for children of root
   - [ ] Returns 3+ for deeper levels
   - [ ] Handles missing categoriesArray

3. **getValidMoveTargets()** (Line 1623)
   - [ ] Excludes self
   - [ ] Excludes ancestors
   - [ ] Excludes Level 3 targets
   - [ ] Sets disabled flag correctly
   - [ ] Logs all exclusions

4. **addTargetCategoriesRecursively()** (Line 1722)
   - [ ] Processes all categories
   - [ ] Maintains depth tracking
   - [ ] Respects isLevel3 constraint
   - [ ] Logs reasons for exclusions

5. **moveCategoryUsingScope()** (Line 1857)
   - [ ] Validates source
   - [ ] Validates target
   - [ ] Executes removal
   - [ ] Executes addition
   - [ ] Triggers $apply()
   - [ ] Updates stats
   - [ ] Broadcasts changes
   - [ ] Handles errors

---

## Edge Cases to Verify

- [ ] Empty children arrays
- [ ] Single category in root
- [ ] Deeply nested structures (L4+)
- [ ] Move operation on category with many children
- [ ] Rapid successive moves (race condition prevention)
- [ ] Move with scope.$apply() already in progress
- [ ] API response timing
- [ ] Network errors during move

---

## Regression Tests

Ensure previous functionality still works:
- [ ] Category creation
- [ ] Category deletion
- [ ] Search functionality
- [ ] Stats tracking
- [ ] Popup display
- [ ] Storage persistence
- [ ] Cross-extension messaging

---

## Notes

- All 8 steps should be logged to browser console for debugging
- Each test should verify both UI changes and console logs
- Console logs serve as detailed audit trail
- Move operations should be atomic (all or nothing)
- Race conditions prevented by disabling all buttons during move

---

## References

- Main file: `src/content/content.js`
- Related functions:
  - moveCategory() - Entry point
  - moveCategoryUsingScope() - Main implementation
  - getValidMoveTargets() - Validation and options
  - saveCategoryOrderingToServer() - API call
  - rollbackMove() - Error handling
