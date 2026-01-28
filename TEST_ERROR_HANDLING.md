# Error Handling Verification Test Plan

## Overview
Comprehensive testing of error scenarios and recovery mechanisms in the Chrome extension's Greasemonkey logic migration.

## Test Scenarios

### 1. Scope Misalignment Testing
**Objective**: Verify scope alignment issues are handled with detailed diagnostics

**Test Steps**:
- [ ] Manually trigger scope error by executing in browser console
- [ ] Verify console displays detailed diagnostic info (scope.$id vs DOM)
- [ ] Check error categories and recovery suggestions

**Expected Behavior**:
- Console shows: scope.$id, hasScope, hasItem, scopePath
- Fallback mechanism activates (DOM name lookup)
- User sees actionable error message

**Log Entry Example**:
```
[STEP 6] 驗證移動結果...
  ❌ Scope misalignment detected: scope.$id vs DOM category name mismatch
  Scope: $12 (item.name: "Category A")
  DOM: "Category B"
  Fallback: Using DOM name lookup
```

### 2. Network Error Testing
**Objective**: Verify network failures are properly detected and communicated

**Test Steps**:
- [ ] Use Chrome DevTools Network tab - set throttling to slow connection
- [ ] Attempt category move operation
- [ ] Verify network error is detected
- [ ] Verify error type classification: 'network-error'
- [ ] Verify user sees network error message
- [ ] Verify UI recovers to pre-move state

**Expected Behavior**:
- Timeout or connection failure is caught
- Error type: 'network-error'
- Toast message: "網路連線失敗..."
- Local state preserved, not persisted to server
- Buttons re-enabled after timeout

**Console Log Example**:
```
[STEP 7] 呼叫 API 保存到伺服器...
  ❌ Network Error: TypeError: Failed to fetch
  Error Type: network-error
  Retry: User should refresh page
```

### 3. API Error (500 Response) Testing
**Objective**: Verify server errors trigger recovery mechanism

**Test Steps**:
- [ ] Use Chrome DevTools Network tab - create response override for 500
- [ ] Attempt category move
- [ ] Verify API failure is detected
- [ ] Verify error type: 'pure-server-failure'
- [ ] Verify recovery message shown
- [ ] Verify UI reverts to pre-move state

**Expected Behavior**:
- API 500 response is caught
- Error type: 'pure-server-failure'
- Toast message: "伺服器錯誤..."
- Local state remains unchanged
- Category position restored

**Console Log Example**:
```
[STEP 7] 呼叫 API 保存到伺服器...
  ❌ API Error: Status 500 Internal Server Error
  Error Type: pure-server-failure
  Message: Server failed to process request
  Recovery: Local state preserved, UI reverted
```

### 4. Invalid Input Validation
**Objective**: Verify validation prevents invalid operations

**Test Steps**:
- [ ] Attempt to move category to its own descendant
- [ ] Attempt to move to level 3+ category as parent (too deep)
- [ ] Attempt to move with null source category
- [ ] Attempt to move with invalid target reference

**Expected Behavior**:
- Move is blocked before API call
- Console shows validation reason
- User sees error message
- No API request is made

**Console Log Example**:
```
[STEP 2] 驗證目標位置...
  ❌ 目標已是最深層級，不能添加子項!
  [STEP 4] 執行移動操作... (SKIPPED)
```

### 5. Console Output Verification
**Objective**: Verify all 8 move steps are correctly logged

**Test Steps**:
- [ ] Perform successful category move
- [ ] Check console for all 8 STEP logs
- [ ] Verify log order and completeness
- [ ] Verify performance metrics

**Expected Output Structure**:
```
═══════════════════════════════════════════════════════════════
[Shopline Category Manager] 🚀 開始移動分類
─────────────────────────────────────────────────────────────
[STEP 1] 驗證源分類...
[STEP 2] 驗證目標位置...
[STEP 3] 定位源分類在陣列中的位置...
[STEP 4] 執行移動操作...
[STEP 5] 觸發 AngularJS 更新...
[STEP 6] 驗證移動結果...
[STEP 7] 呼叫 API 保存到伺服器...
[STEP 8] 完成移動
  ✅ 移動成功！耗時: X.XXms
═══════════════════════════════════════════════════════════════
```

### 6. Error Classification Verification
**Objective**: Verify error types are correctly classified

**Test Methods**:

#### network-error:
- Timeout (no response)
- Connection refused
- CORS error
- Network unavailable

#### pure-server-failure:
- HTTP 500, 502, 503
- Request successful, server processing failed
- No response body

#### client-error:
- Invalid parameters
- Missing URL parameters
- Scope resolution failure

**Console Output Verification**:
```
[Shopline Category Manager]   錯誤類型: network-error | pure-server-failure | client-error
[Shopline Category Manager]   訊息: <error details>
```

### 7. Recovery Mechanism Testing
**Objective**: Verify system recovers from errors

**Test Steps**:
- [ ] Trigger network error
- [ ] Check UI state (buttons enabled/disabled)
- [ ] Attempt another move operation
- [ ] Verify no memory leaks or state corruption

**Expected Behavior**:
- All buttons re-enabled after error
- isMoving flag reset to false
- Can immediately retry another operation
- No console errors about state issues

**Success Indicator**:
```
[Shopline Category Manager] 重新啟用所有移動按鈕
[Shopline Category Manager] 🚀 開始移動分類 (second attempt)
```

## Test Data

### Category Structure Used:
```
Root
├── Category A (level 1)
│   ├── Child A1 (level 2)
│   │   └── Grandchild A1a (level 3)
│   └── Child A2 (level 2)
├── Category B (level 1)
└── Category C (level 1)
```

## Success Criteria

### All Tests Passed When:
1. ✅ All 8 move steps logged correctly
2. ✅ Error types correctly classified (3 types)
3. ✅ Recovery mechanisms work (buttons re-enabled)
4. ✅ No state corruption after errors
5. ✅ All error messages user-friendly and in Traditional Chinese
6. ✅ No unhandled promise rejections in console
7. ✅ UI correctly displays error/warning/success toasts
8. ✅ Can perform subsequent operations after error recovery

## Known Limitations

- Cannot test actual server 500 without real API endpoint
- Scope misalignment testing requires AngularJS DOM context
- Network simulation limited to DevTools throttling

## Session Log Format

For each test, record:
```
Test: [Scenario Name]
Date: YYYY-MM-DD HH:MM:SS
Result: PASS | FAIL
Console Output: [Key logs captured]
Notes: [Any issues or observations]
```

