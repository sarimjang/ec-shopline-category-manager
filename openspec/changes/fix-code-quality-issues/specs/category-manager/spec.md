# Category Manager Code Quality Improvements

## MODIFIED Requirements

### Requirement: Category Move Execution
The system SHALL move the selected category to the chosen target position and persist the change with proper error handling and race condition prevention.

#### Scenario: Move with race condition prevention
- **WHEN** user clicks the "Move to" button while another move is in progress
- **THEN** the new move request SHALL be rejected (ignored)
- **AND** visual feedback MAY show that another operation is in progress
- **AND** all move buttons SHALL be disabled during active operation

#### Scenario: Move to root level
- **WHEN** user selects "根目錄" as the target
- **THEN** the category SHALL be moved to Level 1 (direct child of root)
- **AND** the change SHALL be saved to Shopline backend via API
- **AND** if the API call fails, an error SHALL be displayed to the user
- **AND** the user SHALL have the option to rollback the client-side change

#### Scenario: Move under Level 1 category
- **WHEN** user selects a Level 1 category as the target
- **THEN** the moved category SHALL become a Level 2 category (child of the selected target)
- **AND** the UI SHALL update to reflect the new hierarchy
- **AND** the change SHALL be saved to Shopline backend
- **AND** if the API fails, the user SHALL see a clear error message

#### Scenario: Move under Level 2 category
- **WHEN** user selects a Level 2 category as the target
- **THEN** the moved category SHALL become a Level 3 category (child of the selected target)
- **AND** this is the deepest allowed level
- **AND** the API call SHALL include all required fields (parent, ancestor, descendant)

#### Scenario: Successful move feedback
- **WHEN** a category is successfully moved and persisted to backend
- **THEN** the system SHALL provide visual feedback (e.g., brief highlight or toast notification)
- **AND** the success message SHALL clearly indicate the operation completed

#### Scenario: Move failure handling with clear messaging
- **WHEN** a move operation fails (e.g., API error, scope unavailable)
- **THEN** the system SHALL display a clear, user-friendly error message
- **AND** the original category position SHALL remain unchanged (or be rolled back if client-side changed)
- **AND** the user SHALL have the option to retry or manually refresh

#### Scenario: API error with stale DOM binding
- **WHEN** the DOM tree has changed significantly (expand/collapse, reorder) between button creation and click
- **THEN** the system SHALL validate that the button binding is recent (within 30 seconds)
- **AND** if the binding is stale, a new error SHALL be shown asking user to refresh
- **AND** the move operation SHALL NOT proceed with stale binding

### Requirement: AngularJS Integration with Proper Cleanup
The system SHALL integrate with Shopline's AngularJS framework to ensure proper data binding, persistence, and resource cleanup.

#### Scenario: Access AngularJS scope
- **WHEN** the userscript initializes
- **THEN** it SHALL access the AngularJS scope via `angular.element().scope()`
- **AND** it SHALL read the `categories` array from the scope
- **AND** it SHALL check if a digest is already in progress before calling `$apply()`

#### Scenario: Trigger save after move
- **WHEN** a category is moved programmatically
- **THEN** the system SHALL call `$scope.$apply()` to update bindings
- **AND** the system SHALL handle the case where `$apply()` fails (e.g., digest already in progress)
- **AND** the system SHALL independently call the API to persist the change

#### Scenario: Observer cleanup on long-lived SPAs
- **WHEN** the user navigates within the Shopline admin (SPA behavior)
- **THEN** the MutationObserver tracking DOM changes SHALL be properly disconnected
- **AND** old observers SHALL NOT accumulate (preventing memory leaks)
- **AND** the system SHALL NOT show memory growth in browser DevTools after 1+ hours of use

### Requirement: Robust Error Handling
The system SHALL distinguish between client-side success and server-side failure, providing appropriate feedback.

#### Scenario: API failure after client update
- **WHEN** the client-side move succeeds but the API call fails
- **THEN** the system SHALL NOT show the standard "✅ 成功" message
- **AND** the system SHALL show an error message like "伺服器保存失敗，刷新頁面後會還原"
- **AND** the user SHALL be warned that the change will NOT persist after refresh

#### Scenario: Network error during move
- **WHEN** the API call encounters a network error or timeout
- **THEN** the system SHALL clearly report the network error to the user
- **AND** the system SHALL distinguish this from a server-side validation error
- **AND** the user SHALL be offered options to retry or rollback

#### Scenario: Rollback after move failure
- **WHEN** the user chooses to rollback a failed move
- **THEN** the category SHALL be restored to its original position
- **AND** all parent/child relationships SHALL be exactly restored
- **AND** the tree structure in the UI SHALL match the backend after refresh

### Requirement: Defensive Programming Practices
The system SHALL implement robust null checks and handle edge cases gracefully.

#### Scenario: Move with null parent
- **WHEN** moving a category to root (parent becomes null)
- **THEN** the API call SHALL correctly handle null in the `parent` field
- **AND** no undefined reference errors SHALL occur

#### Scenario: Move deeply nested categories
- **WHEN** moving categories 3+ levels deep
- **THEN** the system SHALL correctly identify ancestor and descendant IDs
- **AND** the rollback SHALL restore all nested children correctly

#### Scenario: Move after tree mutations
- **WHEN** the category tree has been expanded, collapsed, or reordered before move
- **THEN** the system SHALL validate that bindings are still pointing to correct data
- **AND** stale bindings (> 30 seconds old) SHALL be detected and rejected

## REMOVED Requirements

None - all external behavior preserved.

## RENAMED Requirements

None - all requirement names preserved.
