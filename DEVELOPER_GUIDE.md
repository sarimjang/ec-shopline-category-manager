# Shopline 類別管理器 - 開發人員指南

## 目錄

1. [架構概覽](#架構概覽)
2. [組件詳解](#組件詳解)
3. [API 參考](#api-參考)
4. [開發工作流程](#開發工作流程)
5. [故障排除](#故障排除)
6. [TypeScript 類型定義](#typescript-類型定義)

---

## 架構概覽

```
┌─────────────────────────────────────────────────────┐
│                    Chrome Extension                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────┐  ┌──────────────────────┐   │
│  │   Popup (UI)     │  │  Background Worker   │   │
│  ├──────────────────┤  ├──────────────────────┤   │
│  │ • Statistics     │  │ • Message Router     │   │
│  │ • Search        │  │ • Storage Manager    │   │
│  │ • Error Log     │  │ • Event Handlers     │   │
│  │ • Validation    │  │                      │   │
│  │ • Time Tracking │  │ 9 Message Handlers:  │   │
│  └──────────────────┘  │ ✓ recordCategoryMove│   │
│         ↕              │ ✓ getStats          │   │
│  ┌──────────────────┐  │ ✓ resetStats        │   │
│  │ Content Script   │  │ ✓ getSearchHistory  │   │
│  ├──────────────────┤  │ ✓ recordSearchQuery │   │
│  │ CategoryManager  │  │ ✓ getErrorLog       │   │
│  │ • 8-step valid. │  │ ✓ recordError       │   │
│  │ • Search        │  │ ✓ getMoveHistory    │   │
│  │ • Time tracking │  │ ✓ validatePath      │   │
│  │ • Error handling│  └──────────────────────┘   │
│  └──────────────────┘                             │
│         ↕                                         │
│  ┌──────────────────┐                             │
│  │ Injected Script  │                             │
│  ├──────────────────┤                             │
│  │ • AngularJS Bridge                             │
│  │ • _scm_getAngular()                            │
│  │ • _scm_getScope()                              │
│  └──────────────────┘                             │
│         ↕                                         │
│  ┌──────────────────┐                             │
│  │  Shopline Page   │                             │
│  │  (AngularJS)     │                             │
│  └──────────────────┘                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 組件詳解

### 1. Popup (popup.html/css/js)

**責任**: 用戶界面和交互

**功能**:
- 顯示統計資訊（移動次數、時間節省）
- 搜尋類別（實時，300ms debounce）
- 錯誤日誌查看
- 驗證進度跟蹤
- 時間追蹤摘要
- 匯出/撤銷功能

**主要函數**:
- `initializePopup()` - 初始化
- `loadStats()` - 加載統計
- `loadSearchHistory()` - 加載搜尋歷史
- `loadErrorLog()` - 加載錯誤日誌
- `loadTimeSummary()` - 加載時間摘要
- `updateValidationStep(stepNumber, status)` - 更新驗證進度

---

### 2. Background Worker (service-worker.js)

**責任**: 後台邏輯和消息路由

**9 個消息處理器**:

| Handler | 輸入 | 輸出 | 用途 |
|---------|------|------|------|
| recordCategoryMove | {categoryId, timeSaved, details} | {stats} | 記錄移動 |
| getStats | - | {totalMoves, totalTimeSaved} | 獲取統計 |
| resetStats | - | {stats: {0, 0}} | 重置統計 |
| getSearchHistory | - | [strings] | 取搜尋歷史 |
| recordSearchQuery | {query} | [strings] | 記錄搜尋 |
| getErrorLog | - | [errors] | 取錯誤日誌 |
| recordError | {type, message, details} | - | 記錄錯誤 |
| getMoveHistory | - | [moves] | 取移動歷史 |
| validateCategoryPath | {path} | {valid: bool} | 驗證路徑 |

**存儲結構**:

```javascript
// categoryMoveStats
{
  totalMoves: number,
  totalTimeSaved: number,      // seconds
  lastReset: "ISO8601"
}

// moveHistory []
{
  timestamp: "ISO8601",
  timeSaved: number,           // seconds
  categoryId: number,
  categoryName: string,
  targetLevel: number,
  usedSearch: boolean
}

// searchHistory []
string[]  // most recent first, max 50

// errorLog []
{
  timestamp: "ISO8601",
  type: "network|api|validation|scope|unknown",
  message: string,
  details: object
}
```

---

### 3. Content Script (content.js)

**責任**: CategoryManager 實現和事件管理

**主要組件**:

#### CategoryManager
- 30+ 方法
- 8 步驗證流程
- 搜尋功能（300ms debounce）
- 時間計算
- 錯誤分類

**關鍵方法**:
- `moveCategory(categoryId, targetLevel)` - 執行移動
- `validate()` - 8 步驗證
- `search(query)` - 搜尋類別
- `calculateTimeSaved()` - 時間計算

#### 驗證流程 (8 步驟)

```
1. Input validation      → 驗證 ID 和目標有效
2. Pre-flight check      → 確認類別存在
3. Scope verification    → 驗證 AngularJS 就緒
4. Tree validation       → 檢查無循環依賴
5. Permission check      → 驗證用戶權限
6. API request          → 發送移動請求
7. Response verification → 檢查成功狀態
8. Post-move verification→ 驗證最終位置
```

---

### 4. Injected Script (injected.js)

**責任**: AngularJS 橋接

**提供的 API**:

```javascript
// 獲取 AngularJS scope
window._scm_getAngular()
→ Returns: {
    $scope,
    $apply: function(),
    categoryService: { getCategories, move, ... }
  }

// 獲取當前 scope
window._scm_getScope()
→ Returns: current AngularJS scope object
```

---

### 5. Storage 層 (storage.js)

**StorageManager 類**:

```typescript
class StorageManager {
  getStats(): Promise<Stats>
  setStats(stats): Promise<void>
  addMove(timeSaved, moveDetails): Promise<Stats>
  getMoveHistory(): Promise<Move[]>
  getSearchHistory(): Promise<string[]>
  recordSearchQuery(query): Promise<string[]>
  getErrorLog(): Promise<Error[]>
  recordError(errorData): Promise<void>
  resetStats(): Promise<Stats>
}
```

---

## API 參考

### Content Script 消息 API

從 Popup 或其他 script 傳送消息到 Service Worker：

```javascript
// 記錄移動
chrome.runtime.sendMessage({
  action: 'recordCategoryMove',
  data: {
    categoryId: 123,
    categoryName: '服裝',
    timeSaved: 13,
    targetLevel: 2,
    usedSearch: false
  }
}, response => { ... });

// 獲取統計
chrome.runtime.sendMessage({
  action: 'getStats'
}, response => {
  console.log(response.stats);
});

// 記錄錯誤
chrome.runtime.sendMessage({
  action: 'recordError',
  data: {
    type: 'network',  // 'network'|'api'|'validation'|'scope'
    message: 'Connection timeout',
    details: { code: 'TIMEOUT', retries: 2 }
  }
}, response => { ... });
```

---

## 開發工作流程

### 1. 本地開發設置

```bash
# Clone 項目
git clone <repo>
cd shopline-category-manager

# 無需 npm install（純 JS）
# 所有 dependencies 通過 Chrome APIs 提供
```

### 2. 加載到 Chrome

```
1. chrome://extensions
2. 啟用「開發人員模式」
3. 「載入未封裝」→ 選擇 /src
4. 開啟 DevTools (F12)
```

### 3. 測試和調試

```javascript
// 在 Console 中：

// 測試搜尋
window._popupDebug.performSearch('服裝')

// 模擬驗證進度
window._popupDebug.simulateValidation()

// 加載時間摘要
window._popupDebug.loadTimeSummary()

// 檢查 Storage
new StorageManager().getStats().then(s => console.log(s))

// 手動添加移動記錄
new StorageManager().addMove(13, {
  categoryId: 1,
  categoryName: '服裝',
  targetLevel: 2,
  usedSearch: false
})
```

### 4. 提交工作流程

```bash
# 確保無錯誤
# 1. 檢查 Console (F12)
# 2. 運行測試檢查點 (.planning/TESTING.md)
# 3. 提交變更

git add .
git commit -m "feat: description

- Detailed change 1
- Detailed change 2"
```

---

## 故障排除

### 常見問題

**Q: Extension 不加載**
A: 檢查 manifest.json 格式，查看 Console 錯誤

**Q: Popup 為空**
A: 檢查 popup.html 存在，CSS/JS 路徑正確

**Q: 消息未收到**
A: 確認 Service Worker 已安裝，查看後台 Console

**Q: Storage 數據遺失**
A: 檢查 chrome.storage.local API 調用，確認無配額超限

---

## TypeScript 類型定義

```typescript
// 統計類型
interface Stats {
  totalMoves: number;
  totalTimeSaved: number;        // seconds
  lastReset: string;             // ISO8601
}

// 移動記錄
interface MoveRecord {
  timestamp: string;             // ISO8601
  timeSaved: number;             // seconds
  categoryId: number;
  categoryName: string;
  targetLevel: number;
  usedSearch: boolean;
}

// 搜尋歷史
type SearchHistory = string[];   // max 50 items

// 錯誤日誌項
interface ErrorLogEntry {
  timestamp: string;             // ISO8601
  type: 'network' | 'api' | 'validation' | 'scope' | 'unknown';
  message: string;
  details?: object;
}

// 消息請求
interface MessageRequest {
  action: string;
  data?: object;
}

// 消息響應
interface MessageResponse {
  success: boolean;
  data?: object;
  error?: string;
}

// AngularJS Scope Bridge
interface AngularScopeBridge {
  $scope: any;
  $apply: () => void;
  categoryService: any;
}
```

---

## 模塊依賴圖

```
popup.js
├── storage.js (StorageManager)
├── logger.js
├── constants.js
└── Service Worker (消息 API)

content.js
├── CategoryManager (main logic)
├── storage.js (StorageManager)
├── logger.js
├── constants.js
├── injected.js (AngularJS bridge)
└── Service Worker (消息 API)

service-worker.js
├── storage.js
├── logger.js
└── constants.js

manifest.json
├── popup/popup.html (UI)
├── popup/popup.css
├── popup/popup.js
├── content/content.js
├── content/injected.js
├── background/service-worker.js
├── shared/* (utilities)
└── icons/ (images)
```

---

## 性能優化建議

1. **搜尋 Debounce**: 300ms（已實現）
2. **Storage 緩存**: 考慮 in-memory cache 以減少 I/O
3. **Move History 限制**: 500 條（已配置）
4. **Error Log 限制**: 100 條（已配置）
5. **Validation 緩存**: 快速檢查可緩存 5 分鐘

---

## 安全考慮

- ✅ 使用 Content Security Policy
- ✅ 避免 innerHTML（使用 textContent）
- ✅ 驗證所有用戶輸入
- ✅ 限制 API 呼叫頻率
- ⚠️ 考慮添加 rate limiting

---

## 後續開發階段

**Phase 2 計畫**:
- [ ] 實時 AngularJS 集成測試
- [ ] 實際 API 呼叫驗證
- [ ] 批量移動支持
- [ ] 自動重試邏輯優化
- [ ] 性能分析

---

**文檔版本**: 1.0
**最後更新**: 2026-01-23
**維護者**: Shopline Extension Team
