# Import Validation Specification

## Overview

The Import Validation system provides comprehensive validation and conflict detection for imported data. It ensures data integrity and guides users through the import process with detailed conflict resolution options.

## Architecture

### Components

1. **Import Validator** (src/shared/import-validator.js)
   - JSON format validation
   - Schema version compatibility checking
   - Required fields verification
   - Data type validation
   - Timestamp format validation (ISO 8601)
   - Data boundary checking

2. **Conflict Detector** (src/shared/conflict-detector.js)
   - Detects duplicate moves, searches, and errors
   - Identifies version and timestamp conflicts
   - Detects data loss risks
   - Generates merge strategies
   - Performs intelligent data merging

3. **Service Worker Handler** (src/background/service-worker.js)
   - validateImportData message handler
   - Orchestrates validation and conflict detection
   - Returns comprehensive validation report

4. **Popup UI** (src/popup/popup.js)
   - Updated import workflow
   - Displays validation results
   - Shows conflict summary
   - Handles user confirmation
   - Performs data merging before import

## Main Functions

### ShoplineImportValidator.validateImportData(jsonString)

Validates JSON structure and data integrity.

Returns:
```javascript
{
  isValid: boolean,
  data: Object|null,
  errors: Array<{severity, type, message}>,
  warnings: Array<{severity, type, message}>,
  summary: Object,
  schemaVersion: Object
}
```

### ShoplineConflictDetector.detectConflicts(importedData, existingData)

Detects conflicts and generates merge strategy.

Returns:
```javascript
{
  hasConflicts: boolean,
  conflicts: Array,
  summary: Object,
  mergeStrategy: Object,
  mergedData: Object
}
```

## Conflict Types

| Type | Severity | Detection | Resolution |
|------|----------|-----------|-----------|
| DUPLICATE_MOVE | WARNING | categoryId + timestamp + timeSaved | SKIP |
| DUPLICATE_SEARCH | INFO | String comparison | SKIP |
| DUPLICATE_ERROR | INFO | type + message + timestamp | SKIP |
| VERSION_MISMATCH | WARNING | Schema version | WARN |
| DATA_LOSS_RISK | ERROR | Empty arrays over data | MERGE |

## Validation Process

1. JSON format validation
2. Schema version check
3. Required fields check
4. Data type validation
5. Timestamp format validation
6. Data boundary checking

## Merge Strategies

- **MERGE**: Combine data, remove duplicates
- **DEDUPLICATE**: Remove duplicate entries
- **SKIP**: Ignore duplicate record
- **RECALCULATE**: Recalculate stats from merged data

## Data Boundaries

- moveHistory: Max 500 records (auto-truncate)
- searchHistory: Max 50 records (auto-truncate)  
- errorLog: Max 100 records (auto-truncate)

For full specification, see detailed documentation.
