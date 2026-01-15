# Tampermonkey 沙箱 AngularJS 訪問修復

## 概述

修復 production 版本無法在 Shopline 網站上顯示客製按鈕的關鍵 bug。根本原因是 Tampermonkey 沙箱模式阻擋了對頁面 AngularJS 物件的訪問，導致初始化失敗。

## 問題診斷

### 症狀
- ✅ Dev 版本 (`shopline-category-manager.user.js`) 正常運作
- ❌ Prod 版本 (`shopline-category-manager.prod.user.js`) 無法顯示「移動到」按鈕
- ✅ 語法驗證通過（acorn parser）
- ✅ 檔案結構完整（CategoryManager 類別、init() 函數皆存在）

### 根本原因

**Tampermonkey 沙箱阻擋 AngularJS 訪問**

當使用 `@grant GM_registerMenuCommand` 時，Tampermonkey 啟用沙箱模式：

```javascript
// ❌ 在沙箱中失敗
window.angular → undefined
angular.element(node).scope() → ReferenceError or undefined

// ✅ 正確做法
unsafeWindow.angular → 頁面的 AngularJS 物件
```

**失敗流程**：
1. `init()` 函數執行
2. 調用 `getAngularScope()` (Line 2406)
3. 嘗試訪問 `window.angular` → `undefined`
4. 返回 `null` → `init()` 提前退出 (Line 2546)
5. `CategoryManager` 從未初始化 → 按鈕永遠不會注入

### 影響範圍

**直接使用 `angular` 的位置（共 4 處）**：
- Line 704: `angular.element(node).scope()` - `attachButtonsToCategories()`
- Line 789: `angular.element(treeNode).scope()` - `getCategoryFromElement()`
- Line 896: `angular.element(nodeEl).scope()` - `getCategoryFromElement()`
- Line 2413: `angular.element(element).scope()` - `getAngularScope()`

### 為何 Dev 版本正常？

**差異分析**：

| 項目 | Dev 版本 | Prod 版本 |
|------|----------|-----------|
| @namespace | `http://tampermonkey.net/` | `https://github.com/...` |
| @run-at | 未設定 | `document-end` |
| @grant | `GM_registerMenuCommand` | `GM_registerMenuCommand` |
| 其他 metadata | 簡化 | 完整（homepage, updateURL 等）|

**結論**：兩個版本的 `@grant` 設定相同，都應該啟用沙箱。問題可能來自：
1. **測試方式不同**：Dev 版本可能在不同環境下測試（例如：直接開啟檔案 vs. 從 GitHub 載入）
2. **瀏覽器快取**：Dev 版本可能使用了舊的無沙箱版本
3. **Tampermonkey 版本差異**：不同版本的沙箱行為可能略有不同

**重要**：無論 Dev 版本為何正常，Prod 版本的問題是真實且必須修復的。

## 解決方案

### 方案 A: 安全的 AngularJS 訪問（推薦）

**核心原則**：使用 `unsafeWindow` 跨越沙箱邊界，並加入完整的錯誤處理。

#### 1. 引入 `getAngular()` Helper

```javascript
/**
 * 安全獲取 AngularJS 物件（跨越 Tampermonkey 沙箱）
 *
 * 背景：當使用 @grant 權限時，Tampermonkey 會啟用沙箱模式，
 * 導致 window.angular 無法訪問頁面的 AngularJS 物件。
 *
 * @returns {Object|null} AngularJS 物件或 null
 */
function getAngular() {
  // 優先使用 unsafeWindow（跨越沙箱）
  if (typeof unsafeWindow !== 'undefined' && unsafeWindow.angular) {
    return unsafeWindow.angular;
  }

  // 降級使用 window（無沙箱模式，例如 @grant none）
  if (typeof window !== 'undefined' && window.angular) {
    return window.angular;
  }

  return null;
}
```

**插入位置**：`src/shopline-category-manager.user.js` Line ~2360（工具函數區域）

#### 2. 引入 `waitForAngular()` 函數

```javascript
/**
 * 等待 AngularJS 載入完成
 *
 * 用途：確保在初始化前 AngularJS 已經完全載入，
 * 避免 SPA 路由變更或延遲載入導致的失敗。
 *
 * @param {number} timeout - 超時時間（毫秒）
 * @returns {Promise<Object>} AngularJS 物件
 */
function waitForAngular(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkAngular = () => {
      const ng = getAngular();
      if (ng) {
        console.log('[Shopline Category Manager] ✓ AngularJS 已就緒');
        resolve(ng);
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error('AngularJS 載入超時'));
        return;
      }

      // 每 100ms 檢查一次
      setTimeout(checkAngular, 100);
    };

    checkAngular();
  });
}
```

