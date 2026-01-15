# Shopline 分類管理器 - 專案知識庫

> 記錄在 Tampermonkey 脚本开发中遇到的陷阱、模式和最佳实践

---

## ~~[Trap] AngularJS 動態樹中的 DOM 節點識別陷阱~~ #angularjs #dom #userscript

> ❌ **已被取代** - 此 lesson 的解決方案無效，已被「[Pattern] DOM 名稱優先策略」取代
>
> **原因**：這是第一次嘗試的錯誤假設。建議「優先從 DOM 查詢 scope」，但 scope 本身就是不可靠的（會錯位）。
> **正確方案**：不信任 scope，用 DOM 文字內容（名稱）直接在數據中查找。

- **Context**: 使用 Tampermonkey 脚本在 Shopline 分類管理（angular-ui-tree 框架）中為每個分類項目注入「移動到」按鈕

- **Issue**: 當用戶點擊子項（如「分類A-1」）的按鈕時，系統卻識別為父項（「分類A」），導致整個父項及其所有子項被移動

- **Root Cause** (部分正確，但解決方案錯誤):
  1. ~~**注入時的映射過時**~~：不是主因
  2. **Scope 繼承問題**：✅ 正確診斷
  3. ~~**優先級錯誤**~~：優先 scope 查詢仍然無法解決問題

- ~~**Solution**~~: ❌ 此方案無效
  ```javascript
  // ❌ 這個方案仍然依賴 scope，而 scope 本身可能錯位
  const scope = angular.element(treeNode).scope();
  // scope.item 可能返回錯誤的分類！
  ```

- **Correct Solution**: 見「[Pattern] DOM 名稱優先策略」
  ```javascript
  // ✅ 正確：從 DOM 取名稱，用名稱查找分類
  const domName = element.querySelector('.cat-name')?.textContent?.trim();
  const categoryInfo = this.findCategoryByName(domName);
  ```

- **Status**: ❌ 已被取代

- **FirstRecorded**: 2026-01-08
- **Superseded**: 2026-01-08

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

> ⚠️ **重要警告**：`scope()` 雖然是官方 API，但在 **angular-ui-tree** 等動態樹框架中，
> scope 可能與 DOM 節點**錯位**（返回錯誤的 scope）。
> **建議**：始終驗證 scope 返回的數據是否與 DOM 內容一致，或直接使用「DOM 名稱優先策略」。

- **Technique**: 在 Tampermonkey 脚本中查詢 AngularJS 的 scope（需謹慎使用）

```javascript
// ⚠️ 可用但需驗證
const element = document.querySelector('.angular-ui-tree-node');
const scope = angular.element(element).scope();

// 🆕 必須驗證 scope 與 DOM 是否一致
if (scope && scope.item) {
  const scopeName = getDisplayName(scope.item);
  const domName = element.querySelector('.cat-name')?.textContent?.trim();

  if (scopeName !== domName) {
    console.warn('⚠️ Scope mismatch! Using DOM fallback');
    // 使用 DOM 名稱查找，不信任 scope
  }
}

// ❌ 避免直接訪問
// scope.$$childHead, scope.$parent 等內部屬性不穩定
```

- **Key Points**:
  - 使用 `angular.element(el).scope()` 而非直接訪問 `el.$scope`
  - 始終檢查 scope 和相關屬性是否存在
  - ⚠️ **新增**：在動態樹（如 angular-ui-tree）中，scope 可能錯位，必須驗證
  - ⚠️ **新增**：如果 scope 數據與 DOM 內容不符，使用 DOM 作為真相來源
  - 避免依賴 Scope 的內部結構（如 `$$childHead`、`$parent`），改用公開數據（如 `scope.item`）

- **Why**:
  - `scope()` 是官方推薦的 API，但不保證在動態樹中正確綁定
  - Angular-ui-tree 的節點複用機制可能導致 scope 錯位

- **Status**: ⚠️ 需謹慎使用

- **FirstRecorded**: 2026-01-08
- **Updated**: 2026-01-08 (加入 scope 錯位警告)

---

## [Trap] AngularJS Scope 與 DOM 節點錯位問題 #angularjs #scope #dom-mismatch

- **Context**: Tampermonkey 腳本在使用 `angular.element(treeNode).scope()` 從樹節點獲取分類資訊時

