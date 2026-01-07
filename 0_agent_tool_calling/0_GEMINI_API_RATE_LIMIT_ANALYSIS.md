# Gemini API 速率限制問題分析與解決方案

## 🎯 Gemini 2.5 Pro 實際速率限制 (已確認)

**模型**: Gemini 2.5 Pro (免費版)
**更新時間**: 2025-10-25 16:30

### 官方配額限制
- **RPM (Requests Per Minute)**: ~60 次/分鐘
- **RPD (Requests Per Day)**: ~100 次/天
- **Context Window**: 每次呼叫獨立計算，建議充分利用大 context window

### 實際使用建議
1. **最小間隔**: 2 秒（保守策略，理論上可 1 秒 1 次）
2. **推薦間隔**: 10 秒（更保守，降低觸發限制風險）
3. **每日配額監控**: 達到 50% (50次) 時提示，80% (80次) 時警告
4. **充分利用 Context Window**: 一次呼叫盡量帶入完整資訊，減少呼叫次數

---

## 📋 問題摘要

**發生時間**: 2025-10-25 08:42:52
**任務**: Task 5.1.3 - 審查測試數據格式設計
**狀態**: ❌ 失敗 (HTTP 429 - Resource Exhausted)

---

## 🔍 錯誤詳情

### 錯誤代碼
```
HTTP 429 - Too Many Requests
Status: RESOURCE_EXHAUSTED
Reason: rateLimitExceeded
```

### 完整錯誤訊息
```json
{
  "error": {
    "code": 429,
    "message": "Resource exhausted. Please try again later. Please refer to https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429 for more details.",
    "errors": [
      {
        "message": "Resource exhausted. Please try again later...",
        "domain": "global",
        "reason": "rateLimitExceeded"
      }
    ],
    "status": "RESOURCE_EXHAUSTED"
  }
}
```

### API 端點
```
POST https://cloudcode-pa.googleapis.com/v1internal:streamGenerateContent?alt=sse
```

### 使用的 CLI
```bash
gemini -p "請審查 tests/fixtures/test-data-schema.json..."
```

### 重試行為
- Gemini CLI 內建重試機制 (使用 exponential backoff)
- 重試 1 次後仍然失敗
- `server-timing: gfet4t7; dur=13670` (13.67 秒處理時間)

---

## 🎯 根本原因分析

### 1. **速率限制觸發條件**

根據 Google Vertex AI 文檔，429 錯誤可能由以下原因觸發：

#### a) **QPM (Queries Per Minute) 限制**
- **免費層級**: 通常為 15-60 QPM
- **付費層級**: 可達 300-1000+ QPM
- **當前使用狀況**: 短時間內可能有多次 API 呼叫

#### b) **TPM (Tokens Per Minute) 限制**
- **輸入 Token**: 提示詞過長
- **輸出 Token**: 預期回應長度
- **當前提示詞**: ~500+ tokens (包含文件路徑、審查要求、輸出格式)

#### c) **RPD (Requests Per Day) 限制**
- 累積使用量達到每日配額
- 可能之前有其他測試或開發活動消耗配額

### 2. **時間窗口問題**

```
Timeline:
08:40:00 - Task 5.1.2 完成 (Codex 執行)
08:40:02 - Task 5.1.3 開始
08:41:00 - 建立 test-data-schema.json
08:42:00 - 呼叫 Gemini API
08:42:52 - 收到 429 錯誤 (52 秒後)
08:50:00 - Gemini 完成處理 (但已失敗)
```

**觀察**:
- API 呼叫處理時間: 13.67 秒
- 總等待時間: ~8 分鐘 (包含重試)
- **可能原因**: 前面有其他 Gemini 使用 (可能是其他終端/項目)

### 3. **CLI 工具版本**

```
GeminiCLI/v24.2.0 (darwin; arm64)
google-api-nodejs-client/9.15.1
```

---

## ⚠️ 速率限制的影響

### 對當前工作流的影響

