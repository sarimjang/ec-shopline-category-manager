# 實作任務清單

## Task 1: 加入 getAngular() Helper 函數

**目標**：創建安全的 AngularJS 訪問包裝器，跨越 Tampermonkey 沙箱邊界。

### 子任務
- [ ] 在工具函數區域加入 `getAngular()` 函數
- [ ] 實作 `unsafeWindow.angular` 檢查（優先）
- [ ] 實作 `window.angular` 降級邏輯
- [ ] 加入詳細的 JSDoc 註釋
- [ ] 單元測試：沙箱模式、非沙箱模式、AngularJS 不可用

**檔案位置**: `src/shopline-category-manager.user.js` (Line ~2360，在 `waitForElement` 之前)

**程式碼**:
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

**驗證**：
```javascript
console.log(getAngular()); // 應該返回 AngularJS 物件或 null
```

---

## Task 2: 加入 waitForAngular() 函數

**目標**：實作輪詢機制，確保初始化前 AngularJS 已完全載入。

### 子任務
- [ ] 在 `getAngular()` 後加入 `waitForAngular()` 函數
- [ ] 實作輪詢邏輯（每 100ms 檢查一次）
- [ ] 實作超時機制（預設 10 秒）
- [ ] 加入詳細的 console.log 輸出
- [ ] 單元測試：立即可用、延遲載入、超時

**檔案位置**: `src/shopline-category-manager.user.js` (緊接在 `getAngular()` 之後)

**程式碼**:
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

**驗證**：
```javascript
waitForAngular(5000)
  .then(ng => console.log('AngularJS 已載入:', ng))
  .catch(err => console.error('載入失敗:', err));
```

---

## Task 3: 修改 attachButtonsToCategories() 方法

**目標**：替換直接的 `angular.element` 調用為 `getAngular()?.element`。

### 子任務
- [ ] 在方法開頭加入 `getAngular()` 檢查
- [ ] 加入提前返回邏輯（AngularJS 不可用）
- [ ] 替換 `angular.element` 為 `ng.element`
- [ ] 加入 console.warn 提示

**檔案位置**: `src/shopline-category-manager.user.js` (Line ~704)

**修改範例**:
```javascript
// 修改前（Line 704）
const actualScopeItem = angular.element(node).scope()?.item;

// 修改後
const ng = getAngular();
if (!ng) {
  console.warn('[Shopline Category Manager] AngularJS 不可用，跳過按鈕注入');
  return;
}
const actualScopeItem = ng.element(node).scope()?.item;
```

**影響範圍**：`attachButtonsToCategories()` 方法中的單一調用點

---

## Task 4: 修改 getCategoryFromElement() 方法

**目標**：替換兩處 `angular.element` 調用。

### 子任務
- [ ] 修改第一處（Line ~789）
- [ ] 修改第二處（Line ~896）
- [ ] 加入 null 檢查
- [ ] 確保向後兼容

**檔案位置**: `src/shopline-category-manager.user.js` (Line 789, 896)

**修改範例 1** (Line ~789):
```javascript
// 修改前
const scope = angular.element(treeNode).scope();

// 修改後
const ng = getAngular();
if (!ng) return null;
const scope = ng.element(treeNode).scope();
```

**修改範例 2** (Line ~896):
```javascript
// 修改前
const scope = angular.element(nodeEl).scope();

// 修改後
const ng = getAngular();
if (!ng) return null;
const scope = ng.element(nodeEl).scope();
```

**影響範圍**：`getCategoryFromElement()` 方法中的兩個調用點

---

## Task 5: 修改 getAngularScope() Helper 函數

**目標**：替換 `angular.element` 調用為 `getAngular()?.element`。

### 子任務
- [ ] 在函數開頭加入 `getAngular()` 檢查
- [ ] 加入提前返回邏輯
- [ ] 替換 `angular.element`

**檔案位置**: `src/shopline-category-manager.user.js` (Line ~2413)

**修改範例**:
```javascript
// 修改前（Line 2413 附近）
function getAngularScope(element) {
  // ... 前面的程式碼 ...

  const scope = angular.element(element).scope();
  // ...
}

// 修改後
function getAngularScope(element) {
  // ... 前面的程式碼 ...

  const ng = getAngular();
  if (!ng) return null;
  const scope = ng.element(element).scope();
  // ...
}
```

**影響範圍**：`getAngularScope()` helper 函數中的單一調用點

---

## Task 6: 在 init() 加入 waitForAngular() 調用

**目標**：確保初始化前 AngularJS 已完全載入。

### 子任務
- [ ] 在 `init()` 開頭加入 `waitForAngular()` 調用
- [ ] 使用 try-catch 處理載入失敗
- [ ] 加入詳細的錯誤日誌
- [ ] 失敗時提前退出初始化

**檔案位置**: `src/shopline-category-manager.user.js` (Line ~2506)

**修改範例**:
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
  } catch (error) {
    console.error('[Shopline Category Manager] 初始化失敗:', error);
  }
}
```

**影響範圍**：`init()` 函數開頭（加入 5-10 行程式碼）

---

## Task 7: 同步到 prod.user.js

**目標**：使用 AST 同步工具更新 production 版本。

### 子任務
- [ ] 執行 `node scripts/sync-prod-ast.js`
- [ ] 驗證 prod.user.js 語法正確
- [ ] 比較兩個檔案的差異（應該只有 metadata）
- [ ] 確認行數差異合理

**命令**:
```bash
# 從專案根目錄執行
node scripts/sync-prod-ast.js
```

**驗證**:
```bash
# 語法驗證
node -e "
  const fs = require('fs');
  const acorn = require('acorn');
  const code = fs.readFileSync('src/shopline-category-manager.prod.user.js', 'utf8');
  acorn.parse(code, {ecmaVersion: 2022, sourceType: 'script'});
  console.log('✅ prod.user.js 語法正確');