- **Issue**: **CRITICAL - Scope Misalignment**

  在日誌分析中發現：
  ```
  DOM 層面: <li class="angular-ui-tree-node">
    -> querySelector('.cat-name') → "測試分類A-1"

  但 angular.element(treeNode).scope().item 返回:
    -> getCategoryDisplayName() → "測試分類B"  ❌ 錯誤的分類！
  ```

  **這導致按下子項的「移動到」按鈕時，系統認為要移動的是完全不同的分類 B，而不是子項 A-1**

- **Root Cause**:
  - AngularJS 的 scope 與 DOM 節點的綁定已損毀或錯位
  - `angular.element(node).scope()` 返回了錯誤的 scope（可能是父節點或兄弟節點的 scope）
  - 這可能由以下原因造成：
    1. Angular 動態樹的 scope 快取機制（tree-reuse/recycling）
    2. Scope 層級繼承導致子元素讀到父級的 scope
    3. DOM 更新時 Angular 未正確同步 scope 綁定

- **Solution** - 多層驗證策略:
  1. **驗證 Scope 對應性**（新增驗證層）
     ```javascript
     const nodeNameEl = nodeEl.querySelector('.ui-tree-row .cat-name');
     const domCategoryName = nodeNameEl?.textContent?.trim() || '';
     const scope = angular.element(nodeEl).scope();
     const scopeCategoryName = this.getCategoryDisplayName(scope.item);

     // 驗證: DOM 名稱是否與 Scope 返回的名稱一致
     if (domCategoryName && scopeCategoryName !== domCategoryName) {
       console.error('[SCOPE MISALIGNMENT] Detected mismatch:', {
         domName: domCategoryName,
         scopeName: scopeCategoryName,
         scopeId: scope.$id,
       });
       // 此時應該使用 DOM 信息而非 scope 信息
     }
     ```

  2. **降級策略** - 當發現 Scope 錯位時
     - ❌ 不要盲目信任 `angular.element().scope()`
     - ✓ 改用 DOM 文本內容直接搜尋分類
     - ✓ 或在按鈕注入時存儲分類資訊到 DOM data attribute
     ```javascript
     // 在按鈕上存儲分類 ID，點擊時直接使用
     button.dataset.categoryId = category.id;
     // 點擊時從 data attribute 取而非 scope 取
     ```

- **Why Angular-UI-Tree Is Problematic**:
  - Angular-ui-tree 使用動態 scope 和 DOM 節點複用
  - 樹節點在展開/收縮時可能重新渲染
  - Scope 綁定不夠穩定，導致獲取錯誤的分類資訊

- **Lesson for Future**:
  - 在 SPA 框架（Angular/React/Vue）中操作 DOM 時，**不要過度依賴框架的 scope/context**
  - 始終驗證框架返回的數據是否符合預期
  - 重要信息應該同時存儲在 DOM attributes + JavaScript 對象中，提供多個查詢途徑

- **Status**: ✅ 已驗證（在 0108-02.log 中確認）

- **FirstRecorded**: 2026-01-08
- **RootCauseFound**: 2026-01-08

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

## [Trap] JavaScript 變數捕獲時機陷阱 #javascript #closure #timing

- **Context**: 在函數中，一個變數依賴另一個變數的值，但被依賴的變數後續可能更新

- **Issue**: 使用 `const` 過早捕獲值，導致後續邏輯使用過時的引用
  ```javascript
  // ❌ Bug: nodeNameEl 在 nodeEl 更新前被捕獲
  let nodeEl = element.closest('.angular-ui-tree-node');
  const nodeNameEl = nodeEl.querySelector('.cat-name');  // 捕獲舊值

  if (element.classList?.contains('angular-ui-tree-node')) {
    nodeEl = element;  // nodeEl 更新
    // nodeNameEl 仍指向舊 nodeEl 的子元素！
  }

  const name = nodeNameEl?.textContent;  // 錯誤的值！
  ```

- **Solution**: 使用 `let` 並在依賴變數更新後重新捕獲
  ```javascript
  // ✅ 正確：let + 重新捕獲
  let nodeEl = element.closest('.angular-ui-tree-node');
  let nodeNameEl = nodeEl.querySelector('.cat-name');

  if (element.classList?.contains('angular-ui-tree-node')) {
    nodeEl = element;
    nodeNameEl = nodeEl.querySelector('.cat-name');  // 重新捕獲！
  }
  ```

