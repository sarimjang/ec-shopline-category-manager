# Capability: Data Export/Import

## ADDED Requirements

### Requirement: Export Category Structure as JSON
The system SHALL export the current category hierarchy as JSON maintaining complete tree structure and metadata.

#### Scenario: Export includes all category properties
- **WHEN** user clicks "Export as JSON"
- **THEN** downloaded file contains:
- version: "1.0"
- exportDate: ISO timestamp
- shopId: extracted from current URL
- categories: full tree with id, name, level, parentId, children
- **AND** file is named `shopline_categories_YYYY-MM-DD.json`

#### Scenario: Nested categories are properly structured
- **WHEN** file is exported
- **THEN** each category object includes:
- id: unique identifier from Shopline
- name: localized name (preferred order: zh-hant → en → other)
- level: 1, 2, or 3
- parentId: parent category ID or null for root
- children: array of child categories (recursive)

#### Scenario: Export captures multi-language data
- **WHEN** category has translations (name_translations)
- **THEN** export includes:
- Primary name in preferred language
- All available language codes
- **AND** import can restore multi-language metadata

#### Scenario: Export file is valid JSON
- **WHEN** export completes
- **THEN** file can be parsed by JSON.parse()
- **AND** conforms to export schema
- **AND** no data loss or corruption

---

### Requirement: Export Category Structure as CSV
The system SHALL export the category structure as CSV for editing in spreadsheet applications.

#### Scenario: CSV includes all essential columns
- **WHEN** user clicks "Export as CSV"
- **THEN** file includes columns:
- categoryId, categoryName, parentId, parentName, level, position
- **AND** file is named `shopline_categories_YYYY-MM-DD.csv`

#### Scenario: CSV is editable in Excel/Google Sheets
- **WHEN** CSV is opened in spreadsheet application
- **THEN** user can:
- Reorder rows (change positions)
- Modify parent assignments
- **AND** no corruption occurs when saved back

---

### Requirement: Import File Format Detection
The system SHALL automatically detect whether uploaded file is JSON or CSV based on content.

#### Scenario: JSON file is recognized
- **WHEN** user uploads a .json file
- **THEN** system parses as JSON
- **AND** validates JSON schema
- **AND** displays any parse errors clearly

#### Scenario: CSV file is recognized
- **WHEN** user uploads a .csv file
- **THEN** system parses as CSV
- **AND** maps columns to data structure
- **AND** displays any format errors clearly

#### Scenario: Invalid file format is rejected
- **WHEN** user uploads non-JSON/non-CSV file
- **THEN** system displays:
- "Please upload a JSON or CSV file"
- **AND** suggests exporting first if needed

---

### Requirement: Import Validation - Layer Limits
The system SHALL validate that imported structure respects Shopline's 3-level category limit.

#### Scenario: Nesting exceeds 3 levels
- **WHEN** import file contains category 4 levels deep
- **THEN** validator detects violation
- **AND** displays error:
- "Category [name] at level 4 exceeds maximum of 3"
- **AND** prevents import

#### Scenario: Validator counts levels correctly
- **WHEN** import includes correctly nested structure
- **THEN** validator confirms:
- Level 1: "Women's" ✓
- Level 2: "Women's > Tops" ✓
- Level 3: "Women's > Tops > T-Shirts" ✓
- **AND** approves import

---

### Requirement: Import Validation - Circular Dependencies
The system SHALL detect and prevent circular parent-child relationships.

#### Scenario: Circular reference is detected
- **WHEN** import file contains:
- Category A → parent: B
- Category B → parent: C
- Category C → parent: A
- **THEN** validator displays error:
- "Circular dependency detected: A → B → C → A"

#### Scenario: Self-reference is rejected
- **WHEN** category has parentId equal to its own id
- **THEN** validator displays error:
- "Category cannot be its own parent"

---

### Requirement: Import Validation - Orphaned Categories
The system SHALL detect categories whose parents are not found.

