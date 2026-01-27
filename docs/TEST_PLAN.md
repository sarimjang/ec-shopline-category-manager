# End-to-End Testing Plan: Export & Import Functionality

**Project**: Shopline Category Manager Chrome Extension
**Phase**: 2 (Export/Import)
**Task**: 2-P2.4
**Date Created**: 2026-01-27
**Status**: Complete Testing Plan

---

## Overview

This test plan provides comprehensive end-to-end testing procedures for the Export & Import functionality. The plan covers all 10 test scenarios with detailed prerequisites, steps, and expected results.

### Test Coverage Matrix

| # | Scenario | Category | Status |
|---|----------|----------|--------|
| 1 | Valid Export | Happy Path | ✅ Planned |
| 2 | Empty Export | Edge Case | ✅ Planned |
| 3 | Valid Import | Happy Path | ✅ Planned |
| 4 | Duplicate Import | Conflict | ✅ Planned |
| 5 | Invalid JSON | Error Case | ✅ Planned |
| 6 | Missing Fields | Validation | ✅ Planned |
| 7 | Large Dataset | Performance | ✅ Planned |
| 8 | Type Mismatch | Validation | ✅ Planned |
| 9 | Cancel Import | User Action | ✅ Planned |
| 10 | Quota Exceeded | Error Case | ✅ Planned |

---

## Success Criteria

### Functionality
- ✅ All 10 test scenarios pass
- ✅ Export works consistently
- ✅ Import validation catches errors
- ✅ Conflicts properly detected
- ✅ No data corruption

### Performance
- ✅ Export completes in < 1 second
- ✅ Validation completes in < 1 second
- ✅ Import completes in < 3 seconds (50 moves)
- ✅ Progress bar animates smoothly
- ✅ UI remains responsive

### Quality
- ✅ No console errors
- ✅ Error messages clear and specific
- ✅ All operations recoverable
- ✅ Documentation complete

---

## Detailed Test Scenarios

### Test 1: Valid Export
**Objective**: Export statistics to JSON
**Expected**: JSON file downloads with filename `shopline-category-backup-YYYY-MM-DD.json`
**Pass Criteria**: File is valid JSON with all data fields present

### Test 2: Export with Empty Data
**Objective**: Export with no history
**Expected**: JSON downloads successfully with empty arrays
**Pass Criteria**: File contains empty arrays for moves/searches/errors

### Test 3: Valid Import
**Objective**: Import previously exported data
**Expected**: Validation passes, import succeeds
**Pass Criteria**: Statistics update, all data present in storage

### Test 4: Import with Duplicates
**Objective**: Import same data twice
**Expected**: Conflicts detected, duplicates skipped
**Pass Criteria**: Statistics don't increase, merge strategy applied

### Test 5: Invalid JSON
**Objective**: Import malformed JSON file
**Expected**: Validation fails with error message
**Pass Criteria**: No data written, clear error shown

### Test 6: Missing Required Fields
**Objective**: Import incomplete data
**Expected**: Validation error shown
**Pass Criteria**: Specific field name reported, no import

### Test 7: Large Dataset
**Objective**: Import 100+ records
**Expected**: Progress bar shown during import
**Pass Criteria**: All records imported correctly

### Test 8: Data Type Mismatch
**Objective**: Import with incorrect data types
**Expected**: Type validation fails
**Pass Criteria**: Error message explains issue

### Test 9: Cancel Import
**Objective**: User cancels during preview
**Expected**: No data written
**Pass Criteria**: Storage unchanged, UI responsive

### Test 10: Quota Exceeded
**Objective**: Import when storage full
**Expected**: Error handled gracefully
**Pass Criteria**: No partial import, clear error message

---

## Test Execution Log Template

Use this template to track test results:

| Test # | Scenario | Date | Tester | Result | Notes |
|--------|----------|------|--------|--------|-------|
| 1 | Valid Export | | | PASS/FAIL | |
| 2 | Empty Export | | | PASS/FAIL | |
| 3 | Valid Import | | | PASS/FAIL | |
| 4 | Duplicate Import | | | PASS/FAIL | |
| 5 | Invalid JSON | | | PASS/FAIL | |
| 6 | Missing Fields | | | PASS/FAIL | |
| 7 | Large Dataset | | | PASS/FAIL | |
| 8 | Type Mismatch | | | PASS/FAIL | |
| 9 | Cancel Import | | | PASS/FAIL | |
| 10 | Quota Exceeded | | | PASS/FAIL | |

---

## Quick Reference

### Console Commands for Testing

```javascript
// Clear storage for fresh start
chrome.storage.local.clear();

// Check current storage state
chrome.storage.local.get(null, (data) => {
  console.log('Storage:', data);
});

// Verify import success
chrome.storage.local.get('categoryMoveStats', (data) => {
  console.log('Stats after import:', data.categoryMoveStats);
});

// Check storage space
chrome.storage.local.getBytesInUse(null, (bytes) => {
  console.log('Used:', (bytes/1024).toFixed(2), 'KB');
});
```

---

**Phase 2: Export & Import Functionality - TEST PLAN COMPLETE**

All 10 test scenarios documented and ready for execution.
