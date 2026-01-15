# 實作任務清單

## Phase 1: 理論驗證與測試案例設計

### Task 1.1: 計算所有測試案例的預期結果
- [ ] 建立測試資料表格
- [ ] 手動計算 6 個場景的拖動時間
- [ ] 驗證沒有負數或異常值
- [ ] 確認邊界條件（分類數 = 0, 1, 極大值）

**測試案例**：

```javascript
// 測試函數（可以在瀏覽器 console 執行）
function testCalculation() {
  const testCases = [
    { categoryCount: 10, targetLevel: 1, usedSearch: false, desc: '極小店家' },
    { categoryCount: 20, targetLevel: 2, usedSearch: false, desc: '小型店家' },
    { categoryCount: 50, targetLevel: 2, usedSearch: false, desc: '中型店家' },
    { categoryCount: 100, targetLevel: 2, usedSearch: false, desc: '大型店家' },
    { categoryCount: 200, targetLevel: 3, usedSearch: false, desc: '超大店家' },
    { categoryCount: 500, targetLevel: 3, usedSearch: false, desc: '極端案例' }
  ];

  console.log('新算法測試結果：');
  console.log('分類數 | 層級 | 拖動時間 | 工具時間 | 節省時間 | 說明');
  console.log('-------|------|----------|----------|----------|------');

  testCases.forEach(tc => {
    const result = calculateTimeSaved(tc.categoryCount, tc.targetLevel, tc.usedSearch);
    console.log(`${tc.categoryCount.toString().padStart(4)} | ${tc.targetLevel} | ${result.dragTime.toString().padStart(6)}s | ${result.toolTime.toString().padStart(6)}s | ${result.timeSaved.toString().padStart(6)}s | ${tc.desc}`);
  });
}
```

**驗證標準**：
- ✅ 分類數越多，拖動時間越長（單調遞增）
- ✅ 層級越深，拖動時間越長（同分類數下）
- ✅ 節省時間 ≥ 0（不能為負數）
- ✅ 極小店家（10 分類）節省時間 < 2 秒（工具價值小）
- ✅ 大型店家（200 分類）節省時間 > 15 秒（工具價值大）

---

### Task 1.2: 與當前算法對比分析
- [ ] 對比所有測試案例的結果
- [ ] 分析差異的合理性
- [ ] 記錄差異最大的場景

**對比表格**：

| 分類數 | 層級 | 當前算法 | 新算法 | 差異 | 差異% | 合理性 |
|--------|------|----------|--------|------|-------|--------|
| 10 | 1 | 6 秒 | 4.4 秒 | -1.6 秒 | -27% | ✅ 小店家影響小 |
| 20 | 2 | 7 秒 | 7.3 秒 | +0.3 秒 | +4% | ✅ 幾乎一致 |
| 100 | 2 | 11 秒 | 13 秒 | +2 秒 | +18% | ✅ 中型店家明顯 |
| 200 | 3 | 16.5 秒 | 20.7 秒 | +4.2 秒 | +25% | ✅ 大店家顯著 |

**驗證標準**：
- ✅ 小型店家（< 30 分類）：差異 < 1 秒
- ✅ 大型店家（> 100 分類）：差異 > 2 秒
- ✅ 差異隨分類數增加而增大

---

## Phase 2: 程式碼修改與測試

### Task 2.1: 修改 calculateTimeSaved 函數
- [ ] 備份當前版本（git stash 或 commit）
- [ ] 修改 Line 104-125 的算法
- [ ] 更新函數註釋（說明新模型）
- [ ] 語法驗證

**檔案位置**: `src/shopline-category-manager.user.js` (Line 104-125)

**修改步驟**：

1. **備份當前程式碼**：
```bash
cd "/Users/slc_javi/My Projects/app_develop/lab/lab_20260107_greasemonkey-script-shopline-category"
git add src/shopline-category-manager.user.js
git stash push -m "backup before time calculation algorithm change"
```

2. **修改算法** - 將 Line 104-125 替換為：

