# 分類移動功能 - 實作筆記 (Step 5-6)

## 實作概要

本實作完成了 Shopline 分類管理系統的核心邏輯：**層級驗證** 和 **移動邏輯**。

### 目標檔案
- `/src/shopline-category-manager.user.js` - 主要實作檔案

---

## Step 5: 核心移動邏輯

### 函數簽名

```javascript
async function moveCategory(scope, categoryId, targetParentId)
```

### 實作步驟

1. **驗證輸入**
   - 檢查 `scope` 和 `scope.categories` 存在
   - 查找要移動的分類是否存在

2. **決定目標**
   - 如果 `targetParentId` 為 `null` 或 `'root'`，目標是根目錄
   - 否則從 categories 樹中查找目標分類

3. **執行驗證** (`validateMove`)
   - 調用驗證函數檢查移動是否合法

4. **移除原位置**
   - 如果在根層級：從 `categories` 陣列中移除
   - 如果在子層級：從父分類的 `children` 陣列中移除

5. **添加新位置**
   - 如果目標是根目錄：直接 `push` 到 `categories`
   - 如果目標是分類：`push` 到目標的 `children` 陣列

6. **觸發 AngularJS 更新**
   ```javascript
   if (typeof scope.$apply === 'function') {
     scope.$apply();
   }
   ```

7. **觸發儲存機制** (`triggerSave`)
   - 嘗試找到並點擊保存按鈕
   - 或呼叫 scope 的 save 函數

### 關鍵實作細節

#### 樹結構操作函數

**findCategoryById(categories, id)**
- 遞迴在整個樹中搜尋特定 ID 的分類
- 回傳找到的分類物件或 `null`

```javascript
function findCategoryById(categories, id) {
  for (let cat of categories) {
    if (cat._id === id) return cat;
    let found = findCategoryById(cat.children, id);
    if (found) return found;
  }
  return null;
}
```

**findParent(categories, categoryId, parent = null)**
- 遞迴找到某分類的直接父分類
- 若在根層級，回傳 `null`
- 若未找到，回傳 `undefined`

```javascript
function findParent(categories, categoryId, parent = null) {
  for (let cat of categories) {
    if (cat._id === categoryId) return parent;
    let found = findParent(cat.children, categoryId, cat);
    if (found !== undefined) return found;
  }
  return undefined;
}
```

**getAllDescendants(category)**
- 取得分類的所有後代（包括直接子分類和遠系子孫）
- 用於驗證不能把分類移到其子孫下

```javascript
function getAllDescendants(category) {
  if (!category || !category.children) return [];
  let descendants = [...category.children];
  for (let child of category.children) {
    descendants = descendants.concat(getAllDescendants(child));
  }
  return descendants;
}
```

---

## Step 6: 層級驗證 + 目標過濾

### 驗證函數

```javascript
function validateMove(categories, movingCategory, targetParent)
```

**檢查項目：**

1. **自身檢查**
   ```javascript
   if (movingCategory._id === targetParent?._id) {
     return { valid: false, reason: MESSAGE.ERROR_SELF_TARGET };
   }
   ```

2. **層級限制檢查**
   ```javascript
   const targetLevel = targetParent
     ? getLevel(categories, targetParent._id)
     : CONFIG.ROOT_LEVEL;  // 0

   const newLevel = targetLevel + 1;
   if (newLevel > CONFIG.MAX_LEVELS) {  // 3
     return { valid: false, reason: MESSAGE.ERROR_LEVEL_EXCEEDED };
   }
   ```

3. **子孫檢查**
   ```javascript
   const descendants = getAllDescendants(movingCategory);
   const descendantIds = descendants.map(d => d._id);
   if (descendantIds.includes(targetParent?._id)) {
     return { valid: false, reason: MESSAGE.ERROR_DESCENDANT_TARGET };
   }
   ```

**回傳值：**
```javascript
{ valid: true }  // 成功
{ valid: false, reason: '錯誤訊息' }  // 失敗
```

### 目標列表建立函數

```javascript
function buildValidTargetList(categories, movingCategory)
```

**演算法：**

1. 初始化目標陣列，添加「根目錄」選項
2. 遞迴遍歷所有分類，過濾掉：
   - 自己（`cat._id === movingCategory._id`）
   - 子孫（`descendantIds.includes(cat._id)`）
   - Level 3 分類（`depth >= CONFIG.MAX_LEVELS`）
3. 對每個有效分類，添加到目標列表並遞迴處理其子分類

**範例：**

假設有以下結構：
```
根目錄
├ Level1-A (id: cat-1)
│  ├ Level2-A1 (id: sub-1)
│  └ Level2-A2 (id: sub-2)
│     └ Level3-A2a (id: l3-1)  <- 不能作為目標
├ Level1-B (id: cat-2)
```

