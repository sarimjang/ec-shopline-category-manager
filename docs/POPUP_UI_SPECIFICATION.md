# Popup UI Specification - Statistics Panel

**Document**: Shopline Category Manager Extension
**Version**: 1.0
**Date**: 2026-01-27
**Status**: Complete

## Overview

The popup UI provides users with a clean, professional statistics panel that displays category move metrics and provides quick access to extension controls. The design prioritizes clarity and responsiveness while maintaining a consistent visual brand.

## User Interface Design

### Layout Structure

```
┌─────────────────────────────────────────┐
│      SHOPLINE 分類管理工具              │ ← Header (Title)
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │ 統計資料 (Stats Panel)           │  │
│  ├──────────────────────────────────┤  │
│  │ 總移動次數  │  總節省時間        │  │ ← 2x2 Stats Grid
│  │    0        │  0 分鐘            │  │
│  ├─────────────┼───────────────────┤  │
│  │ 平均每次    │  最後重置          │  │
│  │  0 秒       │  未重置            │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌─ Controls Panel ────────────────────┐│
│  │ [重置統計] [匯出資料]               ││
│  │ [匯入資料] [設定]                   ││
│  └─────────────────────────────────────┘│
│                                         │
│  ┌─ Status Message ────────────────────┐│
│  │ (Success/Error/Loading)             ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### Responsive Design

- **Width**: 400px (expandable on demand)
- **Height**: Minimum 400px (expandable with content)
- **Font Family**: System fonts with Chinese support (Microsoft JhengHei, Segoe UI)
- **Color Scheme**: Blue/Green gradient with professional grays

### Component Specifications

#### 1. Header Section
- **Title**: "Shopline 分類管理工具"
- **Font Size**: 18px, Bold (600)
- **Styling**: Blue gradient text
- **Spacing**: 20px padding, 12px bottom padding
- **Border**: 2px solid bottom border in light gray

#### 2. Statistics Panel
**Background**: White with subtle shadow
**Border Radius**: 12px
**Padding**: 16px
**Box Shadow**: 0 2px 8px rgba(0, 0, 0, 0.08)

**Stat Items (2x2 Grid)**:
- **Layout**: CSS Grid with 2 columns
- **Gap**: 12px between items
- **Background**: Light gray (#f8f9fa)
- **Padding**: 12px
- **Border-Left**: 4px solid blue (#1976d2)
- **Border Radius**: 8px
- **Transition**: 0.3s ease on hover

**Stat Labels**:
- **Font Size**: 11px
- **Color**: Medium gray (#6c757d)
- **Weight**: 500
- **Text Transform**: UPPERCASE
- **Letter Spacing**: 0.3px

**Stat Values**:
- **Font Size**: 18px
- **Color**: Dark (#1a1a1a)
- **Weight**: 700
- **Alignment**: Center

**Conditional Styling**:
- **Highlight**: Green border and background if totalMoves > 100
- **Warning**: Orange/amber styling if totalMoves = 0

#### 3. Controls Panel
**Layout**: 2-column grid
**Gap**: 12px between buttons
**Margin**: 16px bottom

**Button Types**:

**Primary Buttons** (Export, Import):
- Background: Blue gradient (#1976d2 → #0d47a1)
- Color: White
- Border: None
- Box Shadow: 0 2px 4px rgba(25, 118, 210, 0.3)
- Hover Effect: Enhanced shadow + slight lift

**Secondary Buttons** (Reset, Settings):
- Background: White
- Color: Medium gray (#495057)
- Border: 1.5px solid light gray (#dee2e6)
- Hover Effect: Light gray background + blue border

**Button Shared**:
- **Padding**: 10px 16px
- **Font Size**: 13px
- **Font Weight**: 600
- **Border Radius**: 8px
- **Cursor**: pointer
- **Transition**: 0.2s ease
- **Text Transform**: UPPERCASE
- **Letter Spacing**: 0.3px
- **Disabled State**: opacity: 0.5, cursor: not-allowed

#### 4. Status Message Display
**Positioning**: Below controls
**Padding**: 12px
**Border Radius**: 8px
**Font Size**: 12px
**Font Weight**: 500
**Text Align**: center

**Status Types**:

**Success**:
- Background: Light green (#d1fae5)
- Color: Dark green (#065f46)
- Border: 1px solid medium green (#a7f3d0)

**Error**:
- Background: Light red (#fee2e2)
- Color: Dark red (#991b1b)
- Border: 1px solid medium red (#fecaca)

**Loading**:
- Background: Light blue (#dbeafe)
- Color: Dark blue (#1e40af)
- Border: 1px solid medium blue (#bfdbfe)

**Animation**: Slide-in effect (0.3s)

## Functionality Specification

### Statistics Display

#### Total Moves (總移動次數)
- **Source**: `stats.totalMoves`
- **Format**: Plain number (e.g., "45")
- **Highlight Condition**: > 100 moves → Green highlight
- **Warning Condition**: = 0 → Orange warning

#### Total Time Saved (總節省時間)
- **Source**: `stats.totalTimeSaved` (in seconds)
- **Format**: "X 分鐘" (minutes)
- **Calculation**: Math.floor(totalTimeSaved / 60)
- **Example**: 3600 seconds → "60 分鐘"

#### Average Per Move (平均每次)
- **Source**: Calculated from stats
- **Formula**: totalTimeSaved / totalMoves (if > 0)
- **Format**: "X 秒" (seconds)
- **Default**: "0 秒" (if no moves)
- **Example**: 180 seconds / 3 moves → "60 秒"

#### Last Reset (最後重置)
- **Source**: `stats.lastReset` (ISO timestamp)
- **Format**: Relative time
  - If today: "剛剛" (just now)
  - If < 24h: "X 小時前" (hours ago)
  - If >= 24h: "X 天前" (days ago)
- **Default**: "未重置" (never reset)

### Button Actions

#### Reset Statistics Button
**Behavior**:
1. Show confirmation dialog: "確定要清除所有統計資料嗎？此操作無法撤銷。"
2. If confirmed:
   - Call `storageManager.resetStats()`
   - Update UI with new stats
   - Show success message: "統計已重置"
3. If cancelled: No action

**Disabled State**: During operation (visual feedback)

#### Export Button
**Behavior**:
1. Gather data:
   - Stats from `storageManager.getStats()`
   - Move history from `storageManager.getMoveHistory()`
   - Search history from `storageManager.getSearchHistory()`
2. Create JSON export with structure:
   ```json
   {
     "exportDate": "2026-01-27T12:00:00.000Z",
     "stats": { ... },
     "moveHistory": [ ... ],
     "searchHistory": [ ... ]
   }
   ```
3. Download as file: `shopline-category-stats-YYYY-MM-DD.json`
4. Show success message: "統計已匯出"

**Disabled State**: During operation

#### Import Button
**Behavior**:
1. Trigger file picker (accept: `.json`)
2. On file select:
   - Show loading message: "正在匯入..."
   - Parse JSON content
   - Validate structure (must have `stats` and `moveHistory`)
   - Save to storage:
     - `setStats()`
     - `setMoveHistory()`
     - `setSearchHistory()` (if present)
3. Refresh UI display
4. Show success message: "統計已匯入"
5. If error: Show error message with details

**Disabled State**: During operation

#### Settings Button
**Behavior**:
1. Currently: Show placeholder message "設定功能即將推出"
2. Future (Task 2-P1.5): Open settings page/panel

**Disabled State**: No

### Auto-Refresh

**Behavior**:
- Updates statistics display every 2 seconds
- Non-blocking: Doesn't interfere with user interactions
- Graceful degradation: If update fails, continues polling

**Implementation**:
```javascript
setInterval(async () => {
  const stats = await storageManager.getStats();
  updateStatsDisplay(stats);
}, 2000); // 2 seconds
```

**Cleanup**: Stops on popup close

### Status Messages

**Display Rules**:
- Success: Shown for 3 seconds, auto-dismiss
- Error: Shown for 3 seconds, auto-dismiss
- Loading: Persistent until next message

**Positioning**: Below controls panel
**Animation**: Smooth slide-in from top

## Technical Implementation

### File Structure

```
src/popup/
├── popup.html (UI structure)
├── popup.css (Styling)
└── popup.js (Functionality)
```

### Key Functions

**popup.js**:
- `initializePopup()` - Initialize on DOMContentLoaded
- `loadAndDisplayStats()` - Async load from storage
- `updateStatsDisplay(stats)` - Render statistics
- `startAutoRefresh()` - Enable 2-second polling
- `handleResetStats()` - Reset action handler
- `handleExport()` - Export action handler
- `handleFileImport()` - Import file processing
- `handleSettings()` - Settings action handler
- `showStatus(message, type)` - Display feedback
- `setButtonLoading(buttonId, isLoading)` - Button state

### Dependencies

- `StorageManager` (from `src/shared/storage.js`)
- `ShoplineLogger` (from `src/shared/logger.js`)
- Chrome Extension APIs:
  - `chrome.storage.local`

## User Experience

### First Visit
1. Popup opens
2. Statistics load (auto-refresh starts)
3. All buttons functional
4. User can immediately see their stats

### Common Workflows

**Check Statistics**:
1. Click extension icon
2. View statistics panel
3. Auto-updates every 2 seconds
4. Close popup

**Export Statistics**:
1. Click extension icon
2. Click "匯出資料" button
3. File downloads automatically
4. Success message shown
5. Close popup

**Reset Statistics**:
1. Click extension icon
2. Click "重置統計" button
3. Confirm in dialog
4. Statistics reset to zero
5. Success message shown
6. UI updates immediately

**Import Statistics**:
1. Click extension icon
2. Click "匯入資料" button
3. Select previously exported .json file
4. Loading message shown
5. Statistics imported and displayed
6. Success message shown

## Accessibility

- **Color Contrast**: WCAG AA compliant for all text
- **Focus States**: Clear visual focus indicators on buttons
- **Keyboard Navigation**: All buttons tab-accessible
- **Labels**: All controls have descriptive labels
- **Error Messages**: Clear, actionable text in Chinese

## Performance Considerations

- **Auto-refresh**: Non-blocking async updates
- **File Operations**: Asynchronous, with user feedback
- **Memory**: Auto-cleanup on popup close
- **Responsive**: Lightweight CSS, minimal JavaScript

## Testing Checklist

- [ ] Popup displays correctly on load
- [ ] All statistics display with correct formatting
- [ ] Stats auto-refresh every 2 seconds without flickering
- [ ] Reset button shows confirmation and works correctly
- [ ] Export button creates valid JSON file
- [ ] Import button accepts valid JSON and updates UI
- [ ] Settings button shows placeholder message
- [ ] Status messages appear and disappear correctly
- [ ] Buttons disable/enable appropriately during operations
- [ ] No console errors or warnings
- [ ] Responsive design works at different zoom levels
- [ ] All text in Chinese displays correctly

## Future Enhancements (Task 2-P1.5)

1. **Settings Page**: Full settings interface
2. **Advanced Statistics**: Charts, trends, analytics
3. **Export Formats**: CSV, Excel options
4. **Backup/Restore**: Automatic backup feature
5. **Notifications**: Desktop notifications for milestones
6. **Dark Mode**: Dark theme support
7. **Localization**: Multiple language support

## Browser Compatibility

- **Chrome**: 95+
- **Edge**: 95+
- **Chromium**: Latest versions

## Known Limitations

- Export file size limited by browser download capabilities
- Import file must be < 10MB (Chrome limit)
- Auto-refresh stops when popup is closed
- Statistics are local to device (no cloud sync)