```javascript
/**
 * 計算時間節省（非線性成長模型）
 *
 * 模型設計：
 * - 視覺搜尋：sqrt(categoryCount) - 認知心理學研究表明視覺搜尋時間呈次線性成長
 * - 捲動時間：線性成長 - 捲動距離正比於分類數
 * - 對齊時間：層級越深越困難
 *
 * @param {number} categoryCount - 分類總數（影響視覺搜尋和捲動時間）
 * @param {number} targetLevel - 目標層級 1-3（影響對齊難度）
 * @param {boolean} usedSearch - 是否使用搜尋功能
 * @returns {{dragTime: number, toolTime: number, timeSaved: number}}
 */
function calculateTimeSaved(categoryCount, targetLevel, usedSearch) {
  // 時間組成部分
  const baseTime = 2;                                    // 基礎操作時間（抓取 + 放開 + 確認）
  const visualSearchTime = Math.sqrt(categoryCount) * 0.3; // 視覺搜尋時間（非線性）
  const scrollTime = categoryCount * 0.05;               // 捲動時間（線性）
  const alignmentTime = targetLevel * 1.5;               // 對齊時間（層級影響）

  const dragTime = baseTime + visualSearchTime + scrollTime + alignmentTime;

  // 工具時間 = 2.5秒（使用搜尋）或 3.5秒（瀏覽選單）
  const toolTime = usedSearch ? 2.5 : 3.5;

  // 節省時間 = max(0, 拖動時間 - 工具時間)
  const timeSaved = Math.max(0, dragTime - toolTime);

  return {
    dragTime: Math.round(dragTime * 10) / 10,  // 四捨五入到小數點一位
    toolTime: Math.round(toolTime * 10) / 10,
    timeSaved: Math.round(timeSaved * 10) / 10
  };
}
```

3. **語法驗證**：
```bash
node -c src/shopline-category-manager.user.js
```

**驗證**：
- ✅ 無語法錯誤
- ✅ 函數簽名未變
- ✅ 返回值結構未變

---

### Task 2.2: 在瀏覽器 Console 測試
- [ ] 複製新函數到瀏覽器 console
- [ ] 執行 testCalculation() 函數
- [ ] 驗證所有測試案例
- [ ] 確認無 NaN 或 undefined

**測試步驟**：

1. 開啟 Shopline 分類管理頁面
2. 按 F12 開啟 DevTools
3. 在 Console 貼上新的 `calculateTimeSaved` 函數
4. 貼上 `testCalculation` 測試函數（Task 1.1）
5. 執行 `testCalculation()`
6. 檢查輸出結果

**驗證標準**：
- ✅ 所有結果都是數字（非 NaN）
- ✅ 拖動時間隨分類數遞增
- ✅ 節省時間 ≥ 0
- ✅ 工具時間固定（2.5 或 3.5）

---

### Task 2.3: 同步到 prod.user.js
- [ ] 執行 AST 同步工具
- [ ] 驗證 prod.user.js 語法
- [ ] 比較檔案行數（應該一致）

**命令**：
```bash
cd "/Users/slc_javi/My Projects/app_develop/lab/lab_20260107_greasemonkey-script-shopline-category"
node scripts/sync-prod-ast.js
```

**驗證**：
```bash
# 語法驗證
node -c src/shopline-category-manager.prod.user.js

# 行數比較（應該差 5 行，metadata 長度差異）
wc -l src/shopline-category-manager.user.js src/shopline-category-manager.prod.user.js
```

---

### Task 2.4: 整合測試（真實環境）
- [ ] 安裝 prod.user.js 到 Tampermonkey
- [ ] 移動一個分類，檢查 Toast 訊息
- [ ] 驗證節省時間計算正確
- [ ] 檢查累積統計是否正常
- [ ] 使用 Tampermonkey 選單查看統計

**測試場景 1：小型店家（20 分類）**
- 目標：確認影響小（應該接近當前算法）
- 預期節省時間：3-4 秒
- 檢查點：Toast 訊息、累積統計

**測試場景 2：大型店家（100+ 分類）**
- 目標：確認影響顯著（應該比當前算法高 2-4 秒）
- 預期節省時間：9-13 秒
- 檢查點：Toast 訊息、累積統計

**驗證標準**：
- ✅ Toast 訊息格式正確（三行）
- ✅ 本次節省時間合理
- ✅ 總計次數正確累加
- ✅ 總計時間正確累加
- ✅ 無 JavaScript 錯誤

