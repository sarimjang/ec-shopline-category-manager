# Shopline Category Manager - Chrome Extension 架構規劃

## 目錄
1. [現有功能分析](#現有功能分析)
2. [Extension 架構設計](#extension-架構設計)
3. [功能擴展清單](#功能擴展清單)
4. [遷移評估](#遷移評估)
5. [實作路線圖](#實作路線圖)

---

## 現有功能分析

### 核心功能模組

```
┌─────────────────────────────────────────────────────────────┐
│                   CategoryManager (主類)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │  UI 注入層      │  │  分類操作層     │  │ 數據追蹤層  │  │
│  │  - 按鈕注入     │  │  - 移動邏輯     │  │ - 時間統計  │  │
│  │  - 下拉選單     │  │  - 層級驗證     │  │ - 移動記錄  │  │
│  │  - 搜尋 UI      │  │  - API 同步     │  │ - 持久化    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                   AngularJS 橋接層                           │
│  - getAngular() / unsafeWindow 跨沙箱                        │
│  - scope 操作                                                │
│  - DOM 觀察器                                                │
└─────────────────────────────────────────────────────────────┘
```

### 功能清單（現有）

| 功能 | 描述 | 技術依賴 |
|------|------|----------|
| 移動按鈕 | 每個分類旁的「移動到」按鈕 | DOM 注入 |
| 下拉選單 | 樹狀目標分類選擇 | 純 CSS/JS |
| 搜尋過濾 | 分類名稱搜尋 | debounce + 過濾 |
| 層級驗證 | 防止超過 3 層 | 遞迴計算 |
| 時間統計 | 節省時間追蹤 | localStorage |
| API 同步 | 保存到 Shopline 後端 | fetch + CSRF |
| 回滾機制 | 失敗時還原 | 備份 + 還原 |

---

## Extension 架構設計

### Manifest V3 架構

```
shopline-category-manager-extension/
├── manifest.json              # Extension 配置
├── src/
│   ├── background/
│   │   └── service-worker.js  # 後台服務（統計、通知）
│   ├── content/
│   │   ├── content.js         # 主要內容腳本（現有邏輯）
│   │   ├── category-manager.js # CategoryManager 類
│   │   └── angular-bridge.js  # AngularJS 橋接
│   ├── popup/
│   │   ├── popup.html         # 工具欄彈出視窗
│   │   ├── popup.css
│   │   └── popup.js
│   ├── sidepanel/
│   │   ├── sidepanel.html     # 側邊欄（詳細操作）
│   │   ├── sidepanel.css
│   │   └── sidepanel.js
│   ├── options/
│   │   ├── options.html       # 設定頁面
│   │   └── options.js
│   └── shared/
│       ├── storage.js         # 統一存儲 API
│       ├── messaging.js       # 訊息傳遞
│       └── constants.js       # 共用常數
├── assets/
│   ├── icons/                 # Extension 圖標
│   └── images/
├── _locales/                  # 多語言支援
│   ├── zh_TW/
│   └── en/
└── tests/
    └── ...
```

### 組件通訊架構

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Chrome Extension                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    chrome.runtime    ┌──────────────────────┐    │
│  │   Popup      │◄──────────────────────►│   Service Worker    │    │
│  │  (工具欄)    │        .sendMessage    │   (後台服務)        │    │
│  └──────────────┘                        └──────────────────────┘    │
│         │                                          │                 │
│         │ chrome.sidePanel                         │                 │
│         ▼                                          │                 │
│  ┌──────────────┐                                  │                 │
│  │  Side Panel  │    chrome.storage.local          │                 │
│  │  (側邊欄)    │◄─────────────────────────────────┤                 │
│  └──────────────┘                                  │                 │
│         │                                          │                 │
│         │ chrome.tabs.sendMessage                  │                 │
│         ▼                                          ▼                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Content Script                            │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │    │
│  │  │ UI 注入     │  │ Angular橋接 │  │ CategoryManager     │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
│                              ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                   Shopline 頁面 (AngularJS)                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### manifest.json 設計

```json
{
  "manifest_version": 3,
  "name": "Shopline 分類管理器",
  "version": "1.0.0",
  "description": "快速移動分類、批量操作、時間節省追蹤",

  "permissions": [
    "storage",
    "notifications",
    "contextMenus",
    "sidePanel"
  ],

  "host_permissions": [
    "https://admin.shoplineapp.com/*",
    "https://*.shopline.tw/*",
    "https://*.shopline.app/*"
  ],

  "background": {
    "service_worker": "src/background/service-worker.js"
  },

  "content_scripts": [
    {
      "matches": [
        "https://admin.shoplineapp.com/admin/*/categories*",
        "https://*.shopline.tw/admin/*/categories*",
        "https://*.shopline.app/admin/*/categories*"
      ],
      "js": [
        "src/shared/constants.js",
        "src/content/angular-bridge.js",
        "src/content/category-manager.js",
        "src/content/content.js"
      ],
      "css": ["src/content/styles.css"],
      "run_at": "document_end"
    }
  ],

  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "assets/icons/icon16.png",
      "48": "assets/icons/icon48.png",
      "128": "assets/icons/icon128.png"
    }
  },

  "side_panel": {
    "default_path": "src/sidepanel/sidepanel.html"
  },

  "options_page": "src/options/options.html",

  "commands": {
    "quick-move": {
      "suggested_key": {
        "default": "Alt+M",
        "mac": "Alt+M"
      },
      "description": "快速移動選中分類"
    },
    "toggle-panel": {
      "suggested_key": {
        "default": "Alt+S",
        "mac": "Alt+S"
      },
      "description": "開關側邊欄"
    }
  },

  "icons": {
    "16": "assets/icons/icon16.png",
    "48": "assets/icons/icon48.png",
    "128": "assets/icons/icon128.png"
  }
}
```

---

## 功能擴展清單

### Phase 1: 核心遷移（MVP）

| 功能 | 優先級 | 說明 | 工作量 |
|------|--------|------|--------|
| Content Script 遷移 | P0 | 現有邏輯直接遷移 | 2-3h |
| Storage API 替換 | P0 | localStorage → chrome.storage | 1h |
| Popup 統計面板 | P1 | 顯示時間節省統計 | 2h |
| 圖標和基礎 UI | P1 | Extension 視覺識別 | 1h |

### Phase 2: 增強功能

| 功能 | 優先級 | 說明 | 工作量 |
|------|--------|------|--------|
| 快捷鍵支援 | P1 | Alt+M 快速移動 | 2h |
| 右鍵選單 | P1 | 快速複製分類路徑 | 2h |
| 桌面通知 | P2 | 移動成功/失敗通知 | 1h |
| 側邊欄面板 | P2 | 詳細操作和歷史 | 4h |

### Phase 3: 進階功能（新能力）

| 功能 | 優先級 | 說明 | 工作量 | Tampermonkey 可行？ |
|------|--------|------|--------|---------------------|
| **批量移動** | P1 | 選擇多個分類一次移動 | 6h | ❌ 困難 |
| **移動歷史** | P2 | 記錄所有移動操作 | 3h | ⚠️ 有限 |
| **一鍵撤銷** | P2 | 撤銷最近的移動 | 4h | ❌ 困難 |
| **分類書籤** | P2 | 保存常用分類組合 | 3h | ❌ 不可行 |
| **多店鋪同步** | P3 | 跨 Shopline 店鋪統計 | 8h | ❌ 不可行 |
| **匯出/匯入** | P3 | 分類結構備份 | 6h | ⚠️ 有限 |
| **拖放預覽** | P3 | 移動前視覺化預覽 | 8h | ⚠️ 有限 |

### 功能詳細設計

#### 1. 批量移動（P1 新功能）

```
┌─────────────────────────────────────────┐
│ 📋 批量移動模式                          │
├─────────────────────────────────────────┤
│ ☑ 女裝 > 上衣 > T-shirt                 │
│ ☑ 女裝 > 上衣 > 襯衫                    │
│ ☐ 女裝 > 下裝 > 牛仔褲                  │
│ ☑ 男裝 > 上衣 > Polo衫                  │
├─────────────────────────────────────────┤
│ 已選擇: 3 個分類                         │
│ [移動到...▼]  [取消選擇]  [全選]        │
└─────────────────────────────────────────┘
```

**實作要點**：
- 多選 checkbox 模式
- 批量驗證層級限制
- 單一 API 呼叫（或排隊處理）
- 進度指示器

#### 2. 側邊欄面板（P2）

```
┌─────────────────────────────────────────┐
│ 📊 Shopline 分類管理器                   │
├─────────────────────────────────────────┤
│ 📈 統計                                  │
│ ┌─────────────────────────────────────┐ │
│ │ 今日移動: 12 次                      │ │
│ │ 節省時間: 2 分 34 秒                 │ │
│ │ 本月累計: 156 次 / 31 分鐘           │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ 📜 最近操作                              │
│ ┌─────────────────────────────────────┐ │
│ │ 10:32 T-shirt → 女裝/上衣    [撤銷] │ │
│ │ 10:28 襯衫 → 女裝/上衣        [撤銷] │ │
│ │ 10:25 Polo衫 → 男裝/上衣      [撤銷] │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ ⭐ 分類書籤                              │
│ ┌─────────────────────────────────────┐ │
│ │ [女裝/上衣] [男裝/上衣] [+新增]     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

#### 3. 快捷鍵系統（P1）

| 快捷鍵 | 功能 | 說明 |
|--------|------|------|
| `Alt+M` | 快速移動 | 對選中分類開啟移動選單 |
| `Alt+S` | 側邊欄 | 開關側邊欄面板 |
| `Alt+B` | 批量模式 | 進入/退出批量選擇 |
| `Ctrl+Z` | 撤銷 | 撤銷最近移動 |
| `Esc` | 取消 | 關閉選單/退出模式 |

---

## 遷移評估

### 技術風險評估

| 風險項目 | 等級 | 說明 | 緩解措施 |
|----------|------|------|----------|
| AngularJS 訪問 | 🟡 中 | Content Script 與頁面 JS 隔離 | 使用 `world: "MAIN"` 或 inject script |
| Manifest V3 限制 | 🟢 低 | Service Worker 不支持持久連接 | 使用 chrome.storage + alarm |
| API 同步 | 🟢 低 | 與 Tampermonkey 相同 | 直接遷移 |
| 審核時間 | 🟡 中 | Chrome Web Store 審核 | 先發布為 unpacked，後上架 |

### AngularJS 訪問方案

**方案 A: 注入 Script（推薦）**
```javascript
// content.js
const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/content/injected.js');
document.head.appendChild(script);

// 透過 CustomEvent 通訊
window.addEventListener('categoryMoved', (e) => {
  chrome.runtime.sendMessage({ type: 'CATEGORY_MOVED', data: e.detail });
});
```

**方案 B: Manifest V3 world: MAIN**
```json
{
  "content_scripts": [{
    "world": "MAIN",
    "js": ["src/content/main-world.js"]
  }]
}
```

### 成本效益分析

#### 遷移成本

| 項目 | 工時 | 說明 |
|------|------|------|
| 架構設計 | 2h | 完成 ✅ |
| 核心遷移 | 4h | Content Script + Storage |
| Popup UI | 3h | 統計面板 |
| 測試驗證 | 2h | 功能測試 |
| 打包發布 | 1h | Chrome Web Store |
| **Phase 1 總計** | **12h** | MVP 版本 |

| 項目 | 工時 | 說明 |
|------|------|------|
| 快捷鍵 | 2h | Commands API |
| 右鍵選單 | 2h | ContextMenus API |
| 側邊欄 | 4h | SidePanel API |
| 批量移動 | 6h | 多選 + 批量處理 |
| **Phase 2-3 總計** | **14h** | 增強功能 |

#### 效益評估

| 效益類型 | Tampermonkey | Extension | 提升 |
|----------|--------------|-----------|------|
| 安裝便利性 | 需裝 TM + 腳本 | 一鍵安裝 | ⬆️⬆️⬆️ |
| 使用者信任 | 第三方腳本疑慮 | Chrome 官方審核 | ⬆️⬆️ |
| 功能空間 | 受限於頁面 | 完整 Chrome API | ⬆️⬆️⬆️ |
| 多店鋪支援 | 不可行 | 可實現 | ⬆️⬆️⬆️ |
| 更新機制 | TM 內建 | Chrome 自動更新 | ⬆️ |
| 維護成本 | 較低 | 中等 | ⬇️ |

### 決策矩陣

```
                    效益
                     ↑
                     │   ★ Extension + 批量功能
                     │      (Phase 2-3)
            高效益   │
                     │   ● Extension MVP
                     │      (Phase 1)
                     │
                     │─────────────────────────→ 成本
                     │
            低效益   │   ○ 維持 Tampermonkey
                     │
```

---

## 實作路線圖

### Phase 1: MVP（預計 2 週）

```
Week 1
├─ Day 1-2: 專案結構建立
│   ├─ manifest.json
│   ├─ 目錄結構
│   └─ 基礎配置
├─ Day 3-4: Content Script 遷移
│   ├─ CategoryManager 類
│   ├─ Angular 橋接層
│   └─ UI 注入邏輯
└─ Day 5: Storage 遷移
    ├─ chrome.storage.local
    └─ 統計數據同步

Week 2
├─ Day 1-2: Popup 開發
│   ├─ 統計面板 UI
│   └─ 設定選項
├─ Day 3: 測試驗證
│   ├─ 功能測試
│   └─ 邊界情況
└─ Day 4-5: 發布準備
    ├─ 圖標設計
    ├─ 文檔更新
    └─ Chrome Web Store 提交
```

### Phase 2: 增強功能（預計 2 週）

```
Week 3
├─ Day 1-2: 快捷鍵系統
├─ Day 3-4: 右鍵選單
└─ Day 5: 桌面通知

Week 4
├─ Day 1-3: 側邊欄面板
├─ Day 4: 移動歷史功能
└─ Day 5: 測試和優化
```

### Phase 3: 進階功能（預計 3 週）

```
Week 5-6: 批量移動
Week 7: 多店鋪同步 + 匯出匯入
```

---

## 建議和下一步

### 立即行動建議

1. **確認需求優先級** - 哪些 Phase 2-3 功能最重要？
2. **開始 Phase 1** - 建立專案結構，遷移核心邏輯
3. **維持 Tampermonkey 版本** - 平行維護，直到 Extension 穩定

### 關鍵決策點

- [ ] 是否需要多店鋪支援？（影響 Storage 設計）
- [ ] 是否要上架 Chrome Web Store？（需要開發者帳號 $5）
- [ ] 批量移動是否為必要功能？（影響 Phase 1 範圍）

---

## 附錄

### A. 參考資源

- [Chrome Extension MV3 文檔](https://developer.chrome.com/docs/extensions/mv3/)
- [SidePanel API](https://developer.chrome.com/docs/extensions/reference/sidePanel/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

### B. 競品分析

| 工具 | 類型 | 功能 | 與本專案差異 |
|------|------|------|-------------|
| Shopify Category Manager | Extension | 批量編輯 | 針對 Shopify |
| eCom Tools | Extension | 多功能工具箱 | 通用，非專用 |

### C. 風險緩解計劃

| 風險 | 觸發條件 | 應對方案 |
|------|----------|----------|
| Chrome Web Store 審核失敗 | 政策違規 | 修正後重新提交 |
| AngularJS 訪問失效 | Shopline 更新 | 使用備用注入方案 |
| 效能問題 | 大量分類 | 虛擬滾動 + 懶加載 |
