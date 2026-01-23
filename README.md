# Shopline 類別管理器 - Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Format-Manifest%20V3-blue.svg)](https://developer.chrome.com/docs/extensions/mv3/)

> 高效管理 Shopline 產品類別 - 節省時間、追蹤效率、智能搜尋

Shopline 類別管理器是一個 Chrome Extension，幫助電商運營人員快速、高效地管理產品分類。通過實時統計、搜尋功能和驗證機制，每次操作可節省 ~13 秒。

---

## ✨ 核心功能

### 🔍 智能搜尋 (Stage 5)
- 實時類別搜尋（300ms debounce）
- 支援中文和英文查詢
- 搜尋歷史自動追蹤
- 分層結構展示

### ⏱️ 時間追蹤 (Stage 8)
- 統計每天的移動次數
- 累計節省時間顯示（時:分:秒）
- 平均每次移動時間
- 最近移動歷史記錄

### 📤 數據匯出
- 一鍵匯出所有統計資料（JSON）
- 包含完整的移動歷史
- 用於備份和分析

### ↩️ 撤銷功能
- 快速撤銷上次移動
- 統計自動回滾
- 防止誤操作

### ✅ 驗證系統 (Stage 7)
- 8 步驟驗證流程
  1. 輸入驗證
  2. 前檢檢查
  3. 範圍驗證
  4. 樹驗證
  5. 權限檢查
  6. API 請求
  7. 響應驗證
  8. 後驗證
- 實時進度指示
- 詳細錯誤日誌

### ❌ 錯誤處理 (Stage 6)
- 自動分類錯誤類型
- 網路、API、驗證、範圍錯誤
- 错误日志追蹤
- 指数退避重試

---

## 🚀 快速開始

### 安裝步驟

1. **打開 Chrome** 並進入 `chrome://extensions/`
2. **啟用** 右上角「開發人員模式」
3. **點擊** 「載入未封裝的擴充功能」
4. **選擇** 本項目的 `/src` 目錄
5. **確認** Extension 出現在列表中

✅ **Installation Complete!** 🎉

### 基本使用

1. 點擊 Extension 圖標打開 Popup
2. 查看統計資訊或使用搜尋功能
3. 在 Shopline 分類頁面進行操作
4. 統計自動更新

---

## 📊 功能對照表

| 功能 | 階段 | 狀態 | 說明 |
|------|------|------|------|
| 統計追蹤 | 1 | ✅ | 記錄移動次數和時間 |
| 搜尋功能 | 5 | ✅ | 實時類別搜尋 |
| 錯誤日誌 | 6 | ✅ | 錯誤分類和追蹤 |
| 驗證進度 | 7 | ✅ | 8 步驟驗證顯示 |
| 時間追蹤 | 8 | ✅ | 詳細的時間摘要 |
| 集成測試 | 9 | ✅ | 測試檢查點文檔 |
| 文檔 | 10 | ✅ | 開發/使用者指南 |

---

## 📚 文檔

### 用戶文檔
- 📖 **[使用者指南](USER_GUIDE.md)** - 功能詳解和使用技巧
- 🧪 **[測試檢查點](.planning/TESTING.md)** - 集成測試計畫

