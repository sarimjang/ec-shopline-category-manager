# Phase 3.1: Build-Time Gating for Debug APIs

## 概述

實現了構建時環境變數機制，用於在編譯時條件性地包含或排除調試 API。此機制確保生產構建中的調試代碼被完全移除。

## 實現方案

### 1. 環境變數設定

構建時通過 `NODE_ENV` 環境變數控制：

```bash
# 開發構建 - 包含調試 API
NODE_ENV=development npm run build:dev

# 生產構建 - 排除調試 API（預設）
NODE_ENV=production npm run build:prod
# 或簡單使用
npm run build
```

### 2. 核心機制

#### 環境配置模組 (`src/shared/env-config.js`)

定義了所有環境相關的特性開關：

```javascript
const FEATURES = {
  DEBUG_APIS: ENV.NODE_ENV === 'development',      // 調試 API
  VERBOSE_LOGGING: ENV.NODE_ENV === 'development', // 詳細日誌
  EXPOSE_INTERNAL_STATE: ENV.NODE_ENV === 'development', // 內部狀態暴露
};
```

**特點**：
- 所有開關基於 `process.env.NODE_ENV`
- 生產環境時自動禁用所有調試特性
- 支援 tree-shaking（死碼消除）

#### 構建配置 (`build-config.js`)

提供 Webpack 集成示例：

```javascript
const webpackConfig = getWebpackConfig(env);
// 使用 webpack.DefinePlugin 在編譯時注入環境變數
```

### 3. 調試 API 實現 (`src/content/injected.js`)

使用條件編譯標誌：

```javascript
var DEBUG_APIS_ENABLED = typeof process !== 'undefined' &&
                          process.env &&
                          process.env.NODE_ENV === 'development';

if (DEBUG_APIS_ENABLED) {
  // 開發構建：暴露調試接口
  window.debugCategoryManager = {
    moveCategory: (...) => {...},
    undo: (...) => {...},
    redo: (...) => {...},
    getState: (...) => {...}
  };
}
```

**在生產構建中**：
- `DEBUG_APIS_ENABLED` 為 `false`
- 整個 `if` 塊被 tree-shake 移除
- 結果：`window.debugCategoryManager === undefined`

### 4. 安全特性

#### A. 調試 API 暴露（Phase 3.1）
- **開發模式**：`window.debugCategoryManager` 提供測試接口
- **生產模式**：不存在，完全移除

**暴露的方法**（開發模式）：
```javascript
debugCategoryManager.moveCategory(categoryId, newParent, newPosition)
debugCategoryManager.undo()
debugCategoryManager.redo()
debugCategoryManager.getState()  // 返回當前狀態快照
```

#### B. 內部對象隱藏（Phase 3.1）
- `window.categoryManager` 保持在閉包中
- 即使在開發模式也不暴露（僅 `debugCategoryManager` 暴露有限接口）
- 生產模式下明確刪除任何洩漏的引用

#### C. 消息傳遞驗證（Phase 1 + 3.1）
- 所有跨世界通信使用 nonce 驗證
- Content script 驗證 `categoryManagerReady` 事件中的 nonce
- 防止頁面腳本偽造初始化事件

## 構建流程

### 開發構建
```bash
NODE_ENV=development npm run build:dev
```

結果：
- 調試 API 已啟用
- 詳細日誌輸出
- Source maps 生成
- 代碼未最小化（便於偵錯）

### 生產構建
```bash
npm run build  # 或 NODE_ENV=production npm run build:prod
```

結果：
- 調試 API 完全移除（tree-shaked）
- 日誌語句被移除
- 代碼被最小化
- Source maps 不生成

## 驗證檢查清單

### 生產構建驗證

```bash
# 1. 檢查調試 API 在生產構建中是否被移除
node build-config.js

# 2. 驗證 bundle 大小
du -h dist/injected.js

# 3. 檢查 debugCategoryManager 是否存在（應該找不到）
grep -r "debugCategoryManager" dist/
# 結果應為空或僅包含註解
```

### 開發構建驗證

```bash
NODE_ENV=development npm run build:dev
# 在開發環境，應該能夠訪問 window.debugCategoryManager
```

## NPM Scripts

更新的 `package.json` 提供了以下命令：

