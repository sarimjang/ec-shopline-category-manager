# Spec: Storage Isolation

## ADDED Requirements

### Requirement: Storage Message Handlers
**ID**: SI-001
**Severity**: CRITICAL

The content script SHALL register message handlers that restrict storage access to an explicit allowlist of safe operations.

#### Scenario: Safe Operations via Message Handler
- The content script SHALL register a `chrome.runtime.onMessage` handler
- The handler SHALL permit only these operations:
  - `storage:getCategoryMoveStats` - read-only statistics retrieval
  - `storage:getImportHistory` - read-only history retrieval
  - `storage:recordCategoryMove` - record operation with validation
  - `storage:getImportPreview` - compute preview without side effects
- Any other requested operation SHALL be rejected with an error response

#### Scenario: Unsafe Operations Blocked
- If a message requests an operation not in the allowlist
- OR attempts operations like arbitrary `storage:set` or `storage:get`
- THEN the handler SHALL reject the request with error status
- The error response SHALL NOT expose internal storage structure or keys

### Requirement: Global Storage API Removed
**ID**: SI-002
**Severity**: CRITICAL

The global `window._scm_storage` object SHALL be removed from page-accessible scope.

#### Scenario: Storage Not Accessible from Page
- The expression `window._scm_storage` in page context SHALL return `undefined`
- Attempts to call `window._scm_storage.get()` or `.set()` SHALL fail
- The storage API SHALL only be accessible within the content script (isolated world)

### Requirement: localStorage Completely Removed
**ID**: SI-003
**Severity**: HIGH

All usage of `localStorage` API SHALL be replaced with `chrome.storage.local`.

#### Scenario: No Page-Readable Storage Fallback
- The codebase SHALL contain zero references to `localStorage.getItem()`, `localStorage.setItem()`, or `localStorage.removeItem()`
- All persistent data storage SHALL use exclusively `chrome.storage.local`
- Storage errors SHALL be handled gracefully without falling back to page-readable storage
- A grep search for "localStorage" SHALL return no matches in the `src/` directory

## Related Specs
- cross-world-communication
- extension-api-protection
