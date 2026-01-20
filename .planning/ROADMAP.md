# Shopline Category Manager - Chrome Extension Migration Roadmap

## Phase 1: Chrome Extension MVP (12 hours)

**Goal**: Implement fully functional Chrome Extension with feature parity to UserScript

**Scope**: 
- Manifest V3 configuration
- Content Script migration
- AngularJS access pattern (injected script)
- Storage API abstraction layer
- Popup UI with statistics
- Service Worker initialization

**Dependencies**: None (greenfield for Extension)

**Validation**: Extension loads, all category moves work identically to UserScript

**Research**: No (architecture already decided in design.md)

---

## Phase 2: Export/Import (6 hours)

**Goal**: Add backup/restore capability with comprehensive validation

**Scope**:
- JSON & CSV export (dual format)
- Multi-layer validation (3-level limit, circular deps, orphans)
- Import preview UI
- Manual execution integration
- History tracking

**Dependencies**: Phase 1 complete

**Validation**: Export/import roundtrip works, validation catches all known conflicts

**Research**: No (design complete)

---

## Phase 3: Batch Operations (Future - ~12 hours)

**Goal**: Auto-execute import sequences with progress UI

**Scope**:
- Auto-queuing with 200ms delays
- Exponential backoff retry (3 attempts)
- Progress tracking and pause/resume
- Rollback on failure
- Error recovery UI

**Status**: Deferred (Phase 2 manual execution sufficient for MVP)

---

## Phase 4: Multi-Store & Cloud Sync (Future - TBD)

**Goal**: Support managing multiple Shopline stores, sync across browsers

**Scope**:
- chrome.storage.sync (profile-level)
- Per-store preferences
- Multi-tab coordination

**Status**: Deferred (Phase 1-2 single-store sufficient)

---

## Current Position

Ready to plan Phase 1 implementation.

All major technical decisions made (see design.md):
- ✅ MV3 vs V2 → MV3
- ✅ Storage strategy → chrome.storage.local
- ✅ AngularJS access → injected script + CustomEvent
- ✅ Export format → JSON + CSV
- ✅ Validation approach → multi-layer before execution
