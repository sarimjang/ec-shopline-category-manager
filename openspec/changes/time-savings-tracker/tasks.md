# 實作任務清單

## Phase 1: 靜態估算模型

### Task 1.1: 實作時間計算函數
- [ ] 在工具函數區域加入 `calculateTimeSaved` 函數
- [ ] 實作基礎時間計算邏輯
- [ ] 實作分類數量影響係數
- [ ] 實作層級影響係數
- [ ] 實作搜尋使用影響
- [ ] 單元測試：各種參數組合

**檔案位置**: `src/shopline-category-manager.user.js` (Line ~95，工具函數區域結束處)

**測試案例**:
```javascript
// 小型店家（20 分類，層級 2，使用搜尋）
calculateTimeSaved(20, 2, true)
// 預期：{ dragTime: ~7s, toolTime: 2.5s, timeSaved: ~4.5s }

// 大型店家（100 分類，層級 3，未使用搜尋）
calculateTimeSaved(100, 3, false)
// 預期：{ dragTime: ~12s, toolTime: 3.5s, timeSaved: ~8.5s }
```

---

### Task 1.2: 整合到移動成功流程
- [ ] 在 `moveCategory` 方法中追蹤必要參數
- [ ] 計算目標層級（`getLevel` 方法）
- [ ] 偵測是否使用搜尋功能
- [ ] 呼叫 `calculateTimeSaved`
- [ ] 更新成功訊息格式

**檔案位置**: `src/shopline-category-manager.user.js` (Line 1567，`showSuccessMessage` 呼叫處)

**修改範例**:
```javascript
if (success) {
  // 計算時間節省
  const categoryCount = this.categories.length + this.posCategories.length;
  const targetLevel = this.getLevel(targetCategory, categoriesArray);
  const usedSearch = false; // 暫時先固定為 false

  const result = calculateTimeSaved(categoryCount, targetLevel, usedSearch);

  // 顯示增強訊息
  this.showSuccessMessage(
    `✅ 移動成功！\n⏱️  節省了 ${result.timeSaved} 秒`
  );
}
```

---

## Phase 2: 累積統計追蹤

### Task 2.1: 實作 TimeSavingsTracker 類別
- [ ] 建立 `TimeSavingsTracker` 類別
- [ ] 實作 `loadStats()` 從 localStorage 載入
- [ ] 實作 `saveStats()` 儲存到 localStorage
- [ ] 實作 `recordMove()` 記錄單次移動
- [ ] 實作 `getStats()` 取得統計數據
- [ ] 實作 `showStats()` 格式化顯示統計
- [ ] 實作 `resetStats()` 重置統計
- [ ] 加入錯誤處理（localStorage 可能失敗）

**檔案位置**: `src/shopline-category-manager.user.js` (Line ~150，在 CategoryManager 類別之前)

**localStorage 資料結構**:
```javascript
{
  "totalMoves": 45,
  "totalTimeSaved": 255.5,
  "lastReset": "2026-01-15T10:30:00.000Z"
}
```

---

### Task 2.2: 整合 Tracker 到 CategoryManager
- [ ] 在 `CategoryManager` 建構子初始化 tracker
- [ ] 在 `moveCategory` 成功時呼叫 `tracker.recordMove()`
- [ ] 處理 tracker 錯誤（不應影響主要功能）

**檔案位置**:
- Constructor: Line ~114
- moveCategory: Line ~1567

---

### Task 2.3: 更新 UserScript Metadata
- [ ] 加入 `@grant GM_registerMenuCommand`
- [ ] 加入 `@grant GM_getValue`
- [ ] 加入 `@grant GM_setValue`
- [ ] 同步更新 `.prod.user.js`

**檔案位置**: `src/shopline-category-manager.user.js` (Line 1-11)

**修改**:
```diff
// @match        https://*.shopline.app/admin/*/categories*
- // @grant        none
+ // @grant        GM_registerMenuCommand
+ // @grant        GM_getValue
+ // @grant        GM_setValue
```

---

### Task 2.4: 實作 Tampermonkey 選單整合
- [ ] 註冊「📊 查看時間統計」選單項目
- [ ] 註冊「🔄 重置統計」選單項目
- [ ] 實作選單觸發邏輯
- [ ] 加入確認對話框（重置功能）

**檔案位置**: `src/shopline-category-manager.user.js` (在 `init()` 函數內，Line ~2400)

**實作範例**:
```javascript
// 在 init() 函數最後加入
if (typeof GM_registerMenuCommand !== 'undefined') {
  GM_registerMenuCommand('📊 查看時間統計', () => {
    const stats = manager.tracker.showStats();
    alert(stats);
  });

  GM_registerMenuCommand('🔄 重置統計', () => {
    if (confirm('確定要重置時間統計嗎？')) {
      manager.tracker.resetStats();
      alert('✅ 統計已重置');
    }
  });
}
```

---

## 測試與文檔

### Task 3.1: 單元測試
- [ ] 測試 `calculateTimeSaved` 邊界條件
- [ ] 測試 `TimeSavingsTracker` localStorage 操作
- [ ] 測試統計累積正確性

### Task 3.2: 整合測試
- [ ] 測試完整移動流程
- [ ] 測試 Tampermonkey 選單功能
- [ ] 測試跨瀏覽器相容性

### Task 3.3: 更新文檔
- [ ] 更新 README.md 加入功能說明
- [ ] 更新 CHANGELOG.md
- [ ] 截圖展示時間統計功能

---

## 驗收標準

### Phase 1 完成標準
- ✅ 每次移動成功都顯示時間節省訊息
- ✅ 時間估算合理（手動測試 5 次，誤差 < ±30%）
- ✅ 不影響現有移動功能效能

### Phase 2 完成標準
- ✅ 統計數據正確累積
- ✅ localStorage 持久化正常
- ✅ Tampermonkey 選單可正常使用
- ✅ 重置功能正常運作
- ✅ 錯誤處理完善（localStorage 失敗不影響主功能）

---

## 預估時間

| 任務 | 預估時間 |
|------|----------|
| Task 1.1 | 30 分鐘 |
| Task 1.2 | 20 分鐘 |
| Task 2.1 | 45 分鐘 |
| Task 2.2 | 15 分鐘 |
| Task 2.3 | 10 分鐘 |
| Task 2.4 | 30 分鐘 |
| Task 3.x | 45 分鐘 |
| **總計** | **~3 小時** |

---

## 備註

- Phase 1 可獨立測試和發布
- Phase 2 依賴 Phase 1 完成
- 保持向下相容：未授權 GM_* 時功能優雅降級
- 所有變更需同時更新 `.user.js` 和 `.prod.user.js`
