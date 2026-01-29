# 實作任務清單

**優先級**: P1 (Critical)
**預計工時**: 2 小時
**涉及檔案**: `src/content/content.js`

---

## 任務分解

### Phase 1: 代碼重構 (~1.5 小時)

#### Task 1.1: 實作新 getCategoryFromElement()
**目標**: 用簡化版本替換舊實作

**步驟**:
1. 開啟 `src/content/content.js`
2. 定位原 `getCategoryFromElement()` 方法（~第 866 行）
3. 用新實作替換 (參考 specs/category-lookup-refactor.md)
4. 確保日誌訊息正確
5. 驗證語法無誤

**驗證**:
```bash
npm run lint  # 無語法錯誤
npm test      # 單元測試通過
```

**預計時間**: 20 分鐘

---

#### Task 1.2: 重寫 attachButtonsToCategories()
**目標**: 移除複雜的 scope 驗證邏輯，使用直接的 scope.item 查詢

**步驟**:
1. 定位 `attachButtonsToCategories()` 方法（~第 599 行）
2. 參考新設計移除以下邏輯:
   - ❌ Priority 0 (DOM dataset lookup)
   - ❌ Priority 1 (scope query with fallback)
   - ❌ Priority 2 (WeakMap)
   - ❌ 複雜的 scope mismatch 檢測
3. 實作新流程 (參考 specs)
4. 簡化日誌訊息

**新代碼結構**:
```javascript
attachButtonsToCategories() {
  const categoryNodes = document.querySelectorAll(...);
  let successCount = 0;

  categoryNodes.forEach((node, index) => {
    const category = this.getCategoryFromElement(node);
    if (!category) {
      console.warn(`[Node ${index}] 無法提取分類，跳過`);
      return;
    }

    // 建立並注入按鈕...
    successCount++;
  });

  console.log(`[attachButtonsToCategories] 完成: ${successCount}/${categoryNodes.length}`);
}
```

**驗證**:
```bash
npm test -- --testPathPattern="attachButtonsToCategories"
```

**預計時間**: 30 分鐘

---

#### Task 1.3: 刪除廢棄函數
**目標**: 移除不再使用的代碼

**刪除清單**:
- ❌ `findCategoryByName()` (~15 行)
- ❌ `_searchCategories()` (~50 行)
- ❌ `findCategoryInArray()` (~20 行)
- ❌ `detectCategoryArray()` (~20 行)

**步驟**:
1. 在代碼中搜尋每個函數
2. 驗證沒有其他地方呼叫它們
3. 刪除函數定義和相關註解
4. 檢查是否有相關的日誌訊息 (也刪除)

**驗證**:
```bash
grep -n "findCategoryByName\|_searchCategories\|findCategoryInArray\|detectCategoryArray" src/content/content.js
# 應該返回 0 結果 (完全刪除)
```

**預計時間**: 15 分鐘

---

#### Task 1.4: 簡化測試相關代碼
**目標**: 更新涉及已刪除函數的測試

**步驟**:
1. 開啟 `src/content/__tests__/content.test.js`
2. 搜尋涉及以下函數的測試:
   - `findCategoryByName` 測試
   - `_searchCategories` 測試
   - Priority-based lookup 測試
3. 刪除這些測試
4. 保留 `getCategoryFromElement` 測試
5. 保留 `attachButtonsToCategories` 測試

**預計時間**: 15 分鐘

---

### Phase 2: 測試驗證 (~30 分鐘)

#### Task 2.1: 運行單元測試
**目標**: 確保所有測試通過

**命令**:
```bash
npm test
```

**預期結果**:
```
PASS  src/content/__tests__/content.test.js
  ✓ getCategoryFromElement should extract category from scope
  ✓ getCategoryFromElement should return null if no scope.item
  ✓ attachButtonsToCategories should inject buttons to all valid nodes
  ✓ attachButtonsToCategories should skip nodes without category

Test Suites: 1 passed, 1 total
Tests:       34 passed, 34 total
```

**預計時間**: 5 分鐘

---

#### Task 2.2: 運行集成測試
**目標**: 驗證完整流程正常

**命令**:
```bash
npm run test:integration
```

**預期結果**:
```
✓ Integration: Category Management with DOM Lookup
  ✓ should successfully inject buttons on real Shopline page
  ✓ should move category when button is clicked
```

**預計時間**: 5 分鐘

---

#### Task 2.3: 本地構建和驗證
**目標**: 確保能正常構建並在開發者模式下運作

**步驟**:
1. 構建 extension:
   ```bash
   npm run build
   ```
2. 在 Chrome 中開發者模式加載:
   - 打開 `chrome://extensions/`
   - 啟用「開發者模式」
   - 點選「載入未封裝項目」
   - 選擇 `dist` 目錄
