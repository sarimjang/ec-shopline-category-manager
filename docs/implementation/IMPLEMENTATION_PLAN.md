# Step 7: 測試計劃和備案方案實作

## 背景
- 主要方案：直接操作 AngularJS $scope
- 備案方案：若 $scope 無法存取，使用拖拉事件模擬
- 測試環境：實際 Shopline 頁面

## Stage 1: 測試計劃框架設計
**Goal**: 建立完整的測試檢查清單和測試指南
**Success Criteria**:
- 測試計劃包含 5 個測試場景
- 每個場景有具體的測試步驟和驗證方式
- 包含邊界情況測試

**Tests**:
- [ ] 基礎功能測試（按鈕出現、下拉選單、合法目標）
- [ ] 移動操作測試（Level 1/2/3 移動）
- [ ] 邏輯驗證測試（自我驗證、子孫驗證、Level 3 排除）
- [ ] 持久化測試（頁面重新整理）
- [ ] 邊界情況測試（多子分類、特殊分類、長名稱）

**Status**: In Progress

## Stage 2: 備案方案 DragEvent 實作
**Goal**: 實作備案方案，若 $scope 無法存取則使用 DragEvent 模擬
**Success Criteria**:
- DragEvent 模擬函數已實作
- 包含錯誤處理和重試機制
- 已整合到主實現中作為備案

**Tests**:
- [ ] 驗證 DragEvent 建立正確
- [ ] 驗證拖拉順序正確（dragstart → dragover → drop）
- [ ] 驗證等待時間足夠讓 angular-ui-tree 處理
- [ ] 驗證備案方案在 scope 失敗時自動觸發

**Status**: Not Started

## Stage 3: 使用者回饋和錯誤處理
**Goal**: 實作清楚的錯誤訊息和使用者回饋機制
**Success Criteria**:
- 移動成功顯示綠色提示（1-2 秒）
- 移動失敗顯示紅色錯誤訊息
- 正在處理時按鈕禁用
- 錯誤訊息清楚說明問題

**Tests**:
- [ ] 驗證成功提示顯示
- [ ] 驗證失敗提示顯示
- [ ] 驗證按鈕在移動時禁用
- [ ] 驗證錯誤訊息包含解決方案

**Status**: Not Started

## Stage 4: 相容性驗證和日誌檢查
**Goal**: 確認 AngularJS 版本和頁面環境相容性
**Success Criteria**:
- 檢查 AngularJS 版本
- 檢查 angular-ui-tree 存在
- 驗證 scope 存取
- 清楚的錯誤訊息

**Tests**:
- [ ] 驗證 AngularJS 版本 >= 1.0
- [ ] 驗證 .angular-ui-tree 元素存在
- [ ] 驗證 scope 可被存取
- [ ] 驗證 categories 陣列存在

**Status**: Not Started

## Stage 5: 現場測試和調試
**Goal**: 在實際 Shopline 頁面上進行完整測試
**Success Criteria**:
- 所有測試場景都通過
- 無 console 錯誤
- 主要方案成功（備案方案未觸發）
- 移動後頁面重新整理仍保留變更

**Tests**:
- [ ] 執行 Stage 1 中的所有測試場景
- [ ] 檢查 Console 輸出（F12 開發者工具）
- [ ] 檢查 Network 請求
- [ ] 驗證持久化（重新整理頁面）

**Status**: Not Started

---

## 詳細測試計劃

### 測試場景 1: 基礎功能

#### 1.1 頁面載入後按鈕出現
- **前置條件**: 開啟 Shopline 分類管理頁面
- **步驟**:
  1. 等待頁面完全載入
  2. 查看分類列表中的每一個分類行
  3. 確認在操作按鈕區看到「移動到」按鈕
- **預期結果**: 每個分類行都有「移動到」按鈕

#### 1.2 點擊按鈕下拉選單顯示
- **前置條件**: 按鈕已顯示
- **步驟**:
  1. 點擊任意分類的「移動到」按鈕
  2. 觀察下拉選單是否出現
  3. 查看選單位置是否正確（不遮擋內容）
- **預期結果**: 下拉選單正確顯示

#### 1.3 下拉選單包含合法目標
- **前置條件**: 下拉選單已打開
- **步驟**:
  1. 檢查第一個選項是否為「📂 根目錄」
  2. 檢查選單中包含所有有效的目標分類
  3. 確認層級顯示正確（使用縮進）
- **預期結果**: 所有有效目標都在選單中，格式正確

### 測試場景 2: 移動操作

