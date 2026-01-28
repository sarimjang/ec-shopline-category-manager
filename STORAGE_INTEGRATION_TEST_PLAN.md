# Storage API Integration - 測試計劃

## 完成的工作

### 1. 在 src/shared/storage.js 中添加了新函數

#### getCategoryMoveStats()
- 使用 `chrome.storage.local.get(['categoryMoveStats'])` 讀取統計數據
- 返回 Promise<Object>，包含 totalMoves, totalTimeSaved, lastReset
- 錯誤處理：若失敗，返回預設值

#### saveCategoryMoveStats(stats)
- 使用 `chrome.storage.local.set({categoryMoveStats: stats})` 保存統計數據
- 返回 Promise<Object>，包含已保存的統計數據
- 包含完整的日誌記錄

#### migrateFromLocalStorage()
- 檢查遷移是否已完成（使用 migrationComplete 標記）
- 從 localStorage 讀取舊數據（shopline_category_stats 等 5 個鍵）
- 轉移到 chrome.storage.local（新鍵名）
- 返回遷移報告：itemsMigrated, errors, 時間戳
- 只在首次運行時執行（避免重複遷移）

### 2. 更新 TimeSavingsTracker（src/content/content.js）

#### constructor 更改
- 初始化 stats 為默認值
- 創建 initializationPromise = this.loadStatsAsync()
- 允許異步初始化

#### loadStatsAsync() 改進
- 首先嘗試遷移舊的 localStorage 數據（使用 migrateFromLocalStorage）
- 使用新的 getCategoryMoveStats() 函數讀取統計數據
- 備用方案：若新 API 不可用，使用消息傳遞 API
- 完整的錯誤處理和日誌記錄

#### saveStats() 改進
- 從同步改為異步
- 使用新的 saveCategoryMoveStats() 函數
- 備用方案：若新 API 不可用，使用消息傳遞 API

#### recordMove() 改進
- 調用異步 saveStats()
- 返回 savePromise，允許調用者等待保存完成
- 改進的日誌記錄

### 3. 向後相容性

- 所有新函數都包含備用方案（fallback）
- 若 window.getCategoryMoveStats 不可用，自動使用消息傳遞 API
- 若 window.saveCategoryMoveStats 不可用，自動使用消息傳遞 API
- 既有的消息傳遞代碼仍然可用

## 測試計劃

### 單元測試

**Test 1: getCategoryMoveStats 返回默認值**
```
前置條件：chrome.storage.local 為空
操作：調用 getCategoryMoveStats()
預期結果：返回 {totalMoves: 0, totalTimeSaved: 0, lastReset: ...}
驗證方式：檢查返回值中的字段
```

**Test 2: saveCategoryMoveStats 保存數據**
```
前置條件：初始化空存儲
操作：調用 saveCategoryMoveStats({totalMoves: 5, totalTimeSaved: 120, ...})
預期結果：數據被保存到 chrome.storage.local
驗證方式：後續讀取應返回相同數據
```

**Test 3: 多次保存正確更新**
```
前置條件：初始化空存儲
操作：
  1. 保存 {totalMoves: 1, totalTimeSaved: 30}
  2. 保存 {totalMoves: 2, totalTimeSaved: 60}
預期結果：最後的讀取應返回第二次的數據
驗證方式：檢查 totalMoves === 2
```

**Test 4: 數據在頁面重新加載後持久化**
```
前置條件：保存數據到 chrome.storage.local
操作：模擬頁面重新加載
預期結果：重新加載後仍能讀取到相同的數據
驗證方式：檢查數據完整性和准確性
```

**Test 5: 遷移功能工作正確**
```
前置條件：localStorage 中有舊數據（shopline_category_stats 等）
操作：調用 migrateFromLocalStorage()
預期結果：
  - 舊數據被轉移到 chrome.storage.local
  - migrationComplete 標記被設置
  - 返回報告顯示遷移了正確數量的項目
驗證方式：檢查遷移報告和 chrome.storage.local 中的數據
```

**Test 6: 遷移只執行一次**
```
前置條件：已執行過一次遷移
操作：再次調用 migrateFromLocalStorage()
預期結果：函數應檢測到 migrationComplete 標記並跳過遷移
驗證方式：報告應顯示 alreadyMigrated: true
```

### 集成測試

**Test 7: TimeSavingsTracker 初始化**
```
操作：創建新的 TimeSavingsTracker 實例
預期結果：
  - 同步返回默認值
  - 異步初始化統計數據
  - initializationPromise 應解決
```

**Test 8: recordMove 保存統計**
```
前置條件：TimeSavingsTracker 已初始化
操作：調用 recordMove(20, 2, true)
預期結果：
  - 統計數據在內存中更新
  - savePromise 被返回
  - 數據異步保存到存儲
驗證方式：等待 savePromise 並檢查存儲中的數據
```

