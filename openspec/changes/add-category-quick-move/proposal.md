# Change: Add Category Quick Move Feature

## Why
Shopline 分類管理頁面在分類數量多（165+）時操作效率極低。新增的分類會出現在列表最底部，要將它移動到頂部某個母分類底下需要長距離拖拉，這在觸控板或滑鼠操作上都非常不便。

## What Changes
- 在每個分類的操作按鈕區新增「移動到」按鈕
- 點擊按鈕後顯示樹狀下拉選單，列出所有可選的目標位置（母分類或根目錄）
- 選擇目標後，自動將分類移動到該位置
- 透過 AngularJS scope 操作觸發 Shopline 原生儲存機制

## Impact
- Affected specs: `category-manager` (新建)
- Affected code:
  - `src/shopline-category-manager.user.js` (新建 userscript)
- No breaking changes - 純粹新增功能
- 不影響 Shopline 原有拖拉功能