#### 2.1 移動 Level 1 分類到根目錄
- **前置條件**: 有多層分類結構，至少有一個 Level 2 分類
- **步驟**:
  1. 找一個 Level 2 分類
  2. 點擊其「移動到」按鈕
  3. 選擇「📂 根目錄」
  4. 確認分類移動到頂層
- **預期結果**: 分類成為 Level 1，位置在列表頂部

#### 2.2 移動分類到某個 Level 1 分類底下
- **前置條件**: 有兩個 Level 1 分類
- **步驟**:
  1. 選擇一個分類
  2. 點擊「移動到」按鈕
  3. 選擇另一個 Level 1 分類
  4. 確認分類變成 Level 2，在目標分類下縮進
- **預期結果**: 分類成為 Level 2，層級顯示正確

#### 2.3 移動分類到某個 Level 2 分類底下
- **前置條件**: 有 Level 2 分類可用
- **步驟**:
  1. 選擇一個分類
  2. 點擊「移動到」按鈕
  3. 選擇一個 Level 2 分類
  4. 確認分類變成 Level 3，縮進更深
- **預期結果**: 分類成為 Level 3，正確顯示在層級結構中

### 測試場景 3: 邏輯驗證

#### 3.1 無法將分類移到自己
- **前置條件**: 下拉選單已打開
- **步驟**:
  1. 在下拉選單中查找被移動的分類
  2. 確認該分類沒有出現在選單中
- **預期結果**: 分類本身不在選單選項中

#### 3.2 無法將分類移到自己的子孫
- **前置條件**: 有分類有子分類
- **步驟**:
  1. 選擇一個有子分類的分類
  2. 點擊「移動到」按鈕
  3. 查看下拉選單中是否包含其子分類或孫分類
  4. 確認這些都被排除
- **預期結果**: 所有子孫分類都被排除

#### 3.3 Level 3 分類不出現在下拉選單中
- **前置條件**: 分類結構中有 Level 3 分類
- **步驟**:
  1. 打開下拉選單（任意分類）
  2. 逐一檢查每個選項的層級
  3. 確認沒有 Level 3 分類在選單中
- **預期結果**: Level 3 分類被排除（無法作為目標）

### 測試場景 4: 持久化

#### 4.1 移動後重新整理頁面，變更維持
- **前置條件**: 已完成一次成功的分類移動
- **步驟**:
  1. 按 F5 重新整理頁面
  2. 等待頁面完全載入
  3. 查找剛才移動的分類
  4. 確認分類仍在新位置
- **預期結果**: 分類位置維持不變

#### 4.2 檢查網路請求是否包含儲存
- **前置條件**: 已打開 DevTools Network 標籤，進行了移動操作
- **步驟**:
  1. 查看 Network 標籤中的 API 請求
  2. 尋找更新分類的 API 呼叫（通常是 PUT/POST 到 `/categories` 或類似路徑）
  3. 確認請求包含正確的分類資料
  4. 確認服務器返回成功狀態碼（200/204）
- **預期結果**: 有正確的 API 請求，服務器確認保存

### 測試場景 5: 邊界情況

#### 5.1 分類有多個子分類，移動後仍保留子分類
- **前置條件**: 有分類有多個子分類
- **步驟**:
  1. 移動該分類到新位置
  2. 展開分類查看子分類
  3. 確認所有子分類都還在
  4. 確認子分類的層級正確增加
- **預期結果**: 所有子分類都移動，層級關係保持

#### 5.2 特殊分類（key 有值）按鈕是否禁用
- **前置條件**: 頁面上有特殊分類（如「精選商品」，key 有值）
- **步驟**:
  1. 查看特殊分類的「移動到」按鈕
  2. 確認按鈕是否禁用或不出現
  3. 嘗試點擊按鈕（如果存在）
- **預期結果**: 特殊分類的按鈕被禁用或隱藏

#### 5.3 分類名稱很長，按鈕位置是否正確
- **前置條件**: 找到名稱較長的分類
- **步驟**:
  1. 查看該分類行的「移動到」按鈕
  2. 確認按鈕沒有被長名稱擠出視野
  3. 確認按鈕仍可點擊
- **預期結果**: 按鈕位置正確，不被文字遮擋

---

## 測試工具和方式

### 使用瀏覽器 DevTools (F12)

#### Console 標籤
- **用途**: 檢查錯誤訊息和腳本輸出
- **關鍵訊息**:
  - `[Shopline Category Manager] 正在初始化...` 表示腳本啟動
  - `[Shopline Category Manager] 成功初始化` 表示初始化完成
  - `error` 開頭的訊息表示有問題
- **檢查項**:
  - 沒有紅色的 console.error
  - 沒有未捕獲的異常

