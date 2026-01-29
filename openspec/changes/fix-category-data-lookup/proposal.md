# 提案：修復分類資料查詢 - 使用 DOM 索引而非名稱搜尋

**日期**: 2026-01-29
**優先級**: P1 (Critical Bug)
**狀態**: Proposed
**涉及組件**: content.js, injected.js

---

## 問題敘述

Chrome Extension 在注入分類移動按鈕時遇到關鍵問題：

### 現象
- ✅ DOM 樹容器正確渲染，找到 134+ 個分類節點 (`li[ui-tree-node]`)
- ✅ AngularJS 初始化完成，CategoryManager 建立成功
- ❌ **無法查詢到分類資料** → `findCategoryByName()` 返回 null
- ❌ **按鈕注入失敗** → 無法為節點綁定分類物件

### 根本原因

| 問題 | 原因 |
|------|------|
| 名稱搜尋失敗 | `scope.categories` 陣列中的分類名稱格式與 DOM 節點名稱不一致 |
| 資料結構不匹配 | DOM 顯示 `薑黃滴雞精-irene`，但資料庫可能是 `薑黃滴雞精` |
| 時序問題 | scope 資料可能延遲於 DOM 渲染 |
| 架構缺陷 | 依賴全局名稱搜尋是脆弱的設計 |

### 日誌證據
```
[content.js] 找到 134 個分類節點 ✓
[content.js] 無法從 scope 取得分類: getAngular is not defined
[content.js] [FIX] Scope failed, using DOM name fallback
[content.js] [搜尋by name] 未找到 ← **關鍵失敗點**
[content.js] 無法從第 0 個節點取得分類物件 (DOM名稱: 暖春送禮補元氣)
```

---

## 提議方案

### 策略：使用 DOM 索引和 AngularJS scope 繫結（而非名稱搜尋）

```
原方案（失敗）:
  DOM 節點 → 提取名稱 → findCategoryByName() → 搜尋資料庫 → null ❌

新方案（修復）:
  DOM 節點 → 取得 node.scope() → scope.item → 直接取得分類物件 ✓
```

### 核心改進

1. **直接從 AngularJS scope 綁定分類**
   - 利用 `ng-repeat` 的 `$index` 和 `item` 變數
   - 每個 DOM 節點的 scope 已包含其對應的分類物件

2. **避免名稱搜尋的多層失敗**
   - 不依賴名稱格式一致性
   - 不受資料庫結構變更影響

3. **提高可靠性和性能**
   - O(1) 直接取得，而非 O(n) 搜尋
   - 零延遲，無時序競爭

---

## 影響分析

### 變更範圍
- **修改**: `src/content/content.js` (attachButtonsToCategories, getCategoryFromElement)
- **修改**: `src/content/injected.js` (可選：簡化 scope 依賴)
- **測試**: 更新單元測試

### 向後相容性
✅ **完全相容** - 只改變內部實作方式，API 不變

### 風險評估
- 風險等級：**低**
- 測試覆蓋：現有自動化測試應涵蓋 (Phase 1.8-1.9)
- 回滾方案：恢復原始版本的 attachButtonsToCategories()

---

## 成功標準

- [ ] 所有分類節點都能成功綁定分類物件（無 null 返回）
- [ ] DOM 注入的按鈕數量 = 分類節點數量（134+）
- [ ] 日誌不再出現「無法從 scope 取得分類」
- [ ] 日誌不再出現「搜尋by name 未找到」
- [ ] 所有自動化測試通過
- [ ] 在實際 Shopline 頁面上驗證按鈕出現

---

## 時程估計

- **設計**: ✅ 完成
- **實作**: ~1 小時
- **測試**: ~0.5 小時
- **驗證**: ~0.5 小時
- **總計**: ~2 小時

---

## 相關文件

- [Design Document](./design.md)
- [Specifications](./specs/category-lookup-refactor.md)
- [Implementation Tasks](./tasks.md)
- [Git Log](commit hashes will be linked after implementation)

---

## 簽核

- **提案者**: Claude Code
- **推薦者**: QA Team (Phase 1.8-1.9 驗證)
- **狀態**: ✅ Ready for Design Review