- **Rule of Thumb**: 如果變數 B 依賴變數 A，且 A 可能被更新，則 B 也需要可更新（用 `let`）並在 A 更新後重新賦值

- **Status**: ✅ 已驗證

- **FirstRecorded**: 2026-01-08

---

## [Trap] CSS :scope 選擇器在嵌套結構中的重要性 #css #selector #nested

- **Context**: 使用 `querySelector` 在樹狀 DOM 結構中查找元素

- **Issue**: 普通選擇器會匹配所有後代，包括嵌套節點的子元素
  ```html
  <li class="tree-node" id="parent">
    <div class="row"><span class="name">Parent</span></div>
    <ol>
      <li class="tree-node" id="child">
        <div class="row"><span class="name">Child</span></div>
      </li>
    </ol>
  </li>
  ```

  ```javascript
  // ❌ 可能匹配到嵌套節點的 .name
  parentNode.querySelector('.row .name')  // 可能返回 "Child" 而非 "Parent"
  ```

- **Solution**: 使用 `:scope >` 限定為直接子元素
  ```javascript
  // ✅ 只匹配直接子元素的 .row
  parentNode.querySelector(':scope > .row .name')  // 確保返回 "Parent"
  ```

- **Why `:scope`**:
  - `:scope` 代表調用 `querySelector` 的元素本身
  - `:scope >` 表示「該元素的直接子元素」
  - 避免意外匹配嵌套結構中的同類元素

- **Status**: ✅ 已驗證

- **FirstRecorded**: 2026-01-08

---

## [Pattern] DOM 名稱優先策略（繞過不可靠的框架狀態）#dom #angular #reliability

- **Context**: 在 SPA 框架（如 AngularJS）中，框架內部狀態可能與 DOM 不同步

- **Key Insight**: **DOM 是真相，框架狀態可能說謊**
  - DOM 文字內容是從實際數據渲染的，永遠正確
  - 框架的 scope/state 可能因繼承、複用、快取而錯位

- **Pattern**: 使用 DOM 內容作為主要查找依據
  ```javascript
  // 1️⃣ 從 DOM 取得名稱（永遠正確）
  const domName = element.querySelector('.name')?.textContent?.trim();

  // 2️⃣ 嘗試框架查找
  let item = getItemFromFramework(element);

  // 3️⃣ 驗證框架結果
  if (item && getDisplayName(item) !== domName) {
    console.warn('Framework mismatch! Using DOM fallback');
    item = findItemByName(domName);  // 用名稱在數據中查找
  }

  // 4️⃣ 純 DOM 回退
  if (!item && domName) {
    item = findItemByName(domName);
  }
  ```

- **When to Use**:
  - 框架使用 scope 繼承（AngularJS, Angular）
  - 動態樹結構（展開/收縮/拖拽）
  - DOM 節點複用場景

- **Status**: ✅ 已驗證

- **FirstRecorded**: 2026-01-08

---

## [Shortcut] 多代理並行分析大型日誌文件 #debugging #ai #parallel

- **Technique**: 當日誌文件過大無法一次讀取時，使用多個子代理並行分析

- **Implementation**:
  ```
  日誌文件: 743KB (超過 256KB 限制)

  策略: 啟動 4 個子代理，各自分析不同段落
  - Agent 1: Lines 1-2000
  - Agent 2: Lines 2001-4000
  - Agent 3: Lines 4001-6000
  - Agent 4: Lines 6001-end

  每個代理獨立尋找:
  - Smoking gun 證據
  - 錯誤模式
  - 異常行為

  匯總結果 → 交叉驗證 → 定位根因
  ```

- **Benefits**:
  - 並行處理，節省時間
  - 每個代理可深入分析其段落
  - 多視角交叉驗證，減少遺漏

- **Result**: Agent 3 找到確切 bug 位置（變數捕獲時機問題）

- **Status**: ✅ 已驗證

- **FirstRecorded**: 2026-01-08

---

## 📊 知識統計

