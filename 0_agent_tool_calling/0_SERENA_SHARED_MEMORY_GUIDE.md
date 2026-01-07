# Serena Shared Memory 協作指南

*跨 Agent 共享知識庫，實現 Claude Code + Codex CLI 高效協作*

---

## 核心概念

Serena MCP 提供持久化的 memory 系統，讓多個 LLM Agent 能夠共享同一份知識庫：

```
┌─────────────────────────────────────────────────────────────┐
│                    .serena/memories/                         │
│                    (持久化儲存於專案目錄)                      │
├─────────────────────────────────────────────────────────────┤
│  project_overview.md     ← 專案結構                          │
│  requirements.md         ← 需求規格                          │
│  domain_knowledge.md     ← 領域知識                          │
│  task_context.md         ← 任務上下文                        │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
        ▲                           ▲
        │ read/write                │ read/write
        │                           │
┌───────┴───────┐           ┌───────┴───────┐
│  Claude Code  │           │  Codex CLI    │
│  + Serena MCP │           │  + Serena MCP │
└───────────────┘           └───────────────┘
```

---

## 快速開始

### 前置條件

1. **Claude Code 已安裝 Serena MCP**
2. **Codex CLI 已安裝 Serena MCP**
3. **專案目錄已初始化 git**（Serena 需要 git repo）

### 步驟 1：啟用專案（必要！）

每次對話開始時，必須先啟用專案：

```bash
# Claude Code 執行
mcp__Serena_MCP__Global___activate_project("/path/to/your/project")
```

**常見錯誤**：
```
Error: No active project. Ask the user to provide the project path...
```
這表示尚未啟用專案，需要先執行 `activate_project`。

### 步驟 2：檢查 Onboarding 狀態

```bash
mcp__Serena_MCP__Global___check_onboarding_performed()
```

如果回傳 `Onboarding not performed yet`，可選擇：
- 執行完整 onboarding（Serena 會分析專案結構）
- 或直接開始寫入自己的 memory

### 步驟 3：寫入 Memory

```bash
mcp__Serena_MCP__Global___write_memory(
  memory_file_name="task_requirements.md",
  content="# 任務需求\n\n## 目標\n..."
)
```

### 步驟 4：讀取 Memory

```bash
mcp__Serena_MCP__Global___read_memory(
  memory_file_name="task_requirements.md"
)
```

### 步驟 5：列出所有 Memory

```bash
mcp__Serena_MCP__Global___list_memories()
```

---

## 與 Codex CLI 協作

### 模式 A：Claude 寫入 → Codex 讀取

```bash
# Step 1: Claude Code 寫入需求
mcp__Serena_MCP__Global___write_memory(
  "workflow_requirements.md",
  "# Workflow 需求\n- 功能A\n- 功能B\n..."
)

# Step 2: 呼叫 Codex，讓它讀取 memory
codex exec "
讀取 Serena memory 'workflow_requirements.md' 中的需求，
然後建立對應的程式碼。
"

# Step 3: Claude Code 可以讀取 Codex 更新的 memory（如果有）
mcp__Serena_MCP__Global___list_memories()
```

### 模式 B：Codex 寫入 → Claude 讀取

```bash
# Step 1: Codex 執行任務並寫入結果摘要
codex exec "
分析專案結構，將結果寫入 Serena memory 'analysis_result.md'
"

# Step 2: Claude Code 讀取結果
mcp__Serena_MCP__Global___read_memory("analysis_result.md")
```

### 模式 C：多 Agent 協作流程

```bash
# Phase 1: 規劃（Claude Sub-Agent）
Task tool (Plan) → 產出計劃 → 寫入 memory

# Phase 2: 執行（Codex）
codex exec → 讀取 memory → 生成代碼 → 更新 memory

# Phase 3: 審查（Claude Sub-Agent）
Task tool (code-reviewer) → 讀取 memory → 審查 → 更新 memory
```

---

## Memory vs Prompt 比較

| 面向 | 純 Prompt | Shared Memory |
|------|-----------|---------------|
| **Prompt 長度** | 長（包含所有細節） | 短（只說「讀取 memory」） |
| **資訊重用** | 每次都要重寫 | 寫一次，多次使用 |
| **跨 session** | 無法保留 | 持久化保留 |
| **多 agent 協作** | 每個都要傳完整 prompt | 都讀同一份 memory |
| **版本控制** | 難追蹤 | memory 檔案可 git 追蹤 |
| **更新維護** | 改 prompt 重跑 | 改 memory 即可 |

### 何時用 Prompt

- 一次性簡單任務
- 不需要跨 session
- 單一 Agent 執行

### 何時用 Shared Memory

- 複雜多階段任務
- 多 Agent 協作
- 需要跨 session 保留上下文
- 需求可能迭代修改

