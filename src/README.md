# Shopline Category Manager - UserScript

快速移動 Shopline 分類到指定位置的 UserScript。

## 文件結構

```
src/
├── shopline-category-manager.user.js    # 主要 UserScript 文件
├── shopline-category-manager.test.js    # 單元測試
└── README.md                              # 本文件
```

## 核心功能

### 1. 頁面偵測和初始化

#### waitForElement(selector, timeout = 10000)
等待指定的 DOM 元素出現。

```javascript
const treeContainer = await waitForElement('.angular-ui-tree');
```

**參數**:
- `selector` (string): CSS 選擇器
- `timeout` (number): 超時時間，單位毫秒，預設 10000ms

**返回值**: Promise<Element>

**錯誤情況**: 超時時拋出 Error

---

### 2. AngularJS Scope 取得

#### getAngularScope(element)
從 DOM 元素取得 AngularJS scope。

```javascript
const scope = getAngularScope(treeContainer);
if (!scope) {
  console.error('無法取得 scope');
}
```

**參數**:
- `element` (Element): 要取得 scope 的 DOM 元素

**返回值**: Object | null

**錯誤處理**:
- 若 AngularJS 不可用，返回 null
- 若無法取得 scope，返回 null
- 錯誤訊息會輸出到 console

---

### 3. 層級計算

#### getCategoryLevel(categories, targetCategory, currentLevel = 1)
計算分類在整個樹中的層級。

```javascript
const level = getCategoryLevel(categories, myCategory);
// 返回值：1, 2, 3，或 -1（未找到）
```

**層級定義**:
- **Level 1**: 根陣列中的分類（直接在 `categories` 陣列中）
- **Level 2**: 第 1 層分類的子分類（在某個 Level 1 分類的 `children` 中）
- **Level 3**: 第 2 層分類的子分類（在某個 Level 2 分類的 `children` 中）
- **-1**: 未找到該分類

**參數**:
- `categories` (Array): 要搜尋的分類陣列
- `targetCategory` (Object): 要查找的分類物件（引用比較）
- `currentLevel` (number): 當前搜尋層級，預設 1（內部使用）

**返回值**: number (1 | 2 | 3 | -1)

**實現細節**:
- 使用深度優先搜尋 (DFS) 遞迴遍歷
- 使用引用相等比較 (`===`) 找出目標分類
- 層級隨著遞迴深度自動增加

---

### 4. 子孫搜尋

#### getCategoryDescendants(category)
取得分類的所有子孫（遞迴）。

```javascript
const allDescendants = getCategoryDescendants(myCategory);
// 返回值：[分類本身, 直接子, 孫, 曾孫, ...]
```

**用途**:
- 排除「自己和自己的子孫」作為移動目標
- 驗證圓形階層（避免將祖先移到子孫下）

**參數**:
- `category` (Object): 要取得子孫的分類物件

**返回值**: Array

**返回陣列內容**:
- 索引 0：分類本身
- 索引 1+：所有子孫（順序為遞迴順序）

**例子**:
```javascript
// 分類結構：
// 母分類 1
// ├─ 子分類 1-1
// │  └─ 孫分類 1-1-1
// └─ 子分類 1-2

const descendants = getCategoryDescendants(母分類1);
// 返回 4 個元素：[母分類1, 子分類1-1, 孫分類1-1-1, 子分類1-2]
```

**實現細節**:
- 使用遞迴方式取得所有層級的子孫
- 第一個元素始終是分類本身
- 順序保持樹遍歷順序

---

### 5. 子孫關係檢查

#### isDescendant(potentialAncestor, potentialDescendant)
檢查一個分類是否為另一個分類的子孫。

```javascript
const isChild = isDescendant(potentialAncestor, potentialDescendant);
// 返回值：true（是子孫）或 false（不是）
```

**用途**:
- 在選擇移動目標時排除無效選項
- 防止圓形階層

**參數**:
- `potentialAncestor` (Object): 潛在的祖先分類
- `potentialDescendant` (Object): 潛在的子孫分類

**返回值**: boolean

**邏輯**:
```javascript
// 實現邏輯
const descendants = getCategoryDescendants(potentialAncestor);
return descendants.includes(potentialDescendant);
```

**注意**:
- 分類被視為自己的子孫
- 即 `isDescendant(cat, cat)` 返回 `true`

---

### 6. 樹狀結構快取（CategoryManager.buildCategoryTree()）

#### buildCategoryTree()
建立分類樹狀結構的快取，用於快速查詢。

```javascript
const manager = new CategoryManager(scope);
const treeMap = manager.buildCategoryTree();

// 可訪問以下映射：
console.log(treeMap.levelMap);     // Map<categoryId, level>
console.log(treeMap.parentMap);    // Map<categoryId, parentId>
console.log(treeMap.childrenMap);  // Map<parentId, children[]>
```

**返回值**: Object，包含以下屬性：
- `children`: 根陣列的分類
- `childrenMap`: Map，鍵為分類 ID，值為其子分類陣列
- `levelMap`: Map，鍵為分類 ID，值為其層級（1-3）
- `parentMap`: Map，鍵為分類 ID，值為其父分類 ID

**快取機制**:
- 第一次呼叫時建立快取
- 後續呼叫返回已快取的結果
- 若分類結構改變，需手動重建

---

## CategoryManager 類

### 初始化

```javascript
const manager = new CategoryManager(scope);
manager.initialize();
```

**參數**:
- `scope` (Object): AngularJS scope 物件，需包含 `categories` 陣列

### 方法

#### getLevel(category)
計算分類層級的便捷方法。

```javascript
const level = manager.getLevel(myCategory);
```

#### getAllDescendants(category)
取得分類子孫的便捷方法。

