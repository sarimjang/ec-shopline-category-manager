# 時間節省追蹤功能

## 概述

在 Shopline Category Manager 中加入時間節省追蹤功能，量化工具為使用者節省的時間，提升產品價值感知。

## 動機

### 問題陳述
- 使用者無法直觀感受到使用工具相比手動拖動的效率提升
- 缺乏數據支持產品 ROI（投資回報率）計算
- 無法追蹤累積的生產力提升

### 目標
1. 提供即時時間節省反饋（每次移動後）
2. 追蹤並顯示累積的時間節省統計
3. 增強產品價值感知和使用者滿意度

## 功能範圍

### Phase 1: 靜態估算模型 ✅
**即時時間節省計算和顯示**

#### 1.1 時間計算公式
```javascript
calculateTimeSaved(categoryCount, targetLevel, usedSearch)
```

**參數**：
- `categoryCount`: 分類總數（影響捲動尋找時間）
- `targetLevel`: 目標層級 1-3（影響對齊時間）
- `usedSearch`: 是否使用搜尋功能（影響工具使用時間）

**計算邏輯**：
```
拖動時間 = 基礎時間(4秒) +
          (分類數 / 10) × 0.5秒 +
          目標層級 × 1秒

工具時間 = 2.5秒（使用搜尋）或 3.5秒（瀏覽選單）

節省時間 = max(0, 拖動時間 - 工具時間)
```

#### 1.2 增強型 Toast 即時反饋（方案 C）
**顯示方式**：
- 使用現有的 `showSuccessMessage` Toast 通知（右下角綠色訊息框）
- 延長顯示時間：從 2 秒增加到 3.5 秒（`TOAST_SUCCESS_DURATION_MS`）
- 顯示位置：固定右下角，不遮擋操作區域

**訊息格式（三行）**：
```
✅ 移動成功！
⏱️  本次節省 5.5 秒
📊 總計: 45 次 / 4.2 分鐘
```

**設計優勢**：
- ✅ 非干擾性（不需點擊關閉）
- ✅ 同時顯示即時 + 累積效果
- ✅ 支援連續移動不中斷工作流程
- ✅ 符合現代 UX 慣例（Gmail, Slack 等）

### Phase 2: 累積統計追蹤 ✅
**長期使用數據追蹤和展示**

#### 2.1 TimeSavingsTracker 類別
持久化儲存使用統計：
- `totalMoves`: 總移動次數
- `totalTimeSaved`: 累積節省時間（秒）
- `lastReset`: 統計開始日期

**儲存機制**：
- 使用 `localStorage`（key: `categoryMoveStats`）
- 每次成功移動後更新

#### 2.2 統計查詢功能
```javascript
getStats() → {
  totalMoves: number,
  totalSeconds: number,
  totalMinutes: number,
  avgPerMove: number,
  startDate: string
}
```

#### 2.3 Tampermonkey 選單整合
**新增選單項目**：
- 📊 查看時間統計 - 顯示累積數據
- 🔄 重置統計 - 清空所有統計數據

**需要的 @grant 權限**：
```
// @grant        GM_registerMenuCommand
```

**說明**：
- 統計數據使用 `localStorage` 存儲，不需要 GM_getValue/GM_setValue 權限
- 僅需要 GM_registerMenuCommand 權限以註冊 Tampermonkey 選單項目

## 技術規格

### 新增的工具函數
```javascript
// Phase 1
function calculateTimeSaved(categoryCount, targetLevel, usedSearch)

// Phase 2
class TimeSavingsTracker {
  constructor()
  loadStats()
  saveStats()
  recordMove(categoryCount, targetLevel, usedSearch)
  getStats()
  showStats()
  resetStats()
}
```

### 修改的常數
```javascript
// CategoryManager 類別常數調整
static TOAST_SUCCESS_DURATION_MS = 3500;  // 從 2000 改為 3500（增加 1.5 秒）
```

