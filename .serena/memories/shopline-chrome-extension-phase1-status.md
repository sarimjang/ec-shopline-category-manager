# Shopline Chrome Extension - Phase 1 MVP Status

## Current Position
- **Phase 1 MVP**: 4/4 plans complete (01-01 through 01-04)
- **Status**: Code implementation complete, pending manual Chrome verification
- **Blocker**: Extension failing to load in chrome://extensions with manifest errors

## Phase Completion Summary

### ✅ 01-01: Project Structure & Manifest V3
- Created Manifest V3 configuration
- Established directory structure
- Added all required icons (16x48x128px)
- Commit: `ee42644` (structure), `c700f0d` (build), `986ee2f` (diagnostics)

### ✅ 01-02: Content Script & AngularJS Bridge  
- Implemented Content Script with isolated world detection
- Created Injected Script with CategoryManager skeleton
- Established CustomEvent cross-world communication pattern
- Commits: `8a6a3c5`, `5b7eda4`, `87a53b1`

### ✅ 01-03: Storage API, CategoryManager, Popup UI
- StorageManager class with Promise-based API
- CategoryManager with moveCategory() implementation
- Popup UI with real-time stats display and reset functionality
- Commits: `147b7f8`, `3d3791f`, `d77c046`, `22b8c7e`

### ✅ 01-04: Service Worker & Integration
- Service Worker with chrome.runtime.onInstalled listener
- Storage initialization on first install
- Context menu scaffold for Phase 2 export feature
- Code complete, awaiting manual verification

## Known Issues & Solutions

### Issue 1: Manifest Load Failures
**Symptom**: "Default locale was specified, but _locales subtree is missing" + "無法載入資訊清單"

**Root Causes**:
1. Initial: Missing `action.default_popup` field in manifest.json
   - **Fix applied**: Added `"default_popup": "popup/popup.html"` to action section
   
2. Potential: Chrome browser cache caching old extension config
   - **Solution**: Complete cache clear + reboot required (see Chrome Cleanup Steps below)

**Chrome Cleanup Steps** (if issue persists):
```
1. chrome://extensions/ → Remove extension
2. chrome://settings/clearBrowserData → Clear all time, all data types
3. Close all Chrome windows completely
4. Reopen Chrome
5. chrome://extensions/ → Load unpacked → Select src/ directory
```

## Critical File Structure
```
src/
├── manifest.json (MV3 config - NOW HAS default_popup)
├── assets/ (icon-16/48/128.png)
├── background/service-worker.js (lifecycle + storage init)
├── content/
│   ├── content.js (ISOLATED world script)
│   └── injected.js (MAIN world script with CategoryManager)
├── popup/
│   ├── popup.html (stats display UI)
│   ├── popup.css (compact 300px design)
│   └── popup.js (storage listener + event handlers)
└── shared/
    ├── constants.js
    ├── logger.js
    └── storage.js (StorageManager class)
```

## Architecture Decisions
- **Storage**: chrome.storage.local only (Phase 1: no cloud)
- **Communication**: CustomEvent between ISOLATED (content) and MAIN (injected) worlds
- **Rate Limiting**: Conservative 200ms delays on Shopline API calls
- **Stats Formula**: Time Saved = (targetLevel * 5) + (categoryCount / 10) seconds
- **Service Worker**: Lightweight, no long-running ops (MV3 constraint)

## Next Steps
1. **Immediate**: Retry Chrome load after cache clearing
2. **If successful**: Manual verification checkpoint (popup open, stats display, console logs)
3. **After approval**: Create 01-04-SUMMARY.md
4. **Phase 2 Ready**: Export/Import functionality (02-01-PLAN.md)

## Build Status
- **No build step needed**: Extension loads directly from src/ (no transpilation in Phase 1)
- **npm run build**: Currently placeholder ("Build steps TBD for Phase 2")
- **npm test**: Test script exists but TBD

## Known Gotchas
1. Icons must be PNG format and exact sizes (16x16, 48x48, 128x128)
2. Content script runs in ISOLATED world - cannot directly access page AngularJS
3. Injected script must be loaded via web_accessible_resources in manifest
4. Chrome caches extension configs aggressively - always clear after manifest changes
5. Service Worker gets suspended if idle >5 minutes - use chrome.alarms for periodic tasks
