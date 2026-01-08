# Shopline 分類管理器 - 專案知識庫

> 記錄在 Tampermonkey 脚本开发中遇到的陷阱、模式和最佳实践

---

## [Trap] AngularJS 動態樹中的 DOM 節點識別陷阱 #angularjs #dom #userscript

- **Context**: 使用 Tampermonkey 脚本在 Shopline 分類管理（angular-ui-tree 框架）中為每個分類項目注入「移動到」按鈕

- **Issue**: 當用戶點擊子項（如「分類A-1」）的按鈕時，系統卻識別為父項（「分類A」），導致整個父項及其所有子項被移動

- **Root Cause**:
  1. **注入時的映射過時**：注入按鈕時，通過 `getCategoryFromElement()` 獲取的分類信息被存儲在 `buttonCategoryMap` 中，但 DOM 動態變化後該映射可能失效
  2. **Scope 繼承問題**：AngularJS 中子元素的 scope 可能繼承父級屬性，在某些情況下 `scope.item` 返回錯誤的引用
  3. **優先級錯誤**：依賴緩存的映射而非實時 DOM 查詢

- **Solution**: 反轉依賴優先級 — **優先從 DOM 直接查詢，後備才使用緩存映射**
  ```javascript
  // ✅ 改進後的邏輯
  let categoryInfo = null;
  const button = e.currentTarget;
  const treeNode = button.closest('.angular-ui-tree-node');

  // 第1步：直接從按鈕所在的樹節點查詢 scope
  if (treeNode) {
    const scope = angular.element(treeNode).scope();
    if (scope && scope.item) {
      const arrayInfo = this.detectCategoryArray(scope.item);
      categoryInfo = {
        category: scope.item,  // 直接獲取當前節點的分類
        array: arrayInfo.array,
        arrayName: arrayInfo.arrayName,
      };
    }
  }

  // 第2步：只有在 DOM 查詢失敗時，才使用注入時的映射
  if (!categoryInfo) {
    const boundCategoryInfo = this.buttonCategoryMap.get(button);
    categoryInfo = boundCategoryInfo || this.getCategoryFromElement(button);
  }
  ```

- **Key Insight**:
  - 每次點擊都重新查詢 scope 能確保獲取最新的 DOM 狀態
  - 對於動態 DOM 環境（如樹結構、可拖拽組件），實時性 > 性能
  - 緩存映射應只作為後備，不應作為主要信息來源

- **Why It Matters**:
  - 這是 Tampermonkey 脚本在 SPA（Single Page App）中常見的陷阱
  - 不修復會導致「神秘的」移動錯誤，用戶難以復現或理解

- **Status**: ✅ 已驗證 (在實際測試日誌中確認)

- **FirstRecorded**: 2026-01-08

---

## [Pattern] 樹結構數據移動的驗證策略 #data-structure #validation #state-management

- **Context**: 在 AngularJS 動態樹中，修改分類的父子關係（將分類從一個父項移到另一個父項）

- **Pattern**: 移動後必須進行**多層驗證**，確保數據一致性和可回滾性

- **Implementation**:
  ```javascript
  // 1️⃣ 移動前：備份完整狀態（用於回滾）
  const backupData = {
    sourceParent,        // 源所在的容器（陣列）
    sourceIndex,         // 源在容器中的索引
    targetChildrenBefore: targetCategory?.children?.length || 0,
    arrayName,
  };

  // 2️⃣ 執行移動
  sourceParent.splice(sourceIndex, 1);                    // 從源移除
  targetCategory.children.push(sourceCategory);           // 添加到目標

  // 3️⃣ 驗證移動結果（三層檢查）

  // 檢查 1：源是否真的被移除了？
  const sourceStillInOldLocation = sourceParent.indexOf(sourceCategory) !== -1;
  if (sourceStillInOldLocation) {
    console.error('❌ 驗證失敗：源分類仍在舊位置');
    rollbackMove(sourceCategory, targetCategory, backupData);
    return false;
  }

  // 檢查 2：源是否真的在新位置？
  const sourceInNewLocation = targetCategory.children?.indexOf(sourceCategory) !== -1;
  if (!sourceInNewLocation) {
    console.error('❌ 驗證失敗：源分類不在新位置');
    rollbackMove(sourceCategory, targetCategory, backupData);
    return false;
  }

  // 檢查 3：數據大小是否符合預期？
  if (sourceParentLengthAfter !== sourceParentLengthBefore - 1) {
    console.error('❌ 驗證失敗：源容器大小不符');
    rollbackMove(sourceCategory, targetCategory, backupData);
    return false;
  }
  ```

