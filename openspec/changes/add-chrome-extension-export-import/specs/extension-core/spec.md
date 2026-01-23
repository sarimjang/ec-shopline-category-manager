# Capability: Extension Core

## ADDED Requirements

### Requirement: Chrome Extension Installation & Activation
The system SHALL allow users to install Shopline Category Manager from Chrome Web Store and automatically activate on Shopline admin category pages.

#### Scenario: Extension installs successfully
- **WHEN** user clicks "Add to Chrome" on Web Store
- **THEN** Extension adds to Chrome toolbar
- **AND** Extension automatically loads on Shopline category pages

#### Scenario: Extension persists across sessions
- **WHEN** user closes and reopens Chrome
- **THEN** Extension remains installed and functional
- **AND** All statistics and settings preserved

---

### Requirement: Manifest V3 Configuration
The Extension SHALL configure all permissions, content scripts, and UI elements via Manifest V3 specification.

#### Scenario: Manifest declares correct permissions
- **WHEN** Extension loads
- **THEN** Manifest includes permissions: storage, contextMenus, sidePanel
- **AND** Host permissions match Shopline domains (*.shoplineapp.com, *.shopline.tw, *.shopline.app)

#### Scenario: Action icon appears in toolbar
- **WHEN** user navigates to Shopline category page
- **THEN** Extension action icon appears in toolbar
- **AND** Clicking icon opens popup with statistics

---

### Requirement: Content Script Execution
The Extension SHALL inject and execute content scripts on Shopline category pages to manipulate DOM and intercept operations.

#### Scenario: Content script loads on category page
- **WHEN** user navigates to /admin/*/categories*
- **THEN** content script executes with access to page DOM
- **AND** CategoryManager class initializes successfully

#### Scenario: AngularJS access via injected script
- **WHEN** content script needs to access page AngularJS
- **THEN** injected script bridges to window.angular
- **AND** scope manipulation works identically to UserScript

---

### Requirement: Service Worker Background Service
The Extension SHALL run a Service Worker to handle installation, storage sync, and future features without requiring page context.

#### Scenario: Service Worker handles installation
- **WHEN** Extension is first installed
- **THEN** Service Worker executes onInstall handler
- **AND** Storage initialization completes

#### Scenario: Service Worker listens to storage changes
- **WHEN** content script updates chrome.storage.local
- **THEN** Service Worker receives change event
- **AND** can broadcast to other tabs if needed (future: multi-tab sync)

---

### Requirement: Popup Statistics Display
The Extension SHALL display time-saved statistics and controls in the action popup.

#### Scenario: Popup shows current statistics
- **WHEN** user clicks Extension icon
- **THEN** popup displays:
- Total moves today
- Time saved (formatted as "X min Y sec")
- Average time per move
- Reset stats button
- Open settings button

#### Scenario: Popup updates in real-time
- **WHEN** user performs a category move on the page
- **THEN** popup automatically reflects new statistics
- **AND** no manual refresh needed

#### Scenario: Reset statistics clears all data
- **WHEN** user clicks "Reset Stats" in popup
- **THEN** system displays confirmation dialog
- **AND** on confirm, all statistics reset to zero

---

### Requirement: Storage API Abstraction
The Extension SHALL provide a unified storage interface replacing localStorage with chrome.storage.local.

#### Scenario: Statistics persist in chrome.storage
- **WHEN** user performs moves and closes Extension
- **WHEN** user reopens Extension hours later
- **THEN** statistics preserved exactly as they were

#### Scenario: Storage abstraction handles async operations
- **WHEN** content script calls storage.get()
- **THEN** Promise resolves with stored data
- **AND** callback pattern also supported for backward compatibility

---

### Requirement: Assets and Visual Identity
The Extension SHALL include proper icons and branding for Chrome Web Store and toolbar display.

#### Scenario: Icons display correctly in all sizes
- **WHEN** Extension appears in toolbar
- **THEN** icon at 16x16, 48x48, 128x128 renders clearly
- **AND** matches Shopline brand colors (blue)

---

## MODIFIED Requirements
*None for Phase 1 - this is new Extension-specific capability*

---

## REMOVED Requirements
*None - UserScript version remains functional in parallel*
