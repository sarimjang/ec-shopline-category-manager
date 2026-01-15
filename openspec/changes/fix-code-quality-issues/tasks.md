# Implementation Tasks: Fix Code Quality Issues

## Phase 1: Critical Fixes

### 1. Prevent Race Conditions (Issue #1)
- [ ] 1.1 Add visual feedback: disable all move buttons during active move
- [ ] 1.2 Enhance `isMoving` check with early return for duplicate requests
- [ ] 1.3 Add finally block to re-enable buttons regardless of success/failure
- [ ] 1.4 Test rapid clicks don't create duplicate moves
- [ ] 1.5 Verify button state correctly restored on error

### 2. Fix Critical API Error Handling (Issue #8)
- [ ] 2.1 Change API failure behavior: don't return `true` on API failure
- [ ] 2.2 Show error message to user when API fails but client state changed
- [ ] 2.3 Add user prompt option to rollback failed moves
- [ ] 2.4 Log clear distinction between client success + server failure vs pure failure
- [ ] 2.5 Test page refresh shows original state if API failed
- [ ] 2.6 Verify error messages are user-friendly (not technical)

### 3. Harden Scope Validation (Issue #2)
- [ ] 3.1 Add timestamp to button dataset when binding
- [ ] 3.2 Check binding age before processing click (30 second threshold)
- [ ] 3.3 Block stale clicks with user-friendly error message
- [ ] 3.4 Log warning when binding timeout occurs
- [ ] 3.5 Test move after tree expand/collapse doesn't use stale binding
- [ ] 3.6 Verify DOM mutations properly trigger new bindings

## Phase 2: Important Improvements

### 4. Fix Memory Leak in MutationObserver (Issue #5)
- [ ] 4.1 Store MutationObserver as instance property `this.domObserver`
- [ ] 4.2 Add disconnect logic to cleanup method
- [ ] 4.3 Check for existing observer and disconnect before creating new one
- [ ] 4.4 Create `destroy()` method for proper cleanup
- [ ] 4.5 Test memory usage over 1+ hour of active use (browser DevTools)
- [ ] 4.6 Verify observer properly disconnects on page navigation

### 5. Fix Incomplete Rollback Logic (Issue #6)
- [ ] 5.1 Track `targetCategory.children` presence in backup (add `targetHadChildren` flag)
- [ ] 5.2 In rollback, delete `targetCategory.children` if it didn't exist before
- [ ] 5.3 Preserve array references correctly during rollback
- [ ] 5.4 Test rollback restores exact original tree structure
- [ ] 5.5 Test move to/from root directory with rollback

### 6. Fix Debounce Cleanup Race Condition (Issue #7)
- [ ] 6.1 Add optional chaining for debounce cancel: `?.cancel?.()`
- [ ] 6.2 Add null checks for searchSection existence
- [ ] 6.3 Test rapid search + dropdown close doesn't throw errors
- [ ] 6.4 Verify debounce cancellation works in all timing scenarios

## Phase 3: Code Quality Enhancements

### 7. Enhance XSS Protection (Issue #4)
- [ ] 7.1 Create `getCategoryDisplayName()` helper method
- [ ] 7.2 Add sanitization: remove `<>` characters from display names
- [ ] 7.3 Apply sanitization consistently for all category name displays
- [ ] 7.4 Test special characters (emoji, Unicode) display correctly
- [ ] 7.5 Test HTML-like strings don't break layout

### 8. Extract Duplicate Search Logic (Issue #9)
- [ ] 8.1 Create `_searchCategories(matcher)` helper with unified search logic
- [ ] 8.2 Refactor `findCategoryByName()` to use new helper
- [ ] 8.3 Refactor `findCategoryById()` to use new helper
- [ ] 8.4 Update all references to use new helper
- [ ] 8.5 Test all search functions still return correct results
- [ ] 8.6 Verify performance unaffected

### 9. Remove Magic Numbers (Issue #10)
- [ ] 9.1 Add `SEARCH_DEBOUNCE_MS = 300` class constant
- [ ] 9.2 Add `BINDING_STALENESS_MS = 30000` class constant (30 seconds)
- [ ] 9.3 Replace hardcoded values with constants
- [ ] 9.4 Document why these values were chosen
- [ ] 9.5 Make constants easily configurable for different deployments

### 10. Add Missing Null Checks (Issue #3)
- [ ] 10.1 Review all array accesses for null safety
- [ ] 10.2 Add explicit validation for `targetCategory` before property access
- [ ] 10.3 Add defensive checks in `findCategoryById` recursion
- [ ] 10.4 Test edge cases: empty arrays, null parents, root moves
- [ ] 10.5 Verify no undefined reference errors in corner cases

## Code Review & Testing

### 11. Comprehensive Testing
- [ ] 11.1 Unit tests for race condition prevention
- [ ] 11.2 Unit tests for API error handling
- [ ] 11.3 Integration tests for move + API + rollback flow
- [ ] 11.4 Performance tests (verify observer cleanup reduces memory usage)
- [ ] 11.5 Manual testing: all test cases from proposal pass
- [ ] 11.6 Regression testing: existing features still work

### 12. Final Validation
- [ ] 12.1 Run linter on all modified code
- [ ] 12.2 Check for console errors/warnings
- [ ] 12.3 Verify error messages are helpful to users
- [ ] 12.4 Code review for edge cases
- [ ] 12.5 Update comments/documentation
- [ ] 12.6 Get approval on implementation approach

## Acceptance Criteria

- [ ] All Phase 1 tasks complete and tested
- [ ] All Phase 2 tasks complete and tested
- [ ] Code passes strict linting
- [ ] No memory leaks detected
- [ ] All race conditions prevented
- [ ] API errors clearly reported to user
- [ ] At least 95% test coverage for modified functions
- [ ] No regression in existing functionality
