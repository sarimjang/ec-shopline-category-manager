# Storage API - Quick Reference Guide

**Phase**: Phase 3.0 - Storage API Integration  
**Date**: 2026-01-28  
**Status**: ✅ COMPLETE

---

## API Functions

### getCategoryMoveStats()
**Location**: `src/shared/storage.js:395-416`  
**Availability**: `window.getCategoryMoveStats`

```javascript
// Load statistics
const stats = await window.getCategoryMoveStats();

console.log(stats);
// Output: { totalMoves: 5, totalTimeSaved: 120, lastReset: "2026-01-28T..." }
```

**Returns**: 
```javascript
Promise<{
  totalMoves: number,
  totalTimeSaved: number,
  lastReset: string (ISO timestamp)
}>
```

**Error Handling**: 
- Logs errors to console with `[getCategoryMoveStats]` prefix
- Returns default values on error

---

### saveCategoryMoveStats(stats)
**Location**: `src/shared/storage.js:423-439`  
**Availability**: `window.saveCategoryMoveStats`

```javascript
// Save updated statistics
const updatedStats = {
  totalMoves: 6,
  totalTimeSaved: 135,
  lastReset: "2026-01-28T..."
};

await window.saveCategoryMoveStats(updatedStats);
```

**Parameter**:
```javascript
{
  totalMoves: number,
  totalTimeSaved: number,
  lastReset: string
}
```

**Returns**: `Promise<Object>` (resolved stats)

**Error Handling**: 
- Logs errors to console with `[saveCategoryMoveStats]` prefix
- Rejects promise on critical errors

---

### migrateFromLocalStorage()
**Location**: `src/shared/storage.js:446-522`  
**Availability**: `window.migrateFromLocalStorage`

```javascript
// Run one-time migration
const report = await window.migrateFromLocalStorage();

console.log(report);
// Output: { 
//   itemsMigrated: 2,
//   errors: [],
//   startTime: "2026-01-28T...",
//   endTime: "2026-01-28T...",
//   alreadyMigrated: false  (if already migrated)
// }
```

**Returns**: 
```javascript
Promise<{
  itemsMigrated: number,
  errors: array,
  startTime: string,
  endTime: string,
  alreadyMigrated?: boolean
}>
```

**Migrations**:
- `shopline_category_stats` → `categoryMoveStats`
- `shopline_search_history` → `searchHistory`
- `shopline_move_history` → `moveHistory`
- `shopline_error_log` → `errorLog`
- `shopline_user_settings` → `userSettings`

---

## TimeSavingsTracker Integration

### Initialization
```javascript
// Create tracker instance
const tracker = new TimeSavingsTracker();

// Stats available immediately (async values)
console.log(tracker.stats);  
// Output: { totalMoves: 0, totalTimeSaved: 0, lastReset: "..." }

// Wait for async initialization if needed
await tracker.initializationPromise;

// Now stats has actual values loaded from storage
console.log(tracker.stats);
```

### Recording Moves
```javascript
// Record a move and get updated statistics
const result = tracker.recordMove(
  categoryCount,    // number
  targetLevel,      // number
  usedSearch        // boolean
);

console.log(result);
// Output: {
//   thisMove: 12.5,           // Time saved in this move (seconds)
//   totalMoves: 6,            // Total moves so far
//   totalTime: 135,           // Total time saved (seconds)
//   savePromise: Promise      // Wait for persistence
// }

// Wait for statistics to be persisted
await result.savePromise;
```

### Getting Formatted Stats
```javascript
// Get formatted statistics for display
const display = tracker.getStats();

console.log(display);
// Output: {
//   totalMoves: 6,
//   totalSeconds: 135,
//   totalMinutes: 2.25,
//   avgPerMove: 22.5,
//   startDate: "2026-01-28"
// }
```

---

## Console Logging

All operations log to console with prefixes for easy filtering:

