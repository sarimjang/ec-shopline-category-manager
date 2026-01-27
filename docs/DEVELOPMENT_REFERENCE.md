# Developer Reference: Export & Import Implementation

**Shopline Category Manager Chrome Extension**
**Phase 2: Data Export & Import**
**Version**: 1.0
**Last Updated**: 2026-01-27

---

## Overview

This guide is for developers who need to:
- Understand the export/import system architecture
- Extend functionality (add new export formats, etc.)
- Debug issues in the system
- Add new validation rules
- Integrate with other systems

---

## Architecture

### High-Level System Design

```
Presentation Layer (popup.html, popup.js, popup.css)
         ↓
Business Logic Layer (Service Worker)
         ↓
Validation Layer (import-validator.js, conflict-detector.js)
         ↓
Data Layer (Chrome Storage)
```

### Component Responsibilities

**Presentation Layer**:
- Render UI elements
- Capture user interactions
- Display results

**Business Logic Layer**:
- Coordinate validation
- Execute import operation
- Manage storage operations

**Validation Layer**:
- Validate JSON format
- Check schema compatibility
- Verify data types
- Detect conflicts

**Data Layer**:
- Persistent storage
- Quota management
- Key-value operations

---

## Component Guide

### 1. popup.js - User Interface Controller

**Key Functions**:
- `handleExport()` - Collect data and trigger download
- `handleFileImport(event)` - Process selected file
- `showImportPreview(validationResult)` - Display preview
- `handleConfirmImport()` - Execute import

**Dependencies**:
- popup.html (DOM elements)
- popup.css (styling)
- Chrome runtime API
- Service worker messaging

**File Location**: `src/popup/popup.js`

### 2. service-worker.js - Background Process

**Key Functions**:
- `handleExportData(request, sendResponse)` - Prepare export
- `handleValidateImportData(request, sendResponse)` - Validate data
- `handleExecuteImportData(request, sendResponse)` - Write to storage

**Responsibilities**:
- Listen for messages
- Route to handlers
- Coordinate validation
- Execute import

**File Location**: `src/background/service-worker.js`

### 3. import-validator.js - Validation Logic

**Key Functions**:
- `validateImportData(jsonString)` - Main validation function
- `validateJSONFormat(jsonString)` - Parse JSON
- `validateRequiredFields(data)` - Check required fields
- `validateDataTypes(data)` - Type check all fields
- `validateTimestamps(data)` - Verify ISO 8601 format
- `validateDataBoundaries(data)` - Enforce max records

**File Location**: `src/shared/import-validator.js`

### 4. conflict-detector.js - Conflict Logic

**Key Functions**:
- `detectConflicts(importedData, existingData)` - Main detection
- `detectDuplicateMoves(imported, existing)` - Find identical moves
- `generateMergeStrategy(conflicts)` - Create merge plan
- `performMerge(imported, existing, strategy)` - Execute merge

**File Location**: `src/shared/conflict-detector.js`

---

## Message Protocol

### Export Message

**Request**: `{action: 'exportData'}`

**Response**:
```javascript
{
  success: true,
  data: {stats, moveHistory, searchHistory, errorLog},
  summary: {moveCount, searchCount, errorCount}
}
```

### Validation Message

**Request**: 
```javascript
{
  action: 'validateImportData',
  payload: {jsonString: '...'}
}
```

**Response**:
```javascript
{
  success: true,
  isValid: boolean,
  errors: [],
  conflicts: [],
  mergedData: {},
  summary: {}
}
```

### Import Message

**Request**:
```javascript
{
  action: 'executeImportData',
  payload: {mergedData: {}, importTimestamp: '...'}
}
```

**Response**:
```javascript
{
  success: true,
  message: 'Import completed',
  summary: {movesAdded, searchesAdded, ...}
}
```

---

## Storage Schema

### Chrome Storage Keys

```javascript
{
  categoryMoveStats: {
    totalMoves: Number,
    totalTimeSaved: Number,
    lastReset: ISO8601String
  },
  moveHistory: [{timestamp, timeSaved, categoryId, ...}],
  searchHistory: [String],
  errorLog: [{timestamp, type, message}]
}
```

---

## Data Flow

### Complete Export-Import Cycle

