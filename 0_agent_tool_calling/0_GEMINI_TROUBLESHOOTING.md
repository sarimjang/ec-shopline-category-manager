# Gemini CLI 故障排除指南

*基於實際遇到的 404 ModelNotFoundError 案例*

---

## 快速診斷流程

當 Gemini CLI 報錯時，按照這個順序診斷：

```
1. 查看 JSON 錯誤報告 (最重要！)
   ↓
2. 識別錯誤類型
   ↓
3. 應用對應的解決方案
   ↓
4. 驗證修復
```

---

## 常見錯誤類型

### 錯誤 1: ModelNotFoundError (404)

**症狀**
```bash
Error when talking to Gemini API
{
  "error": {
    "type": "Error",
    "message": "[object Object]",
    "code": 1
  }
}
```

**查看完整錯誤**
```bash
# 找到錯誤報告路徑（會在錯誤訊息中顯示）
cat /var/folders/.../gemini-client-error-*.json | python3 -m json.tool
```

**真正的錯誤內容**
```json
{
  "error": {
    "code": 404,
    "message": "Requested entity was not found.",
    "status": "NOT_FOUND"
  }
}
```

**根本原因**
- Gemini CLI 嘗試訪問的**模型不存在**
- 可能是：
  - 模型名稱錯誤（拼寫錯誤）
  - 模型版本已停用
  - 專案沒有權限訪問該模型
  - 區域不支援該模型

**解決方案**

1. **檢查可用模型列表**
```bash
# 如果已安裝 gcloud CLI
gcloud ai models list --project=YOUR_PROJECT_ID --region=us-central1

# 或直接詢問 Gemini CLI
gemini models
```

2. **檢查 Gemini CLI 配置**
```bash
# 查看當前使用的模型
gemini config show

# 可能顯示類似：
# model: gemini-2.5-pro-exp-1206  ← 這個模型可能不存在
```

3. **切換到可用模型**
```bash
# 使用穩定版本
gemini config set model gemini-2.0-flash-exp

# 或使用標準模型
gemini config set model gemini-pro
```

4. **驗證修復**
```bash
# 測試簡單對話
gemini -p "你好"

# 應該成功返回回應
```

---

### 錯誤 2: 認證失敗 (401/403)

**症狀**
```json
{
  "error": {
    "code": 401,
    "message": "Request is missing required authentication credential.",
    "status": "UNAUTHENTICATED"
  }
}
```

**解決方案**

1. **重新認證**
```bash
# 重新登入 Google 帳戶
gcloud auth application-default login

# 執行後會打開瀏覽器，完成 OAuth 授權
```

2. **檢查認證狀態**
```bash
# 列出已認證帳戶
gcloud auth list

# 應該看到一個帳戶標記為 ACTIVE
```

3. **檢查專案設定**
```bash
# 查看當前專案
gcloud config list

# 確認 project 指向正確的 Google Cloud 專案
```

---

### 錯誤 3: API 未啟用 (403)

**症狀**
```json
{
  "error": {
    "code": 403,
    "message": "Generative Language API has not been used in project...",
    "status": "PERMISSION_DENIED"
  }
}
```

**解決方案**

1. **啟用 API**
```bash
# 啟用 Generative Language API
gcloud services enable generativelanguage.googleapis.com --project=YOUR_PROJECT_ID

# 或啟用 Vertex AI API（如果使用 Vertex AI）
gcloud services enable aiplatform.googleapis.com --project=YOUR_PROJECT_ID
```

2. **檢查已啟用的 API**
```bash
gcloud services list --enabled --project=YOUR_PROJECT_ID | grep -i gemini
```