### Filter by prefix
```javascript
// In DevTools console, type:
// Copy & paste filtered logs:
console.log("Showing all storage operations...");

// Look for these prefixes:
// [getCategoryMoveStats]
// [saveCategoryMoveStats]
// [migrateFromLocalStorage]
// [TimeSavingsTracker]
```

### Example console output
```
[storage.js] Content script storage APIs initialized (message-based)
[storage.js] New storage functions available: getCategoryMoveStats, saveCategoryMoveStats, migrateFromLocalStorage
[migrateFromLocalStorage] Migration already completed, skipping
[TimeSavingsTracker] Stats loaded from chrome.storage.local: {totalMoves: 5, totalTimeSaved: 120, lastReset: "2026-01-28T..."}
[TimeSavingsTracker] Move recorded locally: {thisMove: 12.5, totalMoves: 6, totalTime: 135}
[saveCategoryMoveStats] Stats saved successfully: {totalMoves: 6, totalTimeSaved: 135, lastReset: "2026-01-28T..."}
```

---

## Testing in Browser Console

### Test 1: Check available functions
```javascript
console.log(typeof window.getCategoryMoveStats);      // "function"
console.log(typeof window.saveCategoryMoveStats);     // "function"
console.log(typeof window.migrateFromLocalStorage);   // "function"
```

### Test 2: Load current statistics
```javascript
window.getCategoryMoveStats().then(stats => {
  console.log("Current stats:", stats);
});
```

### Test 3: Save new statistics
```javascript
const newStats = {
  totalMoves: 10,
  totalTimeSaved: 300,
  lastReset: new Date().toISOString()
};

window.saveCategoryMoveStats(newStats).then(saved => {
  console.log("Stats saved:", saved);
});
```

### Test 4: Check storage directly
```javascript
chrome.storage.local.get(['categoryMoveStats'], result => {
  console.log("Storage content:", result);
});
```

### Test 5: Verify persistence
```javascript
// Save
window.saveCategoryMoveStats({totalMoves: 999, totalTimeSaved: 999, lastReset: new Date().toISOString()})
  .then(() => {
    // Wait 1 second
    setTimeout(() => {
      // Reload page
      window.location.reload();
    }, 1000);
  });

// After reload, check console for:
// [TimeSavingsTracker] Stats loaded from chrome.storage.local: {totalMoves: 999, ...}
```

---

## Error Scenarios & Handling

### Scenario 1: Storage not available
```javascript
// System tries getCategoryMoveStats()
// ❌ chrome.storage.local returns error
// ✅ Falls back to message-based API
// ✅ Returns default values if both fail
```

**Console output**:
```
[getCategoryMoveStats] Error reading stats: ...
[TimeSavingsTracker] Message API failed, using defaults: ...
```

### Scenario 2: Corrupted localStorage data
```javascript
// During migrateFromLocalStorage()
// ❌ JSON.parse() fails on "shopline_category_stats"
// ✅ Error logged, migration continues with next key
// ✅ Other keys migrated successfully
```

**Console output**:
```
[migrateFromLocalStorage] Failed to parse shopline_category_stats: SyntaxError...
[migrateFromLocalStorage] Migration completed: {itemsMigrated: 2, errors: [{key: "shopline_category_stats", ...}], ...}
```

### Scenario 3: Statistics save fails
```javascript
// During recordMove() + saveStats()
// ❌ chrome.storage.local.set() returns error
// ✅ Stats updated in memory
// ⚠️  Data may be lost on page reload
// ✅ Falls back to message-based API
```

**Console output**:
```
[saveCategoryMoveStats] Error saving stats: ...
[TimeSavingsTracker] Error saving stats: ...
```

---

## Data Structure Reference

### Statistics Object
```javascript
{
  totalMoves: 6,                            // Total category moves performed
  totalTimeSaved: 135,                      // Total time saved in seconds
  lastReset: "2026-01-28T21:24:28.000Z"    // ISO timestamp of last reset
}
```

