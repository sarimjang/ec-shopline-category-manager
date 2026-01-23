# Technical Design: Chrome Extension Migration with Export/Import

## Context

### Current State
- **UserScript** using Tampermonkey with @grant directives
- **Architecture** - Single file (2,700+ lines) with monolithic CategoryManager class
- **Storage** - localStorage per domain (single shop only)
- **API** - Shopline PUT /api/admin/v1/{shopId}/categories/{categoryId}/ordering

### Constraints
- Shopline API accepts one category move per request (no batch endpoint)
- 200-2000ms response time per API call
- Speed rate limits unknown (conservative: 200ms between requests)
- AngularJS integration via unsafeWindow.angular (Tampermonkey sandbox workaround)

### Stakeholders
- **Users** - Shopline store administrators managing categories
- **Developers** - Maintenance and feature development
- **Ecosystem** - Chrome Web Store distribution

---

## Goals & Non-Goals

### Goals
1. **Feature Parity** - Extension behaves identically to UserScript
2. **Data Portability** - Users can backup/restore category structures
3. **Maintainability** - Cleaner architecture than monolithic file
4. **Future Growth** - Foundation for batch operations, notifications, multi-store support
5. **Installation UX** - Reduce friction (one-click vs TM + script)

### Non-Goals
- ❌ Implement batch API (Shopline limitation)
- ❌ Auto-sync across stores (Phase 3 or later)
- ❌ Cloud backup (local-only data)
- ❌ Real-time collaboration (single-user context)

---

## Architectural Decisions

### 1. Manifest V3 (vs V2)

**Decision**: Use MV3 for new feature support and longevity

**Rationale**
- MV3 is Chrome's current standard; V2 deprecated since 2022
- Required for SidePanel, Service Workers, best APIs
- Better security model

**Alternatives Considered**
- MV2: Shorter-term but faces deprecation by 2024

**Risks**
- Slightly more boilerplate
- Service Worker lifecycle learning curve

---

### 2. Storage Strategy

**Decision**: Use chrome.storage.local (no cloud sync)

**Structure**
```javascript
{
  "categoryMoveStats": {
    "totalMoves": 42,
    "totalTimeSaved": 256.4,
    "lastReset": "2026-01-20T10:30:00Z"
  },
  "exportHistory": [
    { "date": "2026-01-20", "filename": "categories_2026-01-20.json" }
  ]
}
```

**Rationale**
- Per-browser storage suffices (user works on single machine)
- No security exposure (local only)
- Synchronous reads (fast UI updates)
- chrome.storage.onChanged enables reactive updates

**Alternatives Considered**
- Cloud Storage (Google Drive): Adds complexity, privacy concerns
- IndexedDB: Overkill for small data (~10KB)

---

### 3. AngularJS Access Pattern

**Decision**: Use injected script + CustomEvent bridge

**Pattern**
```javascript
// content.js
const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/content/injected.js');
document.documentElement.appendChild(script);

// Communicate via window event
window.addEventListener('categoryMoved', (e) => {
  chrome.runtime.sendMessage({ type: 'CATEGORY_MOVED', data: e.detail });
});
```

**Rationale**
- Cleanest way to access `window.angular` across content-script boundary
- Tampermonkey used unsafeWindow; Extension uses world: "MAIN"
- Minimal security risk (trusted injected code)

**Alternatives Considered**
- MAIN world in manifest: Simpler but harder to debug
- Inline script injection: More fragile

---

### 4. Export Format: JSON + CSV

**Decision**: Dual format (JSON for data integrity, CSV for user edits)

**JSON Structure**
```json
{
  "version": "1.0",
  "exportDate": "2026-01-20T10:30:00Z",
  "shopId": "shopline_12345",
  "categories": [
    {
      "id": "cat_123",
      "name": "Women's",
      "level": 1,
      "parentId": null,
      "children": [...]
    }
  ]
}
```

**CSV Structure**
```
categoryId,name,parentId,level
cat_123,Women's,,1
cat_456,Tops,cat_123,2
```

**Rationale**
- JSON preserves tree structure and metadata
- CSV enables Excel/Sheets editing by non-technical users
- Both formats validated on import

**Alternatives Considered**
- XML: Too verbose
- YAML: Tool incompatibility

---

### 5. Validation Strategy

**Decision**: Multi-layer validation before user confirmation

**Layers**
1. **File Format** - JSON parse, required fields
2. **Layer Limits** - Max 3 levels per Shopline spec
3. **Graph Validity** - No cycles, no orphaned parents
4. **Conflict Detection** - Duplicate IDs, missing categories

**Execution Model**
- User uploads file
- System validates and shows report
- User manually reviews and confirms
- User manually triggers each move (no auto-execution)

**Rationale**
- Reduces risk of destructive operations
- Users learn structure through review process
- Can iterate with external editors (Sheets, JSON tools)

