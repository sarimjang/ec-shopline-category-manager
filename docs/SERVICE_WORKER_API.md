# Service Worker API Reference

**Document Version**: 1.0
**Last Updated**: 2026-01-27
**Status**: Complete - Task 2-P1.5

---

## Overview

The Service Worker (`src/background/service-worker.js`) acts as the extension's persistent background process in Chrome Manifest V3. It handles:
- Storage operations and data persistence
- Message routing from content scripts and popup
- Initialization and lifecycle management
- Error logging and diagnostics

---

## Quick Handler Reference

| Handler | Action | Purpose |
|---------|--------|---------|
| recordCategoryMove | WRITE | Record category move + update stats |
| getStats | READ | Retrieve stats (totalMoves, totalTimeSaved) |
| resetStats | WRITE | Reset stats to zero, update timestamp |
| recordSearchQuery | WRITE | Log search query (dedup, max 50) |
| getSearchHistory | READ | Get search query history |
| classifyError | WRITE | Log and classify error by type |
| getErrorLog | READ | Retrieve error log (max 100) |
| validateCategoryPath | READ | Pre-flight validation for move |
| getMoveHistory | READ | Get detailed move audit trail |
| exportData | READ | Export all storage data |
| importData | WRITE | Import previously exported data |
| getCategories | READ | Get stored categories (Phase 2+) |
| updateCategories | WRITE | Update categories (Phase 2+) |

---

## Core Handlers

### recordCategoryMove
**Purpose**: Record a category move operation and update statistics

**Request**:
```javascript
{
  action: 'recordCategoryMove',
  timeSaved: 45  // Time in seconds
}
```

**Response**:
```javascript
{
  success: true,
  stats: {
    totalMoves: 12,
    totalTimeSaved: 540,
    lastReset: "2026-01-27T10:00:00.000Z"
  }
}
```

**Storage Key**: `categoryMoveStats`

**Example**:
```javascript
chrome.runtime.sendMessage({
  action: 'recordCategoryMove',
  timeSaved: 45
}, (response) => {
  if (response.success) {
    console.log('Move recorded. Total:', response.stats.totalMoves);
  }
});
```

---

### getStats
**Purpose**: Retrieve current category move statistics

**Request**:
```javascript
{
  action: 'getStats'
}
```

**Response**:
```javascript
{
  success: true,
  stats: {
    totalMoves: 12,
    totalTimeSaved: 540,
    lastReset: "2026-01-27T10:00:00.000Z"
  }
}
```

**Default Values** (if no data):
```javascript
{
  totalMoves: 0,
  totalTimeSaved: 0,
  lastReset: new Date().toISOString()
}
```

---

### resetStats
**Purpose**: Reset all statistics to zero

**Request**:
```javascript
{
  action: 'resetStats'
}
```

**Response**:
```javascript
{
  success: true,
  stats: {
    totalMoves: 0,
    totalTimeSaved: 0,
    lastReset: "2026-01-27T10:30:45.000Z"  // Updated
  }
}
```

**Example** (from popup):
```javascript
if (confirm('Reset all stats?')) {
  chrome.runtime.sendMessage({ action: 'resetStats' }, (response) => {
    if (response.success) {
      console.log('Stats reset at:', response.stats.lastReset);
    }
  });
}
```

---

### recordSearchQuery
**Purpose**: Record a search query

**Request**:
```javascript
{
  action: 'recordSearchQuery',
  query: 'electronics'
}
```

**Response**:
```javascript
{
  success: true,
  history: [
    "electronics",
    "previously searched term",
    ...
  ]
}
```

**Constraints**:
- Maximum 50 queries stored (oldest removed when exceeded)
- Ordered newest first
- Duplicates moved to top on repeated search

---

### getSearchHistory
**Purpose**: Retrieve search query history

**Request**:
```javascript
{
  action: 'getSearchHistory'
}
```

**Response**:
```javascript
{
  success: true,
  history: [
    "electronics",
    "clothing",
    "shoes"
  ]
}
```

---

### classifyError
**Purpose**: Log and classify an error for diagnostics

**Request**:
```javascript
{
  action: 'classifyError',
  errorType: 'network',  // 'network', 'api', 'validation', 'scope'
  message: 'Failed to fetch categories',
  details: {
    statusCode: 500,
    endpoint: '/api/categories'
  }
}
```

**Response**:
```javascript
{
  success: true,
  errorData: {
    timestamp: "2026-01-27T10:15:31.000Z",
    type: "network",
    message: "Failed to fetch categories",
    details: { statusCode: 500, endpoint: '/api/categories' }
  },
  logSize: 15
}
```

**Error Types**:
- `network`: Network connectivity issues
- `api`: API errors (4xx, 5xx)
- `validation`: Input validation failures
- `scope`: AngularJS scope/element issues

