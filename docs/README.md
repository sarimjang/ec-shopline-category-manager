# Shopline 分類管理器 - 使用說明書

> 版本：0.2.1-prod | 最後更新：2026-01-09

## 簡介

**Shopline 分類管理器**是一個 Tampermonkey/Greasemonkey 使用者腳本，為 Shopline 後台的分類管理頁面增加「快速移動」功能，讓您可以輕鬆地將分類移動到其他位置，無需繁瑣的拖曳操作。

---

## 功能特色

### 1. 快速移動按鈕
- 在每個分類的操作區新增「移動到」按鈕
- 點擊後顯示樹狀下拉選單，選擇目標位置

### 2. 搜尋過濾
- 下拉選單內建搜尋框
- 即時過濾分類，快速找到目標位置
- 支援中英文關鍵字搜尋

### 3. 智慧層級驗證
- 自動偵測分類層級（最多 3 層）
- 防止違反 Shopline 的 3 層限制
- 清楚提示無法移動的原因

### 4. 視覺化回饋
- 成功/失敗操作即時 Toast 通知
- 按鈕狀態視覺提示
- 禁用狀態的特殊分類標示

---

## 安裝方式

### 前置需求

請先安裝以下任一瀏覽器擴充套件：

| 瀏覽器 | 擴充套件 | 下載連結 |
|--------|----------|----------|
| Chrome | Tampermonkey | [Chrome 線上應用程式商店](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Firefox | Greasemonkey | [Firefox 附加元件](https://addons.mozilla.org/firefox/addon/greasemonkey/) |
| Edge | Tampermonkey | [Edge 附加元件](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |
| Safari | Userscripts | [Mac App Store](https://apps.apple.com/app/userscripts/id1463298887) |

### 安裝腳本

1. 確認已安裝 Tampermonkey 或 Greasemonkey
2. 點擊 Tampermonkey 圖示 → 建立新腳本
3. 複製 `shopline-category-manager.prod.user.js` 的完整內容
4. 貼上並儲存（Ctrl+S / Cmd+S）

---

## 使用方法

### 步驟 1：進入分類管理頁面

登入 Shopline 後台，進入：
```
商店設定 → 分類管理
```

或直接訪問：
```
https://admin.shoplineapp.com/admin/[您的商店ID]/categories
```

### 步驟 2：使用移動功能

1. 找到要移動的分類
2. 點擊該分類右側的「**移動到**」按鈕
3. 在下拉選單中：
   - 直接選擇目標分類
   - 或使用搜尋框過濾
4. 點擊目標位置完成移動

### 快速操作

| 操作 | 說明 |
|------|------|
| 移動到根層級 | 選擇「📁 移動到根層級」 |
| 移動到子分類 | 點擊目標父分類旁的「▶」展開子層級 |
| 搜尋分類 | 在搜尋框輸入關鍵字 |
| 關閉選單 | 點擊選單外任意位置 |

---

## 限制與注意事項

### Shopline 分類規則

| 規則 | 說明 |
|------|------|
| 最大層級 | 3 層（父 → 子 → 孫） |
| 特殊分類 | 「全部分類」、「未分類」等系統分類無法移動 |
| 循環限制 | 無法將父分類移動到自己的子分類下 |

### 常見問題

**Q: 為什麼某些分類的「移動到」按鈕是灰色的？**
> 系統預設的特殊分類（如「全部分類」）無法移動。

**Q: 為什麼選單中某些分類是灰色的？**
> 移動到該位置會違反 3 層限制，或會造成循環參照。

**Q: 移動後資料沒有儲存？**
> 腳本只是在前端操作，請記得點擊 Shopline 的「儲存」按鈕。

---

## 技術規格

### 相容性

| 項目 | 支援範圍 |
|------|----------|
| 瀏覽器 | Chrome 88+, Firefox 78+, Edge 88+, Safari 14+ |
| Shopline 網域 | `admin.shoplineapp.com`, `*.shopline.tw`, `*.shopline.app` |
| 腳本管理器 | Tampermonkey 4.0+, Greasemonkey 4.0+ |

### 權限說明

此腳本使用 `@grant none`，表示：
- ✅ 不需要任何特殊權限
- ✅ 不會存取您的個人資料
- ✅ 不會傳送任何資料到外部伺服器
- ✅ 僅在 Shopline 分類頁面運作

---

## 版本歷史

| 版本 | 日期 | 變更內容 |
|------|------|----------|
| 0.2.1-prod | 2026-01-09 | 生產版本：關閉 debug 訊息、安全性改進 |
| 0.2.1 | 2026-01-08 | 新增搜尋過濾、修復 Scope 對齊問題 |
| 0.2.0 | 2026-01-07 | 新增快速移動功能 |
| 0.1.0 | 2026-01-06 | 初始版本 |

---

## 問題回報

如遇到任何問題，請提供以下資訊：

1. 瀏覽器版本
2. Tampermonkey/Greasemonkey 版本
3. 問題描述與截圖
4. Console 錯誤訊息（按 F12 開啟開發者工具）

---

## 授權

MIT License - 可自由使用、修改、分發。
