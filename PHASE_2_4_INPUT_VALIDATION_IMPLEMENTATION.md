# Phase 2.4 - 輸入驗證實現報告
**完成日期**: 2026-01-28
**實現者**: Claude Code

---

## 概述

為 Shopline 類別管理器擴展程序的存儲消息處理器實現了全面的輸入驗證和安全防護。此實現包括類型檢查、長度限制、白名單驗證、XSS 防護和注入攻擊防護。

---

## 主要成果

### 1. 新建模塊：輸入驗證器 (`src/shared/input-validator.js`)

建立了一個獨立的、可重用的輸入驗證模塊，包含以下核心功能：

#### 1.1 基本驗證函數

| 函數 | 目的 | 防護對象 |
|------|------|---------|
| `validateRequestStructure()` | 驗證請求是否為有效的對象且包含 action 字段 | 無效結構攻擊 |
| `validateAction()` | 驗證操作名稱是否有效並在白名單中 | 未授權操作、注入攻擊 |
| `validateQuery()` | 驗證查詢字符串長度和內容 | SQL 注入、XSS |
| `validateCategoryId()` | 驗證分類 ID 格式和長度 | 無效 ID、路徑遍歷 |
| `validateTimeSaved()` | 驗證時間節省值為有效的非負整數 | 數據完整性 |
| `validateErrorType()` | 驗證錯誤類型在允許的列表中 | 無效數據 |
| `validateErrorMessage()` | 驗證錯誤訊息長度和內容 | XSS、長字符串 DoS |
| `validateJsonString()` | 驗證 JSON 字符串大小和嵌套深度 | JSON 炸彈、DoS 攻擊 |
| `validateDataObject()` | 驗證數據對象鍵是否在白名單中 | 未授權數據修改 |
| `validateCategories()` | 驗證分類數組的結構和大小 | 無效數據 |

#### 1.2 安全工具函數

| 函數 | 目的 |
|------|------|
| `escapeXSS()` | 轉義危險字符以防止 XSS 攻擊 |
| `detectInjectionAttacks()` | 檢測 SQL 注入、腳本注入、null 字節等 |
| `validateStringLength()` | 驗證字符串長度不超過限制 |
| `logRejectedRequest()` | 記錄被拒絕的請求以便調試 |

#### 1.3 白名單和限制

**允許的操作**（14 個）：
```javascript
getCategories, updateCategories, exportData, validateImportData,
executeImportData, recordCategoryMove, getStats, resetStats,
getSearchHistory, recordSearchQuery, classifyError, getErrorLog,
validateCategoryPath, getMoveHistory
```

**允許的存儲鍵**（7 個）：
```javascript
categories, categoryMoveStats, moveHistory, searchHistory,
errorLog, importTimestamp, exports, imports
```

**允許的錯誤類型**：
```javascript
network, api, validation, scope
```

**長度限制**：
| 字段 | 限制 |
|------|------|
| action | 100 字符 |
| query | 500 字符 |
| categoryId | 200 字符 |
| message | 2000 字符 |
| jsonString | 10 MB |

---

## 2. 服務工作者整合 (`src/background/service-worker.js`)

### 2.1 消息處理器入口點

在所有消息到達時添加了雙層驗證：

```javascript
// 層級 1: 驗證請求基本結構
const structureValidation = window.ShoplineInputValidator.validateRequestStructure(request);

// 層級 2: 驗證操作名稱
const actionValidation = window.ShoplineInputValidator.validateAction(request.action);
```

### 2.2 特定處理器驗證

為以下 7 個處理器添加了輸入驗證：

#### `handleUpdateCategories()`
- 驗證分類數據數組
- 檢查每個分類對象的必要字段
- 限制分類數量（最多 10,000）

#### `handleRecordSearchQuery()`
- 驗證查詢字符串長度（最多 500 字符）
- 檢測 SQL 注入和腳本注入
- 驗證查詢不為空

#### `handleRecordCategoryMove()`
- 驗證時間節省值為非負整數
- 檢查時間值的上限

#### `handleClassifyError()`
- 驗證錯誤類型（必須是允許的 4 種類型之一）
- 驗證錯誤訊息長度（最多 2000 字符）
- 檢測訊息中的注入攻擊

#### `handleValidateCategoryPath()`
- 驗證分類 ID 格式（只允許字母數字、下劃線、連字符）
- 驗證目標分類 ID（可以為 null）
- 檢測無效格式