### 開發者文檔
- 🔧 **[開發人員指南](DEVELOPER_GUIDE.md)** - 架構、API、開發工作流程
- 📋 **[API 參考](#api-參考)** - 消息 API 和存儲結構

---

## 🏗️ 架構

```
┌─────────────────────────────────┐
│       Chrome Extension          │
├─────────────────────────────────┤
│                                 │
│  Popup (UI) ↔ Background Worker │
│   • Stats        • Messages     │
│   • Search       • Storage      │
│   • Validation   • Handlers     │
│   • Time Track   • Events       │
│                                 │
│  Content Script ↔ Injected JS   │
│   • Monitor      • AngularJS    │
│   • CategoryMgr  • API Bridge   │
│                                 │
└─────────────────────────────────┘
         ↕ Shopline Page
```

### 核心組件

1. **Popup** (`src/popup/`) - 用戶界面
2. **Service Worker** (`src/background/`) - 後台邏輯
3. **Content Script** (`src/content/`) - 頁面監控
4. **Injected Script** (`src/content/injected.js`) - AngularJS 橋接
5. **Storage** (`src/shared/storage.js`) - 數據持久化

---

## API 參考

### 消息 API

從 Popup 發送消息到 Service Worker：

```javascript
// 記錄移動
chrome.runtime.sendMessage({
  action: 'recordCategoryMove',
  data: {
    categoryId: 123,
    timeSaved: 13,
    targetLevel: 2
  }
});

// 獲取統計
chrome.runtime.sendMessage({
  action: 'getStats'
}, response => console.log(response.stats));

// 取搜尋歷史
chrome.runtime.sendMessage({
  action: 'getSearchHistory'
}, response => console.log(response.history));
```

### 存儲結構

```javascript
// 統計
{
  totalMoves: number,
  totalTimeSaved: number,      // seconds
  lastReset: "ISO8601"
}

// 移動歷史
[{
  timestamp: "ISO8601",
  timeSaved: number,
  categoryId: number,
  categoryName: string,
  targetLevel: number
}]

// 搜尋歷史
["query1", "query2", ...]

// 錯誤日誌
[{
  timestamp: "ISO8601",
  type: "network|api|validation|scope",
  message: string,
  details: object
}]
```

---

## 🧪 測試

### 運行測試檢查點

參考 [.planning/TESTING.md](.planning/TESTING.md) 進行完整測試：

- Phase 1: 基本功能驗證
- Phase 2: 擴展功能驗證
- Phase 3: Content Script 集成
- Phase 4: 完整端到端流程
- Phase 5: 數據持久性

### Console 調試

```javascript
// 在 Console 中測試
// 模擬驗證進度
window._popupDebug.simulateValidation()

// 加載時間摘要
window._popupDebug.loadTimeSummary()

// 檢查存儲
new StorageManager().getStats().then(s => console.table(s))
```

---

## 🛠️ 開發

### 系統要求

- Chrome 120+（Manifest V3 支持）
- 無需 Node.js（純 JavaScript）

### 本地開發

```bash
# 克隆倉庫
git clone <repo>
cd shopline-category-manager

# 載入到 Chrome
# 1. chrome://extensions
# 2. 開發人員模式 ON
# 3. 載入未封裝 → /src
```

### 代碼結構

```
src/
├── background/
│   └── service-worker.js       # 後台消息路由
├── content/
│   ├── content.js              # Content Script
│   ├── injected.js             # AngularJS 橋接
│   └── category-manager.js     # 核心邏輯
├── popup/
│   ├── popup.html              # UI 結構
│   ├── popup.css               # 樣式
│   └── popup.js                # 交互邏輯
├── shared/
│   ├── storage.js              # 存儲管理
│   ├── logger.js               # 日誌工具
│   └── constants.js            # 常量
├── icons/                      # 擴展圖標
└── manifest.json               # 配置文件
```

---

## 🔒 隱私和安全

✅ **100% 本地運行**
- 所有數據存儲在 Chrome 本地存儲中
- 不上傳任何數據到遠程服務器
- 完全開源、透明

---

## 📄 許可證

MIT License - 詳見 [LICENSE](LICENSE)

---

## 相關資源

- 📚 [Chrome Extension 文檔](https://developer.chrome.com/docs/extensions/)
- 📚 [Shopline 開發者文檔](https://shopline.hk/)

---

## 版本信息

| 項目 | 值 |
|------|-----|
| **版本** | 1.0 (Phase 1) |
| **格式** | Chrome Extension (Manifest V3) |
| **大小** | ~200KB (完整功能) |
| **開發時間** | 4 階段實現 |

---

**最後更新**: 2026-01-23
**開發階段**: Phase 1 MVP - 完成 ✅
**下一步**: Phase 2 - AngularJS 實時集成
