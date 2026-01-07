# Step 5-6 快速參考指南

## 核心函數一覽

### 樹搜尋 (Tree Search)

```javascript
// 尋找分類
const cat = findCategoryById(scope.categories, 'cat-1');

// 尋找父分類
const parent = findParent(scope.categories, 'sub-1');

// 計算層級
const level = getLevel(scope.categories, 'cat-1'); // => 1, 2, or 3

// 取得所有子孫
const descendants = getAllDescendants(category);
```

### 驗證 (Validation)

```javascript
// 驗證移動合法性
const validation = validateMove(categories, source, target);
if (!validation.valid) {
  console.error(validation.reason);
}

// 生成有效目標清單
const targets = buildValidTargetList(categories, source);
targets.forEach(t => {
  console.log(`${t.level}: ${t.name}`);
});
```

### 執行 (Execution)

```javascript
// 執行移動
const result = await moveCategory(scope, 'cat-1', 'cat-2');
if (result.success) {
  console.log('成功');
} else {
  console.error(result.message);
}

// 觸發儲存
await triggerSave(scope);
```

---

## 常見用法

### 1. 移動分類到根目錄

```javascript
const result = await moveCategory(scope, categoryId, null); // 或 'root'
```

### 2. 移動分類到特定父分類下

```javascript
const result = await moveCategory(scope, categoryId, parentId);
```

### 3. 檢查是否可以移動

```javascript
const source = findCategoryById(scope.categories, categoryId);
const target = findCategoryById(scope.categories, targetId);

if (validateMove(scope.categories, source, target).valid) {
  // 可以移動
  await moveCategory(scope, categoryId, targetId);
}
```

### 4. 列出所有可選目標

```javascript
const targets = buildValidTargetList(scope.categories, source);
targets.forEach(target => {
  if (target.isRoot) {
    console.log(`根目錄`);
  } else {
    console.log(`${target.name} (Level ${target.level})`);
  }
});
```

---

## 層級參考

```
層級結構：
  Level 1 (根層級) ← 可作為目標
    ├─ Level 2     ← 可作為目標
    │   └─ Level 3 ← 不能作為目標
    └─ Level 2     ← 可作為目標
        └─ Level 3 ← 不能作為目標
```

---

## 錯誤訊息速查

| 訊息 | 原因 | 解決方案 |
|------|------|---------|
| `ERROR_SELF_TARGET` | 選擇了自己 | 選擇其他分類 |
| `ERROR_LEVEL_EXCEEDED` | 超過 3 層 | 只能移到 Level 1-2 |
| `ERROR_DESCENDANT_TARGET` | 選擇了子孫 | 選擇同層或上層 |

---

## 文件位置

```
src/
└── shopline-category-manager.user.js    ← 主實作（1114 行）

文檔文件：
├── CORE_API_REFERENCE.md               ← 完整 API 文檔
├── IMPLEMENTATION_NOTES.md             ← 實作細節
├── STEP_5_6_COMPLETION_SUMMARY.md      ← 完成報告
├── QUICK_REFERENCE.md                  ← 本文件
└── test-core-logic.js                  ← 單元測試
```

---

## 快速測試

```bash
node test-core-logic.js
```

---

## 進度狀態

- [x] Step 5: moveCategory() - 移動邏輯
- [x] Step 6: validateMove() + buildValidTargetList() - 驗證和過濾
- [x] 輔助函數 - 樹搜尋操作
- [ ] Step 4: UI 整合（下一步）
- [ ] Step 7: 儲存優化（下一步）

---

**最後更新：** 2026-01-07