| 階段 | Gemini 角色 | 影響程度 |
|------|------------|---------|
| **Task 5.1.3** | 審查測試數據格式 | 🟡 中度 (已由 Claude 替代完成) |
| **Task 5.1.4** | 審查 OCR 投票測試 | 🔴 高度 (必須有 Gemini 審查) |
| **Task 5.1.5** | 數字混淆測試 | 🟡 中度 |
| **Task 5.1.6** | 端到端測試審查 | 🔴 高度 |
| **Task 5.2.x** | 代碼重構審查 | 🔴 高度 (大型代碼審查) |

### Gemini 的獨特優勢（不應放棄使用）

1. **超大 Context Window**
   - Gemini 2.0: 2M tokens (遠超 Claude 200K)
   - **用途**: 完整閱讀 1179 行的 ocrVotingCoordinator.js
   - **用途**: 同時分析多個相關文件進行重構設計

2. **代碼理解能力**
   - 擅長大型代碼庫的結構分析
   - 快速識別設計模式和反模式
   - 精確的依賴關係追蹤

3. **多語言支持**
   - 繁體中文輸出質量高
   - 技術術語翻譯準確

---

## 💡 解決方案

### 🚀 立即可執行方案 (短期)

#### 方案 1: 智能等待與重試
```bash
# 檢查當前配額狀態
gcloud auth list
gcloud config get-value project

# 等待 1-5 分鐘後重試 (速率限制通常是分鐘級別)
sleep 60

# 重試 Gemini 呼叫
gemini -p "簡短提示詞..."
```

**實施步驟**:
1. ✅ 記錄上次 Gemini 呼叫時間
2. ✅ 在下次呼叫前等待至少 60 秒
3. ✅ 縮短提示詞長度 (< 300 tokens)
4. ✅ 使用 `--max-output-tokens` 限制回應長度

#### 方案 2: 分批處理大型任務
```bash
# ❌ 錯誤做法：一次性審查所有內容
gemini -p "審查這 7 個測試類別、23 個案例、所有混淆對..."

# ✅ 正確做法：分批審查
gemini -p "審查測試數據的結構設計"
sleep 60
gemini -p "審查邊界情況覆蓋"
sleep 60
gemini -p "審查混淆對覆蓋"
```

**實施步驟**:
1. 將大型審查任務拆分為 3-5 個小任務
2. 每個任務之間等待 60-90 秒
3. 合併各批次的審查結果

#### 方案 3: 使用本地文件減少 Token 消耗
```bash
# ❌ 在提示詞中包含大量內容
gemini -p "審查以下 JSON: {大量數據...}"

# ✅ 使用文件參考 + 精簡提示詞
gemini -p "審查 tests/fixtures/test-data-schema.json 的結構合理性，重點關注：
1. 邊界情況
2. 錯誤處理
3. 可擴展性
用 3-5 個要點總結。"
```

---

### 🏗️ 架構級解決方案 (中期)

#### 方案 4: 實施智能 LLM 路由器

建立 `llm-router.js` 工具來智能分配任務：

```javascript
/**
 * LLM 任務路由器
 * 根據任務特性、API 配額狀態智能選擇 LLM
 */
class LLMRouter {
  constructor() {
    this.lastGeminiCall = null;
    this.geminiCallCount = 0;
    this.minInterval = 60000; // 60 秒最小間隔
  }

  /**
   * 選擇最適合的 LLM
   */
  selectLLM(task) {
    const { type, contextSize, priority, timeoutMs } = task;

    // Gemini 優先使用場景
    if (contextSize > 100000) {
      return this.tryGemini(task);
    }

    // Claude 優先使用場景
    if (priority === 'urgent' || type === 'architecture') {
      return 'claude';
    }

    // Codex 優先使用場景
    if (type === 'code-generation') {
      return 'codex';
    }

    // 檢查 Gemini 可用性
    if (this.isGeminiAvailable()) {
      return 'gemini';
    }

    return 'claude'; // 默認降級
  }

  tryGemini(task) {
    const now = Date.now();
    const timeSinceLastCall = now - (this.lastGeminiCall || 0);

    if (timeSinceLastCall < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastCall;
      console.log(`⏳ Gemini 冷卻中，等待 ${waitTime/1000} 秒...`);

      // 選項 1: 主動等待
      // await sleep(waitTime);

      // 選項 2: 降級到 Claude
      console.log(`⚡ 降級使用 Claude 以避免延遲`);
      return 'claude';
    }

    this.lastGeminiCall = now;
    this.geminiCallCount++;
    return 'gemini';
  }

  isGeminiAvailable() {
    // 檢查速率限制狀態
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    const callsThisMinute = this.getCallsInMinute(minute);

    return callsThisMinute < 10; // 假設 QPM 限制為 15，保守使用 10
  }
}
```