| 類型 | 數量 | 狀態 |
|------|------|------|
| Trap | 7 | ✅ 6, ❌ 1 (已被取代) |
| Pattern | 7 | ✅ 7 |
| Shortcut | 2 | ⚠️ 1 (需謹慎), ✅ 1 |
| **Total** | **16** | **✅ 14, ⚠️ 1, ❌ 1** |

> **2026-01-09 更新**：
> - 新增 4 條 Code Review 經驗（Codex CLI 審查發現）
> - 多陣列合併陷阱、Debounce 清理、防禦性字串處理、CSS Class 查詢
>
> **2026-01-08 更新**：
> - 第一條 Trap「DOM 節點識別陷阱」已被取代（解決方案錯誤）
> - Shortcut「Scope 查詢技巧」加入 scope 錯位警告

## ✅ RESOLVED: Scope Misalignment Root Cause (2026-01-08)

經過深入分析 `0108-01.log`（使用 4 個子代理並行分析 743KB 日誌），發現並修復了 **3 個疊加問題**：

### 問題 1: 變數捕獲時機 Bug
```javascript
// ❌ Bug: const 在 nodeEl 更新前捕獲
const nodeNameEl = nodeEl.querySelector('.cat-name');
if (element.classList?.contains('angular-ui-tree-node')) {
  nodeEl = element;  // nodeEl 更新，但 nodeNameEl 仍指向舊的！
}
```

### 問題 2: 嵌套選擇器問題
```javascript
// ❌ 可能匹配嵌套後代
nodeEl.querySelector('.ui-tree-row .cat-name')

// ✅ 只匹配直接子元素
nodeEl.querySelector(':scope > .ui-tree-row .cat-name')
```

### 問題 3: 缺少回退機制
Scope 失敗時按鈕被跳過，而非使用 DOM 名稱查找正確分類。

**解決方案：DOM 名稱優先策略**
1. ✅ 添加 `findCategoryByName()` 方法（繞過 scope）
2. ✅ 按鈕附加時驗證 scope 名稱 vs DOM 名稱
3. ✅ 不匹配時使用 DOM 名稱重新查找

**Commit**: `e3e00a7` (+87 lines, -3 lines)

---

## 🔗 相關檔案

- 主要修改：`src/shopline-category-manager.user.js`
  - 行 254-304：改進按鈕點擊識別邏輯
  - 行 645-686：改進下拉選單 debug 日誌
  - 行 691-735：改進排除邏輯 debug 日誌
  - 行 777-945：改進移動執行步驟和驗證日誌

- 參考日誌：`ref/0108-01.log`（原始移動操作的完整日誌）

---

**最後更新**: 2026-01-09 (v3 - 新增 Code Review 經驗)

---

## [Trap] 多陣列資料合併後的單陣列操作陷阱 #data-integrity #array #cross-reference

- **Context**: 搜尋功能從多個陣列（`categories` 和 `posCategories`）合併結果供用戶選擇，但後續操作只使用當前項目的陣列

- **Issue**: 用戶可能選擇來自不同陣列的項目，但移動操作假設目標與源在同一陣列
  ```javascript
  // ❌ Bug: 搜尋結果混合兩個陣列
  const allLevel1 = this.getLevel1Categories(currentCategory);  // 合併 categories + posCategories

  // 但移動時只用當前分類的陣列
  this.moveCategory(current, target, categoriesArray, arrayName);
  // 如果 target 來自不同陣列，操作可能失敗或產生不一致
  ```

- **Solution**: 過濾搜尋結果只顯示同一陣列的項目
  ```javascript
  // ✅ 正確：限制搜尋結果到同一陣列
  const allLevel1 = this.getLevel1Categories(currentCategory, arrayName);  // 只返回同陣列
  ```

- **When This Happens**:
  - 系統有多個類似結構的數據源（如 Shopline 的 categories vs posCategories）
  - UI 合併顯示但後端操作需區分來源
  - 任何「選擇後操作」的場景

- **Status**: ✅ 已驗證

- **FirstRecorded**: 2026-01-09

---

## [Pattern] Debounce 函數的完整生命週期管理 #performance #cleanup #memory

- **Context**: 搜尋輸入使用 debounce 延遲執行，但 dropdown 可能在 debounce 觸發前關閉

