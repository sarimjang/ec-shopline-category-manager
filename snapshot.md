# Project Snapshot: Shopline Category Manager Chrome Extension

**Updated**: 2026-01-28 22:30
**Status**: Complete (Phase 4.3)
**Commits**: 40+ features, 15+ optimizations

---

## Quick Architecture

```
Chrome Extension
├── Background (Service Worker)      ← Message routing, storage API
├── Content Script                   ← Page integration, category operations
├── Popup UI                         ← Dashboard, import/export
└── Shared Utils                     ← Storage, validation, conflict detection
```

---

## Project Structure

```
src/
├── background/service-worker.js     ← Central message dispatcher
├── content/
│   ├── content.js                  ← Main category manager logic
│   ├── init.js                     ← Content script bootstrap
│   ├── injected.js                 ← Cross-world bridge (AngularJS access)
│   ├── category-manager.js         ← Category operations
│   └── storage-client.js           ← Storage API client
├── popup/
│   ├── popup.html                  ← UI template
│   ├── popup.css                   ← Styling
│   └── popup.js                    ← Controller (stats, import/export)
├── shared/
│   ├── storage.js                  ← Storage abstraction
│   ├── conflict-detector.js        ← Conflict resolution
│   ├── import-validator.js         ← Input validation
│   ├── csv-export.js               ← CSV export utility
│   ├── logger.js                   ← Logging
│   ├── constants.js                ← Global config
│   ├── storage-schema.js           ← Schema definitions
│   ├── export-formats.js           ← Format handlers
│   ├── input-validator.js          ← Input validation
│   ├── env-config.js               ← Environment config
│   └── security/                   ← Security utilities
├── manifest.json                   ← Extension manifest (v3)
└── assets/                         ← Icons

docs/                               ← 35+ documentation files
openspec/                           ← OpenSpec change proposals (3 changes)
tests/                              ← Unit & integration tests
scripts/                            ← Build & release automation
```

---

## Core Features

### Phase 1: MVP ✓
- Service worker message routing
- Category move tracking & validation
- Storage integration with event lifecycle

### Phase 2: UI & Import/Export ✓
- Popup dashboard with statistics
- CSV/JSON import/export
- Conflict detection & merge strategies
- Cross-world communication (injected scripts)

### Phase 3: Security ✓
- Build-time manifest v3 gating
- CSP compliance
- API isolation & hardening

### Phase 4: Optimization ✓
- Move operation performance optimization
- Time-savings calculation
- Event cleanup & maintenance
- Regression testing & verification

---

## Key Modules

| Module | Purpose | Exports |
|--------|---------|---------|
| **storage.js** | Chrome storage API abstraction | get, set, remove, StorageManager |
| **conflict-detector.js** | Conflict detection & merge | detectConflicts, mergeData |
| **import-validator.js** | Data validation & schema | validateImportData |
| **csv-export.js** | CSV format conversion | arrayToCsv, createCsvSheets |
| **export-formats.js** | Multi-format export handler | createJsonExport, createCsvExport |
| **service-worker.js** | Message dispatcher | chrome.runtime.onMessage handlers |

---

## Data Model

```javascript
CategoryMove {
  id,                // Unique identifier
  shoplineId,        // Store ID
  oldCategoryId,     // Source category
  newCategoryId,     // Target category
  timestamp,         // When moved
  nonce,             // Validation token
  verified,          // Conflict status
  source            // 'manual' | 'import'
}

Storage {
  moves: Move[],               // Move history (max 500)
  searches: SearchQuery[],     // Search history (max 50)
  errors: Error[],             // Error log (max 100)
  config: UserConfig
}
```

---

## Build & Release

```bash
npm run build:dev    # Development with debug APIs
npm run build:prod   # Production with test
npm run test         # Run test suite
npm run version:bump # Semantic versioning
```

---

## Development Patterns

- **Shared utilities** in `/src/shared/`
- **Message types** in `constants.js`
- **Validation** at system boundaries
- **Custom test framework** (no external library)
- **JSDoc** for type hints

---

## Known Constraints

✗ JavaScript only (no TypeScript)
✗ Custom test framework (no Jest)
✗ Manifest v3 (latest Chrome)
✗ Content script isolation (limited cross-world access)
✗ Storage quota limits

---

## Recent Completions

✅ Move validation & time-savings calculation
✅ Event cleanup & maintenance
✅ Comprehensive error handling
✅ Security audit & hardening
✅ UI verification & regression testing
✅ Deployment readiness

---

## Entry Points

- **For users**: `/src/manifest.json` (Chrome Web Store)
- **For developers**: `/docs/` (35+ guides)
- **For contributions**: `openspec/` (change proposals)
- **For tracking**: `.beads/` (issue management)
