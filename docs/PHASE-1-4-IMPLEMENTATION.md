# Phase 1.4: Service Worker Message Handling Implementation

**Date**: 2026-01-28
**Task**: [1.4] Setup Service Worker Message Handling
**Status**: ✅ Complete

## Overview

本實現為 Chrome Extension 添加了完整的消息監聽和分類移動記錄功能。Service Worker 現在可以：

1. ✅ 接收來自 Content Script 的 `recordCategoryMove` 消息
2. ✅ 驗證消息格式和參數（timeSaved, categoryName, targetLevel）
3. ✅ 從 chrome.storage.local 讀取當前統計數據和歷史記錄
4. ✅ 更新統計數據（totalMoves, totalTimeSaved）
5. ✅ 記錄詳細的移動歷史（時間戳、分類名、目標級別）
6. ✅ 保存更新的數據回 chrome.storage.local
7. ✅ 返回成功/失敗的響應給 Content Script
8. ✅ 支持 Popup 中的統計顯示和自動更新

## Detailed Implementation

### 1. Service Worker Message Handler (`src/background/service-worker.js`)

#### 函數: `handleRecordCategoryMove(request, sendResponse)`

**輸入（Request 格式）**:
```javascript
{
  action: 'recordCategoryMove',
  timeSaved: 45,              // 必需，數字（秒）
  categoryName: 'Electronics', // 可選，字符串（最多 255 字符）
  targetLevel: 1              // 可選，數字（0-3）
}
```

**處理步驟**:

1. **驗證 timeSaved**
   - 檢查是否為數字類型
   - 檢查是否為非負數
   - 使用 `window.ShoplineInputValidator.validateTimeSaved()`

2. **驗證 categoryName（如果提供）**
   - 檢查是否為字符串
   - 檢查是否為非空
   - 檢查長度不超過 255 字符
   - 使用 `window.ShoplineInputValidator.validateCategoryName()`

3. **驗證 targetLevel（如果提供）**
   - 檢查是否為數字
   - 檢查是否在 0-3 範圍內
   - 內聯驗證（無 validator 方法）

4. **讀取當前存儲**
   - `chrome.storage.local.get(['categoryMoveStats', 'moveHistory'], callback)`
   - 如果不存在則初始化默認值

5. **更新統計數據**
   ```javascript
   stats.totalMoves += 1;
   stats.totalTimeSaved += timeSaved;
   stats.lastMoveTime = timestamp;
   ```

6. **記錄移動歷史**
   ```javascript
   const moveRecord = {
     timestamp: ISO_STRING,
     categoryName: 'Unknown' (if not provided),
     targetLevel: 0 (if not provided),
     timeSaved: value,
     moveNumber: stats.totalMoves
   };

   moveHistory.unshift(moveRecord); // 最新的在前

   // 限制為 500 條記錄
   if (moveHistory.length > 500) {
     moveHistory = moveHistory.slice(0, 500);
   }
   ```

7. **保存到存儲**
   - `chrome.storage.local.set({ categoryMoveStats, moveHistory }, callback)`

8. **返回響應**
   ```javascript
   {
     success: true,
     stats: {
       totalMoves: number,
       totalTimeSaved: number,
       lastMoveTime: ISO_STRING,
       lastReset: ISO_STRING
     },
     moveRecord: {
       timestamp: ISO_STRING,
       categoryName: string,
       targetLevel: number,
       timeSaved: number,
       moveNumber: number
     },
     historySize: number
   }
   ```

### 2. Input Validator Extension (`src/shared/input-validator.js`)

#### 新增函數: `validateCategoryName(categoryName)`

**驗證規則**:
- 必須是字符串類型
- 不能為空字符串
- 最大長度 255 字符
- 不能包含控制字符（0x00-0x1F, 0x7F）

**返回格式**:
```javascript
{
  valid: boolean,
  errors: [
    {
      field: 'categoryName',
      error: 'Error description',
      type: 'TYPE_ERROR|EMPTY_ERROR|LENGTH_ERROR|FORMAT_ERROR'
    }
  ]
}
```

### 3. Storage Schema

#### categoryMoveStats (統計數據)
```javascript
{
  totalMoves: number,           // 累計移動次數
  totalTimeSaved: number,       // 累計節省時間（秒）
  lastReset: ISO_STRING,        // 最後重置時間
  lastMoveTime: ISO_STRING      // 最後移動時間
}
```

#### moveHistory (移動歷史)
```javascript
[
  {
    timestamp: ISO_STRING,      // 移動發生的時間
    categoryName: string,       // 移動的分類名稱
    targetLevel: number,        // 目標階層（0-3）
    timeSaved: number,          // 這次移動節省的時間（秒）
    moveNumber: number          // 全局移動序號
  },
  // ... (最多 500 條記錄，最新的在前)
]
```

## Test Coverage

### Unit Tests (12 tests) - `tests/unit/service-worker-message-handler.test.js`