```javascript
const descendants = manager.getAllDescendants(myCategory);
```

---

## 使用範例

### 基本初始化流程

```javascript
// 1. 等待頁面載入
const treeContainer = await waitForElement('.angular-ui-tree');

// 2. 取得 scope
const scope = getAngularScope(treeContainer);
if (!scope || !scope.categories) {
  console.error('無法初始化');
  return;
}

// 3. 建立管理器
const manager = new CategoryManager(scope);

// 4. 計算分類層級
const level = manager.getLevel(scope.categories[0]);
console.log('第一個分類的層級:', level);  // 輸出: 1

// 5. 取得子孫
const descendants = manager.getAllDescendants(scope.categories[0]);
console.log('子孫數量:', descendants.length);
```

### 檢查移動目標有效性

```javascript
function isValidMoveTarget(sourceCategory, targetCategory, allCategories) {
  const sourceLevel = getCategoryLevel(allCategories, sourceCategory);
  const targetLevel = getCategoryLevel(allCategories, targetCategory);

  // 規則 1: 不能移到自己
  if (sourceCategory === targetCategory) {
    return false;
  }

  // 規則 2: 不能移到自己的子孫
  if (isDescendant(sourceCategory, targetCategory)) {
    return false;
  }

  // 規則 3: 不能移到 Level 3 分類（最深層）
  if (targetLevel === 3) {
    return false;
  }

  return true;
}
```

### 建立有效目標列表

```javascript
function getValidMoveTargets(sourceCategory, allCategories) {
  const validTargets = [];

  // 根目錄始終有效
  validTargets.push({ id: 'root', name: '📂 根目錄', level: 0 });

  // 篩選所有有效的目標分類
  function collectValidTargets(categories, currentLevel) {
    categories.forEach((category) => {
      if (isValidMoveTarget(sourceCategory, category, allCategories)) {
        validTargets.push({
          ...category,
          level: currentLevel,
        });
      }

      if (category.children) {
        collectValidTargets(category.children, currentLevel + 1);
      }
    });
  }

  collectValidTargets(allCategories, 1);
  return validTargets;
}
```

---

## 測試

### 運行測試

```bash
node src/shopline-category-manager.test.js
```

### 測試涵蓋內容

- ✓ getCategoryLevel() - 層級計算（5 個測試）
- ✓ getCategoryDescendants() - 子孫搜尋（5 個測試）
- ✓ isDescendant() - 關係檢查（5 個測試）

### 瀏覽器測試

在 Shopline 分類管理頁面的開發者控制台執行：

```javascript
// 複製 shopline-category-manager.user.js 中的所有函數
// 然後執行：

const scope = angular.element(document.querySelector('.angular-ui-tree')).scope();
const level = getCategoryLevel(scope.categories, scope.categories[0]);
console.log('Level:', level);  // 應輸出 1
```

---

## 錯誤排查

### 無法取得 scope

**症狀**: `getAngularScope()` 返回 null

**可能原因**:
1. AngularJS 未載入
2. 頁面還未完全載入
3. .angular-ui-tree 元素尚未出現

**解決方案**:
```javascript
// 確保在頁面完全載入後執行
waitForElement('.angular-ui-tree').then(async (element) => {
  const scope = getAngularScope(element);
  // ...
});
```

### getCategoryLevel() 返回 -1

**症狀**: 無法計算層級

**可能原因**:
1. 傳入的 category 物件不在樹中
2. categories 陣列為空或未定義
3. 使用了不同的物件引用（副本而非原本）

**解決方案**:
```javascript
// 確保使用正確的物件引用
const categories = scope.categories;
const firstCategory = categories[0];  // 使用原始引用
const level = getCategoryLevel(categories, firstCategory);
console.log(level);  // 應返回 1
```

### 層級計算不正確

**症狀**: 返回的層級值不符預期

**可能原因**:
1. children 陣列未被正確識別
2. 遞迴層級計算邏輯錯誤

**驗證方式**:
```javascript
// 列印分類結構驗證
function printCategoryTree(categories, indent = 0) {
  categories.forEach((cat) => {
    console.log(' '.repeat(indent * 2) + cat.name);
    if (cat.children) {
      printCategoryTree(cat.children, indent + 1);
    }
  });
}
```

---

## 開發指南

### 新增功能

1. 新增函數或方法到對應的類
2. 在 `shopline-category-manager.test.js` 中添加測試
3. 運行測試確保無誤
4. 提交時同時更新此文件的相應部分

### 修改現有函數

1. 檢查是否有單元測試
2. 修改實現並確保測試通過
3. 如果修改了簽名或行為，更新文件中的相應章節

### 性能考慮

- `getCategoryLevel()` 和 `getCategoryDescendants()` 使用遞迴
- 對於大規模分類樹（1000+ 項），考慮使用 `buildCategoryTree()` 快取
- 避免在循環中重複呼叫這些函數

---

## 相關檔案

- `/openspec/changes/add-category-quick-move/proposal.md` - 功能提案
- `/openspec/changes/add-category-quick-move/specs/category-manager/spec.md` - 詳細規格
- `/TEST_VERIFICATION.md` - 測試驗證報告

---

## 下一步

此檔案實現了 Step 1-2 的所有需求：
- [x] UserScript 框架完成
- [x] AngularJS Scope 解析實現
- [x] getLevel() 函數實現並測試
- [x] getAllDescendants() 函數實現並測試
- [x] buildCategoryTree() 快取實現

下一步將實現：
- [ ] Step 3: UI 層 - 在每個分類行添加「移動到」按鈕
- [ ] Step 4: 選擇器 - 顯示有效的移動目標
- [ ] Step 5: 執行邏輯 - 執行分類移動
