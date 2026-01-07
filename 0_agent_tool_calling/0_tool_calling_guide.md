# Agent Tool Calling 總覽

*使用 LLM CLI 進行任務委託，節省主 Agent 的 token 消耗*

---

## 快速參考

```bash
# Codex CLI（代碼生成、批量操作）
codex exec "prompt"

# Gemini CLI（大 context 分析、審查）
gemini -p "prompt"
```

---

## 文件索引

| 文件 | 用途 | 何時參考 |
|------|------|---------|
| **0_CODEX_USAGE_GUIDELINE.md** | Codex CLI 完整使用指南 | 需要委託代碼生成任務時 |
| **0_SERENA_SHARED_MEMORY_GUIDE.md** | Serena 跨 Agent 共享記憶 | 多 Agent 協作、跨 session 時 |
| **0_GEMINI_API_RATE_LIMIT_ANALYSIS.md** | Gemini 速率限制分析 | 遇到 429 錯誤時 |
| **0_GEMINI_TROUBLESHOOTING.md** | Gemini 故障排除 | Gemini 報錯時 |
| **0_gemini-tracker.md** | Gemini 速率追蹤腳本 | 需要監控 Gemini 使用量時 |
| **0_linear_tool_calling.md** | Linear 使用備忘 | 管理專案任務時 |

---

## 核心架構

```
┌─────────────────────────────────────────────────────────────┐
│  Claude Code (主控制器/戰略層)                               │
│  ├── 接收使用者需求                                          │
│  ├── 規劃、決策、審視                                        │
│  ├── 分配任務給 Sub-Agent 或 CLI                            │
│  └── 整合結果、最終驗收                                      │
└─────────────────────────────────────────────────────────────┘
        │
        ├──────────────────┬──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Claude        │  │ Codex CLI     │  │ Gemini CLI    │
│ Sub-Agent     │  │               │  │               │
├───────────────┤  ├───────────────┤  ├───────────────┤
│ • Explore     │  │ • 代碼生成    │  │ • 大 context  │
│ • Plan        │  │ • 批量操作    │  │ • 代碼審查    │
│ • code-review │  │ • Serena MCP  │  │ • 快速分析    │
└───────────────┘  └───────────────┘  └───────────────┘
        │                  │
        └────────┬─────────┘
                 ▼
        ┌───────────────────┐
        │  Serena Memory    │
        │  (共享知識庫)      │
        │  .serena/memories │
        └───────────────────┘
```

---

## 選擇指南

### 何時用 Claude Sub-Agent

- 探索 codebase（Explore）
- 規劃架構（Plan）
- 代碼審查（code-reviewer）
- 需要結果直接回傳到對話

### 何時用 Codex CLI

- 代碼生成（3+ 個文件）
- 批量操作
- 需要 Serena MCP 能力
- 節省 Claude token

### 何時用 Gemini CLI

- 超大 context（2M tokens）
- 快速代碼分析
- 需要繁體中文輸出

---

## Serena Shared Memory

**重點**：Claude Code 和 Codex CLI 都可以讀寫同一份 Serena Memory！

```bash
# Claude Code 寫入需求
mcp__Serena_MCP__Global___write_memory("requirements.md", "...")

# Codex 讀取並執行
codex exec "讀取 Serena memory 'requirements.md'，然後..."

# Claude Code 讀取結果
mcp__Serena_MCP__Global___read_memory("result.md")
```

詳見 `0_SERENA_SHARED_MEMORY_GUIDE.md`

---

## 注意事項

1. **Serena 需要先啟用專案**
   ```bash
   mcp__Serena_MCP__Global___activate_project("/path/to/project")
   ```

2. **Gemini 有速率限制**
   - RPM: ~60 次/分鐘
   - RPD: ~100 次/天
   - 詳見 `0_GEMINI_API_RATE_LIMIT_ANALYSIS.md`

3. **Codex 需要 sandbox 配置**
   - 配置檔：`~/.config/codex/config.toml`
   - 詳見 `0_CODEX_USAGE_GUIDELINE.md`

---

*最後更新：2025-12-06*