**Test 9: getStats 返回格式化的統計**
```
前置條件：记录了多次移動
操作：調用 getStats()
預期結果：返回格式化的統計對象
  - totalMoves：整數
  - totalSeconds：浮點數
  - totalMinutes：浮點數
  - avgPerMove：浮點數
  - startDate：日期字符串
```

### 手動測試

**Test 10: 頁面重新加載後統計持久化**
```
步驟：
  1. 打開 Shopline 分類管理頁面
  2. 在 popup 中查看時間節省統計
  3. 記錄當前的 totalMoves 和 totalTimeSaved 值
  4. 重新加載頁面
  5. 再次查看統計
預期結果：統計值應與重新加載前相同
```

**Test 11: 首次運行的 localStorage 遷移**
```
步驟：
  1. 清空擴展的所有存儲（清除 chrome.storage.local）
  2. 手動在 localStorage 中添加舊數據（shopline_category_stats 等）
  3. 重新加載擴展
  4. 查看瀏覽器控制台日誌
預期結果：應看到遷移成功的日誌消息
```

**Test 12: 錯誤恢復**
```
步驟：
  1. 打開開發者工具
  2. 在控制台執行：chrome.storage.local.clear()
  3. 嘗試使用分類移動功能
預期結果：應恢復到默認統計值，無崩潰
```

## 驗證檢查清單

- [x] getCategoryMoveStats() 函數已添加
- [x] saveCategoryMoveStats() 函數已添加
- [x] migrateFromLocalStorage() 函數已添加
- [x] TimeSavingsTracker 構造函數已更新
- [x] loadStatsAsync() 使用新存儲 API
- [x] saveStats() 變為異步
- [x] recordMove() 返回 savePromise
- [x] 向後相容性（備用方案）已實現
- [x] 所有新代碼通過語法檢查
- [x] 日誌記錄已添加用於調試
- [x] 遷移邏輯已實現（檢查標記、遍歷鍵、返回報告）

## 遷移路徑

```
舊系統（localStorage）
│
├─ shopline_category_stats → categoryMoveStats
├─ shopline_search_history → searchHistory
├─ shopline_move_history → moveHistory
├─ shopline_error_log → errorLog
└─ shopline_user_settings → userSettings
│
↓
新系統（chrome.storage.local）
```

## 數據格式

### categoryMoveStats
```javascript
{
  totalMoves: number,          // 總移動次數
  totalTimeSaved: number,      // 總節省時間（秒）
  lastReset: string            // ISO 時間戳
}
```

### 遷移報告
```javascript
{
  itemsMigrated: number,       // 遷移的項目數
  errors: array,               // 遷移過程中的錯誤
  startTime: string,           // 開始時間（ISO）
  endTime: string,             // 結束時間（ISO）
  alreadyMigrated: boolean     // 是否已遷移過
}
```

## 日誌輸出示例

### 首次運行（有舊數據）
```
[storage.js] Content script storage APIs initialized (message-based)
[storage.js] New storage functions available: getCategoryMoveStats, saveCategoryMoveStats, migrateFromLocalStorage
[migrateFromLocalStorage] Migrated shopline_category_stats → categoryMoveStats
[migrateFromLocalStorage] Migration completed: {itemsMigrated: 1, errors: [], ...}
[TimeSavingsTracker] Stats loaded from chrome.storage.local: {totalMoves: 5, ...}
```

### 正常運行
```
[TimeSavingsTracker] Stats loaded from chrome.storage.local: {totalMoves: 5, ...}
[TimeSavingsTracker] Move recorded locally: {thisMove: 12.5, totalMoves: 6, ...}
[saveCategoryMoveStats] Stats saved successfully: {totalMoves: 6, ...}
```

## 已知問題與注意事項

1. **遷移一次性操作**：遷移只在首次檢測到舊數據時執行。若需要重新遷移，需手動清除 migrationComplete 標記。

2. **異步初始化**：TimeSavingsTracker 的統計數據在異步加載完成前可能是默認值。調用者應等待 initializationPromise。

3. **備用方案**：若新存儲 API 不可用，系統會自動回退到消息傳遞 API，確保向後相容性。

4. **錯誤日誌**：所有操作都包含完整的錯誤日誌，便於調試。

## 後續改進

- [ ] 添加存儲配額監控
- [ ] 實現自動備份機制
- [ ] 添加數據驗證層
- [ ] 實現版本化遷移系統
- [ ] 添加存儲性能指標

## 完成狀態

✅ **已完成**：
- 存儲 API 包裝函數
- TimeSavingsTracker 遷移
- 向後相容性
- 完整的錯誤處理和日誌記錄
- 測試計劃和驗證檢查清單