若移動 `Level1-A`，有效目標應該是：
```
[
  { id: 'root', name: '📂 根目錄', level: 0 },
  { id: 'cat-2', name: '├ Level1-B', level: 1 }
]
```

**不包含：**
- `Level1-A` 本身（不能選擇自己）
- `Level2-A1` 和 `Level2-A2`（是 Level1-A 的子孫）
- `Level3-A2a`（是 Level 3，不能再有子分類）

---

## 層級定義

```
Level 0 (根目錄)
  │
  Level 1 (根目錄的直接子分類)
    │
    Level 2 (Level 1 的子分類)
      │
      Level 3 (Level 2 的子分類，最深層)
```

### getLevel() 函數

計算分類在樹中的層級。

```javascript
function getLevel(categories, categoryId, currentLevel = 1)
```

- 在 `categories`（Level 1）中找到 → 回傳 1
- 在某個 Level 1 分類的 `children` 中找到 → 回傳 2
- 以此類推，最大回傳 3

---

## 成功標準檢查清單

- [x] `moveCategory()` 能正確移動分類
  - 從原位置移除
  - 加入新位置
  - 觸發 $apply() 和儲存

- [x] `validateMove()` 正確檢查層級和邏輯
  - 檢查自己
  - 檢查層級限制
  - 檢查子孫關係

- [x] `buildValidTargetList()` 排除 Level 3 和子孫
  - 遞迴遍歷所有分類
  - 過濾掉無效目標
  - 支援樹狀顯示

- [x] 輔助函數實作完整
  - `findCategoryById()` - 樹中查找
  - `findParent()` - 找父分類
  - `getLevel()` - 計算層級
  - `getAllDescendants()` - 取得子孫

- [ ] UI 整合（Step 4 之後驗證）
  - 按鈕注入
  - 下拉選單展示
  - 點擊事件綁定

- [ ] Shopline 整合驗證（手動測試）
  - $scope.$apply() 後 UI 更新
  - 後端儲存成功
  - 頁面重整後變更維持

---

## 錯誤處理

### 驗證失敗場景

| 場景 | 檢查函數 | 傳回訊息 |
|------|---------|---------|
| 選擇自己 | validateMove | ERROR_SELF_TARGET |
| 超過層級限制 | validateMove | ERROR_LEVEL_EXCEEDED |
| 選擇子孫 | validateMove | ERROR_DESCENDANT_TARGET |
| 目標不存在 | moveCategory | ERROR_INVALID_TARGET |
| 找不到分類 | moveCategory | 未找到要移動的分類 |
| scope 無法存取 | moveCategory | 無法存取分類數據 |

### 移動失敗恢復

```javascript
async function moveCategory(scope, categoryId, targetParentId) {
  try {
    // ... 檢查和驗證 ...

    // 若驗證失敗，在修改陣列前就回傳錯誤
    // 確保原始資料不被破壞

    // 若執行中出錯，catch 區塊捕獲並回傳失敗
  } catch (error) {
    console.error('[CategoryManager] 移動失敗:', error);
    return { success: false, message: MESSAGE.MOVE_FAIL };
  }
}
```

---

## 測試建議

### 單元測試場景

1. **層級驗證**
   ```javascript
   // 測試 validateMove
   const categories = [ /* 模擬資料 */ ];
   const result = validateMove(categories, movingCat, targetCat);
   expect(result.valid).toBe(true);
   ```

2. **樹搜尋**
   ```javascript
   // 測試 findCategoryById
   const cat = findCategoryById(categories, 'id-123');
   expect(cat._id).toBe('id-123');
   ```

3. **層級計算**
   ```javascript
   // 測試 getLevel
   expect(getLevel(categories, rootChild._id)).toBe(1);
   expect(getLevel(categories, l2Child._id)).toBe(2);
   ```

### 手動測試（Shopline 頁面）

1. 移動根層級分類到另一個根層級分類下（Level 1 → Level 2）
2. 移動 Level 2 分類到 Level 1 分類下（Level 2 → Level 3）
3. 嘗試移動到自己（應被拒絕）
4. 嘗試移動到子孫（應被拒絕）
5. 嘗試移動 Level 3 分類到任何地方（應被拒絕）
6. 重整頁面，驗證移動被保存

---

## 下一步

### Step 4（已部分實現）
- UI 按鈕注入
- 下拉選單顯示
- 點擊事件綁定

### Step 7（未來）
- 儲存機制優化
- 錯誤提示UI
- 成功反饋

---

## 相關檔案

- **主實作：** `/src/shopline-category-manager.user.js`
- **規格文檔：** `/openspec/changes/add-category-quick-move/specs/category-manager/spec.md`
- **任務清單：** `/openspec/changes/add-category-quick-move/tasks.md`
- **參考HTML：** `/ref/shopline-category.html`