### Migration Report
```javascript
{
  itemsMigrated: 2,                         // Number of keys successfully migrated
  errors: [                                 // Array of errors encountered
    {
      key: "shopline_category_stats",
      error: "SyntaxError: Unexpected token...",
      type: "parse_error"
    }
  ],
  startTime: "2026-01-28T21:24:28.000Z",   // Start of migration
  endTime: "2026-01-28T21:24:28.500Z",     // End of migration
  alreadyMigrated: false                    // If already migrated (skip triggered)
}
```

### Recorded Move Result
```javascript
{
  thisMove: 12.5,                           // Time saved in this move (seconds)
  totalMoves: 6,                            // Updated total moves
  totalTime: 135,                           // Updated total time saved
  savePromise: Promise                      // Promise resolves when saved to storage
}
```

---

## Common Tasks

### Task 1: Initialize tracker and wait for real stats
```javascript
const tracker = new TimeSavingsTracker();

// Option A: Wait for initialization
await tracker.initializationPromise;
console.log("Real stats loaded:", tracker.stats);

// Option B: Check stats immediately (may be defaults)
console.log("Stats (may be defaults):", tracker.stats);
```

### Task 2: Record move and ensure it's saved
```javascript
const result = tracker.recordMove(20, 2, true);

console.log("Immediate result:", {
  thisMove: result.thisMove,
  totalMoves: result.totalMoves,
  totalTime: result.totalTime
});

// Wait for storage persistence
await result.savePromise;
console.log("Data persisted!");
```

### Task 3: Force data reload from storage
```javascript
const freshStats = await window.getCategoryMoveStats();
tracker.stats = freshStats;
console.log("Reloaded fresh stats:", tracker.stats);
```

### Task 4: Check migration status
```javascript
const report = await window.migrateFromLocalStorage();

if (report.alreadyMigrated) {
  console.log("Migration already completed previously");
} else {
  console.log(`Migrated ${report.itemsMigrated} items`);
  if (report.errors.length > 0) {
    console.warn("Migration had errors:", report.errors);
  }
}
```

---

## Files Reference

| File | Purpose | Key Functions |
|------|---------|---|
| src/shared/storage.js | Storage API wrapper | getCategoryMoveStats, saveCategoryMoveStats, migrateFromLocalStorage |
| src/content/content.js | Page content integration | TimeSavingsTracker class |
| test/storage-integration.test.js | Unit tests | Test scenarios |
| STORAGE_INTEGRATION_TEST_PLAN.md | Test documentation | Comprehensive test cases |
| PHASE_3_0_COMPLETION_REPORT.md | Implementation report | Details and verification |

---

## Key Points

1. **All functions are async** - Use `await` or `.then()`
2. **Backward compatible** - Falls back to message-based API if needed
3. **Transparent migration** - Happens automatically on first load
4. **Comprehensive logging** - Check console for `[prefix]` logs
5. **Error resilient** - Errors logged but don't crash the extension
6. **One-time migration** - Uses `migrationComplete` flag to prevent duplicates
7. **Persistent storage** - Survives page reloads and browser restarts

---

## Troubleshooting

**Q: Statistics show 0 values after page reload?**  
A: Wait for `initializationPromise` to complete

**Q: No migration happened but I have old localStorage data?**  
A: Call `migrateFromLocalStorage()` manually

**Q: Data disappeared after saving?**  
A: Check browser console for errors, verify chrome.storage.local has permission

**Q: Can't find the logged messages?**  
A: Search console for `[Storage` or `[TimeSavings` prefixes

**Q: Multiple migrations happening?**  
A: Should never happen - `migrationComplete` flag prevents it

---

**For detailed information**, see:
- `PHASE_3_0_COMPLETION_REPORT.md` - Full implementation details
- `STORAGE_INTEGRATION_TEST_PLAN.md` - Comprehensive test cases
- `src/shared/storage.js` - Source code with JSDoc comments
- `src/content/content.js` - TimeSavingsTracker integration

