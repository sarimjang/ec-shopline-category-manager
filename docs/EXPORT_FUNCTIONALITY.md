# Export Functionality Documentation

## Overview

The Shopline Category Manager Chrome Extension provides comprehensive export functionality for backing up and exporting extension data. This document describes the export system, file formats, and usage.

## Features

### 1. JSON Export

**Format**: Complete JSON structure with all extension data
**Filename**: `shopline-category-backup-YYYY-MM-DD.json`
**Size**: Typically 5-50 KB depending on data volume

The JSON export includes:
- Complete statistics (total moves, time saved, last reset)
- Full move history with timestamps
- Search query history
- Error log with classifications
- Export metadata (date, version)

**Example JSON Structure**:
```json
{
  "exportDate": "2026-01-27T10:30:00.000Z",
  "exportDateFormatted": "2026-01-27",
  "version": "1.0",
  "data": {
    "stats": {
      "totalMoves": 42,
      "totalTimeSaved": 2520,
      "lastReset": "2026-01-01T00:00:00.000Z"
    },
    "moveHistory": [
      {
        "timestamp": "2026-01-27T10:25:00.000Z",
        "timeSaved": 60,
        "categoryId": "cat_123",
        "categoryName": "Electronics",
        "targetLevel": 2,
        "usedSearch": true
      }
    ],
    "searchHistory": ["electronics", "clothing"],
    "errorLog": []
  }
}
```

### 2. CSV Export (Future Enhancement)

**Format**: Comma-separated values with multiple sections
**Filename**: `shopline-category-backup-YYYY-MM-DD.csv`

When implemented, CSV export will include:
- **Statistics Sheet**: Single row with overall statistics
- **Moves Sheet**: Category moves with timestamp, ID, name, time saved
- **Searches Sheet**: Search queries with timestamp
- **Errors Sheet**: Error records with type and message

**Example CSV Format**:
```csv
# === STATISTICS ===
Total Moves,Total Time Saved (seconds),Average Time Per Move (seconds),Last Reset
42,2520,60,"2026-01-01T00:00:00.000Z"

# === MOVES ===
Timestamp,Category ID,Category Name,Time Saved (seconds)
2026-01-27T10:25:00.000Z,cat_123,Electronics,60
2026-01-27T10:20:00.000Z,cat_124,Clothing,55

# === SEARCHES ===
Query,Timestamp
electronics,2026-01-27T10:25:00.000Z
clothing,2026-01-27T10:20:00.000Z
```

## Architecture

### Core Components

#### 1. **csv-export.js** (`src/shared/csv-export.js`)

Utility library for CSV export operations.

**Key Functions**:
- `escapeField(field)`: Escape CSV special characters
- `arrayToCsv(data, headers)`: Convert array of objects to CSV
- `createMovesCsv(moveHistory)`: Generate moves CSV
- `createSearchesCsv(searchHistory)`: Generate searches CSV
- `createErrorsCsv(errorLog)`: Generate errors CSV
- `createStatsCsv(stats)`: Generate statistics CSV

**Responsibilities**:
- Field escaping (quotes, commas, line breaks)
- CSV formatting and validation
- Header generation
- Data type conversion

#### 2. **export-formats.js** (`src/shared/export-formats.js`)

High-level export format handler managing JSON and CSV exports.

**Key Functions**:
- `getExportDate()`: Generate YYYY-MM-DD format date
- `createJsonExport(allData)`: Create JSON export structure
- `createCsvExport(allData)`: Create CSV export structure
- `generateJsonExport(exportData)`: Generate downloadable JSON blob
- `generateCsvExport(csvSheets, exportDate)`: Generate downloadable CSV blob
- `triggerDownload(blob, filename)`: Initiate file download
- `getExportSummary(exportData)`: Generate export summary

**Responsibilities**:
- Format selection and routing
- Blob creation and preparation
- Download trigger mechanism
- Metadata generation
- Export history tracking

#### 3. **popup.js** (`src/popup/popup.js`)

Popup UI controller handling user interactions.

**Key Function**: `handleExport()`
- Collects all storage data via StorageManager
- Uses ExportFormats library to prepare export
- Triggers JSON download to user's device
- Records export to history
- Displays status message with summary

#### 4. **service-worker.js** (`src/background/service-worker.js`)

Background service worker with enhanced export handler.

**Key Function**: `handleExportData(request, sendResponse)`
- Retrieves all chrome.storage.local data
- Packages data with metadata and summary
- Validates data integrity
- Returns structured export data

## Data Flow

### Export Process

```
User clicks Export Button
    ↓
handleExport() in popup.js
    ↓
StorageManager.getStats()
StorageManager.getMoveHistory()
StorageManager.getSearchHistory()
StorageManager.getErrorLog()
    ↓
ExportFormats.createJsonExport()
    ↓
ExportFormats.generateJsonExport()
    ↓
ExportFormats.triggerDownload()
    ↓
File Downloaded to User Device
    ↓
StorageManager.addToHistory('exports', entry)
```

### Data Collection

All export data comes from `chrome.storage.local`:

| Storage Key | Description | Type |
|---|---|---|
| `categoryMoveStats` | Overall statistics | Object |
| `moveHistory` | Individual move records | Array |
| `searchHistory` | Search queries | Array |
| `errorLog` | Error records | Array |

