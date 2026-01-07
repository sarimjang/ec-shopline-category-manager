# Step 3-4 架構設計文檔

## 系統概覽

```
┌─────────────────────────────────────────────────────────┐
│         Shopline 分類管理 - 快速移動功能               │
└─────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         ┌────▼──┐    ┌────▼──┐    ┌────▼──┐
         │ Step 1 │    │ Step 2 │    │ Step 3│
         │ Page   │    │ Parse  │    │ UI:   │
         │Detect  │    │ Scope  │    │Button │
         └────────┘    └────────┘    └──┬────┘
                                        │
                                   ┌────▼─────┐
                                   │  Step 4   │
                                   │ UI:       │
                                   │Dropdown   │
                                   └──┬────────┘
                                      │
                        ┌─────────────┘
                        │ (待實現)
                   ┌────▼──┐
                   │ Step 5 │
                   │Move    │
                   │Logic   │
                   └────────┘
```

---

## 核心類結構

### CategoryManager 類

```javascript
class CategoryManager {
  // 屬性
  scope          // AngularJS $scope
  categories     // 分類陣列（根層級）
  categoryTreeMap // 樹結構快取
  isMoving       // 防重入標誌

  // 初始化
  initialize()
  injectUI()
  attachButtonsToCategories()

  // UI - Step 3: 按鈕
  getCategoryFromElement(element)

  // UI - Step 4: 下拉選單
  showMoveDropdown(category, button)
  positionDropdown(dropdown, button)
  getValidMoveTargets(category)
  addTargetCategoriesRecursively(...)

  // 移動邏輯 (待實現)
  moveCategory(source, target)
  moveCategoryUsingScope(...)
  moveCategoryUsingDragEvent(...)
  findCategoryParent(category)
  findCategoryElement(category)

  // 通知
  showSuccessMessage(message)
  showErrorMessage(message)

  // 工具
  getLevel(category)
  getAllDescendants(category)
  buildCategoryTree()
}
```

---

## 模塊分解

### 模塊 1: 初始化層 (`init()`)
**責任**: 頁面載入時的初始化
```
init()
  └─ waitForElement('.angular-ui-tree')
  └─ getAngularScope(treeContainer)
  └─ CategoryManager(scope)
     └─ initialize()
```

**關鍵代碼**:
```javascript
async function init() {
  const treeContainer = await waitForElement('.angular-ui-tree', 10000);
  const scope = getAngularScope(treeContainer);
  const categoryManager = new CategoryManager(scope);
  categoryManager.initialize();
}
```

### 模塊 2: DOM 注入層 (Step 3)
**責任**: 在 DOM 中注入按鈕
```
injectUI()
  └─ attachButtonsToCategories()
     ├─ document.querySelectorAll('.angular-ui-tree-node')
     ├─ node.querySelector('.col-xs-5.text-right')
     ├─ getCategoryFromElement(node)
     └─ button.addEventListener('click', showMoveDropdown)
```

**事件流**:
```
頁面載入
  ↓
MutationObserver 監聽樹容器變化
  ↓
每次檢測到變化都調用 attachButtonsToCategories()
  ↓
遍歷所有 .angular-ui-tree-node
  ↓
為每個節點插入「移動到」按鈕
  ↓
綁定點擊事件 → showMoveDropdown()
```

### 模塊 3: 下拉選單層 (Step 4)
**責任**: 顯示和管理下拉選單 UI
```
showMoveDropdown(category, button)
  ├─ getValidMoveTargets(category)
  │  ├─ getLevel(category)
  │  └─ addTargetCategoriesRecursively(...)
  │     ├─ isDescendant(currentCategory, cat)
  │     └─ getLevel(cat)
  ├─ 構建 DOM 元素
  ├─ positionDropdown(dropdown, button)
  ├─ 綁定事件
  │  ├─ hover: 背景高亮
  │  ├─ click: 移動分類
  │  ├─ click outside: 關閉
  │  └─ keydown Esc: 關閉
  └─ document.body.appendChild(dropdown)
```