#### `handleValidateImportData()`
- 驗證 JSON 字符串大小（最多 10 MB）
- 檢測深層嵌套 JSON（DoS 防護）
- 驗證 JSON 不為空

#### `handleExecuteImportData()`
- 驗證數據對象結構
- 檢查鍵是否在允許列表中
- 拒絕陣列作為根對象

---

## 3. 安全防護詳情

### 3.1 XSS 防護

**實現方式**：
- 對所有字符串輸入檢測危險字符：`<`, `>`, `"`, `'`, `` ` ``, `&`
- 轉義函數：`escapeXSS()`
- 檢測模式：`<script`, `javascript:`, `on\w+\s*=` 事件處理器

**應用對象**：
- 所有查詢字符串
- 所有錯誤訊息
- 分類名稱
- JSON 字符串內容

### 3.2 SQL 注入防護

**檢測模式**：
- 匹配 SQL 關鍵字：SELECT, INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, EXECUTE, UNION, WHERE（不區分大小寫）

**應用對象**：
- 搜索查詢
- 分類名稱
- 任何用戶提供的文本字段

### 3.3 Null Byte 注入防護

**檢測**：
- 掃描輸入中的 `\0` 字符
- 防止文件操作相關的攻擊

### 3.4 DoS 防護

**機制**：
1. **大小限制**：
   - JSON 字符串：10 MB
   - 查詢：500 字符
   - 訊息：2000 字符

2. **嵌套深度限制**：
   - JSON 嵌套深度最多 100 層
   - 超過時返回 DEEP_NESTING 攻擊警告

3. **數組大小限制**：
   - 分類最多 10,000 個
   - 移動歷史最多 500 條
   - 搜索歷史最多 50 條
   - 錯誤日誌最多 100 條

---

## 4. 錯誤處理和日誌

### 4.1 詳細錯誤報告

每個驗證失敗都返回結構化的錯誤信息：

```javascript
{
  field: "fieldName",
  error: "詳細的錯誤描述",
  type: "ERROR_TYPE",  // TYPE_ERROR, LENGTH_ERROR, WHITELIST_ERROR, INJECTION_DETECTED 等
  attacks: [...]  // 檢測到的攻擊詳情（如適用）
}
```

### 4.2 被拒絕的請求日誌

```javascript
{
  timestamp: "2026-01-28T...",
  action: "請求的操作",
  reason: "Input validation failed",
  errors: [...],
  severity: "CRITICAL" | "WARNING"
}
```

嚴重性判斷：
- **CRITICAL**：檢測到注入攻擊
- **WARNING**：其他驗證失敗

---

## 5. 資源清單更新 (`src/manifest.json`)

### 5.1 Web 可訪問資源

添加了 `shared/input-validator.js` 到 web_accessible_resources，使其對內容腳本和注入腳本可用。

### 5.2 內容腳本載入順序

確保腳本按正確順序加載：
1. `content/init.js` - 初始化
2. `shared/logger.js` - 日誌工具
3. `shared/input-validator.js` - 輸入驗證（依賴 logger）
4. 其他共享模塊和內容腳本

---

## 6. 測試覆蓋

### 6.1 單元測試 (`tests/input-validator.test.js`)

創建了 100+ 個測試用例，覆蓋：

- **基本驗證**：結構、操作、查詢
- **類型檢查**：各種類型錯誤場景
- **邊界情況**：空值、超長字符串、大型數組
- **安全防護**：XSS、SQL 注入、null 字節
- **DoS 防護**：深層嵌套、超大文件
- **白名單驗證**：不允許的操作和鍵
- **集成測試**：完整消息流驗證

### 6.2 測試場景

#### 有效請求：
```javascript
{
  action: 'recordSearchQuery',
  query: 'valid search term'
}
```

#### 攻擊性請求：
```javascript
{
  action: 'recordSearchQuery',
  query: 'SELECT * FROM users; DROP TABLE users;'
}
```

```javascript
{
  action: 'unknownAction',
  data: 'attempt to call unauthorized operation'
}
```

#### 邊界情況：
```javascript
{
  action: 'recordSearchQuery',
  query: 'a'.repeat(501)  // 超過 500 字符限制
}
```

---

## 7. 實現階段

### 階段 1：核心模塊開發 ✓
- 創建輸入驗證器模塊
- 實現所有驗證函數
- 添加工具函數

### 階段 2：服務工作者集成 ✓
- 在消息入口點添加驗證
- 為 7 個處理器添加驗證
- 返回詳細的驗證錯誤

### 階段 3：安全性加固 ✓
- XSS 防護
- SQL 注入防護
- DoS 防護（大小和嵌套限制）
- Null 字節防護

### 階段 4：測試和文檔 ✓
- 創建綜合測試套件
- 編寫此實現文檔
- 驗證所有功能

---

## 8. 驗證清單

### 無效輸入被正確拒絕

- ✓ 缺少 action 字段的請求
- ✓ 未知操作（不在白名單中）
- ✓ 包含 XSS 負載的查詢
- ✓ 包含 SQL 關鍵字的搜索
- ✓ 超長字符串（超過限制）
- ✓ 非整數的時間值
- ✓ 無效的錯誤類型
- ✓ 超大 JSON（> 10 MB）
- ✓ 深層嵌套 JSON（> 100 層）
- ✓ 包含 null 字節的字符串
- ✓ 不在白名單中的存儲鍵
- ✓ 無效的分類 ID 格式
- ✓ 超大分類數組（> 10,000）

### 有效輸入被正確接受

- ✓ 有效的操作名稱
- ✓ 有效的搜索查詢
- ✓ 有效的分類 ID（數字、字母、下劃線、連字符）
- ✓ 有效的時間節省值（非負整數）
- ✓ 有效的錯誤類型
- ✓ 有效的 JSON 字符串
- ✓ 在白名單中的數據鍵

### 邊界情況被正確處理

- ✓ 空字符串被拒絕（適當情況下）
- ✓ Null/undefined 被處理
- ✓ 恰好在限制的值被接受
- ✓ 超過限制的值被拒絕
- ✓ 大小寫不敏感的檢測（SQL 關鍵字）

---

## 9. 被拒絕的請求日誌範例

```
[InputValidator] Rejected request:
{
  timestamp: "2026-01-28T10:30:45.123Z",
  action: "recordSearchQuery",
  reason: "Input validation failed",
  errors: [
    {
      field: "query",
      error: "Potential injection attack detected: SQL_INJECTION",
      type: "INJECTION_DETECTED",
      attacks: [
        {
          type: "SQL_INJECTION",
          pattern: "SQL keywords detected",
          severity: "HIGH"
        }
      ]
    }
  ],
  severity: "CRITICAL"
}
```

---

## 10. 性能考慮

- **驗證開銷**：最小化，大多數驗證為 O(n)（其中 n 是字符串長度）
- **正則表達式編譯**：一次性編譯為常數，避免重複編譯
- **早期返回**：類型錯誤時立即返回，避免不必要的檢查
- **可選驗證**：高成本驗證（如深層嵌套檢測）只在必要時執行

---

## 11. 未來改進建議

### 短期（Phase 2.5）
1. 實現請求速率限制，防止暴力攻擊
2. 添加審計日誌，記錄所有被拒絕的請求
3. 實現驗證統計：跟蹤常見的驗證失敗

### 中期（Phase 3）
1. 集成內容安全政策（CSP）
2. 實現驗證結果的快取（用於重複請求）
3. 創建驗證規則配置文件，允許動態修改

### 長期（Phase 4+）
1. 集成第三方安全庫（如 DOMPurify）
2. 實現機器學習異常檢測
3. 建立安全相關事件的中央日誌服務

---

## 12. 相關文件清單

| 檔案 | 描述 |
|------|------|
| `src/shared/input-validator.js` | 核心輸入驗證模塊 |
| `src/background/service-worker.js` | 更新的服務工作者，集成驗證 |
| `src/manifest.json` | 更新的清單，包含驗證器腳本 |
| `tests/input-validator.test.js` | 綜合測試套件 |
| `PHASE_2_4_INPUT_VALIDATION_IMPLEMENTATION.md` | 此文檔 |

---

## 總結

Phase 2.4 成功實現了針對存儲消息處理器的全面輸入驗證和安全防護。該實現：

✓ 防止 XSS、SQL 注入和 DoS 攻擊
✓ 強制類型檢查和邊界驗證
✓ 提供白名單控制
✓ 記錄被拒絕的請求以便調試
✓ 包含超過 100 個測試用例
✓ 性能開銷最小化

該解決方案提供了強大的第一道防線，保護 Shopline 類別管理器擴展程序免受常見的 web 攻擊。

---

**實現狀態**：完成 ✓
**下一步**：Phase 2.5 - 實施請求速率限制和審計日誌
