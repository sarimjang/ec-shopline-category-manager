# Capability: Category Operations - Greasemonkey Logic Migration

## MODIFIED Requirements

### Requirement: Category Move Operation (from UserScript)
The system's category move operation SHALL work identically when running in Extension content script as it did in Tampermonkey UserScript, including:
- Local state update before API call
- AngularJS scope $apply() triggering
- Verification of source/target positions
- Time-saved calculation and tracking
- Complete validation with scope misalignment detection
- Network error classification and recovery

#### Scenario: Move preserves parent-child relationships
- **WHEN** user moves category via Extension
- **THEN** category maintains all properties (name, translations, id)
- **AND** target category's children array is properly updated
- **AND** source parent's children array is properly updated
- **AND** DOM reflects change immediately

#### Scenario: Move validates ancestor relationships
- **WHEN** user attempts to move a category to a position that would create a cycle
- **THEN** system prevents the move
- **AND** displays "Cannot move category to itself or its own child" message
- **AND** isDescendant() function prevents illegal moves

#### Scenario: Move triggers AngularJS update
- **WHEN** move operation completes
- **THEN** AngularJS $scope.$apply() is called
- **AND** DOM updates to show new category position
- **AND** UI remains responsive
- **AND** AngularJS binding verification succeeds

#### Scenario: Scope misalignment is detected
- **WHEN** CategoryManager detects that a category's scope.$id doesn't match DOM element
- **THEN** detailed diagnostic warning is logged:
- Misaligned category name (from DOM vs scope)
- Scope ID and timestamp
- Severity level (CRITICAL)
- **AND** operation continues (user can still complete move)
- **AND** diagnostic data collected for analytics

#### Scenario: Network error is classified and recovered
- **WHEN** API call fails
- **THEN** system classifies error into one of:
- network-error: Connection timeout or network unreachable
- pure-server-failure: 500+ error from Shopline servers
- client-error: 400-499 error (validation failure)
- **AND** appropriate user message displayed
- **AND** rollback triggered with detailed error context

#### Scenario: Rollback restores original state completely
- **WHEN** API call fails after local DOM update
- **THEN** system:
- Removes category from new location in scope
- Restores category to original parent
- Calls $scope.$apply() to update DOM
- Verifies rollback succeeded by reading scope
- Displays detailed error message with recovery steps

---