**使用方式**:
```javascript
const router = new LLMRouter();

// Task 5.1.4: OCR 投票測試審查
const llm = router.selectLLM({
  type: 'code-review',
  contextSize: 50000,
  priority: 'normal',
  timeoutMs: 60000
});

if (llm === 'gemini') {
  await execGemini('審查 OCR 投票測試...');
} else {
  await execClaude('審查 OCR 投票測試...');
}
```

---

### 🔧 配置級解決方案 (長期)

#### 方案 5: 升級 Gemini API 配額

**選項 A: 申請提高配額**
```bash
# 檢查當前配額
gcloud alpha services quota describe \
  --service=aiplatform.googleapis.com \
  --quota-id=GenerateContentRequests-per-minute-per-project

# 申請提高配額（需要 Google Cloud Console）
# 前往: https://console.cloud.google.com/iam-admin/quotas
# 搜尋: "Gemini API"
# 申請提高 QPM, TPM, RPD
```

**目標配額**:
- QPM: 60 → 300
- TPM: 1M → 5M
- RPD: 1000 → 10000

**成本估算**:
- 免費層級: $0 (有限配額)
- Pay-as-you-go: ~$0.001 per 1K tokens
- 預估月成本: < $50 (基於當前使用量)

#### 方案 6: 多 API Key 輪換

```bash
# 配置多個 Gemini API Keys
export GEMINI_API_KEY_1="key1..."
export GEMINI_API_KEY_2="key2..."
export GEMINI_API_KEY_3="key3..."

# 建立輪換機制
function gemini-with-rotation() {
  local keys=($GEMINI_API_KEY_1 $GEMINI_API_KEY_2 $GEMINI_API_KEY_3)
  local index=$((RANDOM % ${#keys[@]}))

  GEMINI_API_KEY=${keys[$index]} gemini "$@"
}
```

---

## 📊 最佳實踐指南

### ✅ DO: 應該這樣做

1. **速率限制意識**
   ```bash
   # 記錄每次 Gemini 呼叫
   echo "$(date +%s) - Gemini called for task X" >> .gemini-calls.log

   # 檢查間隔
   last_call=$(tail -1 .gemini-calls.log | cut -d' ' -f1)
   now=$(date +%s)
   interval=$((now - last_call))

   if [ $interval -lt 60 ]; then
     echo "⚠️ 距離上次呼叫僅 $interval 秒，建議等待"
   fi
   ```

2. **精簡提示詞**
   ```bash
   # ✅ 好的提示詞 (< 200 tokens)
   gemini -p "審查 OCR 投票機制，重點：1) 加權投票 2) 位置合成 3) 共識投票。列出 3 個改進建議。"

   # ❌ 糟糕的提示詞 (> 500 tokens)
   gemini -p "請詳細審查 tests/fixtures/test-data-schema.json 這個測試數據格式設計。
   審查重點：1. 邊界情況覆蓋: 是否涵蓋所有重要的邊界情況？
   2. 錯誤場景處理: 錯誤測試案例是否完整？
   3. 測試分類合理性: 七個測試類別是否邏輯清晰且不重疊？..."
   ```

3. **批次處理與等待**
   ```bash
   # 審查大型文件時分批處理
   tasks=(
     "結構設計"
     "邊界情況"
     "錯誤處理"
     "性能閾值"
   )

   for task in "${tasks[@]}"; do
     echo "📝 審查: $task"
     gemini -p "審查測試數據的${task}，3 個要點"
     sleep 90  # 等待 90 秒
   done
   ```

4. **使用本地緩存**
   ```bash
   # 緩存 Gemini 審查結果
   cache_file=".gemini-cache/$(echo "$prompt" | md5).json"

   if [ -f "$cache_file" ]; then
     echo "💾 使用緩存結果"
     cat "$cache_file"
   else
     gemini -p "$prompt" | tee "$cache_file"
   fi
   ```