---

## 實戰範例

### 範例 1：n8n Workflow 開發

```bash
# 1. 啟用專案
mcp__Serena_MCP__Global___activate_project("/path/to/project")

# 2. 寫入需求
mcp__Serena_MCP__Global___write_memory(
  "n8n_requirements.md",
  """
  # n8n Workflow 需求

  ## 資料來源
  - Email: Gmail
  - 寄件者: reports@company.com

  ## 處理邏輯
  - 類型1: 標題含 'Daily' → Drive/daily/
  - 類型2: 標題含 'Weekly' → Drive/weekly/
  """
)

# 3. Codex 生成 workflow
codex exec "
讀取 Serena memory 'n8n_requirements.md'，
建立完整的 n8n workflow JSON 檔案。
"

# 4. 審查結果
Task tool (code-reviewer) → "審查 workflows/ 目錄下的 JSON"
```

### 範例 2：跨 Session 繼續工作

**Session 1**：
```bash
# 寫入進度
mcp__Serena_MCP__Global___write_memory(
  "task_progress.md",
  """
  # 任務進度

  ## 已完成
  - [x] 需求分析
  - [x] 架構設計

  ## 待完成
  - [ ] 代碼實作
  - [ ] 測試
  """
)
```

**Session 2**（新對話）：
```bash
# 1. 啟用專案
mcp__Serena_MCP__Global___activate_project("/path/to/project")

# 2. 讀取上次進度
mcp__Serena_MCP__Global___read_memory("task_progress.md")

# 3. 繼續工作...
```

---

## 注意事項

### 1. 必須先啟用專案

每次新對話都要執行：
```bash
mcp__Serena_MCP__Global___activate_project("/path/to/project")
```

### 2. Memory 檔案命名規則

- 使用 `.md` 結尾（Markdown 格式）
- 使用 `snake_case` 命名
- 名稱要有意義：`task_requirements.md` 而非 `temp.md`

### 3. Memory 內容結構建議

```markdown
# 標題

## 概述
簡短描述

## 詳細內容
- 項目 1
- 項目 2

## 更新記錄
- YYYY-MM-DD: 更新內容
```

### 4. 定期清理 Memory

```bash
# 列出所有 memory
mcp__Serena_MCP__Global___list_memories()

# 刪除不需要的 memory
mcp__Serena_MCP__Global___delete_memory("old_task.md")
```

### 5. Git 追蹤

`.serena/memories/` 目錄會自動建立在專案根目錄，可以加入 `.gitignore` 或提交到 git：

```bash
# 如果要追蹤 memory（團隊共享）
git add .serena/memories/

# 如果不要追蹤（個人使用）
echo ".serena/" >> .gitignore
```

### 6. Codex 讀取 Memory 的 Prompt 寫法

```bash
# ✅ 好的寫法：明確指定 memory 名稱
codex exec "讀取 Serena memory 'requirements.md'，然後..."

# ❌ 不好的寫法：模糊指示
codex exec "看看有什麼需求，然後..."
```

---

## 常見問題

### Q: Memory 儲存在哪裡？

A: 專案目錄下的 `.serena/memories/` 資料夾。

### Q: Codex 和 Claude Code 看到的是同一份嗎？

A: 是的，只要都啟用同一個專案，就會讀寫同一份 memory。

### Q: Memory 會自動同步嗎？

A: 是檔案系統層級的儲存，寫入後立即可讀取，不需要同步機制。

### Q: 可以用 Memory 傳遞大型檔案內容嗎？

A: 可以，但建議只存摘要或參考路徑，大型內容直接讀檔案更有效率。

### Q: 如果 Codex 沒有 Serena MCP 怎麼辦？

A: 可以改用檔案系統共享：
```bash
# Claude 寫入檔案
Write tool → .context/requirements.md

# Codex 讀取檔案
codex exec "讀取 .context/requirements.md..."
```

---

## 快速參考

```bash
# 啟用專案
mcp__Serena_MCP__Global___activate_project("/path/to/project")

# 檢查 onboarding
mcp__Serena_MCP__Global___check_onboarding_performed()

# 列出 memories
mcp__Serena_MCP__Global___list_memories()

# 寫入 memory
mcp__Serena_MCP__Global___write_memory("name.md", "content")

# 讀取 memory
mcp__Serena_MCP__Global___read_memory("name.md")

# 編輯 memory
mcp__Serena_MCP__Global___edit_memory("name.md", "old", "new", "literal")

# 刪除 memory
mcp__Serena_MCP__Global___delete_memory("name.md")
```

---

*最後更新：2025-12-06*
*適用於：Claude Code + Codex CLI + Serena MCP 協作環境*