```
1. Export
   User → handleExport() → Service Worker → Download

2. Validation
   File → handleFileImport() → Service Worker → Validator

3. Preview
   Validation Result → showImportPreview() → Display

4. Import
   User Confirm → handleConfirmImport() → Service Worker → Storage
```

---

## Extending the System

### Adding New Export Format

**Step 1**: Create validator
```javascript
class CsvExportValidator {
  generateCsv(data) {
    // Generate CSV string
  }
}
```

**Step 2**: Update export handler
```javascript
if (format === 'csv') {
  const validator = new CsvExportValidator();
  const csv = validator.generateCsv(data);
  sendResponse({format: 'csv', data: csv});
}
```

**Step 3**: Add UI controls
```html
<select id="exportFormat">
  <option value="json">JSON</option>
  <option value="csv">CSV</option>
</select>
```

### Adding New Validation Rule

**Step 1**: Extend validator
```javascript
validateCustomRule(data) {
  const errors = [];
  // Check rule
  return {isValid, errors};
}
```

**Step 2**: Call from pipeline
```javascript
const custom = this.validateCustomRule(data);
if (!custom.isValid) {
  errors.push(...custom.errors);
}
```

### Adding New Conflict Type

**Step 1**: Extend detector
```javascript
detectNewConflict(imported, existing) {
  // Find new type of conflict
  return conflicts;
}
```

**Step 2**: Call from detection
```javascript
allConflicts.push(
  ...this.detectNewConflict(imported, existing)
);
```

---

## Testing

### Unit Testing

```javascript
const validator = new ShoplineImportValidator();
const result = validator.validateImportData(jsonString);
console.assert(result.isValid === true);
```

### Integration Testing

```javascript
chrome.runtime.sendMessage(
  {action: 'validateImportData', payload: {jsonString}},
  (response) => {
    console.assert(response.success === true);
  }
);
```

### Performance Testing

```javascript
const start = performance.now();
// Perform operation
const end = performance.now();
console.log(`Time: ${end - start}ms`);
```

---

## Common Patterns

### Async Storage Operations

```javascript
function readStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (items) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(items);
      }
    });
  });
}
```

### Error Handling

```javascript
try {
  const result = validator.validateImportData(jsonString);
  return result;
} catch (error) {
  return {
    success: false,
    error: {type: error.type, message: error.message}
  };
}
```

### Validation with Accumulation

```javascript
function validateAll(data) {
  const errors = [];
  if (!data.field1) errors.push({type: 'MISSING_FIELD1'});
  if (!data.field2) errors.push({type: 'MISSING_FIELD2'});
  return {isValid: errors.length === 0, errors};
}
```

---

## Troubleshooting

### Validation Passes but Import Fails

**Likely causes**:
1. Data structure changed between steps
2. Storage quota exceeded
3. Concurrent access to storage

**Solution**: Validate again before import, check quota

### Conflicts Not Detected

**Likely causes**:
1. Comparison logic incorrect
2. Data format unexpected
3. Timestamp comparison too strict

**Debug**:
```javascript
console.log('Imported:', importedData);
console.log('Existing:', existingData);
```

### Progress Bar Not Updating

**Likely causes**:
1. Progress messages not sent
2. UI not listening
3. Too fast to see

**Debug**: Add console.log at each update

---

## Performance Optimization

### Minimize Storage Reads

```javascript
// Good: Single read
const {stats, history} = await readStorage(
  ['categoryMoveStats', 'moveHistory']
);

// Bad: Multiple reads
const stats = await readStorage('categoryMoveStats');
const history = await readStorage('moveHistory');
```

### Use Batch Operations

```javascript
// Good: Single write
chrome.storage.local.set({stats, history});

// Bad: Multiple writes
chrome.storage.local.set({stats});
chrome.storage.local.set({history});
```

---

## References

- Chrome Storage API: https://developer.chrome.com/docs/extensions/reference/storage/
- Chrome Messaging API: https://developer.chrome.com/docs/extensions/mv3/messaging/
- JSON Format: https://www.json.org/
- ISO 8601: https://en.wikipedia.org/wiki/ISO_8601

---

**Version**: 1.0
**Last Updated**: 2026-01-27