#### Scenario: Missing parent is flagged
- **WHEN** import file contains:
- Category "Tops" with parentId: "nonexistent_id"
- **THEN** validator displays:
- "Parent category 'nonexistent_id' not found for 'Tops'"
- **AND** offers to move to root or skip

#### Scenario: Root categories with null parent are valid
- **WHEN** category has parentId: null
- **THEN** validator approves as valid root category

---

### Requirement: Import Validation Report
The system SHALL display comprehensive validation results before import execution.

#### Scenario: Validation report shows all issues
- **WHEN** import validation completes
- **THEN** report displays:
- Total categories: 42
- Valid: 40 ✓
- Errors: 2 ✗
- Warnings: 1 ⚠️
- **AND** detailed list of each issue

#### Scenario: Color-coded severity
- **WHEN** validation report is displayed
- **THEN** issues are color-coded:
- ✓ Green: Valid
- ⚠️ Yellow: Warnings (may proceed with caution)
- ✗ Red: Errors (must fix before import)

---

### Requirement: Import Preview - Operation Queue
The system SHALL show user exactly which moves will be executed when import runs.

#### Scenario: Preview displays all operations
- **WHEN** import validation passes
- **THEN** system shows:
- "Ready to move 5 categories:"
- 1. "T-Shirts" → move to "Women's > Tops"
- 2. "Polo Shirts" → move to "Men's > Tops"
- 3. "Hats" → move to root
- **AND** each operation shows source → target

#### Scenario: User can review before confirming
- **WHEN** preview is displayed
- **THEN** user can:
- Review all operations (scroll if >10)
- Click "Confirm Import" to proceed
- Click "Cancel" to abort
- **AND** no changes occur until confirmation

---

### Requirement: Incremental Import Mode
The system SHALL support incremental import where only specified categories are moved.

#### Scenario: Incremental mode preserves unmoved categories
- **WHEN** user imports file with 10 categories
- **WHEN** current system has 15 categories
- **THEN** 5 categories not in import file remain unchanged

#### Scenario: Incremental mode moves specified categories
- **WHEN** import includes categories A, B, C with new parents
- **THEN** only A, B, C are moved
- **AND** all other categories remain in original positions

#### Scenario: Unmapped categories are skipped
- **WHEN** import file references category ID that doesn't exist locally
- **THEN** system skips it
- **AND** displays warning:
- "Category 'cat_999' not found locally - skipping"

---

### Requirement: User-Driven Manual Execution
The system SHALL require explicit user action to execute import operations (no auto-execution).

#### Scenario: Import operations don't auto-execute
- **WHEN** import completes validation
- **THEN** operations appear in preview only
- **AND** no changes occur automatically

#### Scenario: User manually triggers each operation
- **WHEN** preview shows operations
- **WHEN** user confirms
- **THEN** system uses existing moveCategory() function
- **AND** user can see each operation complete
- **AND** can pause/retry as needed

#### Scenario: Failed operation can be manually retried
- **WHEN** single operation fails during import
- **THEN** user can:
- Click "Retry" to try again
- Click "Skip" to move to next
- Click "Cancel" to stop import
- **AND** partial import results are preserved

---

### Requirement: Export/Import History
The system SHALL maintain a record of recent exports and imports for reference.

#### Scenario: Export history shows recent files
- **WHEN** user opens export tab
- **THEN** displays list:
- 2026-01-20 10:30 - exported 42 categories
- 2026-01-18 14:15 - exported 40 categories
- **AND** user can download again from history

#### Scenario: Import history shows recent imports
- **WHEN** user opens import tab
- **THEN** displays list of attempted imports:
- 2026-01-20 - 5 categories moved (success)
- 2026-01-19 - 3 categories attempted (2 succeeded, 1 failed)

---

## MODIFIED Requirements
*None - export/import is new capability*

---

## REMOVED Requirements
*None - no existing behavior removed*

---

## Notes

- **Phase 2 Implementation** - Export/import validation and preview are manual workflows
- **Future: Phase 3** - Could add auto-execution with progress UI, but Phase 2 keeps it manual for safety
- **Data Integrity** - All export/import operations are reversible via subsequent exports
