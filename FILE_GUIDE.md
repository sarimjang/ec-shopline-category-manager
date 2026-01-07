# 文件導航指南

本指南幫助您快速找到所需的文件和信息。

## 文件總覽

```
PROJECT ROOT/
│
├── src/                                    # 原始碼目錄
│   ├── shopline-category-manager.user.js   # 主要 UserScript
│   ├── shopline-category-manager.test.js   # 單元測試
│   └── README.md                           # API 文檔
│
├── openspec/                               # OpenSpec 規格目錄
│   └── changes/add-category-quick-move/
│       ├── proposal.md                     # 功能提案
│       └── specs/category-manager/spec.md  # 詳細規格
│
├── QUICK_REFERENCE.md                      # 快速參考（1 分鐘）
├── PROJECT_SUMMARY.md                      # 項目概括（5 分鐘）
├── STEP_1_2_COMPLETION_REPORT.md          # 完成情況（10 分鐘）
├── TEST_VERIFICATION.md                    # 測試驗證（15 分鐘）
├── IMPLEMENTATION_PLAN.md                  # 實現計劃（30 分鐘）
└── FILE_GUIDE.md                           # 本文件
```

## 按需求找文件

### 我想快速了解項目

**時間**: 1-5 分鐘

1. **最快速** (1 分鐘):
   - 讀 `/QUICK_REFERENCE.md`
   - 掃過關鍵函數簽名

2. **略詳細** (5 分鐘):
   - 讀 `/PROJECT_SUMMARY.md`
   - 了解項目概況和進度

### 我想知道 Step 1-2 完成情況

**時間**: 10 分鐘

- 讀 `/STEP_1_2_COMPLETION_REPORT.md`

包含:
- 成功標準檢查清單
- 實現詳情
- 測試驗證結果
- 代碼質量指標
- 下一步說明

### 我想深入了解核心函數

**時間**: 20 分鐘

1. 讀 `/src/README.md` 的相關章節:
   - 第 3 節: 層級計算 (getCategoryLevel)
   - 第 4 節: 子孫搜尋 (getCategoryDescendants)
   - 第 5 節: 關係檢查 (isDescendant)
   - 第 6 節: 樹緩存 (buildCategoryTree)

2. 查看源碼 `/src/shopline-category-manager.user.js`:
   - 行 1046-1071: getCategoryLevel 實現
   - 行 1079-1089: getCategoryDescendants 實現
   - 行 1098-1101: isDescendant 實現

### 我想運行測試

**時間**: 5 分鐘

1. 查看 `/src/shopline-category-manager.test.js`:
   - 行 20-60: 測試資料結構
   - 行 140-280: 測試套件

2. 運行測試:
   ```bash
   node src/shopline-category-manager.test.js
   ```

3. 查看結果說明:
   - `/TEST_VERIFICATION.md` 的第 1-3 節

### 我想了解測試驗證

**時間**: 15 分鐘

讀 `/TEST_VERIFICATION.md`:
- 測試資料結構（包含圖表）
- TEST SUITE 1-3 的詳細驗證
- 邏輯驗證總結
- 核心功能驗證

### 我想了解完整的實現計劃

**時間**: 30 分鐘

讀 `/IMPLEMENTATION_PLAN.md`:
- Step 7 的 5 個階段
- 詳細的測試場景（5 個）
- 測試工具和方式
- 備案方案設計
- 成功標準和檢查清單

### 我想安裝和使用 UserScript

**時間**: 10 分鐘

1. 讀 `/QUICK_REFERENCE.md` 的「進度狀態」
2. 複製 `/src/shopline-category-manager.user.js`
3. 在 Tampermonkey 中安裝
4. 讀 `/PROJECT_SUMMARY.md` 的「快速開始」

### 我想修改或擴展功能

**時間**: 30 分鐘

1. 讀 `/src/README.md` 的「開發指南」（最後部分）
2. 查看 `/src/shopline-category-manager.user.js` 的:
   - CategoryManager 類 (行 116-1032)
   - 核心函數 (行 1046-1101)
3. 根據需要修改
4. 在 `/src/shopline-category-manager.test.js` 中添加測試
5. 運行 `node src/shopline-category-manager.test.js` 驗證

## 文件詳細說明

### `/src/shopline-category-manager.user.js` (1,114 行)

**用途**: 主要 UserScript 實現

**結構**:
```
行 1-10:     UserScript metadata
行 12-21:    IIFE 和 'use strict'
行 27-39:    常數定義 (CONFIG, MESSAGE)
行 45-75:    getAngularScope 函數
行 77-110:   init 初始化函數
行 116-1032: CategoryManager 類
  ├─ 行 117-122:   constructor
  ├─ 行 124-127:   initialize
  ├─ 行 132-156:   injectUI (UI 注入)
  ├─ 行 161-199:   attachButtonsToCategories
  ├─ 行 204-215:   getCategoryFromElement
  ├─ 行 220-283:   showMoveDropdown (下拉選單)
  ├─ 行 288-353:   getValidMoveTargets (目標驗證)
  ├─ 行 358-392:   moveCategory (移動執行)
  ├─ 行 397-444:   moveCategoryUsingScope (主方案)
  ├─ 行 449-499:   moveCategoryUsingDragEvent (備案)
  ├─ 行 504-528:   findCategoryParent
  ├─ 行 533-542:   findCategoryElement
  ├─ 行 547-567:   showSuccessMessage
  ├─ 行 572-592:   showErrorMessage
  ├─ 行 596-1031:  getLevel, getAllDescendants, buildCategoryTree
  └─ 行 1046-1101: getCategoryLevel, getCategoryDescendants, isDescendant
行 1107-1113: 啟動邏輯
```