5. **設定超時與降級**
   ```bash
   # 帶超時的 Gemini 呼叫
   timeout 120s gemini -p "..." || {
     echo "⚠️ Gemini 超時或失敗，降級使用 Claude"
     claude_code_prompt "..."
   }
   ```

### ❌ DON'T: 不應該這樣做

1. **❌ 連續快速呼叫**
   ```bash
   # 錯誤：無間隔連續呼叫
   gemini -p "審查測試 1"
   gemini -p "審查測試 2"  # 立即呼叫，容易觸發 429
   gemini -p "審查測試 3"
   ```

2. **❌ 超長提示詞**
   ```bash
   # 錯誤：在提示詞中包含整個文件內容
   file_content=$(cat large-file.json)
   gemini -p "審查以下內容: $file_content ..."
   ```

3. **❌ 忽略錯誤**
   ```bash
   # 錯誤：不處理 429 錯誤
   gemini -p "..." || echo "失敗了，繼續"
   ```

4. **❌ 硬編碼重試**
   ```bash
   # 錯誤：固定重試次數不考慮間隔
   for i in {1..10}; do
     gemini -p "..." && break
   done
   ```

---

## 🎬 執行計劃：恢復 Gemini 正常使用

### Phase 1: 立即修復 (0-5 分鐘)

#### Step 1: 等待冷卻
```bash
# 當前時間: 08:50
# 上次 Gemini 呼叫: 08:42
# 已經過: 8 分鐘 ✅

# 建議：再等待 2-3 分鐘確保安全
sleep 180
```

#### Step 2: 測試連接
```bash
# 使用極簡提示詞測試
gemini -p "Hello, 測試連接" --max-output-tokens 10
```

**預期結果**:
- ✅ 成功：收到簡短回應 → Gemini 已恢復
- ❌ 失敗 429：需要繼續等待或檢查配額

#### Step 3: 漸進式恢復使用
```bash
# 第一次呼叫：簡短任務
gemini -p "列出 3 個測試最佳實踐"
sleep 60

# 第二次呼叫：中等任務
gemini -p "審查這個測試結構：{簡要描述}"
sleep 90

# 第三次呼叫：完整任務
gemini -p "完整審查 tests/fixtures/test-data.json"
```

### Phase 2: 建立防護機制 (5-15 分鐘)

#### Step 4: 建立速率限制追蹤器
```bash
# 建立 .gemini-tracker.sh
cat > .gemini-tracker.sh << 'EOF'
#!/bin/bash

LOG_FILE=".gemini-calls.log"
MIN_INTERVAL=60  # 秒

log_call() {
  echo "$(date +%s)|$1" >> $LOG_FILE
}

check_rate_limit() {
  if [ ! -f "$LOG_FILE" ]; then
    return 0
  fi

  last_call=$(tail -1 $LOG_FILE | cut -d'|' -f1)
  now=$(date +%s)
  interval=$((now - last_call))

  if [ $interval -lt $MIN_INTERVAL ]; then
    wait_time=$((MIN_INTERVAL - interval))
    echo "⏳ 距離上次呼叫 $interval 秒，需等待 $wait_time 秒"
    return 1
  fi

  return 0
}

safe_gemini() {
  if ! check_rate_limit; then
    echo "❌ 速率限制保護：請稍後重試"
    return 1
  fi

  log_call "$1"
  gemini -p "$1"
}

EOF

chmod +x .gemini-tracker.sh
source .gemini-tracker.sh
```

**使用方式**:
```bash
# 安全呼叫 Gemini
safe_gemini "審查測試數據格式"
```

#### Step 5: 更新 tasks.md 任務執行策略
```markdown
## Gemini 使用準則

### 優先使用 Gemini 的場景
1. **大型代碼審查** (> 500 行)
   - ocrVotingCoordinator.js (1179 lines)
   - 完整模組重構設計
2. **跨文件依賴分析**
   - 追蹤函數調用鏈
   - 識別循環依賴
3. **批次代碼質量檢查**
   - 統一命名規範審查
   - 設計模式識別

### Gemini 呼叫間隔要求
- **最小間隔**: 60 秒
- **推薦間隔**: 90 秒
- **大型任務後**: 120 秒

### 降級策略
如果 Gemini 不可用：
1. **代碼審查** → Claude (feature-dev:code-reviewer agent)
2. **架構設計** → Claude (直接對話)
3. **代碼生成** → Codex
```

