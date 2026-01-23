# Lesson Learn - 工作區

## 索引
- [Patterns](#patterns) - 3 個
- [Traps](#traps) - 2 個
- [Shortcuts](#shortcuts) - 0 個
- [Integration](#integration) - 0 個

---

## Traps

### [Trap] Tampermonkey @updateURL 和 @downloadURL 必須指向實際存在的檔案 #userscript #github #release
- **Context**: 開發 Tampermonkey userscript 並設置自動更新機制時
- **Issue**: 如果直接推送程式碼到 `main` 分支，`@updateURL` 中的 `updates.json` 會更新，但 `@downloadURL` 指向的 GitHub Release 檔案不存在（404），導致用戶無法下載更新
- **Solution**:
  - **方案 A（推薦）**：使用完整的 GitHub Release 流程
    1. 修改程式碼並更新 `@version`
    2. 更新 `.releases/updates.json`
    3. 建立 git tag 和 GitHub Release
    4. 上傳 `.user.js` 檔案到 Release
  - **方案 B**：將 `@downloadURL` 改為指向 `main` 分支的 raw 檔案，但失去版本控制和 changelog 功能
- **Why**: Tampermonkey 的自動更新機制：
  1. 訪問 `@updateURL` 檢查版本號
  2. 如果有更新，從 `@downloadURL` 下載新版本
  3. `@downloadURL` 必須是可直接訪問的檔案 URL
- **Status**: ✅ 已驗證（建立完整發布腳本 `scripts/release.sh`）
- **FirstRecorded**: 2026-01-15

### [Trap] GitHub Repository URL 不一致會導致 raw.githubusercontent.com 404 #github #url #metadata
- **Context**: 設置 Tampermonkey 的 `@updateURL`、`@downloadURL`、`@homepage` 等元數據時
- **Issue**: 本地 git remote 是 `ec-shopline-category-manager`，但腳本中使用 `shopline-category-manager`（缺少 `ec-` 前綴），導致 `raw.githubusercontent.com` 和 GitHub Release URL 都 404
- **Solution**:
  1. 使用 `git remote -v` 確認正確的 repository 名稱
  2. 批量替換所有 URL：`sed -i '' 's|old-repo|correct-repo|g' *.js`
  3. 確保以下檔案中的 URL 一致：
     - `src/*.user.js` 中的 `@namespace`, `@homepage`, `@supportURL`, `@updateURL`, `@downloadURL`
     - `.releases/updates.json` 中的 `updateURL` 和 `downloadURL`
     - `scripts/release.sh` 中的自動化腳本
- **Why**:
  - GitHub raw URL 格式：`https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}`
  - GitHub Release URL 格式：`https://github.com/{owner}/{repo}/releases/download/{tag}/{file}`
  - 任何一個部分錯誤都會導致 404
- **Status**: ✅ 已驗證（全域搜尋並修正所有 URL）
- **FirstRecorded**: 2026-01-15

---

## Patterns

### [Pattern] Tampermonkey 是 Pull-based 更新機制，不是 Push #userscript #tampermonkey #misconception
- **Context**: 誤以為 Tampermonkey 更新是由開發者「推送」給用戶
- **Reality**: Tampermonkey 採用 **Pull-based 機制**，由**用戶端主動檢查**更新
- **How It Works**:
  ```
  用戶瀏覽器 → 每 24 小時訪問 @updateURL
                ↓
              比較版本號
                ↓
           如有新版本 → 下載 @downloadURL
  ```
- **觸發時機**:
  - Tampermonkey 啟動時
  - 每 24 小時定期檢查
  - 用戶手動點擊「檢查更新」
- **Key Differences**:
  | 特性 | Tampermonkey (Pull) | 傳統 Push |
  |------|---------------------|-----------|
  | 主動方 | 用戶端主動檢查 | 伺服器推送 |
  | 延遲 | 最多 24 小時 | 即時 |
  | 隱私 | 開發者不知道用戶數量 | 伺服器記錄所有用戶 |
  | 架構 | 靜態檔案 (CDN) | 需要 WebSocket/長連接 |
- **Why This Matters**:
  - ✅ 開發者只需維護靜態檔案（`updates.json` + `.user.js`）
  - ✅ 無需伺服器維護 WebSocket 連接
  - ✅ GitHub raw URL + Release 檔案即可，利用 GitHub CDN
  - ❌ 無法「立即推送」給所有用戶（最多 24 小時延遲）
- **時間線範例**:
  ```
  T+0 分鐘:    開發者執行 release.sh，推送到 GitHub
  T+5 分鐘:    GitHub CDN 緩存更新完成
  T+0~24 小時: 用戶 A 檢查更新（發現新版本）
  T+0~24 小時: 用戶 B 檢查更新（發現新版本）
  T+0~24 小時: 用戶 C 檢查更新（發現新版本）
  ```
- **Status**: ✅ 已理解並驗證
- **FirstRecorded**: 2026-01-15

### [Pattern] GitHub Release 自動化腳本設計模式 #automation #release #github #ci
- **Context**: 需要為 Tampermonkey userscript 建立自動發布流程，確保版本號一致性和 Release 正確性
- **Pattern**: 單一腳本 (`scripts/release.sh`) 包含完整的發布流程：
  ```bash
  #!/bin/bash
  # 1. 檢查 git 狀態（未提交變更會中止）
  # 2. 驗證版本號一致性（@version vs 參數）
  # 3. 自動更新 updates.json（含 updateURL, downloadURL, changelog）
  # 4. 建立 git tag
  # 5. 推送到 GitHub（main + tag）
  # 6. 建立 GitHub Release 並上傳檔案
  ```
- **Benefits**:
  - ✅ 防止人為錯誤（版本號不一致、忘記建 tag）
  - ✅ 原子性操作（任何步驟失敗都會中止）
  - ✅ 可追溯性（每個 Release 都有對應的 git tag）
  - ✅ 用戶體驗（自動生成正確的 updateURL 和 downloadURL）
- **Usage**:
  ```bash
  ./scripts/release.sh 0.2.2 "新功能說明或 bug 修復"
  ```
- **Status**: ✅ 已實作並驗證
- **FirstRecorded**: 2026-01-15

### [Pattern] Tampermonkey 自動更新機制配置 #userscript #tampermonkey #auto-update
- **Context**: 讓用戶安裝 userscript 後能自動接收更新，無需手動重新安裝
- **Pattern**: 三個關鍵元數據配置：
  ```javascript
  // @version      0.2.1
  // @updateURL    https://raw.githubusercontent.com/{owner}/{repo}/main/.releases/updates.json
  // @downloadURL  https://github.com/{owner}/{repo}/releases/download/{tag}/{script}.user.js
  ```
  搭配 `updates.json` 結構：
  ```json
  {
    "versions": [{
      "version": "0.2.1",
      "updateURL": "...",
      "downloadURL": "...",
      "changelog": "...",
      "released": "YYYY-MM-DD"
    }],
    "lastUpdated": "ISO-8601"
  }
  ```
- **How It Works**:
  1. Tampermonkey 每 24 小時訪問 `@updateURL`
  2. 比較 `updates.json` 中的版本號與用戶安裝版本
  3. 如有更新，從 `@downloadURL` 下載並自動安裝
  4. 提示用戶重新載入頁面
- **Benefits**:
  - ✅ 用戶無需關注更新（set-and-forget）
  - ✅ 支援 changelog 顯示
  - ✅ 可控的發布節奏（用戶 24 小時內收到更新）
- **Status**: ✅ 已驗證（v0.2.1 成功發布）
- **FirstRecorded**: 2026-01-15

---

## 統計資訊
- **總計**: 5 個 Lesson (3 Patterns + 2 Traps)
- **工作區大小**: ~5.2 KB / 50 KB
- **最後更新**: 2026-01-15

---

## 歸檔建議
- ⏳ 工作區容量充足，尚未觸發自動歸檔條件