**插入位置**：緊接在 `getAngular()` 之後

#### 3. 修改所有 `angular.element` 調用

**位置 1: Line 704 - `attachButtonsToCategories()`**

```javascript
// 修改前
const actualScopeItem = angular.element(node).scope()?.item;

// 修改後
const ng = getAngular();
if (!ng) {
  console.warn('[Shopline Category Manager] AngularJS 不可用，跳過按鈕注入');
  return;
}
const actualScopeItem = ng.element(node).scope()?.item;
```

**位置 2: Line 789 - `getCategoryFromElement()` (第一處)**

```javascript
// 修改前
const scope = angular.element(treeNode).scope();

// 修改後
const ng = getAngular();
if (!ng) return null;
const scope = ng.element(treeNode).scope();
```

**位置 3: Line 896 - `getCategoryFromElement()` (第二處)**

```javascript
// 修改前
const scope = angular.element(nodeEl).scope();

// 修改後
const ng = getAngular();
if (!ng) return null;
const scope = ng.element(nodeEl).scope();
```

**位置 4: Line 2413 - `getAngularScope()` Helper**

```javascript
// 修改前
const scope = angular.element(element).scope();

// 修改後
const ng = getAngular();
if (!ng) return null;
const scope = ng.element(element).scope();
```

#### 4. 在 `init()` 開頭加入 AngularJS 等待

**位置：Line 2506 - `init()` 函數**

```javascript
async function init() {
  try {
    console.log('[Shopline Category Manager] 正在初始化...');

    // 新增：等待 AngularJS 載入完成
    try {
      await waitForAngular(CategoryManager.WAIT_ELEMENT_TIMEOUT_MS);
    } catch (error) {
      console.error('[Shopline Category Manager] AngularJS 載入失敗:', error.message);
      console.error('[Shopline Category Manager] 初始化中止');
      return;
    }

    // 現有程式碼：首先等待實際的樹節點出現...
    try {
      await waitForTreeNodes(CategoryManager.TREE_NODES_TIMEOUT_MS);
    } catch (error) {
      console.error('[Shopline Category Manager] 樹節點超時:', error.message);
    }

    // ... 其餘程式碼保持不變
```

### 方案 B: 移除沙箱模式（不推薦）

**做法**：將 `@grant GM_registerMenuCommand` 改為 `@grant none`

**優點**：
- ✅ 簡單直接
- ✅ 無需修改程式碼

**缺點**：
- ❌ 失去 Tampermonkey 選單功能（📊 查看統計、🔄 重置統計）
- ❌ 違背 Phase 2 的設計目標
- ❌ 不符合 UserScript 最佳實踐（應該明確聲明權限）

**結論**：不採用此方案。

## 技術規格

### 新增函數

```javascript
// 1. getAngular() - 跨越沙箱獲取 AngularJS
function getAngular(): Object | null

// 2. waitForAngular() - 等待 AngularJS 載入
function waitForAngular(timeout: number = 10000): Promise<Object>
```

### 修改的函數

```javascript
// 1. attachButtonsToCategories() - 加入 getAngular() 檢查
// 2. getCategoryFromElement() - 兩處加入 getAngular() 檢查
// 3. getAngularScope() - 加入 getAngular() 檢查
// 4. init() - 加入 waitForAngular() 調用
```

### 影響的檔案

- ✅ `src/shopline-category-manager.user.js`
- ✅ `src/shopline-category-manager.prod.user.js`（透過 AST 同步工具自動更新）

## 測試計劃

### 單元測試

1. **getAngular() 測試**
   - [ ] 在沙箱模式下返回 `unsafeWindow.angular`
   - [ ] 在非沙箱模式下返回 `window.angular`
   - [ ] 在 AngularJS 不可用時返回 `null`

2. **waitForAngular() 測試**
   - [ ] AngularJS 立即可用時立即解析
   - [ ] AngularJS 延遲載入時正確等待
   - [ ] 超時後正確拒絕 Promise

### 整合測試

1. **Tampermonkey 沙箱環境**
   - [ ] 安裝 prod.user.js 到 Tampermonkey
   - [ ] 確認「移動到」按鈕正確顯示
   - [ ] 測試移動分類功能正常
   - [ ] 測試 Tampermonkey 選單（📊 查看統計、🔄 重置統計）

