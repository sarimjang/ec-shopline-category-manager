# 核心 API 參考 - Step 5-6 實作

## 目錄

1. [樹結構操作函數](#樹結構操作函數)
2. [驗證函數](#驗證函數)
3. [移動邏輯](#移動邏輯)
4. [數據結構](#數據結構)
5. [範例使用](#範例使用)

---

## 樹結構操作函數

### findCategoryById(categories, id)

在分類樹中查找特定 ID 的分類。

**參數：**
- `categories` {Array} - 分類陣列（可能包含子分類）
- `id` {string} - 要查找的分類 ObjectId

**回傳：**
- {Object|null} - 找到的分類物件，或 `null` 如果未找到

**時間複雜度：** O(n)，n 為總分類數量

**範例：**
```javascript
const movingCategory = findCategoryById(scope.categories, 'cat-1');
if (!movingCategory) {
  console.error('分類不存在');
}
```

---

### findParent(categories, categoryId, parent = null)

找到某分類的直接父分類。

**參數：**
- `categories` {Array} - 分類陣列
- `categoryId` {string} - 目標分類 ID
- `parent` {Object|null} - 父分類物件（遞迴參數，使用者無需提供）

**回傳：**
- {Object|null} - 父分類物件
- {null} - 如果分類在根層級
- {undefined} - 如果分類未找到

**重要：** 區分 `null`（根層級）和 `undefined`（未找到）

**範例：**
```javascript
const originalParent = findParent(scope.categories, categoryId);

if (originalParent === null) {
  // 分類在根層級
  const index = scope.categories.indexOf(movingCategory);
  scope.categories.splice(index, 1);
} else if (originalParent !== undefined) {
  // 分類在子層級
  const index = originalParent.children.indexOf(movingCategory);
  originalParent.children.splice(index, 1);
}
```

---

### getLevel(categories, categoryId, currentLevel = 1)

計算分類在樹中的層級深度。

**參數：**
- `categories` {Array} - 分類陣列
- `categoryId` {string} - 目標分類 ID
- `currentLevel` {number} - 當前層級（遞迴參數）

**回傳：**
- {number} - 層級（1-3）
- {null} - 如果分類未找到

**層級定義：**
```
Level 1: 根目錄的直接子分類
Level 2: Level 1 的子分類
Level 3: Level 2 的子分類（最深層）
```

**範例：**
```javascript
const targetLevel = getLevel(scope.categories, targetCategory._id);
const newLevel = targetLevel + 1;

if (newLevel > CONFIG.MAX_LEVELS) {
  return { valid: false, reason: '超過最大層級限制' };
}
```

---

### getAllDescendants(category)

取得分類的所有後代（包括直接子分類和遠系子孫）。

**參數：**
- `category` {Object} - 分類物件

**回傳：**
- {Array} - 所有後代分類的陣列
- {Array} - 空陣列如果無子分類

**重要：** 此函數不包含父分類本身

**時間複雜度：** O(m)，m 為後代數量

**範例：**
```javascript
const descendants = getAllDescendants(movingCategory);
const descendantIds = descendants.map(d => d._id);

if (descendantIds.includes(targetParent._id)) {
  // 不能把分類移到其子孫下
  return false;
}
```

---

## 驗證函數

### validateMove(categories, movingCategory, targetParent)

驗證分類移動操作是否合法。

**參數：**
- `categories` {Array} - 完整的分類陣列
- `movingCategory` {Object} - 正在移動的分類
- `targetParent` {Object|null} - 目標父分類，`null` 表示根目錄

**回傳：**
```javascript
// 成功
{ valid: true }

// 失敗
{
  valid: false,
  reason: '錯誤訊息'
}
```

**檢查項目：**

1. **自身檢查** - 不能選擇自己作為目標
   - 錯誤訊息：`ERROR_SELF_TARGET`

2. **層級限制** - 新層級必須 <= MAX_LEVELS (3)
   - 計算方式：`targetLevel + 1 <= MAX_LEVELS`
   - 錯誤訊息：`ERROR_LEVEL_EXCEEDED`

3. **子孫檢查** - 不能把分類移到其子孫下（防止循環）
   - 錯誤訊息：`ERROR_DESCENDANT_TARGET`

**範例：**
```javascript
const validation = validateMove(
  scope.categories,
  movingCategory,
  targetParent
);

if (!validation.valid) {
  alert(validation.reason);
  return;
}
```

---

### buildValidTargetList(categories, movingCategory)

建立移動時的有效目標列表（用於下拉選單）。

**參數：**
- `categories` {Array} - 完整的分類陣列
- `movingCategory` {Object} - 正在移動的分類

**回傳：**
```javascript
[
  {
    id: 'root',           // 'root' 表示根目錄
    name: '📂 根目錄',
    level: 0,             // 根目錄層級是 0
    isRoot: true
  },
  {
    id: 'cat-1',          // 分類 ID
    name: '├ 分類名稱',   // 支援縮排顯示
    level: 1,
    isRoot: false
  },
  {
    id: 'sub-1',
    name: '  ├ 子分類',   // 更深的縮排
    level: 2,
    isRoot: false
  }
  // ... 其他有效目標
]
```

**過濾規則：**

排除以下分類：
- 分類本身（`cat._id === movingCategory._id`）
- 分類的所有子孫（防止循環）
- Level 3 分類（不能再有子分類）

**時間複雜度：** O(n)，n 為總分類數量

**範例：**
```javascript
const targets = buildValidTargetList(scope.categories, movingCategory);

// 用於填充下拉選單
targets.forEach(target => {
  const option = document.createElement('option');
  option.value = target.id;
  option.textContent = target.name;
  dropdown.appendChild(option);
});
```

---

## 移動邏輯

### moveCategory(scope, categoryId, targetParentId)

執行分類移動操作。

**參數：**
- `scope` {Object} - AngularJS $scope 物件
- `categoryId` {string} - 要移動的分類 ID
- `targetParentId` {string|null} - 目標父分類 ID，或 `'root'` / `null` 表示根目錄

**回傳：**
```javascript
// 成功
Promise<{ success: true, message: '分類已移動' }>

// 失敗
Promise<{ success: false, message: '錯誤訊息' }>
```

**執行步驟：**

1. **驗證輸入** - 檢查 scope 和分類存在
2. **查找目標** - 從樹中查找分類和目標
3. **驗證移動** - 調用 `validateMove()` 檢查合法性
4. **移除原位置** - 從父分類的 children 或根陣列中移除
5. **添加新位置** - 加到目標的 children 或根陣列
6. **觸發更新** - 調用 `scope.$apply()`
7. **儲存** - 調用 `triggerSave(scope)`

**範例：**
```javascript
const result = await moveCategory(
  scope,
  'cat-1',     // categoryId
  'cat-2'      // targetParentId （或 'root' 或 null）
);

if (result.success) {
  alert('分類已移動');
  // UI 會自動更新（因為 AngularJS binding）
} else {
  alert(`移動失敗：${result.message}`);
}
```

**可能的錯誤：**

| 錯誤 | 原因 |
|------|------|
| 無法存取分類數據 | scope 或 categories 不存在 |
| 未找到要移動的分類 | 分類 ID 不存在 |
| 無效的目標位置 | 目標 ID 不存在 |
| （validateMove 的錯誤） | 層級或邏輯驗證失敗 |

---

### triggerSave(scope)

觸發 Shopline 的儲存機制。

**參數：**
- `scope` {Object} - AngularJS $scope 物件

**回傳：**
- {Promise<void>}

**嘗試方式（優先級）：**

1. 尋找並點擊保存按鈕
   ```javascript
   const saveButton = document.querySelector('[ng-click*="save"]');
   if (saveButton) saveButton.click();
   ```

2. 調用 scope 的 save 函數
   ```javascript
   if (typeof scope.save === 'function') scope.save();
   ```

3. 依賴 Shopline 的自動儲存
   - 假設 `$apply()` 已觸發 watch

---

## 數據結構

### 分類物件

```javascript
{
  _id: string,              // MongoDB ObjectId (24 字元 hex)
  name: string,             // 分類名稱
  key: string|null,         // 特殊分類鑰匙（如 'featured'）
  children: Array<Category> // 子分類陣列
}
```

**範例：**
```javascript
{
  _id: "60b9bde8e1320800389411ed",
  name: "節目藝人愛用分享",
  key: null,
  children: [
    {
      _id: "60b9bde8e1320800389411ee",
      name: "台灣真善美推薦",
      key: null,
      children: [
        {
          _id: "60b9bde8e1320800389411ef",
          name: "真善美好物",
          key: null,
          children: []
        }
      ]
    }
  ]
}
```

### scope.categories

AngularJS 在 Shopline 分類管理頁面上綁定的分類陣列：

```javascript
scope.categories = [
  { _id: 'cat-1', name: '...', children: [...] },
  { _id: 'cat-2', name: '...', children: [...] },
  // ...
]
```

---

## 範例使用

### 完整的移動流程

```javascript
// 1. 取得 AngularJS scope
const treeContainer = document.querySelector('[ui-tree]');
const scope = angular.element(treeContainer).scope();

// 2. 獲取要移動的分類
const movingCategory = findCategoryById(scope.categories, 'cat-1');
if (!movingCategory) {
  console.error('分類不存在');
  return;
}

// 3. 生成有效目標列表
const targets = buildValidTargetList(scope.categories, movingCategory);
console.log('可選目標：', targets);

// 4. 執行移動（假設使用者選擇了 'cat-2'）
const result = await moveCategory(scope, 'cat-1', 'cat-2');

if (result.success) {
  console.log('移動成功');
  // scope.categories 已經更新
  // UI 因 AngularJS binding 自動刷新
} else {
  console.error('移動失敗：', result.message);
}
```

### 層級驗證範例

```javascript
// 計算層級
const level1 = getLevel(scope.categories, 'cat-1');      // => 1
const level2 = getLevel(scope.categories, 'sub-1');      // => 2
const level3 = getLevel(scope.categories, 'l3-1');       // => 3

// 驗證移動 'l3-1' 到 'sub-1' 下
const cat_l3_1 = findCategoryById(scope.categories, 'l3-1');
const cat_sub_1 = findCategoryById(scope.categories, 'sub-1');

const validation = validateMove(scope.categories, cat_l3_1, cat_sub_1);
// => { valid: false, reason: '超過最大層級限制' }
```

### 子孫檢查範例

```javascript
const cat_1 = findCategoryById(scope.categories, 'cat-1');
const descendants = getAllDescendants(cat_1);
// descendants 包含 'sub-1', 'l3-1' 等所有子孫

// 驗證不能把 'cat-1' 移到 'sub-1' 下
const validation = validateMove(scope.categories, cat_1, cat_sub_1);
// => { valid: false, reason: '不能將分類移到其子分類下' }
```

---

## 錯誤處理最佳實踐

```javascript
async function safeMoveCategory(scope, categoryId, targetId) {
  try {
    // 第一層：驗證輸入
    if (!scope || !scope.categories) {
      throw new Error('無效的 scope');
    }

    const category = findCategoryById(scope.categories, categoryId);
    if (!category) {
      throw new Error(`分類 ${categoryId} 不存在`);
    }

    // 第二層：執行移動
    const result = await moveCategory(scope, categoryId, targetId);

    if (!result.success) {
      throw new Error(result.message);
    }

    // 第三層：驗證結果
    const movedCategory = findCategoryById(scope.categories, categoryId);
    const newParent = findParent(scope.categories, categoryId);

    console.log('移動成功：');
    console.log('  分類：', movedCategory.name);
    console.log('  新父分類：', newParent ? newParent.name : '根目錄');

    return true;
  } catch (error) {
    console.error('移動失敗：', error.message);
    return false;
  }
}
```

---

## 性能考慮

### 時間複雜度

| 函數 | 複雜度 | 備註 |
|------|--------|------|
| findCategoryById | O(n) | n = 總分類數 |
| findParent | O(n) | n = 總分類數 |
| getLevel | O(n) | n = 總分類數 |
| getAllDescendants | O(m) | m = 子孫數 |
| validateMove | O(n) | 主要成本在 getLevel |
| buildValidTargetList | O(n) | 遍歷整個樹 |
| moveCategory | O(n) | 包含 find/validate |

### 優化建議

對於大規模分類（1000+ 個），考慮：

1. **快取層級計算**
   ```javascript
   const levelCache = new Map();
   function getCachedLevel(categoryId) {
     if (!levelCache.has(categoryId)) {
       levelCache.set(categoryId, getLevel(categories, categoryId));
     }
     return levelCache.get(categoryId);
   }
   ```

2. **使用 ID-Object 映射**
   ```javascript
   const idToCategory = new Map();
   function buildIndex(categories) {
     categories.forEach(cat => {
       idToCategory.set(cat._id, cat);
       if (cat.children) buildIndex(cat.children);
     });
   }
   ```

---

## 相關資源

- **實作檔案：** `src/shopline-category-manager.user.js`
- **測試檔案：** `test-core-logic.js`
- **實作筆記：** `IMPLEMENTATION_NOTES.md`
- **規格文檔：** `openspec/changes/add-category-quick-move/specs/category-manager/spec.md`
