# Storage Specification - Shopline Category Manager

## Overview

This document describes the storage abstraction layer for the Shopline Category Manager Chrome Extension. It provides a localStorage-compatible interface to chrome.storage.local for persistent data storage with automatic migration, quota management, and error handling.

## Architecture

```
┌──────────────────────────────────────────────┐
│  Content Script / Injected Script            │
└────────────────┬─────────────────────────────┘
                 │ Uses
                 ▼
┌──────────────────────────────────────────────┐
│  StorageAPI (window._scm_storage)            │
│  ├─ In-Memory Cache (Map)                    │
│  ├─ Quota Tracking                           │
│  ├─ Migration Runner                         │
│  └─ Error Handling                           │
└────────────────┬─────────────────────────────┘
                 │ Uses
                 ▼
┌──────────────────────────────────────────────┐
│  chrome.storage.local (Chrome API)           │
│  ├─ 5 MB Quota                               │
│  ├─ Persistent                               │
│  └─ Multi-tab sync                           │
└──────────────────────────────────────────────┘
```

## Storage Schema

Seven storage keys are defined in src/shared/storage-schema.js:

### 1. categoryMoveStats (tiny, <1KB)
Statistics about category move operations performed.

**Default:**
```json
{
  "totalMoves": 0,
  "totalTimeSaved": 0,
  "lastReset": "",
  "movesByDepth": {},
  "movesBySize": {},
  "lastMoveTimestamp": 0
}
```

### 2. searchHistory (small, <10KB)
Recent search queries (50 items max, auto-trimmed).

**Type:** Array of strings

### 3. moveHistory (large, <500KB)
Audit log of category moves (500 items max, auto-trimmed).

**Type:** Array of objects with timestamp, fromId, toId, success, timeSaved

### 4. errorLog (small, <50KB)
System error log (100 items max, 7-day retention).

**Type:** Array of objects with timestamp, level, message, context

### 5. userSettings (tiny, <1KB)
User preferences and feature flags.

**Default:**
```json
{
  "autoScroll": true,
  "notifications": true,
  "showTimeSavings": true,
  "theme": "auto",
  "debugMode": false
}
```

### 6. extensionMetadata (tiny, <1KB)
Version and migration tracking.

**Default:**
```json
{
  "version": "1.0.0",
  "installedAt": 0,
  "lastUpdatedAt": 0,
  "migrationVersion": 0
}
```

### 7. categoryCache (medium, <200KB)
Cached category structure (24-hour retention).

**Default:**
```json
{
  "categories": [],
  "lastFetchedAt": 0
}
```

## Storage Quotas

Chrome Extension provides 5 MB total quota:

| Level  | Size   |
|--------|--------|
| tiny   | 1 KB   |
| small  | 10 KB  |
| medium | 200 KB |
| large  | 500 KB |
| TOTAL  | 5 MB   |

## API Reference

### Initialization
```javascript
await window._scm_storage.init();
// Returns: true if successful, false if error
```

### Reading
```javascript
const value = window._scm_storage.getItem('categoryMoveStats');
// Returns: stored value or null
```

### Writing
```javascript
window._scm_storage.setItem('categoryMoveStats', { totalMoves: 10 });
// Returns: immediately (async persistence)
```

### Removing
```javascript
window._scm_storage.removeItem('key');
window._scm_storage.clear();  // Clear all
```

### Status
```javascript
const status = window._scm_storage.getStatus();
// Returns: { initialized, migrated, itemCount, quotaUsageBytes, quotaUsagePercentage, keys }
```

## Migration

### Automatic Migration on First Run

Migration v1 maps old Greasemonkey keys to new Chrome keys:
- shopline_category_stats → categoryMoveStats
- shopline_search_history → searchHistory
- shopline_move_history → moveHistory
- shopline_error_log → errorLog

Runs automatically during init() if migration version < 1.

## Testing Procedures

### Test 1: Basic Operations
```javascript
window._scm_storage.initialized  // Should be true
window._scm_storage.setItem('test', 'value');
window._scm_storage.getItem('test')  // Should be 'value'
```

### Test 2: Persistence
1. Set data via setItem
2. Reload page
3. Verify data still exists with getItem

### Test 3: Multi-Tab Sync
1. Open page in Tab A and Tab B
2. In Tab A: setItem('multiTab', 'value')
3. In Tab B (within 100ms): getItem('multiTab') should be 'value'

### Test 4: Quota Management
```javascript
const status = window._scm_storage.getStatus();
console.log(status.quotaUsagePercentage);  // Should be low
```

### Test 5: Migration
1. Add old localStorage data: localStorage.setItem('shopline_category_stats', '{}');
2. Call init()
3. Verify: getItem('categoryMoveStats') returns the migrated data

## Error Handling

### Initialization Errors
```javascript
const success = await window._scm_storage.init();
if (!success) {
  console.error('Storage initialization failed');
}
```

### Write Errors
- Fires asynchronously in background
- Errors logged to console but don't throw
- Cache remains valid for current session

### Quota Exceeded
- Automatic cleanup triggers when approaching 80%
- Arrays trimmed to maxSize
- Old entries removed based on retention period

## Performance

| Operation | Time   |
|-----------|--------|
| getItem   | ~0.1ms |
| setItem   | ~1ms   |
| init      | ~50ms  |

## Files

- Implementation: src/shared/storage.js
- Schema: src/shared/storage-schema.js
- Manifest: src/manifest.json (includes "storage" permission)
- Reference: docs/STORAGE_QUICK_REFERENCE.md

---
**Version:** 1.0.0  
**Last Updated:** 2024-01-27