**原因**：增強型 Toast 顯示三行資訊，需要更長的閱讀時間。

### 整合點

#### 1. moveCategory 方法
```javascript
// 在 moveCategory 成功分支加入
if (success) {
  // 新增：追蹤時間節省
  const categoryCount = this.categories.length + this.posCategories.length;
  const targetLevel = this.getLevel(targetCategory, categoriesArray);
  const usedSearch = this._lastMoveUsedSearch || false; // 從實例變數讀取

  const result = this.tracker.recordMove(categoryCount, targetLevel, usedSearch);
  const stats = this.tracker.getStats();

  // 清除標記
  this._lastMoveUsedSearch = false;

  // 顯示增強型 Toast（三行格式）
  this.showSuccessMessage(
    `✅ 移動成功！\n` +
    `⏱️  本次節省 ${result.thisMove} 秒\n` +
    `📊 總計: ${stats.totalMoves} 次 / ${stats.totalMinutes} 分鐘`
  );
}
```

**usedSearch 偵測機制**：
- **Phase 1（初期版本）**：固定為 `false`，提供保守的時間估算（偏向低估節省時間）
- **Phase 2（完整版本）**：
  - 在 CategoryManager 加入實例變數 `this._lastMoveUsedSearch = false`
  - 在搜尋確認按鈕點擊時設置 `this._lastMoveUsedSearch = true`（搜尋區塊的確認按鈕事件處理器）
  - 在 moveCategory 成功後讀取並重置此標記
  - 若從下拉選單直接選擇則保持 `false`

**資料來源驗證**：
- `categoryCount`: 來自 `this.categories` 和 `this.posCategories` 陣列長度總和（在 CategoryManager 建構子中初始化，來自 AngularJS scope）
- `targetLevel`: 來自現有的 `getLevel(category, categoriesArray)` 方法（回傳 1, 2, 或 3）
- 兩者在 `moveCategory` 成功時必定可用

**注意事項**：
- 需要調整 `TOAST_SUCCESS_DURATION_MS` 從 2000 改為 3500 毫秒
- Toast 需要支援多行渲染（見下方 showSuccessMessage 修改）
- `totalMinutes` 需要四捨五入到小數點一位

#### 2. showSuccessMessage 方法修改
```javascript
showSuccessMessage(message) {
  const toast = document.createElement('div');

  // 修改：使用 white-space: pre-line 支援 \n 換行
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: #52c41a;
    color: white;
    padding: 12px 16px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: ${CategoryManager.TOAST_Z_INDEX};
    font-size: 14px;
    white-space: pre-line;  // 新增：支援 \n 換行
    line-height: 1.6;        // 新增：增加行距以提升可讀性
  `;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, CategoryManager.TOAST_SUCCESS_DURATION_MS);
}
```

**說明**：
- 加入 `white-space: pre-line` CSS 屬性以支援 `\n` 換行符號
- 加入 `line-height: 1.6` 增加行距，提升三行訊息的可讀性
- 保持使用 `textContent`（非 `innerHTML`）以避免 XSS 風險

#### 3. CategoryManager 建構子
```javascript
constructor(scope) {
  // 現有程式碼...

  // 新增：初始化時間追蹤器
  this.tracker = new TimeSavingsTracker();

  // 新增：搜尋使用標記
  this._lastMoveUsedSearch = false;
}
```

#### 4. 搜尋確認按鈕事件處理
```javascript
// 在 createSearchSection 或 attachSearchEventListeners 中
// 確認按鈕點擊時設置標記
confirmBtn.addEventListener('click', () => {
  if (searchSection._selectedCategory) {
    this._lastMoveUsedSearch = true;  // 設置搜尋使用標記
    this.moveCategory(currentCategory, searchSection._selectedCategory, categoriesArray, arrayName);
    this.removeExistingDropdown();
  }
});
```

**說明**：
- 此修改確保當使用者透過搜尋功能選擇目標分類時，標記會被正確設置
- 標記會在 moveCategory 成功後自動重置為 `false`

#### 5. UserScript Metadata
```diff
// @match        https://*.shopline.app/admin/*/categories*
- // @grant        none
+ // @grant        GM_registerMenuCommand
// ==/UserScript==
```

**說明**：
- 只需要 `GM_registerMenuCommand` 用於 Tampermonkey 選單整合
- 統計數據使用標準 `localStorage` API，不需要額外權限

## 使用者體驗

### 即時反饋（Phase 1）- 增強型 Toast
```
使用者操作流程：
1. 點擊「移動到」按鈕
2. 選擇目標分類
3. 確認移動
4. 看到右下角綠色 Toast 訊息（顯示 3.5 秒）：

   ┌────────────────────────────────┐
   │ ✅ 移動成功！                  │
   │ ⏱️  本次節省 5.5 秒            │
   │ 📊 總計: 45 次 / 4.2 分鐘      │
   └────────────────────────────────┘
     右下角，綠色背景，3.5 秒後自動消失

