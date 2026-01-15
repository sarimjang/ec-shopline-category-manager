# scripts/README.md 更新草稿

## 現況分析

目前 `scripts/README.md` 包含以下章節：
1. 檔案同步工具說明（方案 A: AST 級別同步、方案 B: 簡易 Shell）
2. 開發工作流程
3. 使用 Serena MCP 進行符號級操作
4. 最佳實踐
5. 疑難排解
6. 工具依賴
7. 進階技巧
8. 總結

**結論**：目前檔案 **完全沒有提到** Tampermonkey 沙箱問題或 AngularJS 訪問限制。

---

## 建議更新內容

### 建議地點

在「疑難排解」章節之後、「工具依賴」章節之前，新增一個完整的章節：

**新章節標題**：`## Tampermonkey 沙箱與 AngularJS 訪問`

或位置 2：在「開發工作流程」章節之後，新增為第 3 個主要章節

**推薦使用位置 1**（在疑難排解之後），因為這是常見的「問題」類型

---

## 完整更新內容

### 第一部分：新增章節內容

```markdown
---

## Tampermonkey 沙箱與 AngularJS 訪問

### 問題背景

Tampermonkey 提供了強大的安全隔離機制。當腳本使用 `@grant` 指令請求特定權限時，Tampermonkey 會啟用**沙箱模式**，將腳本執行環境與頁面主環境分離。

**影響**：
- 沙箱模式下，腳本中的 `window` 物件指向沙箱環境，而非頁面真實環境
- 頁面上下文的 `window.angular`（AngularJS 物件）對沙箱内的腳本不可見
- 直接調用 `angular.element()` 會失敗，因為 `angular` 是 `undefined`

### 我們的實現

這個專案在開發版本和生產版本中都使用了 `@grant` 指令：

#### 開發版本 (`shopline-category-manager.user.js`)

```javascript
// ==UserScript==
// ... 其他 metadata ...
// @grant       none
// ==/UserScript==
```

開發版本沒有使用任何 `@grant` 權限，因此不啟用沙箱模式，可以直接訪問頁面的 AngularJS。

#### 生產版本 (`shopline-category-manager.prod.user.js`)

```javascript
// ==UserScript==
// ... 其他 metadata ...
// @grant       GM_registerMenuCommand
// ==/UserScript==
```

生產版本使用了 `@grant GM_registerMenuCommand` 來實現 Tampermonkey 菜單功能（📊 查看統計、🔄 重置統計）。這會啟用沙箱模式。

### 解決方案：使用 unsafeWindow

為了在沙箱模式下訪問頁面的 AngularJS，我們使用 Tampermonkey 提供的 **`unsafeWindow`** 物件：

```javascript
/**
 * 安全獲取 AngularJS 物件（跨越 Tampermonkey 沙箱）
 *
 * @returns {Object|null} AngularJS 物件或 null
 */
