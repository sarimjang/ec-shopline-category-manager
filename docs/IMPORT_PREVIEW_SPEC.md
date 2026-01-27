# Import Preview UI Specification

**Status**: Completed
**Version**: 1.0
**Date**: 2026-01-27

## Overview

The Import Preview UI provides users with a comprehensive view of data before confirming an import operation. It displays validation results, detected conflicts, merge strategies, and import impact predictions, allowing users to make informed decisions about data merging.

## UI Components

### 1. Preview Panel Layout

**Position**: Fixed modal, centered on screen
**Dimensions**:
- Width: 90% (max 500px)
- Height: Auto (max 90vh with scrolling)
- Z-index: 1001

**Structure**:
```
┌─────────────────────────────────────────┐
│ 匯入預覽                              ✕ │
├─────────────────────────────────────────┤
│ 📊 資料摘要                             │
│ ┌─────────────────────────────────────┐ │
│ │ 移動記錄: 25 | 搜尋查詢: 10         │ │
│ │ 錯誤日誌: 5  | 檔案大小: 45.2 KB   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ⚠️  偵測到衝突 (3)                     │
│ ┌─────────────────────────────────────┐ │
│ │ ❌ 重複的移動: #123 → SKIP           │ │
│ │ ⚠️  版本不匹配: v1 → v1 → UPGRADE    │ │
│ │ ℹ️  重複的搜尋: "category" → SKIP    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 🔄 合併策略                             │
│ ┌─────────────────────────────────────┐ │
│ │ 移動記錄: MERGE | 搜尋查詢: DEDUP   │ │
│ │ 錯誤日誌: MERGE | 統計資料: CALC    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 📈 匯入影響預覽                         │
│ ┌─────────────────────────────────────┐ │
│ │ ✓ 將新增或合併 25 筆移動記錄        │ │
│ │ ✓ 將新增或合併 10 個搜尋查詢        │ │
│ │ ⚠ 將跳過 3 筆重複的移動記錄         │ │
│ │ ✓ 預計匯入後保留 122 筆記錄         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [取消] [保存備份] [確認匯入]          │
└─────────────────────────────────────────┘
```

### 2. Data Summary Section

**Purpose**: Quick overview of data to be imported

**Elements**:
- **移動記錄**: Number of move history records
- **搜尋查詢**: Number of search queries
- **錯誤日誌**: Number of error log entries
- **檔案大小**: File size in human-readable format

