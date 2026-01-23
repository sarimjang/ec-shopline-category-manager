# 整合測試檢查點 - Stage 9

**目標**: 驗證完整的 Chrome Extension 遷移和功能

---

## 前置準備

### 1. 加載 Extension 到 Chrome

```
1. 打開 Chrome
2. 導航到 chrome://extensions/
3. 啟用「開發人員模式」(右上角)
4. 點擊「載入未封裝的擴充功能」
5. 選擇: /src 目錄
```

**預期結果**: Extension 應出現在列表中，無錯誤訊息

---

## 測試計畫

### Phase 1: 基本功能驗證

#### 1.1 Popup 顯示 ✓
- [ ] 點擊 Extension 圖標
- [ ] Popup 應顯示「Shopline Categories」標題
- [ ] 顯示統計數據：
  - [ ] Moves Today: 0
  - [ ] Time Saved: 0 min 0 sec
  - [ ] Avg per Move: 0 sec

**預期**: 所有欄位顯示初始值

---

#### 1.2 Stage 5: 搜尋功能
- [ ] Popup 中有搜尋輸入框
- [ ] 輸入「服裝」，搜尋結果應顯示
- [ ] 結果列表顯示匹配的類別
- [ ] 搜尋歷史部分應為空（首次）
- [ ] 清除歷史按鈕可點擊

**預期**: 搜尋即時更新，歷史功能正常

---

#### 1.3 Stage 6: 錯誤日誌
- [ ] 錯誤日誌部分可見
- [ ] 初始狀態顯示「無錯誤記錄」
- [ ] 清除錯誤按鈕可點擊

**預期**: 錯誤部分準備就緒（無錯誤時為空）

---

#### 1.4 Stage 7: 驗證進度
- [ ] 驗證部分可見，有 8 個步驟指示器
- [ ] 所有步驟初始狀態為「⬜」(待機)
- [ ] 驗證狀態訊息顯示「等待移動操作...」

**預期**: 8 步驟進度條已初始化

---

#### 1.5 Stage 8: 時間追蹤
- [ ] 時間追蹤摘要部分可見
- [ ] 今日節省：0 小時 0 分
- [ ] 上次移動：-
- [ ] 移動次數：0
- [ ] 最近移動列表顯示「尚無移動記錄」
- [ ] 有「匯出統計」按鈕
- [ ] 有「撤銷上次移動」按鈕

**預期**: 所有 Stage 8 UI 元素均顯示

---

### Phase 2: 擴展功能驗證

#### 2.1 統計重置
- [ ] 點擊「Reset Stats」按鈕
- [ ] 確認對話應出現
- [ ] 確認後，所有統計應重置為 0

**預期**: 統計成功重置

---

#### 2.2 匯出統計
- [ ] 點擊「匯出統計」按鈕
- [ ] 應下載 JSON 文件：`shopline-category-stats-YYYY-MM-DD.json`
- [ ] 打開 JSON 文件，應包含：
  - [ ] exportDate
  - [ ] stats (totalMoves, totalTimeSaved)
  - [ ] moveHistory[]
  - [ ] searchHistory[]

**預期**: JSON 文件包含完整數據

---

#### 2.3 撤銷功能
- [ ] 目前無移動記錄
- [ ] 點擊「撤銷上次移動」應顯示「無可撤銷的移動」

**預期**: 提示訊息正確

---

### Phase 3: Content Script 集成

#### 3.1 Shopline 頁面檢測
- [ ] 導航到 Shopline 管理後台
- [ ] 打開「分類管理」頁面
- [ ] 檢查 Console：應無錯誤訊息

**預期**: Extension 在頁面上加載無誤

---

#### 3.2 CategoryManager 初始化（Console 檢查）
```javascript
// 在瀏覽器 Console 中執行
window._scm_getAngular()
// 應返回 scope 物件
```

**預期**: 返回有效的 AngularJS scope

---

