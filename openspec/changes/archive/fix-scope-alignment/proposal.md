# Change: Fix Angular Scope Alignment Issue in Category Move

## Why

When users click "Move to" button on child items (e.g., "A-1"), the entire parent category "A" and all its children are moved together instead of just the child item.

**Root Cause**: AngularJS scope-DOM binding misalignment
- `angular.element(treeNode).scope()` returns incorrect scope objects
- Evidence: DOM shows "測試分類A-1" but scope returns "測試分類B"
- This causes wrong categories to be selected for moving

## What Changes

### Phase 1: Bypass Angular Scope Queries (Hybrid Approach - Recommended)
1. Store category info in DOM attributes (`moveButton.dataset.categoryId`, etc.)
2. Modify click handler to prioritize DOM attributes over scope queries
3. Add scope query as fallback method
4. Add validation layer to detect scope misalignment
5. Comprehensive testing (single move, nested move, rapid clicks, tree operations)

### Phase 2: Fallback & Diagnostics
- If Phase 1 succeeds, keep as-is (safest)
- If issues found, prepare Option A (complete scope bypass)
- Add permanent diagnostics to catch future scope issues

## Impact

- **Affected Code**:
  - `src/shopline-category-manager.user.js` (lines 99-382 for button binding/clicking, lines 791-980 for move operations)
- **No Breaking Changes**: Pure bug fix, functionality unchanged
- **Risk Level**: LOW (hybrid approach with fallback)
- **Expected Success Rate**: 95% (with proper implementation)
- **Work Estimate**: 2-3 hours

## Verification Strategy

### Test Cases
- ✓ Move single-level category to another parent
- ✓ Move nested child category (A-1 to B)
- ✓ Move to root level
- ✓ Rapid consecutive button clicks
- ✓ Move after tree expand/collapse operations
- ✓ Move deeply nested items (3+ levels)

### Success Criteria
- Child items move to correct destination only
- Parent categories remain in place
- No scope misalignment warnings in console
- All test cases pass
- No regression in existing move functionality

## Dependencies

None - this is self-contained fix to category move logic.

## Status

- **Created**: 2026-01-08
- **Phase**: Planning → Implementation → Testing
- **Next Step**: Implement Phase 1 with DOM attributes approach
