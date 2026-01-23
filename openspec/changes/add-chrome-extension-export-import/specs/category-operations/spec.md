# Capability: Category Operations

## ADDED Requirements

### Requirement: Queue Management Foundation
The system SHALL provide infrastructure for queueing multiple category operations while respecting Shopline API rate limits.

#### Scenario: Queue executes operations sequentially
- **WHEN** multiple category moves are queued
- **THEN** system executes one at a time
- **AND** respects 200ms minimum delay between API calls
- **AND** prevents race conditions

#### Scenario: Queue maintains operation status
- **WHEN** queue is executing
- **THEN** system tracks:
- Current operation index
- Success/failure status for each operation
- Detailed error messages on failure

#### Scenario: Queue supports pause and resume
- **WHEN** user clicks pause during batch operation
- **THEN** queue pauses after current operation completes
- **WHEN** user clicks resume
- **THEN** queue continues from where it paused

#### Scenario: Queue provides progress indication
- **WHEN** queue processes operations
- **THEN** system displays:
- Current operation number (e.g., "5/10")
- Percentage complete
- Estimated time remaining
- List of completed and failed operations

---

### Requirement: Category Move with Retry Logic
The system SHALL retry failed API calls up to 3 times with exponential backoff before reporting error.

#### Scenario: API call succeeds on first try
- **WHEN** user moves a category
- **THEN** API is called once and succeeds
- **AND** operation completes immediately

#### Scenario: API call fails and retries
- **WHEN** API call fails (network error, 500 response)
- **THEN** system waits 1 second
- **AND** retries up to 2 more times
- **AND** if all retries fail, displays error message

#### Scenario: Retry attempt is logged
- **WHEN** retry occurs
- **THEN** console logs include:
- Attempt number (1/3, 2/3, etc.)
- Error reason
- Backoff delay

---

### Requirement: Enhanced Error Messages
The system SHALL provide detailed, actionable error messages for different failure scenarios.

#### Scenario: Network error provides recovery steps
- **WHEN** API call fails due to network error
- **THEN** message displays:
- "Network connection failed. Check your internet and try again."
- **AND** retry button is available

#### Scenario: Server error provides status information
- **WHEN** Shopline API returns server error
- **THEN** message displays:
- HTTP status code (e.g., 500)
- Human-readable explanation
- Suggestion to contact support if persists

#### Scenario: Validation error prevents invalid moves
- **WHEN** category move violates 3-layer limit
- **THEN** error displays before API call:
- "Cannot move to this location - would exceed 3-level limit"
- **AND** suggests valid alternatives

---

### Requirement: Operation Rollback on Failure
The system SHALL automatically rollback failed operations to restore consistent state.

#### Scenario: Rollback restores original hierarchy
- **WHEN** category move API call fails after local update
- **THEN** system:
- Removes category from new location
- Restores to original parent
- Refreshes UI
- Displays clear error message

#### Scenario: User can manually trigger rollback
- **WHEN** user views operation history
- **THEN** each operation has associated rollback button
- **WHEN** user clicks rollback on a completed operation
- **THEN** that single operation is reversed (future: Phase 3)

---

## MODIFIED Requirements

### Requirement: Category Move Operation (from UserScript)
The system's category move operation SHALL work identically when running in Extension content script as it did in Tampermonkey UserScript, including:
- Local state update before API call
- AngularJS scope $apply() triggering
- Verification of source/target positions
- Time-saved calculation and tracking

#### Scenario: Move preserves parent-child relationships
- **WHEN** user moves category via Extension
- **THEN** category maintains all properties (name, translations, id)
- **AND** target category's children array is properly updated
- **AND** source parent's children array is properly updated

#### Scenario: Move triggers AngularJS update
- **WHEN** move operation completes
- **THEN** AngularJS $scope.$apply() is called
- **AND** DOM updates to show new category position
- **AND** UI remains responsive

#### Scenario: Time-saved is accurately calculated
- **WHEN** move completes successfully
- **THEN** time-saved is calculated using same formula:
- Visual search time: sqrt(categoryCount) * 0.3
- Scroll time: categoryCount * 0.05
- Alignment time: targetLevel * 1.5
- Tool overhead: 2.5s (with search) or 3.5s (browse)
- **AND** value is added to lifetime statistics

---

## REMOVED Requirements
*None - existing category move behavior is preserved*