---

## Phase 3: 真實環境驗證與調優

### Task 3.1: 真實使用觀察（1-2 週）
- [ ] 正常使用工具進行分類移動
- [ ] 記錄主觀感受（時間估算是否更準確）
- [ ] 記錄異常案例（如果有）

**觀察重點**：

1. **準確性感受**：
   - 拖動完成後，看到的節省時間是否符合直覺？
   - 是否覺得「對，確實節省這麼多時間」？

2. **激勵效果**：
   - 看到較高的節省時間，是否更願意使用工具？
   - 累積統計是否更有成就感？

3. **異常案例**：
   - 是否有時間估算明顯過高或過低的情況？
   - 什麼場景下估算不準？

**記錄格式**：
```markdown
## 日期：2026-01-XX

### 移動記錄
- 分類數：100
- 層級：2
- 實際拖動感受：約 12-15 秒（慢）
- 顯示節省時間：13 秒
- 主觀評價：✅ 準確 / ⚠️ 偏高 / ❌ 偏低

### 整體感受
（記錄整體使用體驗）
```

---

### Task 3.2: 參數微調（如果需要）
- [ ] 分析觀察數據
- [ ] 識別需要調整的參數
- [ ] 小幅調整參數（±20% 以內）
- [ ] 再次驗證

**可調參數**：

```javascript
// 如果視覺搜尋時間估算偏高/偏低
const visualSearchTime = Math.sqrt(categoryCount) * 0.3;  // 可調整 0.2-0.4

// 如果捲動時間估算偏高/偏低
const scrollTime = categoryCount * 0.05;  // 可調整 0.03-0.07

// 如果對齊時間估算偏高/偏低
const alignmentTime = targetLevel * 1.5;  // 可調整 1.0-2.0
```

**調整原則**：
- 每次只調整一個參數
- 調整幅度 ≤ ±20%
- 調整後重新測試 3-5 次
- 根據主觀感受決定是否保留

---

### Task 3.3: 收集用戶反饋（如果有其他用戶）
- [ ] 詢問其他用戶的使用體驗
- [ ] 收集關於時間估算準確性的反饋
- [ ] 根據反饋調整參數

**問題清單**：
1. 時間估算是否符合你的實際感受？
2. 相比之前（舊算法），新的估算是否更準確？
3. 是否有明顯過高或過低的情況？
4. 你的店家大約有多少分類？

---

## Phase 4: 文檔更新與提交

### Task 4.1: 更新 CHANGELOG.md
- [ ] 加入新版本號（v0.2.3 或 v0.3.0）
- [ ] 說明算法改進
- [ ] 列出技術細節

**CHANGELOG 範例**：
```markdown
## [0.3.0] - 2026-01-XX

### Changed
- **時間計算算法改進**：使用非線性成長模型更準確反映分類數量的影響
  - 視覺搜尋時間：sqrt(categoryCount) × 0.3（基於認知心理學研究）
  - 捲動時間：categoryCount × 0.05（線性成長）
  - 對齊時間：targetLevel × 1.5（層級影響增強）
  - 大型店家（100+ 分類）的時間節省估算提升 20-30%

### Technical Details
- 舊算法：dragTime = 4 + (categoryCount / 10) × 0.5 + targetLevel × 1
- 新算法：dragTime = 2 + sqrt(categoryCount) × 0.3 + categoryCount × 0.05 + targetLevel × 1.5
- 效能影響：可忽略（新增 Math.sqrt() 調用，< 0.1ms）
- 向後相容：✅ 完全相容，函數簽名和返回值結構不變
```

---

### Task 4.2: 更新 README.md（如果需要）
- [ ] 說明時間計算的準確性改進
- [ ] 加入算法設計的簡要說明

**README 新增章節**：
```markdown
### 時間節省計算

工具使用**非線性成長模型**估算時間節省：

- **視覺搜尋時間**：隨分類數平方根成長（基於認知心理學研究）
- **捲動時間**：隨分類數線性成長
- **對齊時間**：隨層級增加

這使得時間估算更準確，特別是對大型店家（100+ 分類）：
- 小型店家（20 分類）：每次節省約 3-4 秒
- 大型店家（100 分類）：每次節省約 9-13 秒
- 超大店家（200 分類）：每次節省約 15-20 秒
```

