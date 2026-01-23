# Capability: Category Search (New - Greasemonkey Feature Port)

## ADDED Requirements

### Requirement: Interactive Category Search
The Extension SHALL provide a real-time search interface for filtering available parent categories when moving a category.

#### Scenario: Search input appears in dropdown
- **WHEN** user clicks "📁 移動到 ▼" button on a category
- **THEN** dropdown menu appears
- **AND** search input field is displayed at top of dropdown
- **AND** search field is focused automatically

#### Scenario: Search filters categories in real-time
- **WHEN** user types in search field
- **THEN** dropdown results update to show matching Level 1 categories
- **AND** match is performed on category name (case-insensitive)
- **AND** partial matches are included

#### Scenario: Search uses debounce to prevent flickering
- **WHEN** user is typing continuously
- **THEN** filtering is debounced by 300ms
- **AND** results only update after user pauses
- **AND** prevents unnecessary DOM updates

#### Scenario: Search results show category hierarchy
- **WHEN** search results are displayed
- **THEN** each result shows:
- Parent category name (Level 1)
- Child categories indented below (Level 2 and 3)
- Leaf categories are selectable
- Level 3 categories show "(Cannot move deeper)" indicator

#### Scenario: Clear search to view all categories
- **WHEN** user clears search input (backspace/delete)
- **THEN** full category tree is displayed again
- **AND** no API call is made (filtering is client-side only)

#### Scenario: Search does not include source category
- **WHEN** user searches for categories to move INTO
- **THEN** results exclude the source category itself
- **AND** results exclude any descendants of source category
- **AND** prevents user from creating circular references

---

### Requirement: Category Hierarchy Display
The Extension SHALL display the category tree in a searchable dropdown with proper indentation and selection indicators.

#### Scenario: Dropdown shows full category tree
- **WHEN** dropdown opens with no search text
- **THEN** all Level 1 categories are displayed
- **AND** each Level 1 category shows its Level 2 children, indented
- **AND** each Level 2 category shows its Level 3 children, further indented

#### Scenario: Only leaf categories are selectable
- **WHEN** user views dropdown
- **THEN** Level 1 and 2 categories are expandable/collapsible (disabled select)
- **AND** only Level 3 categories are selectable (enabled radio/checkbox)
- **AND** root directory option is available if moving from child category

#### Scenario: Selected category is highlighted
- **WHEN** user hovers over a category option
- **THEN** category is visually highlighted
- **WHEN** user clicks a category
- **THEN** category is selected and "確認移動" button becomes enabled

---