function getAngular() {
  // 優先使用 unsafeWindow（跨越沙箱）
  if (typeof unsafeWindow !== 'undefined' && unsafeWindow.angular) {
    return unsafeWindow.angular;
  }

  // 降級使用 window（無沙箱模式）
  if (typeof window !== 'undefined' && window.angular) {
    return window.angular;
  }

  return null;
}
```

**關鍵點**：
- `unsafeWindow` 在沙箱模式下指向頁面的真實 `window` 物件
- 優先使用 `unsafeWindow` 確保生產版本正常工作
- 降級邏輯確保開發版本也能正常運作（儘管不需要）

### 等待 AngularJS 載入

即使能訪問 `unsafeWindow.angular`，也需要確保它已經完全初始化：

```javascript
/**
 * 等待 AngularJS 載入完成
 *
 * @param {number} timeout - 超時時間（毫秒，預設 10000）
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

**特點**：
- 使用輪詢機制（100ms 間隔），確保 AngularJS 完全初始化
- 設置超時機制（預設 10 秒），避免無限等待
- Promise 支持易於集成到異步程式碼

### 在初始化時使用

修復的初始化流程：

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

    // 現有程式碼：等待樹節點...
    try {
      await waitForTreeNodes(CategoryManager.TREE_NODES_TIMEOUT_MS);
    } catch (error) {
      console.error('[Shopline Category Manager] 樹節點超時:', error.message);
    }

    // ... 其餘初始化邏輯
  } catch (error) {
    console.error('[Shopline Category Manager] 初始化失敗:', error);
  }
}
```

### 安全考慮與最佳實踐

#### 1. unsafeWindow 的安全性

❓ **Q: 使用 `unsafeWindow` 安全嗎？**

✅ **A: 是的，在這個上下文中是安全的。**

原因：
- `unsafeWindow` 是 Tampermonkey 和 Greasemonkey 等腳本管理器提供的標準功能
- 它被設計用於**必要時**訪問頁面上下文
- 我們只訪問 AngularJS 物件，不修改敏感資料
- 頁面本身已經執行了 AngularJS，我們只是訪問它

詳見 [Tampermonkey 官方文檔 - unsafeWindow](https://www.tampermonkey.net/documentation.php#api:unsafeWindow)

#### 2. 優先順序設計

```javascript
// ✅ 好的做法：優先級清晰
if (typeof unsafeWindow !== 'undefined' && unsafeWindow.angular) {
  return unsafeWindow.angular;  // 沙箱模式
}
if (typeof window !== 'undefined' && window.angular) {
  return window.angular;         // 非沙箱模式
}
return null;
```

這確保了：
- 沙箱模式下使用正確的來源
- 非沙箱模式下有合理的降級
- 代碼清晰易維護

#### 3. 錯誤處理

```javascript
// ✅ 好的做法：顯式檢查和友善的錯誤訊息
const ng = getAngular();
if (!ng) {
  console.warn('[Shopline Category Manager] AngularJS 不可用，跳過按鈕注入');
  return;  // 優雅降級
}

// ❌ 不好的做法：預期總是成功
const ng = getAngular();  // 可能是 null
ng.element(node);  // TypeError: Cannot read property 'element' of null
```

#### 4. 效能考慮

`waitForAngular()` 的輪詢機制：
- **間隔 100ms**：短到能及時響應，長到不會過度耗費 CPU
- **超時 10s**：足夠讓複雜 SPA 完全初始化，同時避免無限等待
- **Promise 型**：允許在初始化前進行其他異步操作

### 除錯技巧

#### 1. 檢查 AngularJS 是否可訪問

```javascript
// 在 Console 中執行
console.log(getAngular());  // 應該返回 AngularJS 物件
console.log(unsafeWindow.angular);  // 在沙箱模式下應可用
```

#### 2. 監控初始化過程

```javascript
// 在 Console 中執行
waitForAngular(5000)
  .then(ng => console.log('AngularJS 已載入:', ng))
  .catch(err => console.error('載入失敗:', err.message));
```

#### 3. 檢查沙箱模式是否啟用

```javascript
// 在 Console 中執行
console.log('沙箱模式:', typeof unsafeWindow !== 'undefined' && unsafeWindow !== window);
// 返回 true 表示沙箱已啟用
```

### 常見問題

#### Q1: 為什麼生產版本需要沙箱？

**A**: 生產版本使用 `@grant GM_registerMenuCommand` 來添加 Tampermonkey 菜單命令（📊 查看統計、🔄 重置統計）。這是 Tampermonkey 提供的高級功能，需要沙箱隔離來保護腳本安全。

#### Q2: 開發版本為什麼不需要沙箱？

**A**: 開發版本使用 `@grant none`，表示不請求任何特殊權限。這樣可以在非沙箱模式下運行，便於開發和測試。

#### Q3: 如何在開發版本中測試沙箱場景？

**A**: 將開發版本的 metadata 改為：
```javascript
// @grant GM_registerMenuCommand
```

然後重新載入腳本。這會啟用沙箱模式，允許你測試 `unsafeWindow` 邏輯。

#### Q4: 能否同時移除菜單功能並保持非沙箱模式？

**A**: 可以，但不推薦。菜單功能對使用者很有用（快速查看統計和重置）。相反，我們推薦始終在生產版本中保持沙箱模式，並確保代碼能正確處理。

### 相關文件

- [Tampermonkey 官方文檔](https://www.tampermonkey.net/documentation.php)
- [Greasemonkey 沙箱說明](http://wiki.greasespot.net/Sandbox)
- 本項目的 `src/shopline-category-manager.prod.user.js` - 完整的修復實現

---
```

### 第二部分：修改現有「疑難排解」章節

在現有的「疑難排解」章節之後的「### 問題：Optional chaining 語法錯誤」之前，新增一個新問題：

```markdown
### 問題：按鈕未出現或功能無效

**原因**：可能是 Tampermonkey 沙箱模式，AngularJS 無法訪問

**解決方式**：
1. 確認使用的是 production 版本（`prod.user.js`）
2. 開啟 Tampermonkey Dashboard，檢查腳本的 @grant 設定
3. 在 Chrome DevTools Console 中執行檢查：
   ```javascript
   console.log(getAngular());  // 應該返回 AngularJS 物件
   console.log(typeof unsafeWindow);  // 應該返回 "object"
   ```
4. 如果返回 `null` 或 `undefined`，表示 AngularJS 未載入
5. 等待 3-5 秒後重新檢查（AngularJS 可能在延遲初始化）
6. 如果問題持續，嘗試以下操作：
   - 清空瀏覽器 cache: Ctrl+Shift+Delete
   - 在 Tampermonkey Dashboard 禁用再啟用腳本
   - 清空 LocalStorage: `localStorage.clear()`
   - 重新整理頁面: F5

**相關章節**：[Tampermonkey 沙箱與 AngularJS 訪問](#tampermonkey-沙箱與-angularjs-訪問)
```

### 第三部分：修改章節導航

在文檔開頭（在第一個 `---` 之前或之後），如果有目錄或快速導航，添加新章節的連結：

```markdown
- [Tampermonkey 沙箱與 AngularJS 訪問](#tampermonkey-沙箱與-angularjs-訪問)
- [疑難排解](#疑難排解)
```

---

## 更新影響評估

### 對現有讀者的影響

**正面影響**：
- ✅ 解釋了為什麼生產版本和開發版本的 @grant 不同
- ✅ 幫助使用者理解沙箱限制
- ✅ 提供了除錯技巧和常見問題解答
- ✅ 增強了文檔的完整性

**無負面影響**：
- ✅ 只是新增內容，不修改現有內容
- ✅ 不影響現有的工具使用說明

### 文檔結構變化

**更新前**（8 個主要章節）：
1. 檔案同步工具
2. 開發工作流程
3. 使用 Serena MCP 進行符號級操作
4. 最佳實踐
5. 疑難排解
6. 工具依賴
7. 進階技巧
8. 總結

**更新後**（9 個主要章節）：
1. 檔案同步工具
2. 開發工作流程
3. 使用 Serena MCP 進行符號級操作
4. 最佳實踐
5. **Tampermonkey 沙箱與 AngularJS 訪問** ← 新增
6. 疑難排解（修改，新增 1 個問題）
7. 工具依賴
8. 進階技巧
9. 總結

---

## 實施步驟

### 步驟 1：插入新章節

在 `scripts/README.md` 的「疑難排解」章節之前插入新章節「Tampermonkey 沙箱與 AngularJS 訪問」。

**插入位置**：第 237 行（在 `## 疑難排解` 之前）

### 步驟 2：修改疑難排解章節

在「疑難排解」章節的最後，在「### 問題：Optional chaining 語法錯誤」之前，新增「### 問題：按鈕未出現或功能無效」。

**插入位置**：第 261 行之前

### 步驟 3：更新文檔統計

更新文檔末尾的文件大小統計（如有）。

---

## 預計影響

- **新增行數**：~180 行（新章節）
- **修改行數**：~10 行（疑難排解部分）
- **文件大小增加**：~6-8 KB
- **估計閱讀時間增加**：~5-7 分鐘

---

## 可選增強

如果要進一步完善文檔，可考慮：

### 選項 A：添加示意圖

在「Tampermonkey 沙箱與 AngularJS 訪問」章節中添加沙箱模式的示意圖：

```
┌─────────────────────────────────────────┐
│ 瀏覽器標籤                              │
├─────────────────────────────────────────┤
│ 頁面 (Page Context)                     │
│ ├─ window.angular (AngularJS)          │
│ ├─ DOM 元素                             │
│ └─ ...                                  │
├─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤ ← 沙箱邊界
│ Tampermonkey 沙箱 (Script Context)      │
│ ├─ window (沙箱 window，無法訪問上面) │
│ ├─ unsafeWindow (可訪問真實 window)    │
│ └─ 腳本代碼                             │
└─────────────────────────────────────────┘
```

### 選項 B：添加視頻或屏幕記錄

如果項目有視頻資源，可添加「故障排除視頻」連結。

### 選項 C：添加參考資源鏈接

收集相關的 Tampermonkey 和 AngularJS 文檔，制作一個「進一步閱讀」部分。

---

## 驗收標準

更新完成後確認：

- [ ] 新章節清晰易讀
- [ ] 代碼示例能正確複製執行
- [ ] 常見問題都得到解答
- [ ] 連結都能正常打開
- [ ] 格式與現有文檔一致
- [ ] 沒有拼寫或文法錯誤

---

**準備日期**：2026-01-15
**準備者**：Claude Code (Codex CLI)
**狀態**：✅ 準備完成，待實作確認
