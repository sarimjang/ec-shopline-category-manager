# Implementation Checklist: Chrome Extension with Export/Import (Option B)

## Phase 1: Chrome Extension MVP (12 hours)

### 1. Project Structure & Setup (2 hours)
- [ ] 1.1 Create directory structure (`src/background`, `src/content`, `src/popup`, `src/shared`)
- [ ] 1.2 Create `manifest.json` with MV3 configuration
- [ ] 1.3 Set up basic icons and assets
- [ ] 1.4 Create `src/shared/constants.js` with configuration
- [ ] 1.5 Validate manifest with `openspec validate`

### 2. Content Script Migration (4 hours)
- [ ] 2.1 Extract `CategoryManager` class to `src/content/category-manager.js`
- [ ] 2.2 Create `src/content/angular-bridge.js` for AngularJS access
- [ ] 2.3 Create `src/content/injected.js` for cross-world communication
- [ ] 2.4 Create main `src/content/content.js` entry point
- [ ] 2.5 Replace `localStorage` with chrome.storage.local calls
- [ ] 2.6 Verify all DOM manipulation works in content script sandbox

### 3. Storage Layer (1.5 hours)
- [ ] 3.1 Create `src/shared/storage.js` abstraction layer
- [ ] 3.2 Implement chrome.storage.local methods (get, set, clear)
- [ ] 3.3 Migrate TimeSavingsTracker to use new storage API
- [ ] 3.4 Verify data persists across sessions

### 4. Popup UI (3 hours)
- [ ] 4.1 Create `src/popup/popup.html` with statistics layout
- [ ] 4.2 Create `src/popup/popup.css` with styling
- [ ] 4.3 Create `src/popup/popup.js` logic for displaying stats
- [ ] 4.4 Implement real-time updates from chrome.storage
- [ ] 4.5 Add buttons: Reset Stats, Open Options
- [ ] 4.6 Test popup opening and displaying data correctly

### 5. Service Worker (1.5 hours)
- [ ] 5.1 Create `src/background/service-worker.js`
- [ ] 5.2 Handle extension installation and updates
- [ ] 5.3 Listen for storage changes and sync stats
- [ ] 5.4 (Optional for Phase 1) Prepare for notifications

### 6. Testing & Packaging (2 hours)
- [ ] 6.1 Test as unpacked extension in Chrome
- [ ] 6.2 Verify all operations work identically to UserScript
- [ ] 6.3 Test persistence across reload and restart
- [ ] 6.4 Create basic test checklist
- [ ] 6.5 Generate extension zip for distribution

---

## Phase 2: Export/Import & Data Portability (6 hours)

### 7. Export Functionality (2 hours)
- [ ] 7.1 Create `src/shared/export.js` with export logic
- [ ] 7.2 Implement JSON export (tree structure)
- [ ] 7.3 Implement CSV export (flat list)
- [ ] 7.4 Create `src/popup/export-tab.html` UI
- [ ] 7.5 Add download button to popup
- [ ] 7.6 Test export output format and completeness

### 8. Validation Layer (2 hours)
- [ ] 8.1 Create `src/shared/import-validator.js`
- [ ] 8.2 Implement layer limit validation (3-level max)
- [ ] 8.3 Detect circular dependencies
- [ ] 8.4 Detect orphaned categories (parent not found)
- [ ] 8.5 Create validation report UI
- [ ] 8.6 Test against known conflict scenarios

### 9. Import Preview UI (1.5 hours)
- [ ] 9.1 Create `src/popup/import-tab.html` with file upload
- [ ] 9.2 Implement file parsing (JSON/CSV detection)
- [ ] 9.3 Show validation results with color coding
- [ ] 9.4 Display operation queue preview (source → target)
- [ ] 9.5 Add confirm/cancel buttons
- [ ] 9.6 Test with sample export files

### 10. Import Execution (0.5 hours)
- [ ] 10.1 Integrate with existing moveCategory() via manual triggering
- [ ] 10.2 Show individual operation status as user selects
- [ ] 10.3 Error handling for API failures
- [ ] 10.4 Document user-driven workflow

---

## Quality Assurance (2 hours)

### 11. Integration Testing
- [ ] 11.1 End-to-end: Move → Export → Validate → Manual import
- [ ] 11.2 Edge cases: Empty categories, deep nesting, name conflicts
- [ ] 11.3 Cross-browser compatibility check (Chrome vs Edge)
- [ ] 11.4 Performance with 50+ categories

### 12. Documentation & Release
- [ ] 12.1 Update README.md with Extension installation instructions
- [ ] 12.2 Create EXPORT_IMPORT_GUIDE.md for users
- [ ] 12.3 Update CHANGELOG.md with Phase 1 & 2 notes
- [ ] 12.4 Prepare for unpacked distribution
- [ ] 12.5 Archive this change with openspec

---

## Notes

- **Phase 1 Priority** - Ensure feature parity with UserScript before adding new features
- **Testing** - Recommend manual testing on actual Shopline admin dashboard
- **Rollback** - Keep UserScript version functional during transition
- **Metrics** - Track time per phase to refine Phase 3 estimates
