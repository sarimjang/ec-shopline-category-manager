# Documentation

Shopline Category Manager 專案文檔。

## 目錄結構

```
docs/
├── fixes/                  # Bug 修復記錄
│   └── scope-alignment-2026-01-08/
│       ├── EXECUTIVE_SUMMARY.md   # 問題摘要
│       ├── TEST_PLAN.md           # 測試計劃
│       ├── COMPLETION_REPORT.md   # 完成報告
│       ├── IMPLEMENTATION_GUIDE.md # 實作指南
│       ├── DEBUG_LOG.md           # 除錯日誌
│       └── tasks.md               # 任務追蹤
│
├── guides/                 # 使用指南
│   ├── QUICK_START.md      # 快速開始
│   ├── TEST_GUIDE.md       # 測試指南
│   ├── FILE_GUIDE.md       # 檔案說明
│   ├── TEST_VERIFICATION.md # 測試驗證
│   ├── DELIVERY_CHECKLIST.md # 交付清單
│   └── SPEC_COMPLIANCE.md  # 規格符合性
│
├── implementation/         # 實作文檔
│   ├── IMPLEMENTATION_PLAN.md     # 實作計劃
│   ├── IMPLEMENTATION_NOTES.md    # 實作筆記
│   ├── STEP_*_*.md                # 各階段報告
│   └── README_STEP_7.md           # 第7步說明
│
└── reference/              # 參考資料
    ├── CORE_API_REFERENCE.md      # API 參考
    ├── QUICK_REFERENCE.md         # 快速參考
    ├── PROJECT_OVERVIEW.md        # 專案概覽
    └── PROJECT_SUMMARY.md         # 專案摘要
```

## 快速導覽

| 需求 | 文檔 |
|------|------|
| 了解專案 | `reference/PROJECT_OVERVIEW.md` |
| 開始開發 | `guides/QUICK_START.md` |
| 測試腳本 | `guides/TEST_GUIDE.md` |
| Scope 修復詳情 | `fixes/scope-alignment-2026-01-08/` |
| API 參考 | `reference/CORE_API_REFERENCE.md` |

## 主要修復記錄

### 2026-01-08: Scope Alignment Fix

**問題**：點擊子項的「移動到」按鈕時，整個父項被移動
**根因**：Angular scope 與 DOM 節點錯位
**解決**：DOM 名稱優先策略 + 變數捕獲修復

詳見 `fixes/scope-alignment-2026-01-08/`
