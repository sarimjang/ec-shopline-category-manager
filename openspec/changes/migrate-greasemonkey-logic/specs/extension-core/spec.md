# Capability: Extension Core - Greasemonkey Logic Migration

## MODIFIED Requirements

### Requirement: Content Script Execution
The Extension SHALL inject and execute content scripts on Shopline category pages to manipulate DOM and intercept operations. Content script execution SHALL include the complete CategoryManager implementation migrated from the production Greasemonkey script.

#### Scenario: Content script loads on category page
- **WHEN** user navigates to /admin/*/categories*
- **THEN** content script executes with access to page DOM
- **AND** CategoryManager class initializes successfully with all 30+ public methods
- **AND** MutationObserver registers for dynamic category list changes

#### Scenario: CategoryManager injects UI buttons
- **WHEN** page loads and categories are rendered
- **THEN** "📁 移動到 ▼" button appears next to each category
- **AND** buttons are dynamically injected as categories are added to DOM
- **AND** button click opens interactive dropdown menu

#### Scenario: AngularJS access via injected script
- **WHEN** content script needs to access page AngularJS
- **THEN** injected script bridges to window.angular via `window._scm_getAngular()`
- **AND** scope manipulation works identically to UserScript version
- **AND** CategoryManager can read/modify scope objects without error

#### Scenario: Storage uses chrome.storage.local (not localStorage)
- **WHEN** CategoryManager initializes
- **THEN** all persistence uses chrome.storage.local
- **AND** localStorage calls are replaced with chrome.storage.local.get/set()
- **AND** Promise-based API is handled correctly

---

## ADDED Requirements

### Requirement: Complete CategoryManager Class Port
The Extension SHALL include the complete CategoryManager class from the Greasemonkey script (lines 255-2361) with all public methods and internal validation logic preserved.

#### Scenario: All CategoryManager methods are available
- **WHEN** content script initializes
- **THEN** CategoryManager provides:
- initialize()
- injectUI()
- attachButtonsToCategories()
- getCategoryFromElement() [with 3-layer priority lookup]
- showMoveDropdown()
- moveCategory() [8-step validation process]
- saveCategoryOrderingToServer()
- Full validation and error handling methods

#### Scenario: Category detection uses 3-layer priority
- **WHEN** CategoryManager needs to identify a category from a DOM element
- **THEN** it attempts lookup in this order:
- 1. DOM dataset (data-category-id attribute)
- 2. AngularJS scope ($scope.category)
- 3. WeakMap cache (if element was previously accessed)
- **AND** first matching layer is used

#### Scenario: Move operation follows 8-step validation
- **WHEN** user confirms a category move
- **THEN** system executes in sequence:
- Step 1: Validate source category exists and is accessible
- Step 2: Validate target position is legal (not Level 4+)
- Step 3: Locate source in parent's children array
- Step 4: Remove from source parent and add to target parent
- Step 5: Trigger AngularJS $apply() to update DOM
- Step 6: Verify move was successful by reading scope
- Step 7: Call Shopline API to persist change
- Step 8: On API success, operation complete; on failure, full rollback

---