### Phase 3: 優化工作流 (15-30 分鐘)

#### Step 6: 重新設計 Task 5.1.4 執行方案

**原計劃**:
```bash
# Codex: 編寫測試
codex exec "為 OCR 投票機制編寫測試..."

# Gemini: 立即審查 (❌ 容易觸發 429)
gemini -p "審查 OCR 投票測試..."
```

**優化方案**:
```bash
# Step 1: Codex 編寫測試
codex exec "為 OCR 投票機制編寫測試..."

# Step 2: 等待冷卻
sleep 90

# Step 3: Gemini 審查（分批）
safe_gemini "審查 tests/unit/ocr/voting/ 的測試結構，3 個要點"
sleep 90

safe_gemini "審查加權投票測試的邊界情況"
sleep 90

safe_gemini "審查測試的 Mock 使用是否恰當"
```

#### Step 7: 建立 LLM 協作模板
```bash
# 建立 .llm-collab-template.sh
cat > .llm-collab-template.sh << 'EOF'
#!/bin/bash

# Multi-LLM 協作任務模板

task_name="$1"
code_task="$2"
review_aspects="$3"

echo "🚀 開始任務: $task_name"

# Phase 1: Codex 生成代碼
echo "📝 Phase 1: Codex 代碼生成"
codex exec "$code_task"
echo "✅ Codex 完成"

# Phase 2: 等待冷卻
echo "⏳ 等待 90 秒後進行審查..."
sleep 90

# Phase 3: Gemini 審查
echo "🔍 Phase 2: Gemini 代碼審查"
source .gemini-tracker.sh

IFS=',' read -ra ASPECTS <<< "$review_aspects"
for aspect in "${ASPECTS[@]}"; do
  echo "  審查: $aspect"
  safe_gemini "審查 $task_name 的 $aspect"
  sleep 90
done

echo "✅ 任務完成: $task_name"
EOF

chmod +x .llm-collab-template.sh
```

**使用範例**:
```bash
./llm-collab-template.sh \
  "OCR投票測試" \
  "編寫 OCR 投票機制的單元測試" \
  "測試結構,邊界情況,Mock使用"
```

---

## 📈 監控與驗證

### 建立 Gemini 使用儀表板
```bash
# 分析 Gemini 使用情況
cat > analyze-gemini-usage.sh << 'EOF'
#!/bin/bash

LOG_FILE=".gemini-calls.log"

if [ ! -f "$LOG_FILE" ]; then
  echo "📊 無使用記錄"
  exit 0
fi

total_calls=$(wc -l < $LOG_FILE)
now=$(date +%s)
last_hour_calls=$(awk -v cutoff=$((now - 3600)) '$1 > cutoff' $LOG_FILE | wc -l)
last_minute_calls=$(awk -v cutoff=$((now - 60)) '$1 > cutoff' $LOG_FILE | wc -l)

echo "📊 Gemini API 使用統計"
echo "━━━━━━━━━━━━━━━━━━━━━"
echo "總呼叫次數: $total_calls"
echo "最近 1 小時: $last_hour_calls"
echo "最近 1 分鐘: $last_minute_calls"
echo ""

if [ $last_minute_calls -ge 10 ]; then
  echo "⚠️  警告：最近 1 分鐘呼叫過於頻繁"
elif [ $last_minute_calls -ge 5 ]; then
  echo "⚡ 提示：接近速率限制"
else
  echo "✅ 使用量正常"
fi

# 計算平均間隔
intervals=()
prev_time=0
while IFS='|' read -r timestamp task; do
  if [ $prev_time -ne 0 ]; then
    interval=$((timestamp - prev_time))
    intervals+=($interval)
  fi
  prev_time=$timestamp
done < $LOG_FILE

if [ ${#intervals[@]} -gt 0 ]; then
  avg_interval=$(( $(IFS=+; echo "${intervals[*]}") / ${#intervals[@]} ))
  echo "平均間隔: $avg_interval 秒"
fi
EOF

chmod +x analyze-gemini-usage.sh
```