"

# 比較行數
wc -l src/shopline-category-manager.user.js src/shopline-category-manager.prod.user.js
```

**預期結果**：
- ✅ 語法驗證通過
- ✅ prod.user.js 行數 = user.js 行數 + 5（metadata 差異）
- ✅ 所有修改都已同步

---

## Task 8: 整合測試

**目標**：在真實 Tampermonkey 環境中驗證修復。

### 子任務
- [ ] 安裝 prod.user.js 到 Tampermonkey
- [ ] 開啟 Shopline 分類管理頁面
- [ ] 驗證「移動到」按鈕正確顯示
- [ ] 測試移動分類功能
- [ ] 測試時間追蹤功能（Phase 1 & 2）
- [ ] 測試 Tampermonkey 選單（📊 查看統計、🔄 重置統計）
- [ ] 檢查瀏覽器 console 無錯誤

**測試環境**：
- Chrome + Tampermonkey (最新版本)
- Shopline Admin Panel: `https://admin.shoplineapp.com/admin/*/categories*`

**測試案例**：
1. **按鈕顯示**：每個分類項目都有「移動到」按鈕
2. **移動功能**：選擇目標分類 → 確認移動 → 分類正確移動
3. **時間追蹤**：移動後顯示時間節省訊息（三行格式）
4. **選單功能**：Tampermonkey 圖示 → 查看統計 → 顯示累積數據
5. **錯誤處理**：嘗試超過 3 層限制 → 顯示警告訊息

**驗收標準**：
- ✅ 所有測試案例通過
- ✅ 無 JavaScript 錯誤
- ✅ console.log 顯示「✓ AngularJS 已就緒」

---

## Task 9: 回歸測試

**目標**：確保修復不影響現有功能。

### 子任務
- [ ] Dev 版本仍然正常運作
- [ ] 搜尋功能正常
- [ ] 多層級分類移動正常
- [ ] 層級驗證正常（超過 3 層顯示錯誤）
- [ ] DOM 觀察器正常（新增分類後按鈕自動注入）

**測試場景**：
1. **新增分類**：新增分類 → 按鈕自動出現
2. **搜尋功能**：點擊搜尋 → 輸入關鍵字 → 選擇結果 → 移動成功
3. **層級限制**：嘗試將第 3 層分類移動到第 2 層子分類下 → 顯示錯誤
4. **多次移動**：連續移動 5 個分類 → 統計數據正確累積

---

## Task 10: 更新文檔

**目標**：記錄此修復的技術細節。

### 子任務
- [ ] 更新 `scripts/README.md` 加入沙箱問題說明
- [ ] 更新專案 `README.md` 加入 troubleshooting 章節
- [ ] 更新 `CHANGELOG.md`

**CHANGELOG.md 範例**:
```markdown
## [0.2.2] - 2026-01-15

### Fixed
- **Critical**: 修復 production 版本在 Tampermonkey 沙箱模式下無法訪問 AngularJS 的問題
  - 引入 `getAngular()` helper 使用 `unsafeWindow.angular` 跨越沙箱邊界
  - 引入 `waitForAngular()` 確保 AngularJS 完全載入後再初始化
  - 替換所有 4 處 `angular.element` 直接調用為安全包裝
  - 感謝 Codex CLI 深度分析診斷根本原因

### Technical Details
- Issue: `@grant GM_registerMenuCommand` 啟用沙箱導致 `window.angular` 無法訪問
- Solution: 使用 `unsafeWindow.angular` + 完整錯誤處理
- Files modified: `src/shopline-category-manager.user.js`, `src/shopline-category-manager.prod.user.js`
- Lines changed: ~30 lines added, 4 call sites modified
```

---

## 驗收標準

### 必須滿足

- ✅ **Task 1-6 完成**：所有程式碼修改完成
- ✅ **Task 7 完成**：prod.user.js 正確同步
- ✅ **Task 8 通過**：整合測試全部通過
- ✅ **Task 9 通過**：回歸測試無問題
- ✅ **Task 10 完成**：文檔更新

### 效能要求

- `getAngular()` 執行時間：< 1ms
- `waitForAngular()` 輪詢頻率：100ms
- 最大等待時間：10 秒

### 品質要求

- 語法驗證通過（acorn parser）
- ESLint 無警告
- 所有 console.log 保持繁體中文
- 程式碼註釋完整

---

## 預估時間

| 任務 | 預估時間 |
|------|----------|
| Task 1 | 15 分鐘 |
| Task 2 | 20 分鐘 |
| Task 3 | 10 分鐘 |
| Task 4 | 15 分鐘 |
| Task 5 | 10 分鐘 |
| Task 6 | 15 分鐘 |
| Task 7 | 5 分鐘 |
| Task 8 | 30 分鐘 |
| Task 9 | 20 分鐘 |
| Task 10 | 15 分鐘 |
| **總計** | **~2.5 小時** |

---

## 備註

- 所有變更需同時更新 `.user.js` 和 `.prod.user.js`
- 使用 `node scripts/sync-prod-ast.js` 進行安全同步
- 測試時建議使用 Chrome DevTools 開啟 console
- 如遇到問題，檢查 Tampermonkey 是否啟用沙箱模式
- `unsafeWindow` 使用符合 UserScript 最佳實踐，風險可控