### Phase 4: 完整端到端流程（模擬）

#### 4.1 模擬驗證進度
```javascript
// 在 Popup Console 中執行
window._popupDebug.simulateValidation()
```

**預期**:
- [ ] 8 個步驟逐個更新為綠色 ✅
- [ ] 每步約 1 秒
- [ ] 最後顯示「✓ 移動完成」

---

#### 4.2 手動測試搜尋歷史
- [ ] 在搜尋框輸入「電子」
- [ ] 再輸入「服裝」
- [ ] 檢查最近搜尋是否顯示（應為倒序）
- [ ] 點擊歷史項目應重新搜尋

**預期**: 搜尋歷史正確追蹤和重放

---

### Phase 5: 數據持久性

#### 5.1 搜尋歷史持久性
- [ ] 執行多次搜尋
- [ ] 關閉 Popup 並重新打開
- [ ] 搜尋歷史應仍存在

**預期**: 搜尋歷史在 Session 間保留

---

#### 5.2 統計持久性
- [ ] 手動修改統計（開發者工具）：
  ```javascript
  new StorageManager().setStats({
    totalMoves: 5,
    totalTimeSaved: 65
  })
  ```
- [ ] 重新打開 Popup
- [ ] 統計應顯示更新的值

**預期**: 統計在 Session 間保留

---

## 故障排除指南

### 問題 1: Extension 加載失敗
**症狀**: chrome://extensions 中未出現，或顯示紅色錯誤

**診斷**:
1. 檢查 Console 錯誤訊息
2. 查看 manifest.json 格式
3. 驗證所有引用的文件存在

**解決**:
```bash
# 驗證 manifest
cat src/manifest.json | python -m json.tool
```

---

### 問題 2: Popup 空白或不顯示
**症狀**: Popup 打開但無內容

**診斷**:
1. 檢查 popup.html 是否正確
2. 檢查 CSS/JS 是否加載
3. 查看 Console 錯誤

**解決**:
```javascript
// 在 Console 中檢查
document.body.innerHTML  // 應有 HTML 內容
```

---

### 問題 3: 搜尋不工作
**症狀**: 輸入搜尋但無結果或結果不正確

**診斷**:
1. 檢查 mockCategories 數據
2. 查看 Console 是否有搜尋日誌
3. 驗證 debounce 延遲

**解決**:
```javascript
// 手動觸發搜尋
window._popupDebug.performSearch('服裝')
```

---

### 問題 4: 時間追蹤未更新
**症狀**: 時間摘要不改變，或匯出無數據

**診斷**:
1. 檢查 StorageManager 是否正確初始化
2. 驗證 moveHistory 是否保存
3. 查看時間計算邏輯

**解決**:
```javascript
// 檢查存儲
new StorageManager().getMoveHistory()
// 應返回陣列（即使為空）
```

---

## 完成檢查清單

### Pre-Release Verification
- [ ] 所有 UI 元素顯示正確
- [ ] 搜尋功能工作
- [ ] 時間追蹤功能工作
- [ ] 驗證進度指示器可更新
- [ ] 統計可匯出
- [ ] 撤銷功能準備就緒
- [ ] 無 Console 錯誤
- [ ] 無記憶體洩漏（長時間使用後）

### 已知限制（當前）
- ⚠️ 實際的類別移動需要等待 Phase 2（AngularJS 橋接優化）
- ⚠️ 錯誤日誌在無實際 API 呼叫時為空
- ⚠️ Shopline 頁面檢測需要配置文件

---

## 下一步

✅ 所有 Stage 8-9 測試完成後：
1. 記錄任何問題或邊界情況
2. 進行 Stage 10（文檔和回滾）
3. 準備 Phase 2 AngularJS 集成

---

**測試日期**: ___________
**測試人員**: ___________
**結果**: [ ] 通過 [ ] 失敗 [ ] 部分通過

**備註**:
```
_________________________________
_________________________________
_________________________________
```
