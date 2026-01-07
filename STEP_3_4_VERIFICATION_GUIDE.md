# Step 3-4 UI 驗證指南

## 快速驗證 (5分鐘)

### 環境設置
1. 安裝 TamperMonkey 或 GreaseMonkey 瀏覽器擴展
2. 將 `src/shopline-category-manager.user.js` 添加為新 userscript
3. 訪問 Shopline 分類管理頁面: `https://admin.shoplineapp.com/*/categories`

---

## Step 3: 「移動到」按鈕 UI 驗證

### 測試 3.1: 按鈕顯示
**目標**: 確認每個分類旁邊都顯示「移動到」按鈕

**步驟**:
1. 打開瀏覽器開發工具 (F12)
2. 進入 Console 標籤
3. 執行以下命令:
```javascript
// 檢查是否有按鈕被注入
const buttons = document.querySelectorAll('[data-move-button]');
console.log(`找到 ${buttons.length} 個「移動到」按鈕`);
buttons.forEach((btn, i) => console.log(`按鈕 ${i}: ${btn.textContent}`));
```

**預期結果**:
- 輸出應顯示: `找到 X 個「移動到」按鈕`
- X 應等於頁面上的分類數量
- 每個按鈕文本應為: `📁 移動到 ▼`

### 測試 3.2: 按鈕位置
**目標**: 確認按鈕位置正確（在按鈕區最前面）

**步驟**:
1. 在頁面上隨意選擇一個分類
2. 檢查其 HTML 結構（右鍵 > 檢查元素）
3. 找到 `.col-xs-5.text-right` 節點

**預期結果**:
```html
<div class="col-xs-5 col-sm-5 col-md-5 text-right">
  <!-- 「移動到」按鈕在最前面 -->
  <button class="btn btn-sm btn-default" data-move-button="true">
    📁 移動到 ▼
  </button>
  <!-- 然後是原有按鈕 -->
  <a class="btn btn-default btn-sm">查閱商品</a>
  <a class="btn btn-default btn-sm">編輯</a>
  <button class="btn btn-danger btn-sm">刪除</button>
</div>
```

### 測試 3.3: 按鈕樣式
**目標**: 驗證按鈕使用正確的 Bootstrap 樣式

**步驟**:
1. 右鍵點擊任何「移動到」按鈕 > 檢查元素
2. 檢查 Styles 面板中的樣式

**預期結果**:
- `class="btn btn-sm btn-default"` - Bootstrap 標準樣式
- 按鈕大小適中，與其他按鈕一致
- 右邊距 8px

### 測試 3.4: 特殊分類禁用
**目標**: 確認特殊分類的按鈕被禁用

**步驟**:
1. 尋找有 `key` 屬性的分類（如「精選商品」）
2. 檢查其「移動到」按鈕

**預期結果**:
- 按鈕應為禁用狀態 (disabled attribute)
- 游標懸停時顯示特殊光標
- 提示文字: "特殊分類不支援移動"

**測試代碼**:
```javascript
const specialButtons = document.querySelectorAll('[data-move-button][disabled]');
console.log(`找到 ${specialButtons.length} 個禁用的「移動到」按鈕`);
```

---

## Step 4: 下拉選單 UI 驗證

### 測試 4.1: 下拉選單顯示
**目標**: 確認點擊按鈕後顯示下拉選單

**步驟**:
1. 點擊任何「移動到」按鈕
2. 觀察頁面反應