- **Issue**: 未取消的 debounce timer 會在 DOM 移除後執行，造成無效操作（雖不致命但浪費資源）
  ```javascript
  // ❌ 問題：dropdown 關閉時 timer 仍在等待
  const debouncedSearch = debounce(search, 200);
  input.addEventListener('input', debouncedSearch);
  // dropdown 關閉 → DOM 移除 → 200ms 後 timer 觸發 → 操作已不存在的 DOM
  ```

- **Solution**: Debounce 返回帶有 `.cancel()` 方法的函數
  ```javascript
  // ✅ 正確：可取消的 debounce
  debounce(func, wait) {
    let timeout;
    const debouncedFn = (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
    debouncedFn.cancel = () => {
      clearTimeout(timeout);
      timeout = null;
    };
    return debouncedFn;
  }

  // 關閉時清理
  removeDropdown() {
    if (searchSection._debouncedSearch?.cancel) {
      searchSection._debouncedSearch.cancel();
    }
    dropdown.remove();
  }
  ```

- **Rule**: 任何延遲執行的操作（debounce、throttle、setTimeout）都應該在組件/容器銷毀時清理

- **Status**: ✅ 已驗證

- **FirstRecorded**: 2026-01-09

---

## [Pattern] 防禦性字串處理：安全的型別轉換 #defensive #type-safety #null-safety

- **Context**: 處理來自外部數據源的值，可能是 string、number、null 或 undefined

- **Issue**: 直接呼叫 `.toLowerCase()` 或其他字串方法會在非字串值上崩潰
  ```javascript
  // ❌ 危險：假設 name 一定是字串
  const name = item.name.toLowerCase();  // item.name 可能是數字 ID 或 undefined
  ```

- **Solution**: 使用 `String(value ?? '')` 模式
  ```javascript
  // ✅ 安全：強制轉為字串，null/undefined 變空字串
  const name = String(item.name ?? '').toLowerCase();

  // 等效但更明確的寫法
  const name = (item.name != null ? String(item.name) : '').toLowerCase();
  ```

- **Why `String()` over `.toString()`**:
  - `String(null)` → `"null"` (安全)
  - `null.toString()` → TypeError (崩潰)
  - `String(undefined)` → `"undefined"` (安全)
  - 但 `??` 運算子讓 null/undefined 先變成 `''`

- **Common Patterns**:
  ```javascript
  String(value ?? '')          // null/undefined → ''
  String(value || '')          // null/undefined/0/false/'' → ''
  `${value ?? ''}`             // 模板字串版本
  (value ?? '').toString()     // 先處理 null 再 toString
  ```

- **Status**: ✅ 已驗證

- **FirstRecorded**: 2026-01-09

---

## [Trap] 用 Inline Style 查詢 DOM 元素的脆弱性 #css #selector #maintainability

- **Context**: 需要查詢動態生成的 DOM 元素（如搜尋結果列表中的每一行）

- **Issue**: 用 inline style 做選擇器會在樣式變更時失效
  ```javascript
  // ❌ 脆弱：依賴精確的 style 文字
  const rows = resultsList.querySelectorAll('div[style*="cursor: pointer"]');

  // 如果未來改成 cursor: grab 或移除這個屬性，查詢就失效
  ```

- **Solution**: 使用有意義的 CSS class
  ```javascript
  // 建立元素時
  const row = document.createElement('div');
  row.className = 'scm-search-result-row';  // 有意義的命名

  // 查詢時
  const rows = resultsList.querySelectorAll('.scm-search-result-row');  // 穩定可靠
  ```

- **Why CSS Class Is Better**:
  - 語意明確：class 名稱描述元素用途
  - 樣式獨立：樣式變更不影響查詢
  - 可維護：重構時只需改一處
  - 性能：class 查詢比 attribute 查詢快

- **Naming Convention**: `[project-prefix]-[component]-[element]`
  - `scm-search-result-row` → Shopline Category Manager, Search, Result Row

- **Status**: ✅ 已驗證

- **FirstRecorded**: 2026-01-09

---

## [Trap] AngularJS 數據修改不自動持久化到伺服器 #shopline #angular #api #persistence

- **Context**: 在 Shopline 分類管理器中，使用 AngularJS `$apply()` 更新分類位置，頁面UI 顯示正確，但重新整理頁面後改動消失

