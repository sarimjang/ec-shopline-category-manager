# 開發指南 - Shopline Category Manager

## 環境設定

### 必要工具

- **Node.js**: v18 或更新版本（推薦 v20）
- **npm**: v9 或更新版本（通常與 Node.js 一起安裝）
- **Git**: 最新版本
- **文本編輯器**: VSCode, Sublime Text 等

### 安裝依賴

```bash
# 克隆倉庫
git clone https://github.com/sarimjang/shopline-category-manager.git
cd shopline-category-manager

# 安裝 Node.js 依賴
npm install
```

## 本地開發流程

### 1. 開發和測試

```bash
# 運行測試
npm test

# 生成最小化版本（用於測試大小縮減效果）
npm run build:minify

# 查看完整的生產構建
npm run build:prod
```

### 2. 本地測試腳本

在本地開發時，直接使用開發版本：

```bash
# 使用原始的開發版本進行測試
# 位置: src/shopline-category-manager.user.js
```

在 Tampermonkey 中添加本地腳本進行測試：

1. 打開 Tampermonkey 面板
2. 點擊「創建新腳本」
3. 複製 `src/shopline-category-manager.user.js` 的內容並貼上
4. 保存並在 Shopline 頁面進行測試

或者，使用 Tampermonkey 的「import」功能直接導入本地文件。

### 3. 調試技巧

#### 啟用調試訊息

在開發版本中，調試訊息默認啟用：

```javascript
// 在代碼中添加調試訊息
console.log('[Shopline Category Manager] 調試信息');
console.error('[Shopline Category Manager] 錯誤信息');
```

#### 使用瀏覽器開發者工具

1. 按 F12 打開開發者工具
2. 在 Console 標籤中查看所有訊息
3. 在 Network 標籤中監控 API 調用

## 版本管理

### 語義化版本

