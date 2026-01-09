# Category Manager Specification

## ADDED Requirements

### Requirement: Quick Move Button
The system SHALL display a "Move to" button next to each category in the Shopline admin category management page.

#### Scenario: Button visibility
- **WHEN** user views the category management page
- **THEN** each category row SHALL display a "Move to" button in the action buttons area

#### Scenario: Button disabled for special categories
- **WHEN** a category has a special `key` property (e.g., "精選商品")
- **THEN** the "Move to" button MAY be disabled or hidden

### Requirement: Parent Category Selector
The system SHALL provide a dropdown that allows users to select a target parent category. Clicking a target means "become a child of this category".

#### Scenario: Show available targets in tree format
- **WHEN** user clicks the "Move to" button
- **THEN** a dropdown SHALL appear showing all valid target positions
- **AND** the list SHALL display categories in hierarchical tree format with indentation
- **AND** the first option SHALL be "📂 根目錄" (Root Level)

#### Scenario: Click target equals become its child
- **WHEN** user clicks on a target category in the dropdown
- **THEN** the moved category SHALL become a child of the clicked target
- **AND** clicking "根目錄" SHALL place the category at Level 1

#### Scenario: Hover preview
- **WHEN** user hovers over a target category in the dropdown
- **THEN** the system SHOULD display a visual preview showing where the category will be placed

### Requirement: Three-Level Hierarchy Constraint
The system SHALL respect Shopline's 3-level category hierarchy constraint (excluding root as Level 0).

#### Scenario: Hide Level 3 categories as targets
- **WHEN** displaying the target selection dropdown
- **THEN** categories at Level 3 (the deepest level) SHALL NOT appear as selectable targets
- **AND** this prevents creating a 4th level which Shopline does not support

#### Scenario: Level calculation
- **GIVEN** the hierarchy structure:
  - Root (Level 0)
  - Level 1: Direct children of root
  - Level 2: Children of Level 1 categories
  - Level 3: Children of Level 2 categories (maximum depth)
- **WHEN** a category is at Level 3
- **THEN** it SHALL be excluded from the target dropdown

### Requirement: Exclude Invalid Targets
The system SHALL prevent illogical move operations.

#### Scenario: Exclude self as target
- **WHEN** displaying the target selection dropdown
- **THEN** the category being moved SHALL NOT appear as a target option

#### Scenario: Exclude descendants as targets
- **WHEN** displaying the target selection dropdown
- **THEN** all descendants (children, grandchildren) of the category being moved SHALL NOT appear as targets
- **AND** this prevents circular hierarchy

### Requirement: Category Move Execution
The system SHALL move the selected category to the chosen target position and persist the change.

#### Scenario: Move to root level
- **WHEN** user selects "根目錄" as the target
- **THEN** the category SHALL be moved to Level 1 (direct child of root)
- **AND** the change SHALL be saved to Shopline backend

#### Scenario: Move under Level 1 category
- **WHEN** user selects a Level 1 category as the target
- **THEN** the moved category SHALL become a Level 2 category (child of the selected target)
- **AND** the UI SHALL update to reflect the new hierarchy

#### Scenario: Move under Level 2 category
- **WHEN** user selects a Level 2 category as the target
- **THEN** the moved category SHALL become a Level 3 category (child of the selected target)
- **AND** this is the deepest allowed level

#### Scenario: Successful move feedback
- **WHEN** a category is successfully moved
- **THEN** the system SHALL provide visual feedback (e.g., brief highlight or toast notification)

#### Scenario: Move failure handling
- **WHEN** a move operation fails (e.g., API error, scope unavailable)
- **THEN** the system SHALL display an error message to the user
- **AND** the original category position SHALL remain unchanged

### Requirement: AngularJS Integration
The system SHALL integrate with Shopline's AngularJS framework to ensure proper data binding and persistence.

#### Scenario: Access AngularJS scope
- **WHEN** the userscript initializes
- **THEN** it SHALL access the AngularJS scope via `angular.element().scope()`
- **AND** it SHALL read the `categories` array from the scope

#### Scenario: Trigger save after move
- **WHEN** a category is moved programmatically
- **THEN** the system SHALL call `$scope.$apply()` to update bindings
- **AND** the system SHALL trigger Shopline's native save mechanism
