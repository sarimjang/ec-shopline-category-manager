# Troubleshooting Guide: Export & Import

**Shopline Category Manager Chrome Extension**
**Phase 2: Data Export & Import**
**Version**: 1.0
**Last Updated**: 2026-01-27

---

## Quick Diagnostics

### Identify Your Problem

**Export not working?**
→ Go to: Export Problems section

**Import not working?**
→ Go to: Import Problems section

**File validation failed?**
→ Go to: Validation Errors section

**Conflicts detected?**
→ Go to: Conflict Issues section

**Running out of space?**
→ Go to: Storage Problems section

**Data looks wrong?**
→ Go to: Data Corruption section

**Extension is slow?**
→ Go to: Performance Issues section

---

## Export Problems

### Export Button Doesn't Work

**What you see**: Click button, nothing happens

**Troubleshooting**:
1. Check if extension is enabled (chrome://extensions)
2. Reload extension using reload button
3. Check Chrome DevTools console for errors
4. Verify download permissions in Chrome settings

**Solutions**:
- ✅ Enable extension if disabled
- ✅ Reload extension
- ✅ Check download folder permissions
- ✅ Try different download location

### File Downloads but is Empty

**What you see**: File downloads but contains no data

**Troubleshooting**:
1. Use extension first to create some data
2. Check if storage has data:
   ```javascript
   chrome.storage.local.get('categoryMoveStats', (data) => {
     console.log('Stats:', data);
   });
   ```
3. Verify downloaded file is complete JSON

**Solutions**:
- ✅ Make some category moves first
- ✅ Check chrome.storage.local for data
- ✅ Try export again

---

## Import Problems

### File Not Accepted by Import

**What you see**: File is grayed out in picker, can't select it

**Troubleshooting**:
1. Check file extension: Must be `.json`
2. Verify file is readable JSON
3. Try different file

**Solutions**:
- ✅ Verify filename has .json extension
- ✅ Check file is valid JSON
- ✅ Try test file to verify picker works

### Import Never Completes

**What you see**: Shows "Processing..." forever

**Troubleshooting**:
1. Wait 30 seconds (some files take time)
2. Check Service Worker for errors:
   - Right-click extension → Manage extension
   - Click Details → Service Worker
   - Look for error messages
3. Try with smaller file

**Solutions**:
- ✅ Give it 30 seconds
- ✅ Check service worker errors
- ✅ Reload extension
- ✅ Try with smaller file

### Import Completes but Data Doesn't Appear

**What you see**: Import succeeds but stats show 0 moves

**Troubleshooting**:
1. Reload popup (close and reopen)
2. Check if data in storage:
   ```javascript
   chrome.storage.local.get('moveHistory', (data) => {
     console.log('History length:', data.moveHistory.length);
   });
   ```
3. Check for errors in console

**Solutions**:
- ✅ Reload popup to refresh UI
- ✅ Verify data in storage directly
- ✅ Check console for errors

---

## Validation Errors

### "Invalid JSON Format"

**What it means**: JSON syntax error

**Common issues**:
- Missing comma between fields
- Trailing commas
- Single quotes instead of double quotes
- Missing closing brackets

**How to fix**:
1. Use online JSON validator (jsonlint.com)
2. Or open file in code editor with JSON support
3. Look for red error indicators
4. Use original exported file

### "Missing Required Field"

**What it means**: File is incomplete

**Required fields**:
- exportDate, version, data (top level)
- data must have: stats, moveHistory, searchHistory, errorLog

**How to fix**:
1. Use complete exported file
2. Don't manually edit JSON
3. Export fresh data

### "Data Type Mismatch"

**What it means**: Wrong data type (e.g., string instead of number)

**Type requirements**:
- stats.totalMoves: number (not string)
- stats.totalTimeSaved: number (not string)
- moveHistory: array (not object)

**How to fix**:
1. Check error message for field and expected type
2. Remove quotes from numbers: "42" → 42
3. Use arrays [ ] not objects { }

### "Invalid Timestamp Format"

**What it means**: Date format incorrect

**Correct format**: `YYYY-MM-DDTHH:mm:ss.SSSZ`
**Wrong format**: `2026-01-27` or `01/27/2026`

**How to fix**:
1. Use ISO 8601 format
2. Always include T and Z
3. Use original exported file

---

## Conflict Issues

### Too Many Conflicts Detected

**What it means**: Many duplicates found

**Why it happens**:
- Same file imported twice
- Importing old backup (you have newer data)
- Wrong file selected

**What to do**:
1. This is NORMAL and EXPECTED
2. Conflicts prevent data duplication
3. Only new data will be added
4. Existing data preserved
5. Safe to click Import

**Solutions**:
- ✅ Understand duplicates are expected
- ✅ Review conflicts in preview
- ✅ Proceed with import
- ✅ Only non-duplicate data added

---

## Storage Problems

### "Storage Space Full" Error

**What it means**: Chrome extension storage quota exceeded

**How much space**:
- Chrome extensions get: ~10 MB
- Shopline typically uses: 100 KB - 1 MB
- Can fit: Years of data

**How to fix**:
1. Export current data (backup first)
2. Clear old history:
   - Open extension
   - Find "Clear History" button
   - Select old date range to clear
3. Try import again

**Solutions**:
- ✅ Export before clearing
- ✅ Clear old data to free space
- ✅ Retry import

---

## Data Corruption

### Warning Signs

❌ Statistics suddenly wrong
❌ Duplicate entries everywhere
❌ Missing data sections
❌ Inconsistent statistics

### Recovery Steps

1. **STOP ALL OPERATIONS** - Don't make changes
2. **Export current state** - Have record of corruption
3. **Clear and restore**:
   ```javascript
   chrome.storage.local.clear();
   // Then import from backup
   ```
4. **Verify recovered data**:
   ```javascript
   chrome.storage.local.get(null, (data) => {
     console.log('Stats:', data.categoryMoveStats);
     console.log('History:', data.moveHistory.length);
   });
   ```

---

## Performance Issues

### Extension is Slow

**What you see**: Popup takes 3+ seconds to open

**Causes**:
1. Too much history stored
2. Browser resources low
3. Slow storage access

**How to fix**:
1. Check storage size:
   ```javascript
   chrome.storage.local.getBytesInUse(null, (bytes) => {
     console.log('Used:', (bytes/1024/1024).toFixed(2), 'MB');
   });
   ```
2. If > 5 MB: Too much data
3. Clear old data to speed up

**Solutions**:
- ✅ Check storage size
- ✅ Clear old data
- ✅ Restart browser

---

## Advanced Diagnostics

### Console Commands

```javascript
// Check storage state
chrome.storage.local.get(null, (data) => {
  console.log('All storage:', data);
});

// Check space usage
chrome.storage.local.getBytesInUse(null, (bytes) => {
  console.log('Used:', bytes, 'bytes');
});

// Test export
chrome.runtime.sendMessage({action: 'exportData'}, (r) => {
  console.log('Export response:', r);
});

// Check for errors
chrome.runtime.lastError
  ? console.log('Error:', chrome.runtime.lastError)
  : console.log('No errors');
```

### Debug Mode

Check DevTools console:
1. Right-click popup
2. Select "Inspect"
3. Go to "Console" tab
4. Look for red error messages
5. Note exact error text

---

## When to Contact Support

### Contact Support If

✅ Consistent issues that won't resolve
✅ Error message you don't understand
✅ Data corruption after recovery steps
✅ Suspected extension bug
✅ Feature not working at all

### What to Include

1. Exact error message (copy/paste)
2. What you were trying to do
3. Steps to reproduce
4. Browser version
5. Extension version
6. Screenshot of error
7. Operating system

---

**Last Updated**: 2026-01-27
**Version**: 1.0