- **Why This Pattern**:
  - 樹結構修改涉及多個陣列引用，任何步驟失敗都會導致不一致
  - 驗證失敗時自動回滾確保原子性（all-or-nothing）
  - 多層檢查能捕獲邊界情況（如引用複製、陣列長度不匹配）

- **Anti-Pattern** ❌:
  - 移動後不驗證，假設操作一定成功
  - 只檢查一個條件（如「在新位置」），忽略「不在舊位置」
  - 驗證失敗後不回滾，留下髒數據

- **Status**: ✅ 已驗證

- **FirstRecorded**: 2026-01-08

---

## [Pattern] 分層 Debug 日誌設計 #logging #debugging #ux

- **Context**: 複雜操作（如樹結構移動）涉及多個步驟，單一日誌行無法有效診斷問題

- **Pattern**: 按執行流程分層記錄，每層聚焦一個責任域

- **Implementation**: 5 層 Debug 日誌架構

```
層面 1️⃣ 按鈕點擊識別
  └─ 確認用戶點擊的是哪個分類？
  └─ 輸出：[DEBUG] Click 最終確認: {displayName: '分類A-1', ...}

層面 2️⃣ 下拉選單生成
  └─ 哪些項目可選？為什麼有些被禁用？
  └─ 輸出：
     [✓] 可用「分類B」: Level 1
     [✗] 排除「分類C」: Level 3 (最深層級)

層面 3️⃣ 移動執行步驟
  └─ 7 個明確的執行步驟，每步輸出確認消息
  └─ [STEP 1] 驗證源分類...
     [STEP 2] 驗證目標位置...
     [STEP 3] 定位源分類位置...
     [STEP 4] 執行移動操作...
     [STEP 5] 觸發 AngularJS 更新...
     [STEP 6] 驗證移動結果...
     [STEP 7] 完成移動

層面 4️⃣ 數據驗證與對比
  └─ 移動前後的數據是否一致？
  └─ 輸出：
     源父容器: 167 → 166 (少了 1 項 ✓)
     目標子項: 1 → 2 (多了 1 項 ✓)

層面 5️⃣ 性能計時
  └─ 整個操作耗時多久？
  └─ 輸出：✅ 移動成功！耗時: 45.23 ms
```

- **Value**:
  - 快速定位問題根源：從按鈕層 → 選單層 → 移動層 → 驗證層
  - 用戶反饋時更容易提供有用的日誌摘錄
  - 性能分析：識別哪個步驟最耗時

- **Implementation Guidelines**:
  1. 每層使用不同的格式符號（✓ ✗ ⚠️ ❌）便於 scan
  2. 用分隔線 `═══` 標記主要操作的開始和結束
  3. 包含前後對比（「Before → After」），便於驗證
  4. 錯誤時保留完整上下文，不要截斷信息

- **Status**: ✅ 已驗證

- **FirstRecorded**: 2026-01-08

---

## [Shortcut] Tampermonkey 中的 AngularJS Scope 查詢技巧 #angularjs #userscript #dom

- **Technique**: 在 Tampermonkey 脚本中安全地查詢 AngularJS 的 scope 和相關數據

```javascript
// ✅ 推薦用法
const element = document.querySelector('.angular-ui-tree-node');
const scope = angular.element(element).scope();

// 檢查 scope 是否存在和包含所需數據
if (scope && scope.item) {
  const category = scope.item;  // 獲取該節點對應的分類
  // ...
}

// ❌ 避免直接訪問
// scope.$$childHead, scope.$parent 等內部屬性不穩定
```

- **Key Points**:
  - 使用 `angular.element(el).scope()` 而非直接訪問 `el.$scope`
  - 始終檢查 scope 和相關屬性是否存在
  - 避免依賴 Scope 的內部結構（如 `$$childHead`、`$parent`），改用公開數據（如 `scope.item`）
  - 對於動態 DOM（插入/刪除），每次都重新查詢而非緩存 scope