**Alternatives Considered**
- Auto-execute on upload: Risky, no way to undo
- Silent validation: Users won't see what's happening

---

### 6. Queue Management Foundation (Future)

**Design for Phase 3** (batch operations)

```javascript
class BatchQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.requestDelayMs = 200; // Conservative rate limit
    this.maxRetries = 3;
  }

  async executeQueue() {
    // One-by-one execution with delays
  }
}
```

**Current (Phase 2)** - Manual execution, same queuing available but not automated

---

## Key Decisions

### Decision: No Multi-Store Sync (Phase 1)
- Each Extension instance serves one Chrome profile
- Stats stored locally; no cloud sync
- Phase 3 can add: chrome.storage.sync for profile-level persistence

### Decision: Conservative API Rate Limiting
- 200ms between requests (vs unknown actual limit)
- Prevents API rejection and improves UX
- Can be tuned based on real-world data

### Decision: Validation > Auto-Import
- Show conflicts before executing
- User manually confirms sequence
- Reduces data loss risk

---

## Migration Path

### Phase 1 → Phase 2 Compatibility
- CategoryManager class: No changes to core logic
- Storage: Wrapper abstraction (chrome.storage.local)
- UI: Incremental additions (new tabs, no breaking changes)

### UserScript Parallel
- Keep UserScript functional during transition
- Both can coexist (Extension + TM)
- Users choose which to use

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| AngularJS access fails in future Shopline update | 🔴 Critical | Monitor Shopline releases; provide fallback |
| Unknown API rate limits cause rejections | 🟡 Medium | Conservative 200ms delays; user retries |
| Export validation misses edge cases | 🟡 Medium | Manual review step; detailed error messages |
| chrome.storage quota exceeded | 🟢 Low | Max ~100 exports = ~1MB; well within quota |
| Service Worker terminated during import | 🟡 Medium | State saved to storage; can resume on reload |

---

## Performance Characteristics

### Phase 1 (MVP)
- UI Load: <500ms (popup appears instantly)
- Category Move: 200-2000ms (unchanged from UserScript)
- Stats Display: <100ms (cached from storage)

### Phase 2 (Export/Import)
- Export Generation: <100ms (in-memory)
- Large Export (100+ categories): <500ms
- Validation: <200ms
- File Upload Parse: <100ms

### Scaling Assumptions
- Single store with <500 categories
- <50 concurrent moves per session
- Extensions persist for days/weeks between reloads

---

## Testing Strategy

### Unit Tests (Minimum)
```javascript
// src/shared/__tests__/export.test.js
- Export as JSON maintains tree structure
- Export as CSV flattens correctly
- Import validator detects layer violations
```

### Integration Tests
```javascript
// Manual in actual Shopline admin
- Move category in Extension
- Export structure
- Modify in external editor
- Import with validation
- Verify moves executed correctly
```

### Edge Cases
- Empty categories
- Deeply nested (3 levels)
- Duplicate names
- Circular parent references

---

## Success Metrics

### Phase 1
- [ ] Extension loads on all category pages
- [ ] All moves work identically to UserScript
- [ ] Stats persist after reload
- [ ] Install rate via Web Store (vs UserScript)

### Phase 2
- [ ] Export file valid JSON/CSV
- [ ] Validator catches 100% of known conflict types
- [ ] User successfully imports exported backup

---

## Open Questions

1. **Shopline Future Changes** - How stable is the AngularJS interface?
   - Monitor: Shopline release notes, community forums
   - Fallback: Maintain UserScript version

2. **Rate Limiting** - What's the actual limit?
   - Experiment: Start with 200ms, reduce if stable
   - Telemetry: Log API response times

3. **User Demand for Batch** - Will Phase 3 happen?
   - Gauge: Gather feedback during Phase 1-2 testing
   - Decision: Q2 2026 roadmap

---

## Migration Timeline

```
Week 1 (Phase 1 Core)
├─ Days 1-2: Manifest, project setup, Angular bridge
├─ Days 3-4: CategoryManager adaptation, content script
└─ Day 5: Storage layer, basic popup

Week 2 (Phase 1 Testing + Phase 2 Export)
├─ Days 1-2: Popup refinement, service worker, integration testing
├─ Days 3-4: Export logic, validation layer
└─ Day 5: Import UI, documentation

Post-Launch (Parallel UserScript)
├─ Bug fixes and user feedback
├─ Monitor compatibility with Shopline updates
└─ Plan Phase 3 (batch operations)
```

---

## Dependencies & Resources

### External
- **Chrome Web Store** - Distribution
- **Shopline Admin Dashboard** - Target environment
- **AngularJS** (existing page) - No new dependency

### Internal
- `EXTENSION_ARCHITECTURE.md` - Component design
- `BATCH_OPERATIONS_ANALYSIS.md` - API constraints

### Development Tools
- Chrome DevTools (Extension debugging)
- Manifest V3 validation
- OpenSpec validation