- **Issue**: 分類被成功移動（DOM 和 scope 都更新），但重新整理頁面後回復原來位置
  ```javascript
  // ❌ 不完整：只修改客戶端狀態
  this.moveCategoryUsingScope(sourceCategory, targetCategory);
  scope.$apply();  // UI 更新，但伺服器不知道！
  // 頁面重新整理 → 伺服器重新加載舊數據 → 改動遺失
  ```

- **Root Cause**:
  - AngularJS `$apply()` 只觸發本地 **UI 更新**（重新渲染 DOM）
  - 並**不會自動調用伺服器 API** 來持久化數據
  - 這是單頁應用（SPA）的常見陷阱：**客戶端狀態改變 ≠ 伺服器狀態改變**

- **Why It's Counterintuitive**:
  - 開發者期望：「修改了數據 → 呼叫 $apply() → 數據就保存」
  - 實際情況：「修改了數據 → 呼叫 $apply() → UI 更新」，但伺服器仍有舊數據
  - 兩個獨立的系統：客戶端 scope 和伺服器數據庫

- **Solution**: 在 UI 更新後，立即呼叫伺服器 API 持久化
  ```javascript
  // ✅ 完整流程
  async moveCategoryUsingScope(sourceCategory, targetCategory) {
    // Step 1-6: 修改客戶端 scope（如原本的邏輯）
    this.moveInScope(sourceCategory, targetCategory);
    scope.$apply();

    // Step 7 (新增): API 調用持久化
    const success = await this.saveCategoryOrderingToServer(
      sourceCategory,
      targetCategory,
      oldParentId
    );
    
    if (!success) {
      console.error('❌ 伺服器保存失敗！本地修改將在重新整理後遺失');
      // 考慮回滾或提示用戶
    }
  }
  ```

- **Lesson for Future**:
  - 任何 SPA 中的「持久化」操作都需要雙層次：
    1. **本地層** - 修改 scope/state，更新 UI（快速反饋）
    2. **遠端層** - 調用伺服器 API，持久化到數據庫（長期保存）
  - 沒有遠端層，修改只是「暫時視覺效果」

- **Status**: ✅ 已驗證（Shopline API 調用成功）

- **FirstRecorded**: 2026-01-14

---

## [Pattern] CSRF Token 動態提取的多重降級策略 #csrf #security #web-api

- **Context**: 調用受 CSRF 保護的伺服器 API 時，需要從頁面中動態提取 CSRF token

- **Pattern**: 嘗試多個提取方式，按優先級降級
  ```javascript
  async extractCSRFToken() {
    // 方法 1️⃣ (推薦): 從 meta tag 提取（標準做法）
    let csrfToken = document.querySelector('meta[name="csrf-token"]')
      ?.getAttribute('content');
    if (csrfToken) {
      console.log('[CSRF] ✅ 從 meta tag 獲取成功');
      return csrfToken;
    }

    // 方法 2️⃣ (降級): 從 Angular 依賴注入獲取
    try {
      const httpDefaults = angular.element(document.body)
        .injector()
        .get('$http')
        .defaults.headers.common['X-CSRF-Token'];
      if (httpDefaults) {
        console.log('[CSRF] ✅ 從 Angular $http 獲取成功');
        return httpDefaults;
      }
    } catch (e) {
      console.warn('[CSRF] ⚠️ Angular 注入失敗，嘗試下一方法');
    }

    // 方法 3️⃣ (最後降級): 從 cookie 提取
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name.toLowerCase().includes('csrf') || 
          name.toLowerCase().includes('token')) {
        console.log('[CSRF] ✅ 從 cookie 獲取成功');
        return decodeURIComponent(value);
      }
    }

    // 全部失敗 → 警告但繼續（伺服器可能寬鬆）
    console.warn('[CSRF] ⚠️ 無法獲取 CSRF token，API 調用可能失敗');
    return '';  // 傳空字串，讓伺服器決定是否拒絕
  }
  ```

- **Why Multiple Methods**:
  - 不同框架/伺服器框架儲存 token 的位置不同
  - Meta tag 是 Rails/Django 標準，但 Angular SPA 可能在 $http header 中
  - Cookie 是通用備選，老舊框架可能用這種方式
  - 多層降級提高成功率

