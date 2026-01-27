# Storage Quick Reference

## Initialization
```javascript
await window._scm_storage.init();
```

## Basic Operations

### Read
```javascript
const stats = window._scm_storage.getItem('categoryMoveStats');
```

### Write
```javascript
window._scm_storage.setItem('categoryMoveStats', {
  totalMoves: 10,
  totalTimeSaved: 450
});
```

### Remove
```javascript
window._scm_storage.removeItem('key');
window._scm_storage.clear();
```

### Status
```javascript
window._scm_storage.getStatus();
```

## Storage Keys

| Key | Type | Max Size |
|-----|------|----------|
| categoryMoveStats | Object | - |
| searchHistory | Array | 50 items |
| moveHistory | Array | 500 items |
| errorLog | Array | 100 items (7-day retention) |
| userSettings | Object | - |
| extensionMetadata | Object | - |
| categoryCache | Object | - (24-hour retention) |

## Common Tasks

### Record a Move
```javascript
const stats = window._scm_storage.getItem('categoryMoveStats') || {
  totalMoves: 0,
  totalTimeSaved: 0,
  lastReset: new Date().toISOString()
};

stats.totalMoves += 1;
stats.totalTimeSaved += timeSavedSeconds;
stats.lastMoveTimestamp = Date.now();

window._scm_storage.setItem('categoryMoveStats', stats);
```

### Add to Move History
```javascript
const history = window._scm_storage.getItem('moveHistory') || [];
history.push({
  timestamp: Date.now(),
  fromId: categoryId,
  toId: targetId,
  success: true,
  timeSaved: timeSavedSeconds
});
window._scm_storage.setItem('moveHistory', history);
```

### Add Search Query
```javascript
const history = window._scm_storage.getItem('searchHistory') || [];
history.push(`${Date.now()}:${searchQuery}`);
window._scm_storage.setItem('searchHistory', history);
```

### Log Error
```javascript
const errorLog = window._scm_storage.getItem('errorLog') || [];
errorLog.push({
  timestamp: Date.now(),
  level: 'error',
  message: error.message
});
window._scm_storage.setItem('errorLog', errorLog);
```

## Debugging

### Export All Data
```javascript
const all = Object.fromEntries(
  window._scm_storage.keys().map(k => [k, window._scm_storage.getItem(k)])
);
console.log(JSON.stringify(all, null, 2));
```

### Check Quota
```javascript
window._scm_storage.getStatus().quotaUsagePercentage;
```

### Reset
```javascript
window._scm_storage.clear();
await window._scm_storage.init();
```

## Important Notes

- All reads are synchronous (< 1ms)
- Writes are synchronous for cache, async for persistence
- Data persists across sessions
- Changes sync across tabs < 100ms
- Chrome quota limit: 5 MB total

---
**Version:** 1.0.0