**預期結果**:
- 下拉選單應立即出現
- 位置在按鈕下方
- 背景為白色，邊框為灰色 (#ddd)
- 帶陰影效果

**驗證代碼**:
```javascript
// 檢查下拉選單是否存在
const dropdown = document.querySelector('[data-move-dropdown]');
console.log(`下拉選單存在: ${dropdown !== null}`);
if (dropdown) {
  console.log(`寬度: ${dropdown.offsetWidth}px`);
  console.log(`高度: ${dropdown.offsetHeight}px`);
  console.log(`項目數: ${dropdown.children.length}`);
}
```

### 測試 4.2: 樹狀結構縮排
**目標**: 驗證下拉選單正確顯示分類層級

**步驟**:
1. 點擊一個分類的「移動到」按鈕
2. 查看下拉選單內容結構

**預期結果**:
```
📂 根目錄
📁 分類A (Level 1)
  ├─ 子分類A1 (Level 2)
  ├─ 子分類A2 (Level 2)
  └─ 孫分類A2-1 (Level 3) [禁用]
📁 分類B (Level 1)
  └─ 子分類B1 (Level 2)
```

**結構驗證代碼**:
```javascript
const dropdown = document.querySelector('[data-move-dropdown]');
const items = dropdown.querySelectorAll('[style*="padding"]');
items.forEach((item, i) => {
  const indent = (item.style.paddingLeft.match(/\d+/) || [0])[0] / 20;
  console.log(`項目 ${i}: ${indent} 層 - ${item.textContent}`);
});
```

### 測試 4.3: Hover 高亮
**目標**: 驗證懸停項目時有高亮效果

**步驟**:
1. 點擊「移動到」按鈕顯示下拉選單
2. 將滑鼠移到各個項目上

**預期結果**:
- 未禁用的項目: 背景變為淺灰色 (#f5f5f5)
- 禁用的項目: 保持灰色背景 (#fafafa)，無高亮變化
- 移開時恢復原狀

### 測試 4.4: 根目錄選項
**目標**: 確認根目錄選項的邏輯正確

**步驟**:
1. 點擊 Level 1 分類的「移動到」按鈕
   - 預期: 根目錄選項為禁用 (灰色)
2. 點擊 Level 2 分類的「移動到」按鈕
   - 預期: 根目錄選項為可用

**測試代碼**:
```javascript
// 驗證根目錄選項
const dropdown = document.querySelector('[data-move-dropdown]');
const rootOption = dropdown.children[0];
console.log(`根目錄文本: ${rootOption.textContent}`);
console.log(`根目錄禁用: ${rootOption.style.opacity === '0.5'}`);
```

### 測試 4.5: Level 3 禁用驗證
**目標**: 確認 Level 3 分類無法作為移動目標

**步驟**:
1. 找到有三層分類的分類結構
2. 點擊任何分類的「移動到」按鈕
3. 檢查下拉選單中的 Level 3 項目

**預期結果**:
- Level 3 項目應顯示為禁用 (opacity: 0.5)
- 游標變為 `not-allowed`
- 無法點擊

### 測試 4.6: 自身和子孫排除
**目標**: 驗證分類不能選擇自己或子孫作為目標

**步驟**:
1. 找到一個有子分類的分類（如「分類A」有「子分類A1」）
2. 點擊「分類A」的「移動到」按鈕
3. 檢查下拉選單

**預期結果**:
- 「分類A」本身不出現在列表中
- 「子分類A1」等子孫也不出現在列表中
- 只能選擇其他分類或「根目錄」

### 測試 4.7: 關閉下拉選單
**目標**: 驗證下拉選單的關閉機制

**測試 4.7.1: 點擊外側關閉**
- 點擊下拉選單外的頁面
- 預期: 下拉選單立即消失

**測試 4.7.2: 點擊項目後關閉**
- 點擊下拉選單中的一個項目
- 預期: 下拉選單消失（移動邏輯待實現）

**測試 4.7.3: 按 Esc 鍵關閉**
- 顯示下拉選單後按 Esc 鍵
- 預期: 下拉選單消失

### 測試 4.8: 下拉選單位置調整
**目標**: 驗證下拉選單能自動調整位置以避免超出視窗邊界

**步驟**:
1. 滾動到頁面底部
2. 點擊靠近頁面邊緣的分類的「移動到」按鈕

**預期結果**:
- 如果按鈕靠近視窗下邊，下拉選單應出現在按鈕上方
- 如果按鈕靠近視窗右邊，下拉選單應左移對齊
- 下拉選單永遠完全可見

---

## 綜合驗證測試

### 完整測試場景
```javascript
// 在 console 執行此代碼以進行完整驗證
(function() {
  console.log('=== Shopline Category Manager UI 驗證 ===\n');

  // 1. 按鈕驗證
  console.log('1. 按鈕檢查:');
  const buttons = document.querySelectorAll('[data-move-button]');
  console.log(`   ✓ 找到 ${buttons.length} 個「移動到」按鈕`);

  const disabledButtons = document.querySelectorAll('[data-move-button][disabled]');
  console.log(`   ✓ 禁用按鈕數: ${disabledButtons.length}`);

  // 2. 下拉選單驗證
  console.log('\n2. 下拉選單檢查:');
  const dropdown = document.querySelector('[data-move-dropdown]');
  if (dropdown) {
    console.log(`   ✓ 下拉選單元素存在`);
    console.log(`   ✓ 選項數: ${dropdown.children.length}`);
    console.log(`   ✓ 寬度: ${dropdown.offsetWidth}px`);
    console.log(`   ✓ 高度: ${dropdown.offsetHeight}px`);
  } else {
    console.log('   ℹ 下拉選單未顯示（需先點擊按鈕）');
  }

  // 3. 層級驗證
  console.log('\n3. 樹狀結構驗證:');
  const treeNodes = document.querySelectorAll('.angular-ui-tree-node');
  console.log(`   ✓ 找到 ${treeNodes.length} 個分類節點`);

  console.log('\n=== 驗證完成 ===');
})();
```

---

## 常見問題排除

| 問題 | 可能原因 | 解決方案 |
|------|--------|--------|
| 沒有看到「移動到」按鈕 | userscript 未正確加載 | 檢查 @match 規則，確保 URL 匹配 |
| 按鈕無法點擊 | JavaScript 錯誤 | 打開 console 檢查錯誤訊息 |
| 下拉選單不顯示 | CSS 衝突或 z-index 問題 | 檢查 z-index (10000) 是否足夠高 |
| 下拉選單位置不對 | 計算邏輯問題 | 檢查視窗邊界檢查代碼 |
| Esc 鍵無法關閉 | 事件監聽器未正確綁定 | 檢查 `handleEscapeKey` 函數 |

---

## 性能驗證

### 執行性能測試
```javascript
// 測試按鈕注入性能
console.time('按鈕注入');
const nodes = document.querySelectorAll('.angular-ui-tree-node');
nodes.forEach(node => {
  const btn = node.querySelector('[data-move-button]');
  if (!btn) {
    // 模擬注入
  }
});
console.timeEnd('按鈕注入');

// 測試下拉選單建立性能
console.time('下拉選單建立');
// 點擊按鈕後測量
console.timeEnd('下拉選單建立');
```

**預期結果**:
- 按鈕注入應在 100ms 以內完成
- 下拉選單建立應在 50ms 以內完成
- 頁面滾動和互動應無卡頓

---

## 瀏覽器兼容性檢查

測試的瀏覽器/環境:
- [ ] Chrome 90+
- [ ] Firefox 88+
- [ ] Safari 14+
- [ ] Edge 90+

**預期結果**: 所有測試應在所有瀏覽器上通過，無差異

---

## 最後檢查清單

- [ ] 步驟 3.1 - 按鈕顯示: ✓ 通過
- [ ] 步驟 3.2 - 按鈕位置: ✓ 通過
- [ ] 步驟 3.3 - 按鈕樣式: ✓ 通過
- [ ] 步驟 3.4 - 特殊分類禁用: ✓ 通過
- [ ] 步驟 4.1 - 下拉選單顯示: ✓ 通過
- [ ] 步驟 4.2 - 樹狀結構: ✓ 通過
- [ ] 步驟 4.3 - Hover 高亮: ✓ 通過
- [ ] 步驟 4.4 - 根目錄邏輯: ✓ 通過
- [ ] 步驟 4.5 - Level 3 禁用: ✓ 通過
- [ ] 步驟 4.6 - 自身排除: ✓ 通過
- [ ] 步驟 4.7 - 關閉機制: ✓ 通過
- [ ] 步驟 4.8 - 位置調整: ✓ 通過

---

## 完成標誌

當所有測試都通過時，可認為 Step 3-4 UI 實作完成。

