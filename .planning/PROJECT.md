# Shopline Category Manager - Chrome Extension Migration

## Vision

遷移現有 Tampermonkey UserScript (2,700+ 行) 到專用 Chrome Extension，並新增 export/import 功能。

**核心目標：**
- 提升安裝便利性 (Web Store vs UserScript)
- 完整保留 UserScript 功能
- 新增資料匯出/匯入能力 (JSON + CSV)
- 為批次操作奠定基礎 (Phase 3)

## Current State

- **UserScript**: Tampermonkey + 2,697 行 JavaScript
- **Functionality**: Category 批量管理、時間統計追蹤
- **API**: Shopline REST API (單次操作，無批次端點)
- **Storage**: localStorage per shop

## Target State

**Phase 1 MVP (12h):**
- Chrome Extension Manifest V3
- Content Script + Injected Script (AngularJS 橋接)
- chrome.storage.local 整合
- Popup 統計顯示
- Service Worker 基礎

**Phase 2 Export/Import (6h):**
- JSON 導出 (完整樹狀結構)
- CSV 導出 (試算表編輯友善)
- 多層驗證 (layer limit, circular dependency, orphan detection)
- 導入預覽 + 手動執行
- 歷史紀錄

## Success Criteria

- Extension 通過 Chrome Web Store 審核
- 100% 功能奇偶於 UserScript
- Export/Import 驗證捕獲所有已知衝突類型
- 使用者可成功備份/恢復分類結構

## References

- `openspec/changes/add-chrome-extension-export-import/` - 完整規格
- `EXTENSION_ARCHITECTURE.md` - 架構決定
- `BATCH_OPERATIONS_ANALYSIS.md` - API 分析