**分類篩選邏輯**:
```
候選分類 = 所有分類
  ├─ 排除: 自己
  ├─ 排除: 自己的子孫 (isDescendant)
  ├─ 禁用: Level 3 分類
  └─ 保留: 其他有效目標
```

### 模塊 4: 樹狀結構層
**責任**: 層級計算和樹結構維護
```
樹結構操作函數
├─ getCategoryLevel(categories, target, level=1)
│  └─ 遞迴計算層級 (1,2,3)
├─ getCategoryDescendants(category)
│  └─ 遞迴取得所有子孫
├─ isDescendant(ancestor, descendant)
│  └─ 檢查子孫關係
└─ buildCategoryTree()
   └─ 建立 {levelMap, parentMap, childrenMap}
```

---

## 數據流

### 按鈕點擊流程
```
用戶點擊「移動到」按鈕
         ↓
按鈕 click 事件觸發
         ↓
showMoveDropdown(category, button)
         ↓
1. 移除舊下拉選單
2. 建立新 dropdown 元素
3. 呼叫 getValidMoveTargets(category)
   ├─ 計算當前層級
   ├─ 添加根目錄選項
   └─ 遞迴添加有效目標
4. 為每個選項建立 DOM 元素
5. 綁定事件監聽
6. 計算位置 (positionDropdown)
7. 添加到 DOM
8. 添加全域事件監聽 (關閉)
         ↓
下拉選單顯示
```

### 層級計算流程
```
getLevel(category) 被調用
         ↓
getCategoryLevel(categories, target, 1)
         ↓
遞迴遍歷分類樹
  ├─ 當前層級 = 1
  ├─ 逐個檢查是否匹配
  ├─ 如果有子分類，遞迴搜尋 (層級+1)
  └─ 找到目標時返回層級
         ↓
返回: 1 | 2 | 3 | -1 (未找到)
```

---

## 事件系統

### 事件圖
```
┌─────────────────────────────────────┐
│      按鈕事件                       │
└──────────────┬──────────────────────┘
               │ click
               ↓
        showMoveDropdown()
               │
      ┌────────┴────────┐
      │                 │
   ┌──▼──┐          ┌──▼──┐
   │Hover│          │Click│
   └──┬──┘          └──┬──┘
      │ mouseover      │
      │ mouseout       │ item click
      │ 背景高亮       │ moveCategory()
      │ 恢復背景       └──► 移動邏輯

┌─────────────────────────────────────┐
│      全域事件                       │
└──────────────┬──────────────────────┘
      ┌────────┼────────┐
      │ click  │ keydown│
      │outside │ Esc   │
      └────┬───┴────┬───┘
           │        │
        關閉下拉選單
```

### 事件委派
```
document.addEventListener('click', closeDropdown)
  └─ 檢查: e.target 是否在 dropdown 或 button 內
  └─ 如果都不是，移除下拉選單

document.addEventListener('keydown', handleEscapeKey)
  └─ 檢查: e.key === 'Escape'
  └─ 移除下拉選單並移除監聽器
```

---

## UI 組件結構

### 按鈕組件
```
<button
  class="btn btn-sm btn-default"
  data-move-button="true"
  style="margin-right: 8px;"
  @click="showMoveDropdown()"
>
  📁 移動到 ▼
</button>
```

### 下拉選單組件
```
<div
  data-move-dropdown="true"
  style="
    position: fixed;
    top: Xpx;
    left: Ypx;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 10000;
    min-width: 220px;
    max-width: 300px;
    max-height: 400px;
    overflow-y: auto;
  "
>
  <div class="dropdown-item">📂 根目錄</div>
  <div class="dropdown-item">📁 分類A</div>
  <div class="dropdown-item" style="padding-left: 20px;">
    ├─ 子分類A1
  </div>
  ...
</div>
```

---

## 數據結構

### 分類對象
```javascript
{
  _id: "60b9bde8e1320800389411ed",
  name: "分類A",
  key: undefined,  // 若存在表示特殊分類
  children: [
    {
      _id: "...",
      name: "子分類A1",
      children: [...]
    },
    ...
  ]
}
```