**Styling**:
- Grid layout: 2x2
- Background: Light blue (#f8f9fa)
- Border: Left accent in primary color
- Hover effect: Highlight on interaction

### 3. Conflicts Section

**Visibility**: Shown only when `conflictDetected === true`

**Conflict Item Structure**:
```
[Icon] Message | Resolution
```

**Severity Levels & Colors**:
- **ERROR** (❌): Red (#fee2e2)
  - Examples: Data loss risk, schema mismatch
  - Priority: HIGH

- **WARNING** (⚠️): Amber (#fef3c7)
  - Examples: Duplicate records, version mismatch
  - Priority: MEDIUM

- **INFO** (ℹ️): Blue (#dbeafe)
  - Examples: Duplicate searches, duplicate errors
  - Priority: LOW

**Scrollable**: Max height 200px with scroll for many conflicts

**Example Conflict Display**:
```
❌ Duplicate move: categoryId=42 | SKIP
⚠️ Version mismatch: imported v1, existing v1 | UPGRADE
ℹ️ Duplicate search: "winter coat" | SKIP
```

### 4. Merge Strategy Section

**Purpose**: Explain how different data types will be handled

**Strategy Types**:
| Data Type | Strategy | Meaning |
|-----------|----------|---------|
| 移動記錄 | MERGE | Combine with existing, deduplicate |
| 搜尋查詢 | DEDUPLICATE | Add unique, skip duplicates |
| 錯誤日誌 | MERGE | Combine, deduplicate |
| 統計資料 | RECALCULATE | Compute totals from merged data |

**Display Format**:
- Grid layout: 2x2
- Each item shows label and value
- Color-coded: Green background (#f0fdf4)

### 5. Impact Preview Section

**Purpose**: Show expected results of the import

**Impact Types**:
- **Success** (Green): Records being added
- **Warning** (Amber): Records being skipped
- **Error** (Red): Critical issues (if any)

**Examples**:
```
✓ Will add or merge 25 move records
✓ Will add or merge 10 search queries
⚠ Will skip 3 duplicate move records
✓ Expected to retain 122 total records after import
```

### 6. Progress Section

**Visibility**: Hidden by default, shown during import

**Components**:
- Progress bar (animated fill)
- Status message: "Importing... 25/100 records"
- Percentage display in bar

**Styling**:
- Bar height: 24px
- Color: Blue gradient
- Animation: Smooth width transition

### 7. Control Buttons

**Layout**: Horizontal flex, gap 12px

**Buttons**:

| Button | Action | Loading State | Disabled During |
|--------|--------|---------------|-----------------|
| 取消 | Close panel without importing | No | Import |
| 保存備份 | Export current data before import | Yes | Import |
| 確認匯入 | Execute import with current settings | Yes | Always |

**Styling**:
- 取消/保存備份: Secondary (white, bordered)
- 確認匯入: Primary (blue, filled)
- Disabled state: 50% opacity, cursor not-allowed

## Data Structures

### ValidationResult Object
```javascript
{
  success: true,
  isValid: true,
  data: { /* validated import data */ },
  errors: [],
  warnings: [],
  summary: {
    totalMoves: 50,
    moveRecords: 25,
    searchQueries: 10,
    errorRecords: 5
  },
  conflictDetected: true,
  conflicts: [ /* array of conflict objects */ ],
  conflictSummary: {
    duplicateMoves: 2,
    duplicateSearches: 1,
    duplicateErrors: 0,
    versionMismatches: 0,
    dataLossRisks: 0
  },
  mergeStrategy: {
    moves: 'MERGE',
    searches: 'DEDUPLICATE',
    errors: 'MERGE',
    stats: 'RECALCULATE'
  },
  mergedData: { /* merged data */ }
}
```

### Conflict Object
```javascript
{
  severity: 'WARNING', // ERROR, WARNING, INFO
  type: 'DUPLICATE_MOVE', // Conflict type
  message: 'Duplicate move: categoryId=42',
  resolution: 'SKIP' // SKIP, MERGE, REPLACE, UPGRADE
}
```

## User Workflows

### Workflow 1: No Conflicts
1. User selects file
2. File is validated
3. Preview panel shows:
   - Data summary
   - No conflicts section (hidden)
   - Merge strategy: "Direct import"
   - Impact preview: Simple addition counts
4. User clicks "確認匯入"
5. Import executes and completes

### Workflow 2: With Conflicts
1. User selects file
2. File is validated
3. Preview panel shows:
   - Data summary
   - Conflicts section with all conflicts
   - Merge strategy for each data type
   - Impact preview with additions and skips
4. User optionally clicks "保存備份" to backup current data
5. User clicks "確認匯入"
6. Import executes with conflict resolutions applied
7. Success message shows records imported

### Workflow 3: Cancel Import
1. User clicks "取消" on preview panel
2. Panel closes without importing
3. Current data remains unchanged

## Colors & Visual Hierarchy

### Color Palette
- **Primary**: #1976d2 (Blue)
- **Success**: #10b981 (Green)
- **Warning**: #f59e0b (Amber)
- **Error**: #ef4444 (Red)
- **Background**: #f8f9fa (Light gray)
- **Border**: #e9ecef (Very light gray)
- **Text**: #1a1a1a (Dark gray)

### Typography
- **Title**: 18px, weight 700, gradient blue
- **Section Heading**: 14px, weight 700
- **Label**: 11px, weight 600, uppercase
- **Value**: 13-20px, weight 700

## Animations

### Entrance (0.3s)
```css
@keyframes slideUp {
  from { opacity: 0; transform: translate(-50%, -45%); }
  to { opacity: 1; transform: translate(-50%, -50%); }
}
```

### Overlay Fade (0.2s)
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Progress Fill
- Smooth width transition: 0.3s ease
- Used for progress bar during import

## Accessibility

### WCAG AA Compliance
- Color contrast ratio ≥ 4.5:1 for text
- Interactive elements ≥ 44px × 44px
- Focus visible on all buttons
- Semantic HTML structure
- Proper label associations

### Screen Reader
- Panel marked as modal with role="dialog"
- Section titles marked with proper headings
- Conflict list items have meaningful descriptions
- Button purposes clear from text

## Responsive Design

### Breakpoints
- **Desktop** (>480px): 3-column controls, 2x2 grids
- **Mobile** (<480px): 1-column controls, 1-column grids

### Mobile Adjustments
```css
.import-preview-panel {
  width: 95%;
}

.summary-grid {
  grid-template-columns: 1fr;
}

.preview-controls {
  grid-template-columns: 1fr;
}
```

## Error Handling

### Validation Errors
- Display error message in status area
- File input is cleared
- Allow user to select another file

### Import Errors
- Show "匯入失敗: [error message]" in status
- Keep preview panel open for retry
- Provide "取消" button to exit

### Storage Quota Errors
- Check available storage before import
- Show quota exceeded message
- Suggest clearing old data

## Success Metrics

✅ Users see clear summary before import
✅ Conflicts are clearly explained with resolution hints
✅ Users understand import impact
✅ Users can backup data before import
✅ Import progress is visible during execution
✅ Success message shows records imported
✅ All operations complete without errors
✅ UI is responsive on mobile devices
✅ No console errors or warnings
✅ All buttons function correctly

## Future Enhancements

1. **Conflict Resolution UI**: Allow users to choose resolution for each conflict individually
2. **Diff View**: Show side-by-side comparison of old vs new data
3. **Undo**: Provide undo button after successful import
4. **Selective Import**: Allow users to choose which data types to import
5. **Batch Import**: Support multiple files import in sequence
6. **Advanced Options**: Compression, encryption for exported files