✅ **基本功能**:
1. 記錄基本的分類移動（只有 timeSaved）
2. 記錄完整的分類移動（包含所有參數）
3. 正確累積多個移動記錄

✅ **錯誤處理**:
4. 拒絕無效的 timeSaved 值
5. 拒絕無效的 categoryName
6. 拒絕無效的 targetLevel
7. 優雅處理存儲讀取錯誤
8. 優雅處理存儲寫入錯誤

✅ **邊界條件**:
9. 在歷史記錄超過 500 時進行截斷
10. 正確設置時間戳和計算統計

✅ **集成**:
11. 正確調用輸入驗證器
12. 在驗證失敗時記錄被拒絕的請求

**運行結果**: ✅ All 12 tests passed

### Integration Tests (6 tests) - `tests/integration/record-category-move-e2e.test.js`

✅ **端到端流程**:
1. 完整的分類移動記錄流程（從 content script 到 popup）
2. 多個連續的分類移動
3. 存儲恢復（瀏覽器重啟後）

✅ **錯誤場景**:
4. 優雅地處理存儲讀取失敗

✅ **邊界和性能**:
5. 正確處理大量移動記錄（500+ 邊界）

✅ **用戶體驗**:
6. Popup 自動刷新統計

**運行結果**: ✅ All 6 tests passed

## Error Handling

### 驗證失敗響應格式

```javascript
{
  success: false,
  error: 'Invalid [field] value',
  details: {
    field_name: 'Error description'
  }
}
```

### 存儲錯誤響應格式

```javascript
{
  success: false,
  error: 'Failed to [read|save] storage',
  details: 'Chrome runtime error message'
}
```

### 日誌記錄

所有驗證失敗都會記錄到：
- 控制台（透過 `console.error`）
- Validator 日誌（透過 `logRejectedRequest`）

## Data Persistence Guarantees

1. **原子性**: 所有數據（stats + history）在單個 `chrome.storage.local.set()` 調用中更新
2. **完整性**: 歷史記錄中的每個移動都關聯到統計中的 totalMoves
3. **容量管理**: 歷史記錄限制為 500 條，防止存儲膨脹
4. **時間戳準確**: 每個記錄包含 ISO 8601 時間戳

## Content Script Integration

Content Script 發送消息的方式：

```javascript
chrome.runtime.sendMessage(
  {
    action: 'recordCategoryMove',
    categoryName: 'Detected Category Name',
    targetLevel: 1,
    timeSaved: 45
  },
  (response) => {
    if (response.success) {
      console.log('Move recorded:', response.stats);
    } else {
      console.error('Failed to record:', response.error);
    }
  }
);
```

## Popup Display Integration

Popup (`src/popup/popup.js`) 通過以下方式顯示統計：

```javascript
// 讀取統計
chrome.runtime.sendMessage(
  { action: 'getStats' },
  (response) => {
    if (response.success) {
      updateStatsDisplay(response.stats);
    }
  }
);

// 自動刷新（每 2 秒）
setInterval(() => {
  // Fetch latest stats from storage
}, 2000);
```

## Files Modified

1. **`src/background/service-worker.js`**
   - 增強了 `handleRecordCategoryMove` 函數
   - 添加了完整的參數驗證
   - 添加了移動歷史記錄功能

2. **`src/shared/input-validator.js`**
   - 添加了 `validateCategoryName` 函數
   - 更新了公開 API

## Files Added

1. **`tests/unit/service-worker-message-handler.test.js`**
   - 12 個單元測試

2. **`tests/integration/record-category-move-e2e.test.js`**
   - 6 個集成測試

3. **`docs/PHASE-1-4-IMPLEMENTATION.md`**
   - 本文檔

## Validation Results

### Syntax Validation
- ✅ `src/background/service-worker.js` - Valid
- ✅ `src/shared/input-validator.js` - Valid

### Test Results
```
Unit Tests: 12/12 passed
Integration Tests: 6/6 passed
Total: 18/18 passed
```

## Related Issues

- **Task 1.4**: Setup Service Worker Message Handling
- **Task 1.5**: Verify Search, Validation, and UI Features (依賴本實現)
- **Task 2-P1.4**: Popup UI - Statistics Panel (使用本實現的數據)

## Future Enhancements

1. **WebSocket 通知**: 實現多標籤頁實時同步
2. **分析報告**: 按分類統計移動頻率
3. **性能優化**: 移動歷史分頁存儲
4. **備份機制**: 自動備份歷史記錄

## Deployment Checklist

- ✅ 代碼審查完成
- ✅ 單元測試通過
- ✅ 集成測試通過
- ✅ 語法驗證通過
- ✅ 文檔完整
- ✅ 向後兼容（新參數可選）

## Sign-off

**實現者**: Claude Code
**日期**: 2026-01-28
**狀態**: Ready for Merge

---

**Note**: 本實現是 Phase 1（Greasemonkey Logic Migration）的第 4 個子任務。它為 Popup UI 和數據匯出/匯入功能提供了基礎。