遵循 [Semantic Versioning](https://semver.org/):

- **MAJOR** (例: 1.0.0): 不相容的 API 變更
- **MINOR** (例: 0.1.0): 向後相容的新功能
- **PATCH** (例: 0.0.1): 向後相容的 Bug 修復

### 版本遞增

```bash
# 遞增 patch 版本 (0.2.1 → 0.2.2)
npm run version:bump patch

# 遞增 minor 版本 (0.2.1 → 0.3.0)
npm run version:bump minor

# 遞增 major 版本 (0.2.1 → 1.0.0)
npm run version:bump major
```

腳本會自動更新：
- `package.json`
- `src/shopline-category-manager.user.js`
- `src/shopline-category-manager.prod.user.js`

## 發佈流程

### 第 1 步：準備代碼

```bash
# 確保所有測試通過
npm test

# 檢查代碼是否沒有問題
git status

# 建立必要的更新日誌條目
# 編輯 CHANGELOG.md，添加此版本的變更說明
```

### 第 2 步：提交代碼

```bash
# 階段你的更改
git add src/shopline-category-manager*.user.js CHANGELOG.md

# 提交（務必使用清晰的 commit message）
git commit -m "feat: add new feature"
# 或
git commit -m "fix: resolve issue #123"
# 或
git commit -m "docs: update documentation"

# 推送到 main 分支
git push origin main
```

### 第 3 步：建立版本標籤並發佈

```bash
# 遞增版本號（例: 0.2.1 → 0.2.2）
npm run version:bump patch

# 建立帶註解的標籤
git tag -a v0.2.2 -m "Release v0.2.2 - Bug fixes and improvements"

# 推送標籤到遠程倉庫（觸發 GitHub Actions 自動發佈）
git push origin main
git push origin v0.2.2
```

### 第 4 步：自動化完成

GitHub Actions 工作流會自動：

1. ✅ 運行所有測試
2. ✅ 生成最小化版本
3. ✅ 建立 GitHub Release
4. ✅ 上傳生產版本和最小化版本
5. ✅ 更新 `.releases/updates.json` 版本檢查端點
6. ✅ 提交更新回 main 分支

用戶會在 Tampermonkey 中看到新版本可用的通知。

## 提交訊息規範

使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 類型

- **feat**: 新功能
- **fix**: Bug 修復
- **docs**: 文檔變更
- **style**: 代碼格式變更（不影響功能）
- **refactor**: 代碼重構（不改變功能）
- **perf**: 性能改進
- **test**: 新增或修改測試
- **chore**: 構建、依賴或工具變更

### 例子

```bash
git commit -m "feat: add search filter to category selector"
git commit -m "fix: resolve scope alignment issue in moveCategory"
git commit -m "docs: update installation guide"
git commit -m "perf: optimize DOM queries for better performance"
git commit -m "refactor: simplify error handling in API calls"
```

## 文件結構

```
shopline-category-manager/
├── .github/
│   └── workflows/           # GitHub Actions 工作流
│       ├── test.yml        # 自動測試
│       ├── build.yml       # 自動構建
│       └── release.yml     # 版本發佈（核心）
│
├── .releases/
│   ├── updates.json        # Tampermonkey 版本檢查端點
│   └── downloads/          # 版本下載歸檔（由 GitHub Actions 管理）
│
├── docs/
│   ├── INSTALL.md          # 用戶安裝指南
│   └── DEVELOPMENT.md      # 這個文件
│
├── scripts/
│   ├── minify.js          # 最小化腳本（Terser）
│   ├── bump-version.js    # 版本號更新
│   └── update-releases.js # 版本端點更新
│
├── src/
│   ├── shopline-category-manager.user.js       # 開發版（原始）
│   ├── shopline-category-manager.prod.user.js  # 生產版（優化）
│   ├── shopline-category-manager.min.user.js   # 最小化版（自動生成）
│   └── shopline-category-manager.test.js       # 測試文件
│
├── package.json            # Node.js 配置和依賴
├── .gitignore             # Git 忽略規則
├── CHANGELOG.md           # 版本變更日誌
├── README.md              # 項目介紹
└── CLAUDE.md              # 開發指南（針對 AI 助手）
```

## 常見任務

### 新增功能

1. 在 `src/shopline-category-manager.user.js` 中編寫功能
2. 確保在測試文件中添加相應測試
3. 運行 `npm test` 確保所有測試通過
4. 提交代碼和 changelog 條目

### 修復 Bug

1. 在 `src/shopline-category-manager.user.js` 中定位並修復 Bug
2. 添加測試以防止回歸
3. 運行 `npm test` 確保所有測試通過
4. 提交代碼，commit message 格式: `fix: description`

### 更新依賴

```bash
# 檢查過時的依賴
npm outdated

# 更新所有依賴（小心，可能引入破壞性變更）
npm update

# 更新特定依賴
npm install terser@latest
```

## 測試

### 運行測試

```bash
npm test
```

### 寫入測試

測試文件位置: `src/shopline-category-manager.test.js`

遵循以下模式：

```javascript
console.log('測試: 功能描述...');
try {
  // 測試代碼
  console.assert(condition, '失敗訊息');
  console.log('✅ 通過');
} catch (error) {
  console.error('❌ 失敗:', error.message);
}
```

## 故障排查

### Build 失敗

```bash
# 清除 node_modules 並重新安裝
rm -rf node_modules package-lock.json
npm install

# 嘗試重新建立
npm run build:prod
```

### 測試失敗

1. 檢查 console 輸出中的具體錯誤訊息
2. 確保你的代碼更改沒有破壞現有功能
3. 在 Tampermonkey 中本地測試腳本

### 版本發佈卡住

1. 檢查 GitHub Actions 工作流日誌
2. 確保所有測試都通過
3. 確保標籤格式正確（例: `v0.2.2`）

## 聯繫和貢獻

- 📖 **[用戶指南](./INSTALL.md)**
- 🐛 **[報告 Bug](https://github.com/sarimjang/shopline-category-manager/issues)**
- 💬 **[討論](https://github.com/sarimjang/shopline-category-manager/discussions)**
- 🔀 **[貢獻指南](../README.md#貢獻)**