3. **透過 Console 啟用**
- 前往 [Google Cloud Console](https://console.cloud.google.com)
- 搜尋 "Generative Language API"
- 點擊 "啟用"

---

### 錯誤 4: 配額超限 (429)

**症狀**
```json
{
  "error": {
    "code": 429,
    "message": "Quota exceeded",
    "status": "RESOURCE_EXHAUSTED"
  }
}
```

**解決方案**

1. **檢查配額使用**
- 前往 [Google Cloud Console - Quotas](https://console.cloud.google.com/iam-admin/quotas)
- 搜尋 "Generative Language API"
- 查看當前使用量

2. **使用速率限制工具**
```bash
# 使用 0_gemini-tracker.md 中的 safe_gemini 函數
source 0_tool_calling/0_gemini-tracker.md

# 使用受限制的呼叫
safe_gemini "你的問題" "任務名稱"
```

3. **申請提高配額**
- 在 Google Cloud Console 中申請提高 API 配額
- 或等待配額重置（通常是每分鐘或每天重置）

---

## 診斷工具箱

### 工具 1: 查看完整錯誤報告

```bash
# 錯誤報告通常儲存在 /var/folders/.../ 或 /tmp/
# 路徑會在錯誤訊息中顯示

# 使用 Python 格式化 JSON
cat ERROR_FILE.json | python3 -m json.tool

# 或使用 jq（如果已安裝）
cat ERROR_FILE.json | jq '.'
```

### 工具 2: 測試 API 連接

```bash
# 方法 1: 使用 Gemini CLI
gemini -p "測試訊息"

# 方法 2: 使用 gcloud（需要專案 ID）
gcloud ai models list --project=YOUR_PROJECT_ID --region=us-central1

# 方法 3: 使用 curl（繞過 CLI）
ACCESS_TOKEN=$(gcloud auth print-access-token)
curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent" \
  -d '{"contents":[{"parts":[{"text": "Hello"}]}]}'
```

### 工具 3: 檢查 Gemini CLI 配置

```bash
# 查看所有配置
gemini config show

# 查看特定配置
gemini config get model
gemini config get apiKey
gemini config get projectId
```

### 工具 4: 重置 Gemini CLI

```bash
# 清除所有配置（謹慎使用）
rm -rf ~/.gemini

# 重新初始化
gemini init
```

---

## 實戰案例：修復 404 ModelNotFoundError

### 背景
- 使用 Gemini CLI 時報錯 `[object Object]`
- 實際錯誤是 404 ModelNotFoundError
- 原因：嘗試使用 gemini-3.0 或其他不存在的實驗性模型

### 診斷過程

**步驟 1: 查看完整錯誤**
```bash
cat /var/folders/mp/.../gemini-client-error-*.json | python3 -m json.tool
```

**發現**:
```json
{
  "error": {
    "code": 404,
    "message": "Requested entity was not found.",
    "status": "NOT_FOUND"
  }
}
```

**步驟 2: 識別問題**
- 錯誤代碼 404 表示模型不存在
- 可能原因：
  - 嘗試使用 `gemini-3.0`（尚未發布或已停用）
  - 使用了過期的實驗性模型（如 `gemini-2.5-pro-exp-1206`）

**步驟 3: 檢查當前模型配置**
```bash
gemini config show

# 可能輸出：
# model: gemini-3.0  ← 不存在！
# 或
# model: gemini-2.5-pro-exp-1206  ← 已停用！
```

**步驟 4: 切換到穩定模型（實際解決方案）**

根據實際測試，以下模型可用：

```bash
# 方案 1: 使用 Gemini 2.5（推薦 - 已驗證可用）
gemini config set model gemini-2.5-flash-latest

# 方案 2: 使用穩定的實驗版本
gemini config set model gemini-2.0-flash-exp

# 方案 3: 使用標準版本
gemini config set model gemini-pro

# 查看模型列表（如果可用）
gemini models
```

**步驟 5: 驗證修復**
```bash
# 測試簡單對話
gemini -p "你好，請用繁體中文回答：你是哪個版本的 Gemini？"

# 應該成功返回類似：
# "我是 Gemini 2.5 Flash..."
```

**實際成功案例**
```bash
# 問題：gemini-3.0 不存在
# 解決：切換到 gemini-2.5
gemini config set model gemini-2.5-flash-latest

# 驗證成功
gemini -p "測試"
# ✓ 成功返回回應
```

### 關鍵學習點

1. **[object Object] 是顯示問題，不是真正錯誤**
   - 總是查看完整的 JSON 錯誤報告
   - 真正的錯誤訊息在 JSON 中

2. **404 通常是模型問題**
   - 檢查模型名稱是否正確
   - 使用穩定版本而非實驗版本

3. **實驗版模型可能隨時停用**
   - `*-exp-*` 後綴的模型是實驗性的
   - 建議使用穩定版本（如 `gemini-pro`）

4. **多層診斷工具**
   - JSON 錯誤報告 → 根本原因
   - gcloud CLI → 環境驗證
   - curl → API 直接測試

---

## 預防措施

### 1. 使用穩定版本模型

```bash
# 推薦的穩定模型
gemini config set model gemini-pro           # 標準版
gemini config set model gemini-2.0-flash-exp # 快速版（較新）

# 避免使用實驗性模型（除非明確知道其存在）
# ❌ gemini-2.5-pro-exp-*
# ❌ gemini-ultra-exp-*
```

### 2. 定期檢查配置

```bash
# 每週檢查一次
gemini config show

# 確認模型仍然可用
gemini -p "測試"
```

### 3. 監控 API 配額

```bash
# 使用速率限制工具
source 0_tool_calling/0_gemini-tracker.md

# 查看使用統計
check_rate_limit
```

### 4. 記錄錯誤報告路徑

```bash
# 在使用 Gemini 時自動記錄
gemini -p "問題" 2>&1 | tee gemini_output.log

# 錯誤報告路徑會在 log 中
grep "Full report available" gemini_output.log
```

---

## 故障排除決策樹

```
Gemini CLI 報錯
  ↓
查看 JSON 錯誤報告
  ↓
錯誤代碼是什麼？
  ├─ 404 → 模型不存在
  │   └─ 切換到穩定模型
  │
  ├─ 401/403 → 認證/權限問題
  │   ├─ 重新認證: gcloud auth application-default login
  │   └─ 啟用 API: gcloud services enable
  │
  ├─ 429 → 配額超限
  │   ├─ 等待配額重置
  │   └─ 使用速率限制工具
  │
  └─ 其他 → 查看具體錯誤訊息
      └─ 搜尋官方文檔或社群
```

---

## 有用的連結

- [Gemini CLI GitHub](https://github.com/google/generative-ai-cli)
- [Google AI Studio](https://aistudio.google.com/)
- [Vertex AI 文檔](https://cloud.google.com/vertex-ai/docs)
- [API 配額管理](https://console.cloud.google.com/iam-admin/quotas)

---

## 最佳實踐

1. **總是先看 JSON 錯誤報告**
   - `[object Object]` 不是真正的錯誤
   - JSON 文件包含完整的錯誤詳情

2. **使用穩定版本模型**
   - 避免使用 `-exp-` 後綴的實驗性模型
   - 除非明確知道其可用性

3. **保持 gcloud CLI 更新**
   ```bash
   gcloud components update
   ```

4. **記錄所有 API 呼叫**
   - 使用 `tee` 保存輸出
   - 方便後續診斷

5. **當遇到 LLM Agent 錯誤時**
   - ✅ 讓 Agent 自己診斷（如 Gemini 提供的建議）
   - ✅ 執行 Agent 建議的步驟
   - ❌ 不要直接放棄使用 Agent

---

*最後更新：2025-11-28*
*基於實際遇到的 404 ModelNotFoundError 案例*