- **Why**:
  - `scope()` 是官方推薦的 API，穩定性更好
  - 直接訪問內部屬性會在 AngularJS 版本更新時失效

- **Status**: ✅ 已驗證

- **FirstRecorded**: 2026-01-08

---

## [Trap] 子項與父項映射的優先級錯誤 #userscript #dom-traversal

- **Context**: 在 HTML 樹中，子元素和父元素都有相同的 CSS 類名（如 `.angular-ui-tree-node`），使用 `closest()` 時可能返回錯誤層級

- **Issue**:
  ```
  <li class="angular-ui-tree-node">  ← 父項 A
    <div>...</div>
    <ul>
      <li class="angular-ui-tree-node">  ← 子項 A-1
        <button data-move-button>...    ← 點擊這個按鈕
      </button>
      </li>
    </ul>
  </li>
  ```
  當點擊「移動」按鈕時，`button.closest('.angular-ui-tree-node')` **可能會返回父項而非子項**

- **Root Cause**:
  - `closest()` 向上查找，返回第一個匹配元素
  - 如果 DOM 結構嵌套層級過深或有多個相同類名，容易返回錯誤層級

- **Solution**:
  1. **驗證返回值**：獲取 closest 後，驗證其內容是否與預期相符
     ```javascript
     const treeNode = button.closest('.angular-ui-tree-node');
     const scope = angular.element(treeNode).scope();
     const actualName = this.getCategoryDisplayName(scope?.item);

     // 驗證：這個元素對應的分類是否是我們預期的？
     if (actualName !== expectedName) {
       console.warn('⚠️ 節點識別錯誤!');
     }
     ```

  2. **多重檢查**：不要只依賴一個查詢方式
     ```javascript
     // 方式1：closest() 查詢
     let node = button.closest('.angular-ui-tree-node');

     // 方式2：驗證節點的直接父類是否符合預期
     if (node.querySelector('[data-move-button]') === button) {
       // ✓ 這是直接包含按鈕的節點，不是祖先
     }
     ```

- **Status**: ⏳ 待決策（是否需要額外的驗證層）

- **FirstRecorded**: 2026-01-08

---

## [Pattern] 移動操作的性能計時與監控 #performance #monitoring

- **Pattern**: 追蹤複雜操作的耗時，識別性能瓶頸

```javascript
const moveStartTime = performance.now();

try {
  // ... 執行移動邏輯

  const moveEndTime = performance.now();
  const duration = (moveEndTime - moveStartTime).toFixed(2);
  console.log(`✅ 移動成功！耗時: ${duration} ms`);

} catch (error) {
  const moveEndTime = performance.now();
  const duration = (moveEndTime - moveStartTime).toFixed(2);
  console.error(`❌ 移動失敗 (耗時: ${duration} ms):`, error);
}
```

- **Threshold Recommendations**:
  - ✓ **< 50 ms**: 快速，用戶無感知
  - ⚠️ **50-200 ms**: 可接受，但可能有小卡頓
  - ❌ **> 200 ms**: 需要優化或添加進度提示

- **Where to Optimize**:
  - `$apply()` 觸發 AngularJS 變化檢測，通常最耗時
  - DOM 查詢（尤其是複雜的 selector）
  - 大陣列的 `indexOf()` 檢查（考慮用 Map/Set 優化）

- **Status**: ✅ 已驗證

- **FirstRecorded**: 2026-01-08

---

## 📊 知識統計

| 類型 | 數量 | 狀態 |
|------|------|------|
| Trap | 2 | ✅ 1, ⏳ 1 |
| Pattern | 3 | ✅ 3 |
| Shortcut | 1 | ✅ 1 |
| **Total** | **6** | **✅ 5, ⏳ 1** |

---

## 🔗 相關檔案

- 主要修改：`src/shopline-category-manager.user.js`
  - 行 254-304：改進按鈕點擊識別邏輯
  - 行 645-686：改進下拉選單 debug 日誌
  - 行 691-735：改進排除邏輯 debug 日誌
  - 行 777-945：改進移動執行步驟和驗證日誌

- 參考日誌：`ref/0108-01.log`（原始移動操作的完整日誌）

---

**最後更新**: 2026-01-08
