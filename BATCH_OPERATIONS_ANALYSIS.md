# 批量操作和匯出/匯入功能評估

## 目錄
1. [Shopline API 分析](#shopline-api-分析)
2. [批量操作可行性](#批量操作可行性)
3. [匯出/匯入設計](#匯出匯入設計)
4. [排隊機制設計](#排隊機制設計)
5. [功能對比與建議](#功能對比與建議)

---

## Shopline API 分析

### 當前 API 規格

**API 端點**
```
PUT /api/admin/v1/{shopId}/categories/{categoryId}/ordering
```

**請求格式**
```json
{
  "parent": "target_category_id_or_null",    // null = 根目錄
  "ancestor": "old_parent_id_or_null",       // 舊的父分類 ID
  "descendant": "category_id"                // 要移動的分類 ID
}
```

**限制發現**

根據代碼分析（line 2077-2087），Shopline API 的特性：
- ❌ **一次只能移動一個分類** - 無 batch endpoint
- ⚠️ **速率限制不明** - 代碼未檢查速率限制頭
- ⚠️ **時序敏感** - 可能存在競態條件
- ✅ **副作用安全** - 重複呼叫同一操作似乎是冪等的

### API 調用流程

```
單個移動操作
├─ 本地更新 (immediate)
│  ├─ 從源陣列移除
│  └─ 添加到目標陣列
├─ 觸發 Angular $apply (synchronous)
├─ 調用 API PUT (async/await)
│  ├─ 提取 shopId
│  ├─ 獲取 CSRF token
│  ├─ 發送請求
│  └─ 解析響應 (200ms-2s)
└─ 顯示結果反饋

平均耗時: 200-2000ms（含網路延遲）
```

---

## 批量操作可行性

### 方案 A: 真正的批量操作（不可行❌）

```javascript
// ❌ Shopline 不支持
PUT /api/admin/v1/{shopId}/categories/batch-ordering
{
  "operations": [
    {"categoryId": "123", "parent": "456"},
    {"categoryId": "789", "parent": "456"},
    ...
  ]
}
```

**局限**：
- Shopline API 無此端點
- 需要後端支持（超出 UserScript/Extension 能力範圍）

### 方案 B: 隊列式批量（可行✅）

```
使用者選擇多個分類並移動
         │
         ▼
批量驗證層（本地）
├─ 層級驗證（3層限制）
├─ 衝突檢查（不允許移動到自身）
└─ 優化順序（先移動父分類再移動子分類）
         │
         ▼
隊列執行層
├─ 分類 1 移動 ─────► API call ─► 等待 200-2000ms
├─ 分類 2 移動 ─────► API call ─► 等待 200-2000ms
├─ 分類 3 移動 ─────► API call ─► 等待 200-2000ms
└─ ...
         │
         ▼
進度追蹤 + 結果反饋
├─ 3/10 完成 (30%)
├─ ✅ 分類A 成功
├─ ❌ 分類B 失敗（原因）
└─ ⏳ 分類C 進行中
```

### 批量操作架構

#### 排隊管理器（Queue Manager）

```javascript
class BatchOperationQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.results = [];
    this.maxConcurrency = 1;  // Shopline API 似乎不支持並發
    this.requestDelayMs = 100; // 請求間隔（尊重 API）
  }

  async addBatch(operations) {
    // operations: Array<{category, targetParent, title}>
    this.queue.push(...operations);
    this.executeQueue();
  }

  async executeQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    for (let i = 0; i < this.queue.length; i++) {
      const op = this.queue[i];

      try {
        console.log(`[Queue] 執行 ${i + 1}/${this.queue.length}...`);

        // 更新 UI 進度
        this.notifyProgress(i + 1, this.queue.length);

        // 執行操作
        const result = await this.categoryManager.moveCategory(
          op.category,
          op.targetParent
        );

        this.results.push({
          title: op.title,
          success: result,
          timestamp: new Date()
        });

        // 請求間隔（避免速率限制）
        await this.delay(this.requestDelayMs);

      } catch (error) {
        this.results.push({
          title: op.title,
          success: false,
          error: error.message,
          timestamp: new Date()
        });
      }
    }

    this.isProcessing = false;
    this.notifyComplete();
  }

  notifyProgress(current, total) {
    // 更新 UI 進度條、數字
  }

  notifyComplete() {
    // 顯示統計結果
  }
}
```

#### 性能預期

| 操作數 | 預期耗時 | 說明 |
|--------|---------|------|
| 5 個 | 1-10 秒 | 快速操作 |
| 10 個 | 2-20 秒 | 中等 |
| 50 個 | 10-100 秒 | 需要進度提示 |
| 100+ | > 2 分鐘 | 不建議 |

### 批量操作 UI 設計

```
┌──────────────────────────────────────────┐
│ 📋 批量移動模式                           │
├──────────────────────────────────────────┤
│ 選擇目標分類: [女裝/上衣 ▼]              │
├──────────────────────────────────────────┤
│ 待移動項目 (8 個)：                      │
│ ☑ T-shirt                               │
│ ☑ 襯衫                                   │
│ ☑ Polo衫                                │
│ ☑ 短袖上衣                              │
│ ☑ 長袖上衣                              │
│ ☐ 背心                                   │
│ ☐ 毛衣                                   │
│ ☐ 其他                                   │
│                                          │
│ 已選: 5/8 個                             │
├──────────────────────────────────────────┤
│ [執行批量移動] [取消] [全選] [全不選]   │
└──────────────────────────────────────────┘
```

#### 進度條界面

```
┌──────────────────────────────────────────┐
│ ⏳ 批量移動進行中...                     │
├──────────────────────────────────────────┤
│ 進度: █████████░░░░░░░░░░ 50% (5/10)   │
├──────────────────────────────────────────┤
│ 完成:                                    │
│ ✅ T-shirt → 女裝/上衣 (0.8s)           │
│ ✅ 襯衫 → 女裝/上衣 (1.2s)              │
│ ✅ Polo衫 → 女裝/上衣 (0.9s)            │
│ ✅ 短袖上衣 → 女裝/上衣 (1.1s)          │
│ ✅ 長袖上衣 → 女裝/上衣 (0.7s)          │
│ ⏳ 背心 → 女裝/上衣 (進行中...)         │
│                                          │
│ 失敗: (目前無)                           │
├──────────────────────────────────────────┤
│ [暫停] [取消]                           │
└──────────────────────────────────────────┘
```

---

## 匯出/匯入設計

### 匯出功能

**格式**：JSON（最靈活）或 CSV（最通用）

#### JSON 格式 - 完整結構

```json
{
  "version": "1.0",
  "exportDate": "2026-01-20",
  "shopId": "12345",
  "categories": [
    {
      "id": "cat_001",
      "name": "女裝",
      "level": 1,
      "parentId": null,
      "children": [
        {
          "id": "cat_002",
          "name": "上衣",
          "level": 2,
          "parentId": "cat_001",
          "children": [
            {
              "id": "cat_003",
              "name": "T-shirt",
              "level": 3,
              "parentId": "cat_002"
            }
          ]
        }
      ]
    }
  ]
}
```

**優勢**：
- ✅ 完整結構信息（層級、parent 關係）
- ✅ 支持嵌套（對應分類樹）
- ✅ 容易驗證和轉換

#### CSV 格式 - 簡化列表

```csv
分類ID,分類名稱,父級ID,父級名稱,層級,排序
cat_001,女裝,,根目錄,1,0
cat_002,上衣,cat_001,女裝,2,0
cat_003,T-shirt,cat_002,上衣,3,0
cat_004,襯衫,cat_002,上衣,3,1
```

**優勢**：
- ✅ Excel/Google Sheets 相容
- ✅ 便於手動編輯
- ❌ 無法完全表達樹結構

### 匯入功能

**兩種匯入模式**

#### 模式 1: 覆蓋現有結構（危險⚠️）

```
原始結構                匯入後
女裝                    女性服飾 (新名稱)
├─ 上衣                 ├─ 上半身衣著
└─ 下裝                 └─ 下半身衣著

風險：完全改變現有結構
```

#### 模式 2: 增量匯入（安全✅）

```
只移動、不新增或刪除
- 匯入清單中的分類會被移到指定位置
- 不在匯入清單中的分類保持不變
- 自動解析層級限制衝突
```

### 匯出/匯入核心邏輯

```javascript
class CategoryExportImport {
  // ==================== 匯出 ====================

  /**
   * 匯出當前分類結構
   */
  export(format = 'json') {
    const categories = this.categoryManager.categories;

    if (format === 'json') {
      return this.exportAsJSON(categories);
    } else if (format === 'csv') {
      return this.exportAsCSV(categories);
    }
  }

  exportAsJSON(categories) {
    return {
      version: "1.0",
      exportDate: new Date().toISOString(),
      shopId: this.getShopId(),
      categories: this.serializeCategories(categories)
    };
  }

  exportAsCSV(categories) {
    const rows = [];
    const flatList = this.flattenCategories(categories);

    rows.push('分類ID,分類名稱,父級ID,父級名稱,層級,排序');

    flatList.forEach((cat, index) => {
      rows.push([
        cat.id,
        cat.name,
        cat.parentId || '',
        cat.parentName || '',
        cat.level,
        index
      ].join(','));
    });

    return rows.join('\n');
  }

  // ==================== 匯入 ====================

  /**
   * 驗證匯入文件
   */
  validateImportFile(data) {
    const errors = [];
    const warnings = [];

    if (!data.version) {
      errors.push('缺少版本信息');
    }

    if (!data.categories || !Array.isArray(data.categories)) {
      errors.push('分類數據格式錯誤');
      return { valid: false, errors, warnings };
    }

    // 驗證分類層級
    data.categories.forEach(cat => {
      if (this.isDescendantOf(cat, cat)) {
        errors.push(`分類 ${cat.name} 無法作為自身的子級`);
      }
    });

    // 警告：結構與現有不同
    if (data.shopId !== this.getShopId()) {
      warnings.push(`此文件來自不同店鋪 (${data.shopId})，某些操作可能失敗`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 執行匯入
   * @param data 匯入的分類數據
   * @param mode 'override' 或 'incremental'
   */
  async importCategories(data, mode = 'incremental') {
    // 驗證
    const validation = this.validateImportFile(data);
    if (!validation.valid) {
      throw new Error(`驗證失敗: ${validation.errors.join('; ')}`);
    }

    const operations = [];

    if (mode === 'incremental') {
      // 增量模式：只移動現有分類
      operations = this.generateIncrementalOperations(data);
    } else if (mode === 'override') {
      // 覆蓋模式：刪除所有現有並重建（需謹慎）
      operations = this.generateOverrideOperations(data);
    }

    // 使用批量隊列執行
    const queue = new BatchOperationQueue();
    await queue.addBatch(operations);

    return queue.results;
  }

  /**
   * 生成增量操作
   * 只操作匯入文件中存在的分類
   */
  generateIncrementalOperations(importData) {
    const operations = [];
    const currentMap = this.buildCategoryMap(this.categoryManager.categories);

    importData.categories.forEach(importedCat => {
      if (!currentMap.has(importedCat.id)) {
        console.warn(`分類 ${importedCat.name} (${importedCat.id}) 在當前系統中不存在，跳過`);
        return;
      }

      const currentCat = currentMap.get(importedCat.id);
      const targetParent = importData.categories.find(
        c => c.id === importedCat.parentId
      ) || null;

      // 如果父級不同，需要移動
      if (currentCat.parentId !== importedCat.parentId) {
        operations.push({
          category: currentCat,
          targetParent: targetParent,
          title: `${importedCat.name} → ${targetParent?.name || '根目錄'}`
        });
      }
    });

    return operations;
  }
}
```

---

## 排隊機制設計

### 核心要求

1. **順序執行** - 避免競態條件和 API 限制
2. **錯誤恢復** - 失敗時可繼續或回滾
3. **進度可視化** - 用戶知道正在進行
4. **可暫停/取消** - 長操作支持中斷

### 排隊狀態機

```
待機
  │
  ▼
正在執行 ◄──── 暫停
  │
  ├─► 單個操作
  │   ├─ API 呼叫
  │   └─ 等待響應
  │
  └─► 操作完成 ──► 記錄結果
      │
      ├─ 還有待執行 ───► 回到「執行」
      └─ 全部完成 ─────► 完成狀態

取消 ─► 中止並清除隊列
```

### 實作細節

```javascript
class QueueWorker {
  constructor() {
    this.queue = [];
    this.results = [];
    this.state = 'idle'; // idle, running, paused, cancelled, completed
    this.currentIndex = -1;
  }

  // 暫停功能
  pause() {
    this.state = 'paused';
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'running';
      this.processNext();
    }
  }

  // 取消功能
  cancel() {
    this.state = 'cancelled';
    this.queue = [];
  }

  // 核心執行邏輯
  async processNext() {
    if (this.state !== 'running') return;

    this.currentIndex++;

    if (this.currentIndex >= this.queue.length) {
      this.state = 'completed';
      return;
    }

    const operation = this.queue[this.currentIndex];

    try {
      const result = await operation.execute();
      this.results.push({ ...operation, result, success: true });
    } catch (error) {
      this.results.push({ ...operation, error, success: false });
    }

    // 延遲後繼續
    setTimeout(() => this.processNext(), 100);
  }
}
```

---

## 功能對比與建議

### Phase 1 vs Phase 2 功能對比

| 功能 | Phase 1 (MVP) | Phase 2 (增強) | Phase 3 (進階) |
|------|---------------|----------------|----------------|
| 單個移動 | ✅ | ✅ | ✅ |
| 快捷鍵 | ❌ | ✅ | ✅ |
| 側邊欄 | ❌ | ✅ | ✅ |
| **批量移動** | ❌ | ❌ | ✅ |
| **匯出結構** | ❌ | ✅ | ✅ |
| **匯入結構** | ❌ | ❌ | ✅ |
| **進度追蹤** | ❌ | ✅ | ✅ |

### 建議方案

#### 選項 A: 最小化（12小時）

**包含**:
- Phase 1 MVP
- 簡單統計 Popup

**不包含**:
- 批量移動
- 匯出/匯入

**適合**: 驗證 Extension 可行性

---

#### 選項 B: 實用化（18小時）⭐ **推薦**

**包含**:
- Phase 1 MVP
- 統計 Popup + 側邊欄
- **匯出功能**（JSON + CSV）
- **驗證層**（匯入前檢查）

**不包含**:
- 批量移動
- 自動匯入執行

**優勢**:
- 用戶可以備份結構
- 用戶可以手動編輯 JSON/CSV 並驗證
- 為未來匯入預留架構

**使用流程**:
```
1. 匯出當前結構為 JSON
2. 外部編輯 (例如 JSON editor 或 Google Sheets)
3. 驗證修改後的文件（系統提示衝突）
4. 手動執行移動操作（已有的 UI）
```

---

#### 選項 C: 完整化（26小時）

**包含**:
- Option B 所有功能
- **批量移動** UI + 隊列執行
- **自動匯入** 執行（增量模式）
- **進度條**和實時反饋

**優勢**:
- 一站式解決方案
- 支持大規模分類重組

**成本**:
- Extension 複雜度增加
- QA 工作加倍

---

### 我的建議 💡

**短期（立即）**：
1. **實施 Option B（選項 B）** - 18 小時
2. 先做 Phase 1 MVP（12h）
3. 再加匯出功能（6h）

**為什麼不選 C？**
- 批量操作需要複雜的隊列管理
- 錯誤恢復邏輯會大幅增加
- 我會從 Option B 的反饋中學到更多需求

**後期（Phase 2）**：
1. 根據用戶反饋評估是否需要自動匯入
2. 如果需要，加入批量移動（可獨立開發）

---

## API 速率限制風險

### 未知的限制

根據代碼，Shopline API 似乎：
- ❓ 沒有明確的速率限制頭（X-RateLimit-*）
- ❓ 沒有公開的文檔說明限制

### 保守策略

```javascript
// 配置建議
const QUEUE_CONFIG = {
  maxConcurrency: 1,           // 始終串行執行
  requestDelayMs: 200,         // 200ms 間隔（可調）
  maxRetries: 3,               // 失敗重試 3 次
  retryDelayMs: 1000,          // 重試延遲 1s
  maxBatchSize: 50,            // 單次不超過 50 個
  warningThreshold: 10,        // 10+ 個操作警告用戶
};
```

---

## 附錄

### A. 匯出檔案示例

**shopline_categories_export_2026-01-20.json**
```json
{
  "version": "1.0",
  "exportDate": "2026-01-20T10:30:00Z",
  "shopId": "shopline_12345",
  "categories": [
    {
      "id": "cat_5f1a2b3c",
      "name": "女裝",
      "seo_title": "Women's Clothing",
      "level": 1,
      "parentId": null,
      "position": 0,
      "children": [
        {
          "id": "cat_6f2b3c4d",
          "name": "上衣",
          "level": 2,
          "parentId": "cat_5f1a2b3c",
          "position": 0,
          "children": [
            {
              "id": "cat_7f3c4d5e",
              "name": "T-Shirt",
              "level": 3,
              "parentId": "cat_6f2b3c4d",
              "position": 0
            }
          ]
        }
      ]
    }
  ]
}
```

### B. 匯入檢查清單

```
匯入前驗證:
☐ 版本相容
☐ shopId 匹配或警告
☐ 不存在圓形依賴（A→B→A）
☐ 分類 ID 在系統中存在
☐ 目標層級不超過 3
☐ 無衝突（同級分類名稱重複等）

匯入中:
☐ 按正確順序移動（父級優先）
☐ 記錄每一步操作
☐ 失敗時提供清楚的錯誤信息
☐ 允許暫停/恢復

匯入後:
☐ 統計成功/失敗數
☐ 允許一鍵回滾
☐ 保存操作日誌
```

### C. 相關代碼位置

當前代碼中相關函數：
- `saveCategoryOrderingToServer()` (line 2012) - API 調用
- `moveCategory()` (line 1720) - 單個移動邏輯
- `getCategoryDescendants()` (line 89) - 層級計算
- `CategoryManager` class (line 259) - 主類
