# Chrome Extension 部署檢查清單

## ✅ 必要檔案檢查

### Manifest V3 配置
- [x] src/manifest.json - Chrome Extension 配置檔案

### Content Scripts
- [x] src/content/init.js - Script 注入器
- [x] src/content/injected.js - AngularJS 橋接
- [x] src/content/content.js - 主要內容腳本

### Background Service Worker
- [x] src/background/service-worker.js - 背景服務工作線程

### Popup UI
- [x] src/popup/popup.html - 彈出窗口 HTML
- [x] src/popup/popup.css - 彈出窗口樣式
- [x] src/popup/popup.js - 彈出窗口邏輯

### 共享模組
- [x] src/shared/storage.js - 存儲抽象層
- [x] src/shared/storage-schema.js - 存儲架構
- [x] src/shared/logger.js - 日誌工具
- [x] src/shared/constants.js - 常數定義
- [x] src/shared/csv-export.js - CSV 匯出
- [x] src/shared/export-formats.js - 匯出格式
- [x] src/shared/import-validator.js - 導入驗證
- [x] src/shared/conflict-detector.js - 衝突檢測

### 資源
- [x] src/assets/icon-16.png - 16x16 圖標
- [x] src/assets/icon-48.png - 48x48 圖標
- [x] src/assets/icon-128.png - 128x128 圖標

## ✅ 功能檢查

### 核心功能
- [x] AngularJS 橋接 (init.js + injected.js)
- [x] 存儲抽象層 (localStorage → chrome.storage.local)
- [x] 彈出窗口統計顯示
- [x] 導出功能 (JSON format)
- [x] 導入驗證 (6 步驟驗證)
- [x] 衝突檢測 (7 種衝突類型)
- [x] 預覽面板 (模態對話框)
- [x] Service Worker 訊息處理

### Service Worker 訊息處理器
- [x] getCategories
- [x] updateCategories
- [x] exportData
- [x] importData
- [x] validateImportData
- [x] executeImportData
- [x] recordCategoryMove
- [x] getStats
- [x] resetStats
- [x] getSearchHistory
- [x] recordSearchQuery
- [x] classifyError
- [x] getErrorLog
- [x] validateCategoryPath
- [x] getMoveHistory

## ✅ 代碼質量

- [x] 無語法錯誤
- [x] 無 TypeScript 診斷錯誤
- [x] 完整的錯誤處理
- [x] JSDoc 註釋完整
- [x] 一致的代碼風格
- [x] 繁體中文註釋

## 💾 部署步驟

### 1. 在 Chrome 中加載擴展

1. 打開 Chrome，輸入 `chrome://extensions/`
2. 啟用右上角的「開發者模式」
3. 點擊「載入未打包的擴展程式」
4. 選擇 `src/` 目錄（包含 manifest.json 的文件夾）
5. 擴展應該會出現在清單中

### 2. 驗證擴展是否正常運行

1. 訪問 Shopline 分類管理頁面 (app.shoplineapp.com/admin/*/categories*)
2. 檢查擴展圖標是否出現在工具欄
3. 點擊圖標打開彈出窗口
4. 檢查統計是否顯示（可能需要先進行一些操作）
5. 檢查瀏覽器控制台是否有錯誤

### 3. 測試核心功能

#### 測試匯出
1. 在分類頁面進行一些操作（移動分類）
2. 打開彈出窗口
3. 點擊「匯出」按鈕
4. 驗證 JSON 文件是否下載成功

#### 測試匯入
1. 點擊「匯入」按鈕
2. 選擇之前匯出的 JSON 文件
3. 驗證預覽面板是否顯示
4. 檢查衝突檢測是否正常工作
5. 點擊「匯入」執行導入

### 4. 檢查 Service Worker

1. 打開 `chrome://extensions/`
2. 找到此擴展
3. 點擊「Service Worker」下的「inspect」
4. 打開 DevTools 控制台
5. 檢查是否有錯誤訊息

## 🔍 常見問題排查

### 擴展未加載
- 檢查 manifest.json 語法是否正確
- 檢查 src/ 目錄中是否包含 manifest.json
- 查看控制台錯誤訊息

### 彈出窗口為空
- 檢查 popup.html 是否正確加載
- 打開 DevTools（Ctrl+Shift+I），檢查控制台錯誤
- 檢查 Storage Manager 是否正確初始化

### 匯出/匯入不工作
- 檢查 Service Worker 是否正常運行
- 查看 Service Worker 控制台日誌
- 檢查 chrome.storage.local 權限是否正確

### AngularJS 檢測失敗
- 檢查頁面是否真的使用 AngularJS
- 驗證 init.js 是否正確注入 injected.js
- 檢查 window.postMessage 是否正常工作

## 📋 已知限制

- 僅在 Shopline 分類管理頁面上工作
- 需要 Chrome 88+（因為 Manifest V3 需求）
- 存儲限制 5MB（Chrome 規定）
- 搜尋歷史限制 50 條
- 移動歷史限制 500 條

## ✅ 部署準備狀態

**狀態**: 🟢 **準備就緒**

所有文件都已完備，代碼質量優秀，可以立即部署到 Chrome 進行測試。

---

Generated: 2026-01-28
