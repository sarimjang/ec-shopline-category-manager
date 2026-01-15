# 時間計算算法改進：非線性成長模型

## 快速摘要

**問題**：當前算法對分類數的影響太小，200 個分類的拖動時間僅比 20 個分類多 8 秒，不符合實際體驗。

**解決方案**：使用非線性成長模型，分別建模視覺搜尋（平方根）和捲動時間（線性）：

```javascript
// 舊算法
dragTime = 4 + (categoryCount / 10) × 0.5 + targetLevel × 1

// 新算法（方案 B）
dragTime = 2 + sqrt(categoryCount) × 0.3 + categoryCount × 0.05 + targetLevel × 1.5
```

**影響**：
- 小型店家（20 分類）：幾乎無影響（+0.3 秒）
- 大型店家（100 分類）：估算提升 18%（+2 秒）
- 超大店家（200 分類）：估算提升 25%（+4.2 秒）

## 文件結構

```
openspec/changes/time-calculation-nonlinear/
├── README.md           # 本文件
├── metadata.json       # 變更元數據
├── spec.md            # 完整技術規格（含認知科學依據）
└── tasks.md           # 詳細實作任務（4 個 Phase）
```

## 快速開始

### 檢視規格
```bash
cat openspec/changes/time-calculation-nonlinear/spec.md
```

### 開始實作
```bash
cat openspec/changes/time-calculation-nonlinear/tasks.md
```

## 核心概念

### 為何使用平方根？

認知心理學研究（Treisman & Gelade 1980, Wolfe 1994）表明：

- **串聯搜尋**（Serial Search）：時間 ∝ n
- **平行搜尋**（Parallel Search）：時間 ∝ 1
- **引導搜尋**（Guided Search）：時間 ∝ sqrt(n) ✅

在分類移動場景中，用戶知道目標名稱（有線索）且分類有排序（有結構），符合**引導搜尋**模型。

### 算法組成

```javascript
dragTime = baseTime + visualSearchTime + scrollTime + alignmentTime
         = 2       + sqrt(n) × 0.3    + n × 0.05   + level × 1.5
```

| 組成部分 | 公式 | 成長類型 | 說明 |
|---------|------|----------|------|
| 基礎時間 | 2 秒 | 常數 | 抓取 + 放開 + 確認 |
| 視覺搜尋 | sqrt(n) × 0.3 | 次線性 | 認知負荷（找目標位置）|
| 捲動時間 | n × 0.05 | 線性 | 物理操作（捲動距離）|
| 對齊時間 | level × 1.5 | 線性 | 層級越深越難對齊 |

## 對比範例

| 分類數 | 層級 | 舊算法 | 新算法 | 差異 | 說明 |
|--------|------|--------|--------|------|------|
| 20 | 2 | 7 秒 | 7.3 秒 | +0.3 秒 | 小型店家影響極小 ✅ |
| 100 | 2 | 11 秒 | 13 秒 | +2 秒 | 中型店家明顯改善 ✅ |
| 200 | 3 | 16.5 秒 | 20.7 秒 | +4.2 秒 | 大型店家顯著改善 ✅ |

## 實作優先級

**建議時程**：
1. ✅ 先完成 `tampermonkey-sandbox-fix` 的文檔更新和 push
2. → 實作本變更（約 2 小時）
3. → 真實環境驗證（1-2 週觀察期）
4. → 根據反饋微調參數

## 風險評估

- **功能風險**：無（純計算邏輯）
- **效能風險**：可忽略（Math.sqrt() < 0.1ms）
- **相容性風險**：無（函數簽名不變）
- **用戶體驗風險**：極低（估算變大 = 感覺更好）

**總評**：✅ 低風險，高價值

## 下一步

閱讀 `spec.md` 了解完整技術細節，或直接開始 `tasks.md` 中的 Phase 1。