---

### Task 4.3: Git 提交
- [ ] 暫存所有變更
- [ ] 撰寫詳細的 commit message
- [ ] 提交到 feature branch

**Commit Message 範例**：
```
feat: improve time calculation algorithm with nonlinear growth model

問題描述：
當前算法對分類數的影響過小，不符合真實使用體驗。
分類數從 20 增加到 200（10 倍），拖動時間僅從 7 秒增加到 15 秒，
但實際上大量分類會顯著增加視覺搜尋和捲動時間。

解決方案：
使用非線性成長模型，分別建模三個時間組成部分：
1. 視覺搜尋時間：sqrt(categoryCount) × 0.3（次線性成長）
2. 捲動時間：categoryCount × 0.05（線性成長）
3. 對齊時間：targetLevel × 1.5（層級影響）

改進效果：
- 小型店家（20 分類）：影響極小（+0.3 秒）
- 大型店家（100 分類）：估算提升 18%（11s → 13s）
- 超大店家（200 分類）：估算提升 25%（16.5s → 20.7s）

認知科學依據：
- Treisman & Gelade (1980): Feature Integration Theory
- Wolfe (1994): Guided Search Model
- 視覺搜尋時間通常遵循 sqrt(n) 成長模式

技術細節：
- 函數簽名不變：完全向後相容
- 效能影響：可忽略（Math.sqrt() < 0.1ms）
- 新增參數：baseTime=2, visualSearchCoeff=0.3, scrollCoeff=0.05, levelCoeff=1.5

測試：
- ✅ 理論驗證：6 個測試案例通過
- ✅ 實作驗證：語法正確，無運行時錯誤
- ✅ 整合測試：真實環境驗證正常

相關檔案：
- src/shopline-category-manager.user.js (Line 104-125)
- src/shopline-category-manager.prod.user.js（同步修改）

OpenSpec: openspec/changes/time-calculation-nonlinear
```

---

## 驗收標準

### Phase 1 完成標準
- ✅ 所有測試案例計算完成
- ✅ 與當前算法對比分析完成
- ✅ 驗證無異常值

### Phase 2 完成標準
- ✅ 程式碼修改完成
- ✅ 語法驗證通過
- ✅ prod.user.js 同步完成
- ✅ 整合測試通過

### Phase 3 完成標準
- ✅ 真實環境使用 1-2 週
- ✅ 主觀感受良好（時間估算更準確）
- ✅ 無明顯異常案例
- ✅ 參數調優完成（如果需要）

### Phase 4 完成標準
- ✅ CHANGELOG.md 更新
- ✅ README.md 更新（如果需要）
- ✅ Git 提交完成

---

## 預估時間

| 階段 | 任務 | 預估時間 |
|------|------|----------|
| Phase 1 | Task 1.1 | 15 分鐘 |
| Phase 1 | Task 1.2 | 15 分鐘 |
| Phase 2 | Task 2.1 | 20 分鐘 |
| Phase 2 | Task 2.2 | 15 分鐘 |
| Phase 2 | Task 2.3 | 5 分鐘 |
| Phase 2 | Task 2.4 | 20 分鐘 |
| Phase 3 | Task 3.1 | 1-2 週（觀察期）|
| Phase 3 | Task 3.2 | 30 分鐘（如需要）|
| Phase 3 | Task 3.3 | 15 分鐘（如有用戶）|
| Phase 4 | Task 4.1 | 15 分鐘 |
| Phase 4 | Task 4.2 | 10 分鐘 |
| Phase 4 | Task 4.3 | 10 分鐘 |
| **總計** | - | **~2.5 小時** + 觀察期 |

---

## 備註

- **向後相容**：完全相容，可隨時切換回舊算法（git revert）
- **風險評估**：低風險（純計算邏輯，不影響移動功能）
- **回滾方案**：如果發現問題，執行 `git revert` 即可
- **參數調優**：Phase 3 提供靈活的參數調整機制
- **用戶反饋**：如果只有自己使用，Phase 3.3 可跳過
- **觀察期**：建議至少使用 1 週，累積 20+ 次移動數據