- **Best Practices**:
  1. **優先序** = 標準做法 > 框架特定 > 通用機制
  2. **偵錯輸出** = 記錄每個步驟的成功/失敗
  3. **優雅降級** = 即使 token 為空也繼續，讓伺服器決定
  4. **不要硬編碼** = Token 總是動態，不要假設固定值

- **When to Use**:
  - 任何 POST/PUT/DELETE 請求都應該包含 CSRF token
  - 如果伺服器啟用了 CSRF 保護（大多數都有）

- **Status**: ✅ 已驗證（Shopline 使用 meta tag + X-CSRF-Token header）

- **FirstRecorded**: 2026-01-14

---

## [Shortcut] 從 Browser DevTools 的 cURL 反向解析 API 格式 #api #debugging #reverse-engineering

- **Technique**: 當 API 文檔不存在時，使用瀏覽器的「Copy as cURL」功能反向解析 API

- **Step-by-Step**:
  1. **在 Browser DevTools Network 標籤中找到目標請求**
     - F12 打開開發者工具
     - 執行用戶交互（如點擊「保存」按鈕）
     - 在 Network 標籤找到相關的 PUT/POST 請求

  2. **複製 cURL 命令**
     - 右鍵點擊請求 → Copy as cURL
     - 貼到記事本分析

  3. **從 cURL 解析 API 細節**
     ```bash
     curl 'https://admin.shoplineapp.com/api/admin/v1/5efc20a1905eb10026d50247/categories/6967724c4c6aa90012259431/ordering' \
       -X 'PUT' \
       -H 'accept: application/json' \
       -H 'content-type: application/json;charset=UTF-8' \
       -H 'X-CSRF-Token: <token>' \
       --data-raw '{\"parent\":null,\"ancestor\":\"696773a71ccc9b4e962ed2c7\",\"descendant\":null}'
     ```

     **解析結果**:
     - **URL 模式**: `/api/admin/v1/{shopId}/categories/{categoryId}/ordering`
     - **HTTP 方法**: PUT
     - **必需 Header**: `X-CSRF-Token` （CSRF 保護）
     - **請求內容**:
       ```json
       {
         "parent": null,           // 新的父分類 ID（null = 根層級）
         "ancestor": "696773...",  // 舊的父分類 ID
         "descendant": null        // 暫時不清楚用途
       }
       ```

  4. **轉換為 JavaScript fetch**
     ```javascript
     const response = await fetch(
       `https://admin.shoplineapp.com/api/admin/v1/${shopId}/categories/${categoryId}/ordering`,
       {
         method: 'PUT',
         headers: {
           'Content-Type': 'application/json;charset=UTF-8',
           'X-CSRF-Token': csrfToken,
           'X-Requested-With': 'XMLHttpRequest'  // 多數 API 期望
         },
         body: JSON.stringify({
           parent: newParentId,
           ancestor: oldParentId,
           descendant: null
         }),
         credentials: 'include'  // 重要：保持 cookie/驗證
       }
     );
     ```

- **Common Pitfalls to Watch For**:
  - ⚠️ **HTTP 方法**: 視覺上修改數據但實際是 GET？檢查 cURL 中的 `-X` 參數
  - ⚠️ **content-type**: 誤用 `form-urlencoded` 而非 `json`
  - ⚠️ **CSRF Token 位置**: 不是所有框架都用 meta tag（可能在 header、cookie、body）
  - ⚠️ **認證方式**: Bearer token？OAuth？Basic auth？檢查 Authorization header
  - ⚠️ **Payload 結構**: 某些字段可能是可選的，嘗試刪除字段看是否仍能工作

- **Advantages**:
  - **快速** - 5 分鐘內了解 API 結構
  - **準確** - 使用真實請求而非推測
  - **可驗證** - 可直接在 curl 中測試，再移植到程式

- **Limitations**:
  - ❌ 無法推斷非必需字段的用途
  - ❌ 無法看到相應的結構（必須自己嘗試）
  - ❌ 無法了解時間依賴（如 token 過期）

- **Status**: ✅ 已驗證（成功反向解析 Shopline API）

- **FirstRecorded**: 2026-01-14
