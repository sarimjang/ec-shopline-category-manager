# 規格：分類查詢重構 - DOM 索引方案

**版本**: 1.0
**日期**: 2026-01-29
**狀態**: Ready for Implementation

---

## 功能規格

### F1: 簡化的 getCategoryFromElement()

**目標**: 從 DOM 節點直接提取分類物件

**輸入**:
- `element: HTMLElement` - 任何元素（通常是 `li[ui-tree-node]`）

**輸出**:
- `category: Object | null` - 分類物件或 null

**過程**:
```
1. 使用 element.closest('.angular-ui-tree-node') 定位樹節點
2. 若無法定位，返回 null
3. 獲取該節點的 AngularJS scope: ng.element(node).scope()
4. 檢查 scope.item 是否存在
5. 若存在，返回 scope.item
6. 若不存在，返回 null
```

**先決條件**:
- AngularJS 必須已加載 (getAngular() 返回非 null)
- 節點必須在樹結構中 (closest() 能定位)

**異常**:
- scope 不存在 → 返回 null
- scope.item 未定義 → 返回 null
- getAngular() 失敗 → 返回 null

**示例**:
```javascript
// 成功案例
const category = manager.getCategoryFromElement(node);
// → { _id: 'cat123', name: '分類 A', children: [...] }

// 失敗案例
const category = manager.getCategoryFromElement(invalidNode);
// → null
```

---

### F2: 改進的 attachButtonsToCategories()

**目標**: 遍歷所有分類節點並注入移動按鈕

**輸入**: 無 (操作全域 DOM)

**輸出**:
- 副作用：在頁面注入 N 個 `<button data-move-button>` 元素

**流程**:
```
1. querySelect('.angular-ui-tree-node') 取得所有節點
2. forEach(node, index):
   a. category = getCategoryFromElement(node)
   b. if (category === null) {
      - log warning
      - continue (跳過此節點)
   c. createMoveButton(category)
   d. attachEventListener(moveButton)
   e. insertIntoDOM(moveButton)
   f. log success
3. 完成，記錄總成功數
```

**成功標準**:
- 所有節點都被檢查
- 每個有效節點都注入了按鈕
- 無節點被重複注入（檢查 `[data-move-button]`）
- 日誌反映準確的注入數量

**異常處理**:
- 節點無分類 → 記錄警告，跳過
- 無法創建按鈕 → 記錄錯誤，跳過
- DOM 選擇器無結果 → 記錄警告，函數返回

**性能要求**:
- 134 個節點的總耗時 < 100ms
- 無明顯的頁面卡頓

---

### F3: 按鈕事件綁定

**目標**: 每個按鈕點擊時顯示移動選單

**綁定方式**:
```javascript
moveButton.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const category = scope.item; // ← 從 scope 讀取
  manager.showMoveDropdown(category, button);
});
```

**特點**:
- 分類物件直接來自 scope (無需搜尋)
- 可靠性 100% (如果能注入按鈕，scope 一定存在)

---

## 刪除規格 (Deprecation)

### D1: findCategoryByName()
**狀態**: ❌ 刪除
**原因**: 新設計不再使用名稱搜尋
**替代**: 直接從 scope.item 取得

### D2: _searchCategories()
**狀態**: ❌ 刪除
**原因**: 無需遞迴搜尋陣列
**替代**: scope 直接提供分類物件

### D3: detectCategoryArray()
**狀態**: ❌ 刪除
**原因**: scope 已包含陣列資訊
**替代**: 不需要檢測

### D4: 複雜的 Priority 0/1/2 降級邏輯
**狀態**: ❌ 刪除
**原因**: 單一可靠方案比多層降級更好
**替代**: 簡單的 scope 查詢

---

## 代碼更改規格

### 文件 1: src/content/content.js

#### 函數: getCategoryFromElement() (修改)

**舊代碼** (~100 行):
```javascript
getCategoryFromElement(element) {
  // 複雜的驗證邏輯
  // Priority 0/1/2 降級
  // 名稱搜尋
  // 多層 try-catch
}
```

**新代碼** (~15 行):
```javascript
getCategoryFromElement(element) {
  const nodeEl = element.closest?.('.angular-ui-tree-node');
  if (!nodeEl) {
    console.warn('[content.js] 無法定位樹節點');
    return null;
  }

  const ng = getAngular();
  if (!ng) {
    console.warn('[content.js] AngularJS 不可用');
    return null;
  }

  const scope = ng.element(nodeEl).scope();
  if (scope?.item) {
    console.log('[content.js] ✓ 從 scope.item 取得分類:',
      this.getCategoryDisplayName(scope.item));
    return scope.item;
  }

  console.warn('[content.js] scope.item 不存在');
  return null;
}
```

#### 函數: attachButtonsToCategories() (大幅簡化)