## Usage

### User Export

1. Open extension popup (click extension icon)
2. Click "匯出資料" (Export Data) button
3. JSON file automatically downloads as `shopline-category-backup-YYYY-MM-DD.json`
4. Success message displays with data summary

### Import

1. Click "匯入資料" (Import Data) button
2. Select previously exported JSON file
3. Data is restored to extension storage
4. Popup refreshes to show imported statistics

### Export History

All exports are recorded in `chrome.storage.local['exports']`:

```javascript
{
  timestamp: "2026-01-27T10:30:00.000Z",
  format: "JSON",
  filename: "shopline-category-backup-2026-01-27.json",
  fileSize: "12.5 KB",
  summary: {
    totalMoves: 42,
    totalTimeSaved: 2520,
    moveRecords: 42,
    searchQueries: 5,
    errorRecords: 0
  }
}
```

## File Size Considerations

### Storage Limits

- Chrome storage quota: 10 MB per extension
- Move history limit: 500 records (rotating)
- Search history limit: 50 records
- Error log limit: 100 records

### Typical Export Sizes

| Scenario | JSON Size | CSV Size |
|---|---|---|
| Empty (no moves) | ~0.5 KB | ~0.3 KB |
| 10 moves | ~1.5 KB | ~0.8 KB |
| 50 moves | ~5 KB | ~3 KB |
| 100+ moves (max) | ~15 KB | ~8 KB |

## Error Handling

### Export Failures

Handled errors:
- Storage API unavailable
- Export library not loaded
- Download trigger failure
- Invalid data format

All errors display in popup status area with details.

### Data Validation

- Stats object structure verified
- History arrays checked for validity
- Timestamps validated
- Size limits enforced

## Testing Scenarios

### Test Case 1: Basic Export
1. Create a few category moves (2-5)
2. Click Export button
3. Verify JSON downloads with correct filename
4. Verify JSON is valid and readable
5. Check summary message accuracy

### Test Case 2: Large Dataset
1. Perform 50+ category moves
2. Record multiple searches
3. Trigger export
4. Verify all records present in JSON
5. Confirm file size reasonable

### Test Case 3: Empty Data
1. Clear all storage (use Reset Stats)
2. Click Export
3. Verify minimal JSON still downloads
4. Confirm structure is valid

### Test Case 4: Reimport
1. Export data to JSON
2. Reset all statistics
3. Import the JSON file
4. Verify statistics restored
5. Confirm move history recovered

### Test Case 5: Error Handling
1. Manually corrupt storage data
2. Attempt export
3. Verify error message displays
4. Check extension remains functional

## Future Enhancements

### Phase 2 Planned Features

1. **CSV Export**
   - Individual CSV files for moves, searches, errors
   - Separate statistics file
   - ZIP archive bundling all CSVs

2. **Export Scheduling**
   - Automatic daily/weekly exports
   - Cloud backup integration
   - Version control and rollback

3. **Advanced Filtering**
   - Date range selection
   - Category-specific exports
   - Custom field selection

4. **Compression**
   - ZIP format for multiple files
   - GZ compression option
   - Reduced transfer size

## API Reference

### ExportFormats API

```javascript
// Get export date
const date = ShoplineExportFormats.getExportDate();
// Returns: "2026-01-27"

// Create JSON export
const jsonData = ShoplineExportFormats.createJsonExport(storageData);

// Create CSV export
const csvSheets = ShoplineExportFormats.createCsvExport(storageData);

// Generate downloadable JSON
const jsonExport = ShoplineExportFormats.generateJsonExport(jsonData);
// Returns: { blob, filename, size, format, stats }

// Trigger download
ShoplineExportFormats.triggerDownload(blob, filename);

// Get summary
const summary = ShoplineExportFormats.getExportSummary(jsonData);
```

### CsvExport API

```javascript
// Escape CSV field
const escaped = ShoplineCsvExport.escapeField('value with, comma');

// Convert to CSV
const csv = ShoplineCsvExport.arrayToCsv([
  { name: 'Item 1', value: 10 },
  { name: 'Item 2', value: 20 }
]);

// Create specific CSV types
const movesCsv = ShoplineCsvExport.createMovesCsv(moveHistory);
const searchesCsv = ShoplineCsvExport.createSearchesCsv(searchHistory);
const errorsCsv = ShoplineCsvExport.createErrorsCsv(errorLog);
```

## Troubleshooting

### Export File Not Downloading

**Symptoms**: Click export but no file appears

**Solutions**:
1. Check browser download settings
2. Verify popup window remains open
3. Check browser console for errors
4. Try refreshing extension

### Import Fails

**Symptoms**: "匯入失敗" (Import failed) message

**Solutions**:
1. Verify JSON file is valid
2. Check file format matches export schema
3. Ensure file not corrupted
4. Try re-exporting reference data

### Large File Performance

**Symptoms**: Slow export with 100+ moves

**Solutions**:
1. Reduce move history (perform reset)
2. Clear error log if excessive
3. Try CSV format instead of JSON
4. Export periodically rather than accumulating

## References

- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [Blob API](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- [CSV Format Specification](https://tools.ietf.org/html/rfc4180)
