# 發布新版本指南

## 前置準備（只需執行一次）

### 1. GitHub CLI 認證

```bash
gh auth login
```

選擇：
- GitHub.com
- HTTPS
- Login with a browser

## 發布流程

### 完整步驟

假設要發布 `0.2.2` 版本：

#### 1. 修改程式碼

正常開發，修改 `src/shopline-category-manager.user.js`

#### 2. 同步到 prod 版本

```bash
./scripts/sync-prod-ast.js
```

#### 3. 更新版本號

手動編輯兩個文件中的 `@version`：
- `src/shopline-category-manager.user.js`
- `src/shopline-category-manager.prod.user.js`

```javascript
// @version      0.2.2  // 改為新版本號
```

#### 4. 提交程式碼變更

```bash
git add src/*.user.js
git commit -m "feat: 新功能描述"
git push origin main
```

#### 5. 執行發布腳本

```bash
./scripts/release.sh 0.2.2 "新功能描述或 bug 修復說明"
```

腳本會自動：
- ✅ 檢查 git 狀態
- ✅ 驗證版本號一致性
- ✅ 更新 `.releases/updates.json`
- ✅ 建立 git tag
- ✅ 推送到 GitHub
- ✅ 建立 GitHub Release 並上傳 prod.user.js

#### 6. 驗證發布

訪問 Release 頁面確認：
```
https://github.com/sarimjang/shopline-category-manager/releases
```

確認以下檔案可下載：
```
https://github.com/sarimjang/shopline-category-manager/releases/download/v0.2.2/shopline-category-manager.prod.user.js
```

## 用戶更新機制

### Tampermonkey 自動更新

- **檢查頻率**：預設每天一次
- **檢查時機**：
  - Tampermonkey 啟動時
  - 每 24 小時自動檢查
  - 手動點擊「檢查更新」

### 更新流程

1. Tampermonkey 訪問 `@updateURL`（`.releases/updates.json`）
2. 比較版本號：`updates.json 版本` vs `用戶安裝版本`
3. 如果有新版本，下載 `@downloadURL`（GitHub Release 上的檔案）
4. 自動安裝並提示用戶重新載入頁面

### 強制立即更新

用戶可以手動檢查更新：
1. Tampermonkey 圖示 → 儀表板
2. 找到「Shopline 分類管理」
3. 點擊「檢查更新」按鈕

## 快速參考

```bash
# 完整流程（一行命令）
./scripts/sync-prod-ast.js && \
  vim src/shopline-category-manager.prod.user.js && \  # 手動改版本號
  git add src/*.user.js && \
  git commit -m "feat: 新功能" && \
  git push origin main && \
  ./scripts/release.sh 0.2.2 "新功能說明"
```

## 版本號規則

遵循 [Semantic Versioning](https://semver.org/)：

- **0.x.y** - 主版本.次版本.修訂號
  - `0.2.1 → 0.2.2` - Bug 修復
  - `0.2.2 → 0.3.0` - 新增功能（向後相容）
  - `0.3.0 → 1.0.0` - 重大變更（可能不相容）

## Changelog 撰寫範例

**好的 changelog**：
```
修復時間計算在大型店家的不準確問題
```

**不好的 changelog**：
```
fix bug
```

**包含多個變更**：
```
- 新增時間節省統計功能
- 修復層級對齊問題
- 改進錯誤提示訊息
```

## 疑難排解

### 問題：gh: command not found

```bash
# macOS
brew install gh

# 其他系統
# 參考: https://cli.github.com/manual/installation
```

### 問題：版本號不一致

確保兩個檔案的 `@version` 完全一致：
- `src/shopline-category-manager.user.js`
- `src/shopline-category-manager.prod.user.js`

### 問題：Release 建立失敗

1. 確認 `gh auth status` 顯示已登入
2. 確認有 repo 的寫入權限
3. 確認 tag 尚未存在：`git tag -l`

## 注意事項

1. **不要跳過版本號** - 按順序遞增
2. **測試後再發布** - 在本地 Tampermonkey 測試功能正常
3. **Changelog 要清楚** - 讓用戶知道更新了什麼
4. **24 小時生效** - 用戶不會立即收到更新，等待 Tampermonkey 自動檢查

## 緊急回滾

如果發現嚴重 bug 需要回滾：

```bash
# 1. 刪除有問題的 release
gh release delete v0.2.2 --yes

# 2. 刪除 tag
git tag -d v0.2.2
git push origin :refs/tags/v0.2.2

# 3. 恢復到前一個版本並重新發布
git revert HEAD
./scripts/release.sh 0.2.3 "緊急修復：回滾至穩定版本"
```