2. **不同瀏覽器**
   - [ ] Chrome + Tampermonkey
   - [ ] Firefox + Tampermonkey
   - [ ] Edge + Tampermonkey

3. **不同頁面狀態**
   - [ ] 頁面直接載入（document.readyState = 'loading'）
   - [ ] 頁面已載入（document.readyState = 'complete'）
   - [ ] SPA 路由變更後

### 回歸測試

- [ ] Dev 版本仍然正常運作
- [ ] 時間追蹤功能正常（Phase 1 & 2）
- [ ] 搜尋功能正常
- [ ] 多層級分類移動正常
- [ ] 錯誤處理正常（層級超過 3 層等）

## 驗收標準

### 必須滿足

1. ✅ **Prod 版本可正常使用**
   - 「移動到」按鈕在所有分類項目上正確顯示
   - 移動功能正常執行
   - 無 JavaScript 錯誤

2. ✅ **跨越沙箱邊界**
   - `getAngular()` 正確返回頁面 AngularJS 物件
   - 所有 `angular.element` 調用使用 `getAngular()`

3. ✅ **等待機制生效**
   - `waitForAngular()` 確保初始化前 AngularJS 已載入
   - 不會因為載入順序問題而初始化失敗

4. ✅ **保持功能完整**
   - 時間追蹤功能仍然正常（Phase 1 & 2）
   - Tampermonkey 選單仍然可用

### 效能要求

- `waitForAngular()` 輪詢間隔：100ms
- 最大等待時間：10 秒（與 `WAIT_ELEMENT_TIMEOUT_MS` 一致）
- `getAngular()` 調用開銷：< 1ms

## 安全性考量

### unsafeWindow 使用

**風險評估**：
- ⚠️  `unsafeWindow` 允許訪問頁面 JavaScript 物件
- ⚠️  可能受到頁面惡意程式碼影響

**緩解措施**：
- ✅ 僅讀取 `unsafeWindow.angular`，不修改
- ✅ 完整的 null 檢查，避免錯誤傳播
- ✅ 使用 `?.` 可選鏈運算子防止崩潰
- ✅ 限制在 Shopline 官方域名（@match 限制）

**結論**：風險可控，符合 UserScript 最佳實踐。

## 向後相容性

### 兼容性分析

| 項目 | 兼容性 |
|------|--------|
| 現有 dev 版本 | ✅ 完全兼容 |
| 時間追蹤功能 | ✅ 不影響 |
| localStorage 統計 | ✅ 不影響 |
| Tampermonkey 選單 | ✅ 仍然可用 |
| AngularJS 1.x | ✅ 兼容所有版本 |

### 降級方案

如果修復失敗，可以：
1. **回退到修復前版本**（透過 git 備份）
2. **移除沙箱模式**（`@grant none`，犧牲選單功能）
3. **使用 Dev 版本**（短期解決方案）

## 實作順序

見 `tasks.md` 詳細任務清單。

建議順序：
1. Task 1: 加入 `getAngular()` helper
2. Task 2: 加入 `waitForAngular()` 函數
3. Task 3: 修改 4 處 `angular.element` 調用
4. Task 4: 在 `init()` 加入 `waitForAngular()`
5. Task 5: 同步到 prod.user.js
6. Task 6: 測試與驗證

## 參考資料

### Tampermonkey 文檔
- [Sandbox Mode](https://www.tampermonkey.net/documentation.php#_grant)
- [unsafeWindow](https://wiki.greasespot.net/UnsafeWindow)

### Codex CLI 審查報告
- Session ID: `019bc004-eb95-7a91-9a5d-3202405cba56`
- 完整報告：`/tmp/claude/.../tasks/b308202.output`
- Token 使用：38,570

### 相關 Issues
- 初始問題：「我發現 main 沒有辦法正常的移動分類後呼叫 shopline api 儲存狀態」
- 症狀：「一直無法載入腳本」+ 語法錯誤
- 最終診斷：Tampermonkey 沙箱阻擋 AngularJS 訪問

## 成功指標

- ✅ Prod 版本按鈕出現率：100%
- ✅ AngularJS 訪問成功率：100%（在 10 秒內）
- ✅ 無 JavaScript 錯誤
- ✅ 時間追蹤功能正常運作
- ✅ 跨瀏覽器兼容性測試通過
