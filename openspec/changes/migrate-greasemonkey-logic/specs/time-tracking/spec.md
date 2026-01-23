# Capability: Time Tracking & Statistics (Greasemonkey Feature Port)

## ADDED Requirements

### Requirement: Time Savings Calculation
The Extension SHALL calculate and track time saved by automating category moves compared to manual drag-and-drop operations.

#### Scenario: Time saved is calculated after each move
- **WHEN** user completes a category move via Extension
- **THEN** system calculates time saved using formula:
- Drag time = 4 + (categoryCount / 10) * 0.5 + targetLevel * 1
- Tool time = 2.5 seconds (if search was used) OR 3.5 seconds (browsed dropdown)
- Time saved = max(0, drag time - tool time)

#### Scenario: Different category counts affect calculation
- **WHEN** system has 10 categories total
- **THEN** estimated manual drag time = 4 + (10/10)*0.5 + level*1 = ~4.5-5.5s
- **WHEN** system has 100 categories total
- **THEN** estimated manual drag time = 4 + (100/10)*0.5 + level*1 = ~9-10s
- **WHEN** system has 500 categories total
- **THEN** estimated manual drag time = 4 + (500/10)*0.5 + level*1 = ~29-30s

#### Scenario: Search vs browse affects tool time
- **WHEN** user moves category using search function
- **THEN** tool time = 2.5 seconds
- **WHEN** user moves category by browsing dropdown
- **THEN** tool time = 3.5 seconds
- **AND** calculation is accurate for both paths

#### Scenario: Nesting level affects time saved
- **WHEN** moving to Level 1 (root)
- **THEN** drag time adjustment = 0 seconds extra
- **WHEN** moving to Level 2 parent
- **THEN** drag time adjustment = ~1 second extra
- **WHEN** moving to Level 3 parent
- **THEN** drag time adjustment = ~2 seconds extra

---

### Requirement: Statistics Tracking
The Extension SHALL track cumulative statistics about category move operations for user feedback.

#### Scenario: Statistics are persisted in chrome.storage.local
- **WHEN** user moves a category
- **THEN** system updates in chrome.storage.local:
- totalMoves (incremented by 1)
- totalTimeSaved (incremented by calculated time)
- lastReset (ISO8601 timestamp of last reset)
- **AND** data survives page reload and browser restart

#### Scenario: Statistics reset clears all data
- **WHEN** user clicks "Reset Stats" in popup
- **THEN** system displays confirmation dialog
- **AND** on confirm, sets:
- totalMoves = 0
- totalTimeSaved = 0
- lastReset = current timestamp
- **AND** popup immediately shows "0 moves, 0 min 0 sec"

#### Scenario: Statistics displayed in popup
- **WHEN** user clicks Extension icon
- **THEN** popup displays:
- "Moves Today: X" (count of moves)
- "Time Saved: X min Y sec" (formatted duration)
- Reset button
- **AND** values match chrome.storage.local exactly

#### Scenario: Popup updates in real-time
- **WHEN** user moves a category on the page
- **THEN** popup values update automatically
- **AND** no manual refresh required
- **AND** update happens within 1 second of move completion

---

### Requirement: TimeSavingsTracker Class
The Extension SHALL provide TimeSavingsTracker class (migrated from Greasemonkey) to manage statistics lifecycle.

#### Scenario: Tracker loads existing statistics on initialization
- **WHEN** CategoryManager initializes
- **THEN** TimeSavingsTracker.loadStats() reads from chrome.storage.local
- **AND** existing values (if any) are loaded
- **AND** first-time users get zero initialized

#### Scenario: Tracker records move with validation
- **WHEN** TimeSavingsTracker.recordMove() is called
- **THEN** it accepts parameters:
- categoryCount: total categories in tree
- targetLevel: destination level (1-3)
- usedSearch: boolean (search vs browse)
- **AND** calculates time saved
- **AND** increments statistics
- **AND** saves to chrome.storage.local

#### Scenario: Tracker provides statistics export
- **WHEN** service-worker.js calls getStats()
- **THEN** TimeSavingsTracker returns:
- totalMoves: number
- totalTimeSaved: number (in seconds)
- lastReset: ISO8601 timestamp
- **AND** values are ready for popup display

---