| 命令 | 環境 | 描述 |
|------|------|------|
| `npm run build` | production | 生產構建（預設） |
| `npm run build:dev` | development | 開發構建，包含調試 API |
| `npm run build:prod` | production | 明確的生產構建 |
| `npm run test` | N/A | 運行測試套件 |
| `npm run release` | production | 發佈準備（構建 + 版本管理） |

## 調試 API 使用示例

### 開發環境使用

在瀏覽器控制台中（開發構建）：

```javascript
// 檢查調試 API 是否可用
window.debugCategoryManager
// 結果：{ moveCategory, undo, redo, getState }

// 取得當前狀態
const state = window.debugCategoryManager.getState();
console.log('Categories:', state.categories);
console.log('Stats:', state.stats);

// 測試移動類別
window.debugCategoryManager.moveCategory(123, 456, 0)
  .then(result => console.log('Move result:', result))
  .catch(error => console.error('Move failed:', error));

// 測試 undo/redo（未實現，返回佔位符）
await window.debugCategoryManager.undo();
await window.debugCategoryManager.redo();
```

### 生產環境檢查

在瀏覽器控制台中（生產構建）：

```javascript
// 結果：undefined
window.debugCategoryManager
// → undefined

// 結果：undefined（內部對象不暴露）
window.categoryManager
// → undefined
```

## 技術細節

### Tree-Shaking 原理

Webpack 在生產模式下使用 UglifyJS 或 Terser 進行死碼消除：

```javascript
// 原始代碼
var DEBUG_APIS_ENABLED = false; // 生產環境

if (DEBUG_APIS_ENABLED) {
  // 這整個塊會被移除
  window.debugCategoryManager = {...};
}

// 編譯後結果（生產）
// （整個 if 塊被移除）

// 開發環境結果
var DEBUG_APIS_ENABLED = true;

if (DEBUG_APIS_ENABLED) {
  // 這個塊被保留
  window.debugCategoryManager = {...};
}
```

### 環境變數注入

使用 Webpack DefinePlugin：

```javascript
new webpack.DefinePlugin({
  'process.env.NODE_ENV': JSON.stringify('production'),
  'DEBUG_APIS_ENABLED': JSON.stringify(false)
})
```

在編譯時，所有 `process.env.NODE_ENV` 引用都被替換為實際值。

## 未來改進

1. **集成 CI/CD**：在 CI 管道中驗證生產構建不包含調試代碼
2. **Bundle 分析**：使用 `webpack-bundle-analyzer` 驗證大小
3. **環境檢查**：添加更多特性開關（例如 `DEBUG_STORAGE_OPERATIONS`）
4. **崩潰報告**：在生產環境添加錯誤上報（但不暴露調試接口）

## 相關檔案

- `src/shared/env-config.js` - 環境配置模組
- `src/content/injected.js` - 調試 API 條件暴露
- `build-config.js` - 構建配置示例
- `package.json` - NPM 腳本定義

## 安全性考量

✅ **已實現**：
- 調試 API 僅在開發環境可用
- 生產構建完全移除調試代碼
- 內部對象保持隱藏
- Nonce 驗證防止偽造

⚠️ **注意**：
- 開發構建不應用於生產環境
- 確保 CI/CD 使用 `NODE_ENV=production`
- 生產構建應通過 bundle 分析驗證

## 規格對應

此實現對應以下規格需求：

- ✅ EAP-001: Debug APIs Build-Time Gated
  - 開發模式：調試 API 已暴露
  - 生產模式：調試 API 未定義，代碼被移除

- ✅ EAP-002: Internal Objects Not Exposed
  - `window.categoryManager` 保持隱藏
  - 僅暴露有限的 `debugCategoryManager` 接口

- ✅ EAP-003: Message Handler Validation
  - Nonce 驗證已實現於 init.js
  - 消息傳遞檢查由 service-worker 進行

## 提交訊息

```
feat(phase-3.1): Implement build-time gating for debug APIs

- Add NODE_ENV-based feature flag in env-config.js
- Conditionally expose debugCategoryManager in injected.js
- Update build-config.js for webpack integration
- Add npm scripts for dev/prod builds
- Ensure production builds have zero debug API code

Fixes: EAP-001, EAP-002
```
