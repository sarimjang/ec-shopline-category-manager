# Shopline Category Manager - 快速移動工具

[![GitHub Release](https://img.shields.io/github/release/sarimjang/shopline-category-manager.svg)](https://github.com/sarimjang/shopline-category-manager/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Actions](https://github.com/sarimjang/shopline-category-manager/actions/workflows/test.yml/badge.svg)](https://github.com/sarimjang/shopline-category-manager/actions)

> 在 Shopline 分類管理頁面添加「移動到」按鈕，支持快速分類重新整理和搜尋過濾。

## ✨ 主要功能

### 🚀 快速移動按鈕
在每個分類旁添加「移動到」按鈕，點擊即可快速選擇目標分類進行移動。

### 🔍 搜尋過濾
在分類選擇下拉菜單中輸入搜尋詞，快速定位目標分類。

### ✅ 層級驗證
自動驗證分類移動不會違反 Shopline 的 3 層分類限制。

### 🔄 自動更新
使用 Tampermonkey 的自動更新機制，每周檢查一次，有新版本時自動提示。

### 📦 版本資訊
- **生產版本** - 完整功能，包含自動更新（~40KB）

## 🎯 快速開始

### 1️⃣ 安裝 Tampermonkey 擴展

選擇你的瀏覽器：

| 瀏覽器 | 下載鏈接 |
|--------|--------|
| Chrome | [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobp47m) |
| Firefox | [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) |
| Safari | [App Store](https://apps.apple.com/app/tampermonkey/id1482490089) |
| Edge | [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndigac) |

### 2️⃣ 下載並安裝腳本

訪問 [Releases 頁面](https://github.com/sarimjang/shopline-category-manager/releases) 下載最新版本。

**推薦**：下載生產版本 `shopline-category-manager.prod.user.js`

### 3️⃣ 開始使用

1. 打開 Shopline 後台的分類管理頁面
2. 你會看到每個分類旁出現「移動到」按鈕
3. 點擊按鈕，選擇目標分類
4. 完成！

## 📖 文檔

- 📥 **[安裝指南](docs/INSTALL.md)** - 詳細安裝步驟和常見問題
- 🔧 **[開發指南](docs/DEVELOPMENT.md)** - 如何貢獻代碼
- 📝 **[變更日誌](CHANGELOG.md)** - 版本歷史和更新記錄

## 🛠️ 構建和開發

### 系統要求

- Node.js v18 或更新版本
- npm v9 或更新版本

### 本地開發

```bash
# 克隆倉庫
git clone https://github.com/sarimjang/shopline-category-manager.git
cd shopline-category-manager

# 安裝依賴
npm install

# 運行測試
npm test

# 完整構建（測試）
npm run build:prod
```

### 發佈新版本

```bash
# 更新版本號
npm run version:bump patch

# 建立標籤（觸發自動發佈）
git tag -a v0.2.2 -m "Release v0.2.2"

# 推送（自動觸發 GitHub Actions）
git push origin main v0.2.2
```

詳見 [開發指南](docs/DEVELOPMENT.md)。

## 🚀 自動更新機制

### Tampermonkey 自動檢查

1. **檢查頻率**: 每周一次
2. **版本端點**: `.releases/updates.json`
3. **用戶通知**: 發現新版本時自動提示
4. **無感更新**: 用戶點擊即可自動安裝

### GitHub Actions CI/CD

- ✅ 每次 push 自動測試
- ✅ 每次 push 到 main 自動構建
- ✅ 標籤推送自動發佈新版本
- ✅ 自動上傳文件到 GitHub Releases
- ✅ 自動更新版本檢查端點

## 📊 項目統計

| 指標 | 值 |
|------|-----|
| 當前版本 | 0.2.1 |
| 腳本大小 | ~40KB |
| 代碼行數 | 1400+ |
| 測試覆蓋 | 15+ 單元測試 |
| 支援瀏覽器 | Chrome, Firefox, Safari, Edge |

## 🤝 貢獻指南

歡迎貢獻！請遵循以下步驟：

### 報告 Bug

1. 檢查 [Issues](https://github.com/sarimjang/shopline-category-manager/issues)
2. 如果沒有相同 Issue，創建新 Issue 並提供：
   - 問題描述
   - 重現步驟
   - 預期 vs 實際行為
   - 瀏覽器版本

### 功能建議

1. 訪問 [Discussions](https://github.com/sarimjang/shopline-category-manager/discussions)
2. 描述你的想法
3. 社區投票支持

### 提交代碼

1. Fork 倉庫
2. 建立功能分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 打開 Pull Request

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 格式。

## 📋 需求規格

### 系統支持

- ✅ Shopline 標準後台
- ✅ Chrome, Firefox, Safari, Edge
- ✅ Windows, macOS, Linux

### 限制

- ⚠️ 不支持 3 層以上分類（Shopline 限制）
- ⚠️ 需要 Tampermonkey 或等價擴展
- ⚠️ 需要在 Shopline 分類管理頁面使用

## 🔒 隱私和安全

### 隱私政策

- 🔐 完全本地運行，無信息收集
- 🔐 不與任何第三方服務通信
- 🔐 所有操作在瀏覽器中進行
- 🔐 無需登錄或賬戶

### 安全性

- ✅ 開源代碼，完全透明
- ✅ 無外部依賴（除了 dev 依賴）
- ✅ 定期安全審核
- ✅ GitHub Actions 自動測試

## 📄 許可證

MIT License - 詳見 [LICENSE](LICENSE) 文件

你可以自由使用、修改和分發本項目，只需遵守 MIT 許可證條款。

## 📞 聯繫和支持

- 🐛 **Bug 報告**: [GitHub Issues](https://github.com/sarimjang/shopline-category-manager/issues)
- 💬 **討論**: [GitHub Discussions](https://github.com/sarimjang/shopline-category-manager/discussions)
- 📧 **郵件**: 參考 GitHub 個人主頁

## 🙏 致謝

感謝所有貢獻者和用戶的支持！

## 相關資源

- 📚 [Tampermonkey 官方網站](https://www.tampermonkey.net/)
- 📚 [Shopline 開發者文檔](https://shopline.hk/)
- 📚 [GreaseMonkey/UserScript 文檔](https://www.greasespot.net/)

---

**最後更新**: 2026-01-15
**維護者**: Development Team
**版本**: 0.2.1