#### Network 標籤
- **用途**: 監控 API 請求
- **關鍵請求**:
  - PUT/POST 到 `/categories` 或類似端點
  - 檢查請求體中的分類資料
  - 驗證響應狀態碼（200/204）
- **檢查項**:
  - 移動操作後有保存請求
  - 請求包含正確的分類 ID 和新位置信息

#### Elements 標籤
- **用途**: 檢查 DOM 結構
- **檢查項**:
  - 找到 `.angular-ui-tree` 容器
  - 每行分類都有「移動到」按鈕
  - 下拉選單的 HTML 結構正確

### 手動測試步驟

1. **安裝腳本**:
   - 使用 Tampermonkey 或類似工具安裝 userscript
   - 確認腳本已啟用

2. **開啟分類管理頁面**:
   - 進入 Shopline 後台
   - 進入分類管理頁面

3. **檢查基礎功能**:
   - 按 F12 開啟 DevTools
   - 切換到 Console 標籤，查看初始化訊息
   - 檢查是否有錯誤

4. **測試按鈕**:
   - 向下滾動查看分類列表
   - 查看每個分類行是否有「移動到」按鈕
   - 點擊按鈕查看下拉選單

5. **測試移動**:
   - 選擇目標分類點擊移動
   - 觀察 UI 變化
   - 檢查 Console 訊息
   - 檢查 Network 請求

6. **驗證持久化**:
   - 重新整理頁面（F5）
   - 查看分類是否保留在新位置

---

## 備案方案：DragEvent 模擬實作

### 實作策略

若 $scope 方案失敗（如 AngularJS 無法存取），將自動切換到拖拉事件模擬：

```javascript
async function moveUsingDragEvent(sourceLi, targetLi) {
  // 1. 建立 DataTransfer 物件
  const dataTransfer = new DataTransfer();

  // 2. 建立並觸發 dragstart
  const dragStartEvent = new DragEvent('dragstart', {
    bubbles: true,
    cancelable: true,
    dataTransfer: dataTransfer
  });
  sourceLi.dispatchEvent(dragStartEvent);
  await new Promise(resolve => setTimeout(resolve, 100));

  // 3. 在目標上觸發 dragover
  const dragOverEvent = new DragEvent('dragover', {
    bubbles: true,
    cancelable: true,
    dataTransfer: dataTransfer
  });
  targetLi.dispatchEvent(dragOverEvent);
  await new Promise(resolve => setTimeout(resolve, 100));

  // 4. 觸發 drop
  const dropEvent = new DragEvent('drop', {
    bubbles: true,
    cancelable: true,
    dataTransfer: dataTransfer
  });
  targetLi.dispatchEvent(dropEvent);

  // 5. 等待 angular-ui-tree 處理
  await new Promise(resolve => setTimeout(resolve, 500));
}
```

### 集成方式

在 $scope 方案失敗時調用備案方案：

```javascript
// 主方案失敗時
try {
  moveUsingScope(sourceCategory, targetCategory);
} catch (error) {
  console.warn('主方案失敗，使用備案 DragEvent 方案...');
  const sourceLi = getScopeLiElement(sourceCategory);
  const targetLi = getScopeLiElement(targetCategory);
  await moveUsingDragEvent(sourceLi, targetLi);
}
```

---

## 成功標準

- [ ] 所有測試場景都通過
- [ ] 移動後頁面刷新仍然維持變更
- [ ] 無 console 錯誤（除了與 Shopline 無關的）
- [ ] 備案方案已實作但未觸發（主要方案成功）
- [ ] 有清楚的錯誤訊息和使用者回饋
- [ ] Network 請求包含保存操作
- [ ] AngularJS 版本驗證通過

---

## 檢查清單

### 錯誤處理
- [ ] 若 scope 無法存取，輸出清楚的錯誤訊息
- [ ] 若 categories 陣列不存在，提示使用者
- [ ] 若移動失敗，恢復原狀態
- [ ] 若網路錯誤，提示使用者重試

### 使用者回饋
- [ ] 移動成功後顯示綠色提示（1-2 秒）
- [ ] 移動失敗時顯示紅色錯誤訊息
- [ ] 正在處理時禁用按鈕（避免多次點擊）
- [ ] 錯誤訊息包含解決方案提示

### 相容性
- [ ] 檢查 AngularJS 版本（須 >= 1.0）
- [ ] 檢查頁面是否有 .angular-ui-tree（確認頁面加載）
- [ ] 驗證 scope 可被存取
- [ ] 驗證 categories 陣列存在且是正確格式

### 代碼質量
- [ ] 無 console.error（除了必要的提示）
- [ ] 所有函數有清楚的註解
- [ ] 備案方案完整實作
- [ ] 錯誤訊息清晰有用