5. 可以立即繼續移動其他分類（不需點擊關閉）
```

**視覺設計**：
- 位置：`position: fixed; bottom: 20px; right: 20px;`
- 顏色：綠色背景（`#52c41a`）+ 白色文字
- 動畫：淡入 + 3.5 秒後淡出
- Z-index：高於其他元素但不遮擋下拉選單

### 統計查詢（Phase 2）
```
使用者操作流程：
1. 點擊 Tampermonkey 圖示
2. 選擇「📊 查看時間統計」
3. 看到彈窗：
   ━━━━━━━━━━━━━━━━
   📊 時間節省統計
   ────────────────
   總移動次數: 45 次
   節省時間: 4 分 15 秒
   平均每次: 5.7 秒
   開始日期: 2026-01-15
   ━━━━━━━━━━━━━━━━
```

## 測試計劃

### 單元測試
- [ ] `calculateTimeSaved` 各種參數組合的正確性
- [ ] `TimeSavingsTracker.recordMove` 累積計算正確
- [ ] `TimeSavingsTracker.resetStats` 清空統計

### 整合測試
- [ ] 移動成功後顯示正確的時間節省訊息
- [ ] localStorage 持久化正常運作
- [ ] Tampermonkey 選單項目可正常觸發

### 使用者測試
- [ ] 不同分類數量下的時間估算是否合理
- [ ] 統計數據是否準確累積
- [ ] 重置功能是否正常

## 非功能性需求

### 效能
- 時間計算不應影響移動操作效能（< 1ms）
- localStorage 操作應使用 try-catch 防止錯誤

### 相容性
- 支援所有已支援的瀏覽器（Chrome, Firefox, Safari, Edge）
- localStorage 可用性檢查：若 localStorage 不可用（如無痕模式），統計功能將靜默失敗，不影響主要移動功能
- Tampermonkey 選單：若 GM_registerMenuCommand 不可用，選單項目不會註冊，但不影響時間追蹤功能

### 安全性
- localStorage 數據僅存於本地，不涉及隱私問題
- 不收集任何使用者個人資訊

## 後續階段（Phase 3，未包含在此 change）

### 視覺化儀表板
- 時間節省趨勢圖表
- 分類層級分佈圖
- 每日/每週統計
- 匯出 CSV 報告

## 成功指標

- ✅ Phase 1 完成：100% 移動操作顯示時間節省
- ✅ Phase 2 完成：統計數據正確累積並可查詢
- ✅ 使用者反饋：時間估算合理（±20% 誤差範圍內）

## 參考資料

### 時間估算研究基礎
- 手動拖動平均時間：8-9 秒（實際測試）
- 工具操作平均時間：2-4 秒（實際測試）
- 平均節省：5-7 秒/次

### 競品分析
- 無類似功能的 UserScript 工具提供時間追蹤
- 此功能為差異化優勢