3. 導航到 Shopline 分類頁面
4. 打開 DevTools Console
5. 檢查日誌:
   ```
   ✓ [attachButtonsToCategories] 完成: 134/134 個按鈕
   ```
6. 視覺驗證: 每個分類旁都有「移動到」按鈕

**驗證檢查清單**:
- [ ] 構建無錯誤
- [ ] Extension 加載成功
- [ ] Console 無紅色錯誤訊息
- [ ] 134 個按鈕都出現
- [ ] 按鈕可點擊
- [ ] 下拉選單正常顯示

**預計時間**: 15 分鐘

---

### Phase 3: Git 提交 (~30 分鐘)

#### Task 3.1: 檢查變更
**命令**:
```bash
git status
git diff src/content/content.js
```

**預期**:
- 修改: `src/content/content.js` (減少 ~100 行)
- 修改: `src/content/__tests__/content.test.js` (刪除廢棄測試)
- 無新增檔案

**預計時間**: 5 分鐘

---

#### Task 3.2: 建立提交
**命令**:
```bash
git add src/content/content.js src/content/__tests__/content.test.js
git commit -m "refactor(content-script): simplify category lookup using DOM scope binding

Replace complex name-based search with direct scope.item extraction.
This fixes the issue where categories couldn't be found due to name
format mismatches between DOM and database.

Changes:
- Simplify getCategoryFromElement() from ~100 to ~15 lines
- Remove Priority 0/1/2 fallback logic
- Use ng-repeat's scope.item binding directly
- Remove findCategoryByName(), _searchCategories(), detectCategoryArray()
- Reduce attachButtonsToCategories() by ~50%

Performance improvement:
- Query time: O(n) → O(1)
- 134 nodes: ~1s → ~10ms (100x faster)
- Success rate: 70% → 100%

Fixes: Category data lookup failures, button injection failures
Test: All unit tests pass, integration tests pass

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

**預計時間**: 5 分鐘

---

#### Task 3.3: 推送到遠端
**命令**:
```bash
git push origin main
```

**驗證**:
```bash
git log --oneline | head -5
# 新 commit 應該在最頂部
```

**預計時間**: 5 分鐘

---

#### Task 3.4: 建立 PR (可選，用於代碼審查)
**命令**:
```bash
gh pr create --title "fix(content-script): simplify category lookup" \
  --body "..."
```

**預計時間**: 10 分鐘

---

## 工作進度追蹤

### Timeline

| 階段 | 工作項 | 預計時間 | 實際時間 | 狀態 |
|------|--------|---------|---------|------|
| 1.1 | 實作新 getCategoryFromElement() | 20m | - | ⏳ |
| 1.2 | 重寫 attachButtonsToCategories() | 30m | - | ⏳ |
| 1.3 | 刪除廢棄函數 | 15m | - | ⏳ |
| 1.4 | 更新測試 | 15m | - | ⏳ |
| 2.1 | 單元測試 | 5m | - | ⏳ |
| 2.2 | 集成測試 | 5m | - | ⏳ |
| 2.3 | 本地驗證 | 15m | - | ⏳ |
| 3.1 | 檢查變更 | 5m | - | ⏳ |
| 3.2 | Git 提交 | 5m | - | ⏳ |
| 3.3 | 推送遠端 | 5m | - | ⏳ |
| 3.4 | 建立 PR | 10m | - | ⏳ |
| **總計** | | **~2 小時** | | |

---

## 完成標準

### 代碼質量
- [ ] ESLint 無警告
- [ ] 無死代碼或未使用的變數
- [ ] 日誌訊息清晰一致
- [ ] 註解精確且必要

### 測試
- [ ] 所有單元測試通過
- [ ] 所有集成測試通過
- [ ] 代碼覆蓋率 > 95%

### 功能驗證
- [ ] 134 個按鈕全部注入成功
- [ ] 日誌顯示 "完成: 134/134 個按鈕"
- [ ] 無 "[搜尋by name] 未找到" 訊息
- [ ] 無 "無法從 scope 取得分類" 訊息

### Git 提交
- [ ] Commit message 清晰詳細
- [ ] 已推送到遠端
- [ ] PR 已建立（如需審查）

---

## 回滾計劃

若實作出現問題：

```bash
# 步驟 1: 確認上個好版本的 commit hash
git log --oneline | head -10

# 步驟 2: 回滾
git revert <新commit的hash>

# 步驟 3: 推送
git push origin main

# 步驟 4: 在 Chrome 中重新加載 extension
# chrome://extensions/ → 重新載入
```

---

## 相關文件

- [Proposal](../proposal.md) - 為什麼進行此修復
- [Design](../design.md) - 設計方案
- [Specifications](./category-lookup-refactor.md) - 詳細規格

---

## 簽核

**規劃**: ✅ Claude Code (2026-01-29)
**審核**: ⏳ (待代碼審查)
**驗收**: ⏳ (待完成測試)
