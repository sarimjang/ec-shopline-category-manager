# Change: Chrome Extension with Export/Import (Option B)

## Why

Currently, the Shopline Category Manager exists as a Tampermonkey UserScript with the following limitations:

1. **Installation Friction** - Users must install Tampermonkey first, then manually add the script
2. **Limited API Access** - Constrained to `GM_*` APIs with no background service capabilities
3. **No Data Portability** - Category structures cannot be exported/backed up or compared across instances
4. **Single Function** - Can only move categories one at a time without batch/queue management

Migrating to Chrome Extension enables:
- One-click installation from Chrome Web Store
- Full Chrome API access (storage, notifications, service workers)
- Export/import infrastructure for data portability and backup
- Foundation for future batch operations without API bottlenecks

## What Changes

### Phase 1: Chrome Extension MVP (12 hours)
- **Migrate Content Script** - Adapt existing CategoryManager logic to Extension content scripts
- **Storage API** - Replace localStorage with chrome.storage.local
- **Popup UI** - Basic statistics panel in action button
- **Angular Bridge** - Maintain AngularJS integration via injected script

### Phase 2: Export/Import Functionality (6 hours)
- **Export as JSON/CSV** - Serialize current category tree structure
- **Import Validation** - Detect conflicts, layer violations, circular dependencies
- **Preview Interface** - Show proposed changes before execution
- **User-Driven Execution** - User manually triggers operations after reviewing import plan

## Impact

### Affected Capabilities
- `extension-core` - New Chrome Extension architecture
- `category-operations` - Enhanced with queue management foundation
- `data-export-import` - New data portability layer

### Affected Code
- `src/shopline-category-manager.prod.user.js` → `src/content/content.js` (adapted)
- `src/` → `src/background/service-worker.js` (new)
- `src/` → `src/popup/popup.js` (new)
- `src/` → `src/shared/storage.js` (new)

### Breaking Changes
- ❌ No breaking changes to end-user behavior
- ✅ Maintenance: Requires separate build pipeline for Extension vs UserScript
- ✅ Deprecation: UserScript version continues in parallel during transition

## Success Criteria

1. **Phase 1 Complete**
   - ✅ All existing category move operations work identically in Extension
   - ✅ Storage persists across sessions with chrome.storage
   - ✅ Popup displays time-saved statistics
   - ✅ Can be loaded as unpacked Extension in Chrome

2. **Phase 2 Complete**
   - ✅ Export generates valid JSON matching specification
   - ✅ Import validator detects all conflict types (layer, circular, orphaned)
   - ✅ Validation results shown before manual execution
   - ✅ User can trigger moves from import plan

## Timeline

- **Week 1** - Phase 1 core implementation
- **Week 2** - Phase 1 testing + Phase 2 export/validation
- **Parallel** - UserScript version maintained for backward compatibility

## Related Documents

- `EXTENSION_ARCHITECTURE.md` - Detailed architecture and component design
- `BATCH_OPERATIONS_ANALYSIS.md` - API limitations and export/import design