**新實作** (~50 行，減少 ~50%):
```javascript
attachButtonsToCategories() {
  const categoryNodes = document.querySelectorAll('.angular-ui-tree-node');
  let successCount = 0;

  categoryNodes.forEach((node, index) => {
    // Step 1: 提取分類
    const category = this.getCategoryFromElement(node);
    if (!category) {
      console.warn(`[Node ${index}] 無法提取分類，跳過`);
      return;
    }

    // Step 2: 避免重複注入
    const buttonArea = node.querySelector('.col-xs-5.text-right');
    if (!buttonArea || buttonArea.querySelector('[data-move-button]')) {
      return;
    }

    // Step 3: 建立按鈕
    const moveButton = document.createElement('button');
    moveButton.textContent = '📁 移動到 ▼';
    moveButton.setAttribute('data-move-button', 'true');
    moveButton.className = 'btn btn-sm btn-default';
    moveButton.style.marginRight = '8px';

    // Step 4: 保存分類資訊
    const categoryId = category._id || category.id;
    const categoryName = this.getCategoryDisplayName(category);
    moveButton.dataset.categoryId = categoryId;
    moveButton.dataset.categoryName = categoryName;

    // Step 5: 綁定事件
    moveButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.showMoveDropdown(category, e.currentTarget);
    });

    // Step 6: 注入 DOM
    buttonArea.insertBefore(moveButton, buttonArea.firstChild);
    successCount++;

    console.log(`[Node ${index}] ✓ 按鈕注入成功:`, categoryName);
  });

  console.log(`[attachButtonsToCategories] 完成: ${successCount}/${categoryNodes.length} 個按鈕`);
}
```

#### 函數: 刪除以下 (已廢棄)
- ❌ `findCategoryByName()`
- ❌ `_searchCategories()`
- ❌ `findCategoryInArray()`
- ❌ `detectCategoryArray()`

---

## 日誌規格

### 成功路徑日誌

```
[content.js:2690] [attachButtonsToCategories] 開始: 134 個節點
[content.js:2720] [Node 0] ✓ 按鈕注入成功: 暖春送禮補元氣｜滿額抽dyson
[content.js:2720] [Node 1] ✓ 按鈕注入成功: 新品上市
[content.js:2720] [Node 2] ✓ 按鈕注入成功: 健康超值環保組
...
[content.js:2745] [attachButtonsToCategories] 完成: 134/134 個按鈕
```

### 失敗路徑日誌

```
[content.js:2705] [Node 5] 無法提取分類，跳過
[content.js:2745] [attachButtonsToCategories] 完成: 133/134 個按鈕
```

### 關鍵改進

**前**:
```
[content.js] 無法從 scope 取得分類: TypeError: window._scm_getAngular is not a function
[content.js] [FIX] Scope failed, using DOM name fallback: 薑黃滴雞精-irene
[content.js] [搜尋by name] 未找到
[content.js] 無法從第 0 個節點取得分類物件
```

**後**:
```
[content.js] ✓ 從 scope.item 取得分類: 薑黃滴雞精-irene
[Node 0] ✓ 按鈕注入成功
```

---

## 測試規格

### 單元測試

#### UT1: getCategoryFromElement - 成功案例
```gherkin
Given: 一個有效的樹節點 with scope.item
When: 調用 getCategoryFromElement(node)
Then: 返回 scope.item 物件
  And: 日誌包含 "✓ 從 scope.item 取得分類"
```

#### UT2: getCategoryFromElement - 無分類
```gherkin
Given: 一個樹節點 with scope.item === null
When: 調用 getCategoryFromElement(node)
Then: 返回 null
  And: 日誌包含 "scope.item 不存在"
```

#### UT3: attachButtonsToCategories - 完全成功
```gherkin
Given: 10 個有效樹節點，都有分類資料
When: 調用 attachButtonsToCategories()
Then: 注入 10 個按鈕
  And: 所有按鈕都有正確的 data-move-button 屬性
  And: 日誌顯示 "完成: 10/10 個按鈕"
```

### 集成測試

#### IT1: 完整初始化流程
```gherkin
Given: 模擬的 Shopline 分類頁面
  And: AngularJS 已加載 134 個分類
When: content.js 初始化並調用 attachButtonsToCategories()
Then: 頁面上出現 134 個「移動到」按鈕
  And: 每個按鈕都能點擊
  And: 點擊後顯示移動下拉選單
```

---

## 驗收標準

```
✅ AC1: 所有有效節點都注入了按鈕
   → 134 個節點 = 134 個按鈕 (100% 成功率)

✅ AC2: 無重複注入
   → 每個節點最多 1 個按鈕

✅ AC3: 按鈕功能完整
   → 點擊後顯示下拉選單
   → 選擇後執行移動

✅ AC4: 日誌清晰準確
   → 成功日誌數 + 失敗日誌數 = 總節點數
   → 無誤導訊息

✅ AC5: 性能達標
   → 注入 134 個按鈕 < 100ms
   → 無頁面卡頓

✅ AC6: 向後相容
   → showMoveDropdown() API 不變
   → moveCategory() API 不變
   → 現有測試全部通過
```

---

## 實作檢查清單

- [ ] 新 getCategoryFromElement() 實作 (~15 行)
- [ ] 新 attachButtonsToCategories() 實作 (~50 行)
- [ ] 刪除 findCategoryByName()
- [ ] 刪除 _searchCategories()
- [ ] 刪除 detectCategoryArray()
- [ ] 刪除 Priority 0/1/2 邏輯
- [ ] 更新單元測試
- [ ] 更新集成測試
- [ ] 本地驗證（所有按鈕出現）
- [ ] 日誌驗證（無錯誤訊息）
- [ ] 功能驗證（按鈕可點擊，下拉選單正常）
- [ ] 性能測試（< 100ms）
- [ ] Git commit
- [ ] 推送到遠端
- [ ] 創建 PR

---

## 相關資源

- [Proposal](../proposal.md) - 提案文檔
- [Design](../design.md) - 設計文檔
- [Tasks](../tasks.md) - 實作任務清單
- [Phase 1.9 Testing Report](../../docs/PHASE_1.9_TESTING_REPORT.md) - 現有測試覆蓋