---

## ✅ 檢查清單：恢復 Gemini 使用前

在繼續使用 Gemini 之前，請確認：

- [ ] 距離上次 Gemini 呼叫 ≥ 5 分鐘
- [ ] 已建立 `.gemini-tracker.sh` 速率限制保護
- [ ] 已測試簡短提示詞連接正常
- [ ] 已更新 tasks.md 的 Gemini 使用策略
- [ ] 已準備降級方案 (Claude/Codex)
- [ ] 已分批規劃 Task 5.1.4 的審查任務
- [ ] 已設定每次呼叫間隔 ≥ 90 秒

---

## 🎯 針對 Task 5.1.4 的具體建議

### 原始計劃
```bash
# Task 5.1.4: 建立 OCR 投票核心邏輯測試
# Codex: 編寫測試
# Gemini: 審查測試
```

### 優化後執行計劃

#### Step 1: Codex 生成測試 (預估 3 分鐘)
```bash
codex exec "為 OCR 投票機制編寫完整的單元測試，包括：
1. 加權投票測試
2. 共識投票測試
3. 數字混淆檢測測試
4. 位置合成測試
5. 候選生成測試

使用 Jest，覆蓋率要求 ≥ 80%"
```

#### Step 2: 等待冷卻 (2 分鐘)
```bash
echo "⏳ 等待 120 秒以確保 Gemini 可用..."
sleep 120
```

#### Step 3: Gemini 分批審查 (預估 5 分鐘)

**審查批次 1: 整體結構** (90 秒後)
```bash
safe_gemini "審查 tests/unit/ocr/voting/ 的測試文件結構和組織，列出 3 個要點"
sleep 90
```

**審查批次 2: 測試覆蓋** (再 90 秒後)
```bash
safe_gemini "檢查 OCR 投票測試的邊界情況覆蓋，找出 3 個遺漏場景"
sleep 90
```

**審查批次 3: Mock 策略** (再 90 秒後)
```bash
safe_gemini "評估測試中 Mock 的使用是否恰當，提供 2-3 個改進建議"
```

**總預估時間**: 3 (Codex) + 2 (等待) + 5 (Gemini 審查) = **10 分鐘**

---

## 📚 參考資源

1. **Google Cloud 文檔**
   - [Vertex AI Quotas](https://cloud.google.com/vertex-ai/generative-ai/docs/quotas)
   - [Error Code 429](https://cloud.google.com/vertex-ai/generative-ai/docs/error-code-429)

2. **最佳實踐**
   - [Rate Limiting Best Practices](https://cloud.google.com/apis/design/design_patterns#rate_limiting)
   - [Exponential Backoff](https://cloud.google.com/iot/docs/how-tos/exponential-backoff)

3. **工具文檔**
   - [Gemini CLI GitHub](https://github.com/google/generative-ai-docs)

---

## 📝 總結

### 問題本質
Gemini API 速率限制 (429) 主要由短時間內過多請求觸發，這是正常的配額保護機制。

### 核心解決思路
1. **智能等待**: 呼叫間隔 ≥ 60-90 秒
2. **精簡提示**: 提示詞 < 300 tokens
3. **分批處理**: 大任務拆分為 3-5 個小批次
4. **降級策略**: Gemini 不可用時使用 Claude

### Gemini 在重構中的價值
- ✅ **2M tokens context**: 可一次性閱讀整個 ocrVotingCoordinator.js
- ✅ **代碼理解**: 精確識別重構機會和依賴關係
- ✅ **批次審查**: 統一檢查命名規範、設計模式

### 行動計劃
1. 立即：等待 5 分鐘後測試 Gemini
2. 短期：建立速率限制保護機制
3. 中期：實施 LLM 路由器智能分配
4. 長期：考慮升級 API 配額

---

**最後更新**: 2025-10-25 08:50
**狀態**: ✅ 分析完成，等待執行恢復計劃
**下一步**: 執行 Phase 1 恢復步驟，然後繼續 Task 5.1.4
