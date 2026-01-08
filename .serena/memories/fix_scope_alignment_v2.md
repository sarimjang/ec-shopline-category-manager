# Scope Alignment Fix v2 (2026-01-08)

## Problem Identified

Log analysis from `ref/0108-01.log` revealed **3 compounding issues**:

### Issue 1: Variable Capture Timing Bug
- Location: `getCategoryFromElement()` lines 546-559
- Bug: `nodeNameEl` captured with `const` BEFORE `nodeEl` update, never re-captured
- Result: DOM name validation uses stale reference

### Issue 2: Nested Node Selector Issue
- Selector `.ui-tree-row .cat-name` could match nested descendants
- Should use `:scope >` to select only immediate children

### Issue 3: No Fallback When Scope Fails
- If `getCategoryFromElement()` returns null due to scope mismatch
- Button was skipped instead of using DOM name fallback

## Fixes Applied (+87 lines, -3 lines)

### Fix 1: `findCategoryByName()` Helper (Lines 149-196)
- New method to find category by DOM name (bypasses Angular scope entirely)
- Searches both `categories` and `posCategories` arrays
- Returns `{category, array, arrayName}` or null

### Fix 2: Button Attachment DOM Name Fallback (Lines 319-347)
- Step 1: Get DOM category name (always correct)
- Step 2: Try scope-based lookup
- Step 3: If scope fails, use DOM name fallback
- Step 4: Extra validation - if scope name != DOM name, re-lookup by name

### Fix 3: Stale Reference Fix (Lines 547-560)
- Changed `const nodeNameEl` to `let nodeNameEl`
- Added `:scope >` selector for immediate children only
- Re-capture `nodeNameEl` after `nodeEl` update

## Expected Behavior After Fix

1. DOM name is ALWAYS correct (rendered from actual data)
2. Even if Angular scope is misaligned, we use DOM name to find correct category
3. Button dataset stores correct category ID
4. Click handler uses correct category

## Testing Instructions

1. Create nested categories: A > A-1, B > B-1
2. Click "移動到" on A-1
3. Check console for `[FIX] Scope mismatch detected!` messages
4. Verify A-1 moves (not A or B)
