# OpenSpec Change: add-chrome-extension-export-import

## Overview
Migrate Shopline Category Manager from Tampermonkey UserScript to Chrome Extension (MV3) with export/import capabilities.

## Status
📋 **PROPOSAL** - Ready for review and approval before implementation

## Structure

```
add-chrome-extension-export-import/
├── proposal.md          # Why, what, impact
├── tasks.md             # Implementation checklist (18 items)
├── design.md            # Technical decisions and architecture
└── specs/               # Capability specifications
    ├── extension-core/spec.md         (6 ADDED requirements)
    ├── category-operations/spec.md    (4 ADDED + 1 MODIFIED)
    └── data-export-import/spec.md     (9 ADDED requirements)
```

## Key Information

### Scope
**Phase 1 (12 hours)**: Chrome Extension MVP with feature parity
**Phase 2 (6 hours)**: Export/Import with validation

### Deliverables
- `manifest.json` - MV3 configuration
- `src/background/service-worker.js` - Background service
- `src/content/content.js` - Content script (adapted from UserScript)
- `src/popup/popup.html|js|css` - Popup UI
- `src/shared/storage.js` - Storage abstraction
- `src/shared/export.js` - Export logic
- `src/shared/import-validator.js` - Validation layer

### Total Effort
**18 hours** (MVP + export/import)

### Risks & Mitigations
- AngularJS access: Use injected script bridge (same as Tampermonkey unsafeWindow)
- API rate limits: Conservative 200ms between requests
- Data loss: Manual review before import execution

## Approval Checklist

Before implementation, verify:
- [ ] Phase 1 MVP scope is acceptable (12 hours)
- [ ] Phase 2 export/import (6 hours) is worth the investment
- [ ] Manual execution workflow (vs auto-import) is acceptable
- [ ] Parallel UserScript maintenance is feasible
- [ ] Architecture decisions (JSON+CSV, no cloud sync) are approved

## Next Steps

1. **Review** - Read proposal.md and design.md
2. **Decide** - Approve Phase 1+2 or adjust scope
3. **Implement** - Follow tasks.md sequentially
4. **Test** - Use manual Shopline admin dashboard
5. **Archive** - After launch, move to archive/ folder

## Related Documents

- `../../EXTENSION_ARCHITECTURE.md` - Detailed architecture
- `../../BATCH_OPERATIONS_ANALYSIS.md` - API analysis and design rationale

## Validation
✅ Passes `openspec validate --strict --no-interactive`
- All spec files have proper delta operations
- Every requirement includes at least one scenario
- No structure errors or missing sections