### 選項對象
```javascript
{
  label: "分類名稱",
  target: categoryObject,  // null 表示根目錄
  indent: 0,  // 層級深度
  disabled: false  // Level 3 時為 true
}
```

### 樹對象
```javascript
{
  children: [...],  // 根層級分類
  childrenMap: Map {
    categoryId1 → [child1, child2, ...]
    categoryId2 → [child3, child4, ...]
  },
  levelMap: Map {
    categoryId1 → 1,
    categoryId2 → 2,
    categoryId3 → 3
  },
  parentMap: Map {
    categoryId1 → null,  // 根層級
    categoryId2 → parentId,
    ...
  }
}
```

---

## 約束和限制

### 硬約束 (代碼保證)
1. **層級限制**: 最多 3 層 (ROOT < L1 < L2 < L3)
2. **防止迴圈**: 不能選擇自己或子孫作為目標
3. **特殊分類**: key 屬性的分類無法移動

### 軟約束 (UI 限制)
1. 根層級分類無法選擇「根目錄」選項
2. Level 3 分類在列表中禁用

### 性能約束
1. MutationObserver 監聽 (可能的性能開銷)
2. 大量分類時的遞迴操作

---

## 錯誤處理

### 初始化層
```javascript
try {
  waitForElement() → timeout 檢查
  getAngularScope() → null 檢查
  scope.categories → array 檢查
} catch (error) {
  console.error() → 記錄錯誤
  return → 中止初始化
}
```

### DOM 操作層
```javascript
attachButtonsToCategories() {
  // 檢查 node 是否存在
  // 檢查 buttonArea 是否存在
  // 檢查 category 是否成功獲取
  // 避免重複注入
}
```

### 下拉選單層
```javascript
showMoveDropdown() {
  // 確保舊下拉選單被移除
  // 確保選項列表不為空
  // 確保位置計算正確
}
```

---

## 擴展點 (Future Steps)

### Step 5: 移動邏輯
```
moveCategory(source, target)
  ├─ 主方案: moveCategoryUsingScope()
  │  ├─ 操作 scope.categories 陣列
  │  ├─ splice() 移除源分類
  │  ├─ push() 添加到目標
  │  └─ scope.$apply() 觸發更新
  └─ 備案: moveCategoryUsingDragEvent()
     ├─ 模擬 dragstart 事件
     ├─ 模擬 dragover 事件
     └─ 模擬 drop 事件
```

### 未來增強
- [ ] 分類預覽
- [ ] 批量操作
- [ ] 撤銷/重做
- [ ] 移動動畫
- [ ] 搜尋功能

---

## 性能考量

### 時間複雜度
```
attachButtonsToCategories()   O(n)           n = 分類數
getCategoryLevel()            O(n)           最壞情況遍歷整棵樹
getValidMoveTargets()         O(n²)          需要檢查每個分類
addTargetCategoriesRecursively() O(n)         遍歷子樹
positionDropdown()            O(1)           固定計算
```

### 空間複雜度
```
categoryTreeMap               O(n)           存儲樹的映射
options 陣列                  O(n)           儲存有效目標
DOM 元素                      O(n)           下拉選單項目
```

---

## 調試技巧

### Console API
```javascript
// 檢查初始化狀態
window.categoryManager

// 檢查分類樹
document.querySelector('.angular-ui-tree').scope().categories

// 列出所有按鈕
document.querySelectorAll('[data-move-button]')

// 檢查下拉選單
document.querySelector('[data-move-dropdown]')
```

### 常用調試代碼
```javascript
// 驗證樹結構
const categories = angular.element(document.querySelector('.angular-ui-tree')).scope().categories;
console.table(categories.map(c => ({
  name: c.name,
  children: c.children?.length || 0
})));

// 測試層級計算
categories.forEach(cat => {
  console.log(`${cat.name}: Level ${CategoryManager.prototype.getLevel(cat)}`);
});
```

---

## 參考文檔

- [Spec: category-manager](./openspec/changes/add-category-quick-move/specs/category-manager/spec.md)
- [技術框架](./technical_framework_zh_TW.md)
- [驗證指南](./STEP_3_4_VERIFICATION_GUIDE.md)

