# Tampermonkey 沙箱 AngularJS 訪問修復

## 問題摘要

**日期**：2026-01-15  
**專案**：Shopline Category Manager UserScript  
**優先級**：Critical  
**影響**：100% production 使用者無法看到客製按鈕

## 根本原因

### Tampermonkey 沙箱機制

當 UserScript 使用 `@grant` 指令時，Tampermonkey 會啟用沙箱模式：

```javascript
// @grant GM_registerMenuCommand  ← 觸發沙箱模式
```

**沙箱效果**：
- `window.angular` → `undefined`
- 無法訪問頁面的 JavaScript 物件
- UserScript 與頁面 JavaScript 完全隔離

**失敗流程**：
```
init() 
  → getAngularScope() 嘗試訪問 window.angular
  → 返回 undefined
  → 返回 null
  → init() 提前退出
  → CategoryManager 從未初始化
  → 按鈕永遠不會注入
```

### 為何 Dev 版本正常？

**可能原因**（推測）：
1. 測試環境差異（file:// vs https://）
2. 瀏覽器快取使用舊版本
3. Tampermonkey 版本差異

**結論**：無論 Dev 為何正常，Prod 必須正確處理沙箱。

## 解決方案

### 1. 使用 unsafeWindow 跨越沙箱

```javascript
/**
 * 安全獲取 AngularJS 物件（跨越 Tampermonkey 沙箱）
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

**優先級設計**：
1. **unsafeWindow.angular** - 跨越沙箱，生產環境必須
2. **window.angular** - 降級方案，開發環境或 @grant none
3. **null** - AngularJS 不可用，優雅降級

### 2. 等待 AngularJS 載入

```javascript
/**
 * 等待 AngularJS 載入完成
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

**機制**：
- 100ms 輪詢間隔
- 10 秒預設超時（與專案 WAIT_ELEMENT_TIMEOUT_MS 一致）
- SPA 路由變更後也能正確等待

### 3. 在 init() 加入等待邏輯

```javascript
async function init() {
  try {
    console.log('[Shopline Category Manager] 正在初始化...');

    // 等待 AngularJS 載入完成
    try {
      await waitForAngular(CategoryManager.WAIT_ELEMENT_TIMEOUT_MS);
    } catch (error) {
      console.error('[Shopline Category Manager] AngularJS 載入失敗:', error.message);
      console.error('[Shopline Category Manager] 初始化中止');
      return;
    }

    // 現有程式碼繼續...
  } catch (error) {
    console.error('[Shopline Category Manager] 初始化失敗:', error);
  }
}
```

### 4. 替換所有直接調用

**修改位置**（共 4 處）：
- Line 704: `attachButtonsToCategories()`
- Line 789, 896: `getCategoryFromElement()` (兩處)
- Line 2473: `getAngularScope()`

**修改模式**：
```javascript
// 修改前
const scope = angular.element(element).scope();

// 修改後
const ng = getAngular();
if (!ng) return null;
const scope = ng.element(element).scope();
```

## 安全考慮

### unsafeWindow 風險評估

**風險**：
- ⚠️  允許訪問頁面 JavaScript 物件
- ⚠️  可能受到頁面惡意程式碼影響

**緩解措施**：
- ✅ 僅讀取 `unsafeWindow.angular`，不修改
- ✅ 完整的 null 檢查，避免錯誤傳播
- ✅ 使用 `?.` 可選鏈運算子防止崩潰
- ✅ 限制在 Shopline 官方域名（@match 限制）

**結論**：風險可控，符合 UserScript 最佳實踐。

## 實作統計

| 項目 | 數量 |
|------|------|
| 新增函數 | 2 個（getAngular, waitForAngular） |
| 修改位置 | 5 處（4 個調用點 + init） |
| 新增程式碼 | ~70 行 |
| 實作時間 | ~45 分鐘（多 agents 並行） |

## 診斷工具使用

**Codex CLI 分析**：
- Session ID: `019bc004-eb95-7a91-9a5d-3202405cba56`
- Tokens 使用: 38,570
- 成功識別根本原因：window.angular undefined in sandbox
- 提供精確的受影響行號和修復建議

**關鍵命令**：
```bash
# Codex CLI 深度分析
codex exec --full-auto "analyze why prod.user.js buttons not showing..."

# AST 同步工具
node scripts/sync-prod-ast.js
```

## 附帶問題：按鈕新鮮度檢查

### 問題描述

原始實作包含按鈕新鮮度檢查：
```javascript
// 檢查綁定是否陳舊（30秒閾值）
const bindingAge = Date.now() - bindingCreatedAt;
if (bindingAge > 30000) {
  console.warn('綁定已過期');
  this.showErrorMessage('綁定已過期，請重新整理頁面重試');
  return;
}
```

**設計目的**：偵測 SPA 頁面更新導致的陳舊綁定

**實際問題**：
- ❌ 太敏感：用戶剛打開頁面就觸發警告
- ❌ 誤報率高：正常使用也會觸發
- ❌ 使用者體驗差：不必要的錯誤訊息

### 解決方式

**移除整個檢查邏輯**（11 行程式碼）：
```javascript
// 修改前：11 行檢查邏輯
// 修改後：直接開始處理
let categoryInfo = null;
```

**決策理由**：
1. 陳舊綁定問題實際上很少發生
2. 如果真的發生，用戶會發現移動失敗，自然會重新整理
3. 移除後無任何功能損失
4. 時間追蹤功能完全保留

## 測試驗證

### 測試結果

✅ **按鈕正常顯示**（修復成功）  
✅ **無過期警告**（移除成功）  
✅ **時間追蹤功能正常**（保留成功）  
✅ **語法驗證通過**（acorn parser）  

### 測試環境

- Chrome + Tampermonkey
- Shopline Admin Panel: `https://admin.shoplineapp.com/admin/*/categories*`
- 測試版本：v0.2.2

## 經驗總結

### 關鍵學習

1. **@grant 必然觸發沙箱**
   - 任何 @grant 指令都會啟用沙箱
   - 不能假設 window 物件可用
   - 必須使用 unsafeWindow 跨越邊界

2. **優先級設計很重要**
   - unsafeWindow > window > null
   - 確保各種環境都能運作
   - 降級方案必須完整測試

3. **等待機制必不可少**
   - SPA 應用載入順序不確定
   - 輪詢機制比事件監聽更可靠
   - 超時時間應合理（10 秒）

4. **過度設計的陷阱**
   - 按鈕新鮮度檢查看似合理，實際過度設計
   - 簡單問題不需要複雜解決方案
   - 優先考慮使用者體驗

5. **Codex CLI 的價值**
   - 深度程式碼分析，快速定位根因
   - 38K tokens 換來精確診斷
   - 提供具體修復建議和行號

### 最佳實踐

**UserScript 開發**：
1. 永遠假設沙箱模式啟用
2. 使用 unsafeWindow 訪問頁面物件
3. 加入完整的 null 檢查
4. 使用 waitFor 模式等待外部資源

**多 Agents 並行**：
1. Agent 1: 核心程式碼修改
2. Agent 2: 測試和文檔準備
3. Agent 3: 生產版同步
4. 總時間：~45 分鐘（vs 串行 ~2.5 小時）

**AST 同步工具**：
1. 保證語法正確性
2. 自動備份機制
3. metadata 正確保留
4. 避免手動行號操作

## 相關檔案

### 修改檔案
- `src/shopline-category-manager.user.js` (2,692 行)
- `src/shopline-category-manager.prod.user.js` (2,697 行)

### 文檔檔案
- `openspec/changes/tampermonkey-sandbox-fix/spec.md`
- `openspec/changes/tampermonkey-sandbox-fix/tasks.md`
- `openspec/changes/tampermonkey-sandbox-fix/testing-checklist.md`
- `openspec/changes/tampermonkey-sandbox-fix/CHANGELOG-draft.md`

### 工具
- `scripts/sync-prod-ast.js` - AST 同步工具
- Codex CLI - 深度程式碼分析

## 標籤

#tampermonkey #sandbox #angularjs #userscript #unsafeWindow #production #critical-bug #codex-cli #ast-sync #multi-agents

## 適用場景

這個 memory 適用於：
- ✅ 任何使用 Tampermonkey 開發 UserScript 的專案
- ✅ 需要訪問頁面 AngularJS 或其他框架的場景
- ✅ 遇到 "window.XXX is undefined" 的沙箱問題
- ✅ SPA 應用的 UserScript 開發
- ✅ 需要跨越沙箱邊界的任何情況

## 後續追蹤

- [ ] 監控使用者回報，確認無其他沙箱問題
- [ ] 考慮是否需要其他框架（Vue, React）的類似 helper
- [ ] 文檔化 unsafeWindow 使用最佳實踐