**關鍵部分**:
- **核心函數** (行 1046-1101): 層級計算、子孫搜尋、關係檢查
- **CategoryManager** (行 116-1032): 主類，包含所有邏輯

### `/src/shopline-category-manager.test.js` (290 行)

**用途**: 單元測試

**結構**:
```
行 20-60:    createTestCategories 函數
行 72-130:   工具函數複製 (getCategoryLevel 等)
行 140-280:  runTests 主測試函數
  ├─ TEST SUITE 1: getCategoryLevel
  ├─ TEST SUITE 2: getCategoryDescendants
  └─ TEST SUITE 3: isDescendant
```

**如何運行**:
```bash
node src/shopline-category-manager.test.js
```

### `/src/README.md` (400+ 行)

**用途**: 詳細的 API 文檔和使用指南

**章節**:
1. 文件結構
2. 核心功能概覽
3-6. 詳細函數說明 (getLevel, descendants, tree cache)
7. CategoryManager 類說明
8. 使用範例
9. 測試指南
10. 錯誤排查
11. 開發指南

### `/TEST_VERIFICATION.md` (8 頁)

**用途**: 測試驗證報告

**內容**:
- 測試資料結構（圖表）
- TEST SUITE 1-3 詳細驗證
- 邏輯驗證總結
- 核心功能驗證
- 最終結果

### `/IMPLEMENTATION_PLAN.md` (15 頁)

**用途**: 實現計劃和測試指南

**內容**:
- Stage 1-5: 5 個實現階段
- 測試場景 1-5: 詳細的手動測試指南
- 備案方案設計
- 成功標準

### `/STEP_1_2_COMPLETION_REPORT.md` (6 頁)

**用途**: Step 1-2 完成情況報告

**內容**:
- 成功標準檢查清單
- 實現詳情
- 測試驗證
- 代碼質量指標
- 無誤確認
- 下一步說明

### `/PROJECT_SUMMARY.md` (8 頁)

**用途**: 項目概括

**內容**:
- 項目概述
- Step 1-2 完成情況
- 項目結構
- 測試覆蓋率
- 代碼質量指標
- 文檔完整性
- 技術棧
- 設計決策
- 路線圖
- 快速開始

### `/QUICK_REFERENCE.md` (3 頁)

**用途**: 快速參考卡片

**內容**:
- 項目結構（簡版）
- 關鍵函數速查
- 測試運行命令
- 瀏覽器驗證
- 常見問題
- 進度狀態

## 按角色找文件

### 項目經理

**應該讀**:
1. `/PROJECT_SUMMARY.md` - 整體進度
2. `/STEP_1_2_COMPLETION_REPORT.md` - 完成情況
3. `/IMPLEMENTATION_PLAN.md` - 下一步計劃

**時間**: 30 分鐘

### 開發人員（新加入）

**應該讀**:
1. `/QUICK_REFERENCE.md` - 快速了解
2. `/PROJECT_SUMMARY.md` - 全面認識
3. `/src/README.md` - API 詳細說明
4. `/src/shopline-category-manager.user.js` - 源代碼

**時間**: 1 小時

### QA/測試人員

**應該讀**:
1. `/IMPLEMENTATION_PLAN.md` - 測試場景
2. `/TEST_VERIFICATION.md` - 驗證方法
3. `/src/shopline-category-manager.test.js` - 單元測試

**時間**: 1 小時

### 代碼審核者

**應該讀**:
1. `/STEP_1_2_COMPLETION_REPORT.md` - 總體情況
2. `/src/shopline-category-manager.user.js` - 完整源代碼
3. `/src/README.md` - 代碼說明

**時間**: 2 小時

## 常見查詢

| 我想知道... | 看這個文件 | 行號或章節 |
|-----------|----------|---------|
| 層級怎麼計算 | /src/README.md | 第 3 節 |
| 子孫怎麼搜尋 | /src/README.md | 第 4 節 |
| 測試怎麼跑 | /src/README.md 或 /TEST_VERIFICATION.md | 「測試」章節 |
| 下一步是什麼 | /PROJECT_SUMMARY.md | 「下一步路線圖」 |
| 代碼質量如何 | /STEP_1_2_COMPLETION_REPORT.md | 「代碼質量」 |
| 完成進度 | /QUICK_REFERENCE.md | 「進度狀態」 |
| 如何安裝 | /PROJECT_SUMMARY.md | 「快速開始」 |
| 核心函數位置 | /src/shopline-category-manager.user.js | 行 1046-1101 |
| 測試資料 | /src/shopline-category-manager.test.js | 行 20-60 |

## 更新和維護

### 何時更新文檔

1. **修改源代碼後**:
   - 更新 `/src/README.md` 的相應章節
   - 更新 `/src/shopline-category-manager.test.js` 的測試
   - 更新 `/STEP_1_2_COMPLETION_REPORT.md`

2. **完成新階段後**:
   - 更新 `/IMPLEMENTATION_PLAN.md`
   - 更新 `/PROJECT_SUMMARY.md`
   - 更新 `/QUICK_REFERENCE.md`

3. **發現新問題後**:
   - 添加到 `/src/README.md` 的「錯誤排查」
   - 添加到 `/TEST_VERIFICATION.md`

## 文檔版本控制

所有文檔都應該在 git 中追蹤：

```bash
git add *.md src/*.md
git commit -m "docs: update documentation"
```

建議在每個主要的源代碼提交時同時更新相關文檔。

---

**最後更新**: 2026-01-07
**文件數**: 6 個主要文檔 + 3 個源代碼文件
**總內容**: 3000+ 行文檔 + 1400+ 行代碼