**Constraint**: Maximum 100 errors stored

---

### getErrorLog
**Purpose**: Retrieve error log for diagnostics

**Request**:
```javascript
{
  action: 'getErrorLog'
}
```

**Response**:
```javascript
{
  success: true,
  errors: [
    {
      timestamp: "2026-01-27T10:15:31.000Z",
      type: "network",
      message: "Failed to fetch",
      details: { ... }
    },
    // ... up to 100 total
  ]
}
```

---

### validateCategoryPath
**Purpose**: Pre-flight validation before category move

**Request**:
```javascript
{
  action: 'validateCategoryPath',
  categoryId: 'cat_123',
  targetCategoryId: 'cat_456'  // null for root
}
```

**Response** (Valid):
```javascript
{
  success: true,
  isValid: true,
  errors: []
}
```

**Response** (Invalid):
```javascript
{
  success: false,
  isValid: false,
  errors: ["Missing categoryId"]
}
```

---

### getMoveHistory
**Purpose**: Retrieve individual move records for audit trail

**Request**:
```javascript
{
  action: 'getMoveHistory'
}
```

**Response**:
```javascript
{
  success: true,
  history: [
    {
      timestamp: "2026-01-27T10:15:31.000Z",
      timeSaved: 45,
      categoryId: "cat_123",
      categoryName: "Electronics",
      targetLevel: 2,
      usedSearch: false
    }
  ]
}
```

**Constraint**: Maximum 500 move records stored

---

### exportData
**Purpose**: Export all extension data for backup

**Request**:
```javascript
{
  action: 'exportData'
}
```

**Response**:
```javascript
{
  success: true,
  data: {
    categoryMoveStats: { ... },
    moveHistory: [ ... ],
    searchHistory: [ ... ],
    errorLog: [ ... ]
  },
  timestamp: "2026-01-27T10:25:00.000Z"
}
```

**Use Case**: Phase 2 Export/Import feature

---

### importData
**Purpose**: Import previously exported data

**Request**:
```javascript
{
  action: 'importData',
  data: {
    categoryMoveStats: { ... },
    moveHistory: [ ... ],
    searchHistory: [ ... ]
  }
}
```

**Response**:
```javascript
{
  success: true,
  message: 'Data imported successfully'
}
```

---

## Error Handling

### General Pattern
All handlers wrap operations in try-catch and return:
```javascript
{
  error: error.message
}
```

### Example Errors

**Unknown Action**:
```javascript
chrome.runtime.sendMessage({ action: 'unknownAction' }, (response) => {
  console.log(response);  // { error: 'Unknown action' }
});
```

**Empty Query**:
```javascript
chrome.runtime.sendMessage({
  action: 'recordSearchQuery',
  query: ''
}, (response) => {
  console.log(response);  // { success: false, error: 'Empty query' }
});
```

---

## Storage Schema

| Key | Type | Max Size | Persistence |
|-----|------|----------|-------------|
| `categoryMoveStats` | Object | 1KB | Persistent |
| `moveHistory` | Array | 500 records | Persistent |
| `searchHistory` | Array | 50 items | Persistent |
| `errorLog` | Array | 100 errors | Persistent |
| `categories` | Array | Variable | Persistent |

---

## Best Practices

### ✅ Always Check Response
```javascript
chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
  if (response.success) {
    console.log(response.stats);
  } else {
    console.error('Failed:', response.error);
  }
});
```

### ✅ Provide Context in Errors
```javascript
chrome.runtime.sendMessage({
  action: 'classifyError',
  errorType: 'network',
  message: 'Failed to fetch',
  details: {
    endpoint: '/admin/categories',
    method: 'GET',
    statusCode: 502
  }
}, ...);
```

### ✅ Validate Before Recording
```javascript
if (timeSaved && timeSaved > 0) {
  chrome.runtime.sendMessage({
    action: 'recordCategoryMove',
    timeSaved: timeSaved
  }, ...);
}
```

---

## Debugging

### Check Storage via DevTools
```javascript
// In service worker console
chrome.storage.local.get(null, (all) => console.table(all));
```

### Monitor Service Worker Logs
1. Go to chrome://extensions/
2. Enable Developer mode
3. Click "Inspect" on Shopline Category Manager
4. View Console tab

---

## Summary

**All handlers async-safe**: Return true to indicate callback will be called
**All storage persistent**: Data survives browser restarts
**All handlers logged**: Enable debugging via DevTools
**All errors handled**: No silent failures

For complete documentation, see:
- SERVICE_WORKER_LIFECYCLE.md - Lifecycle and events
- SERVICE_WORKER_TESTING.md - Testing procedures
