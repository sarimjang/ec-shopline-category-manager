# Spec: Extension API Protection

## ADDED Requirements

### Requirement: Debug APIs Build-Time Gated
**ID**: EAP-001
**Severity**: CRITICAL

Debug APIs SHALL only be exposed when `process.env.NODE_ENV === 'development'`.

#### Scenario: Development Build Includes Debug APIs
- When the extension is built with `NODE_ENV=development`
- The injected script SHALL expose `window.debugCategoryManager` with methods:
  - `moveCategory(from, to)`
  - `undo()`
  - `redo()`
  - `getState()`
- These methods SHALL be available for testing and debugging in development only

#### Scenario: Production Build Has No Debug APIs
- When the extension is built for production (default `NODE_ENV=production`)
- The expression `window.debugCategoryManager` in page context SHALL be `undefined`
- The build process SHALL completely remove all debug API code
- Bundle analysis SHALL confirm zero bytes of debug code in production

### Requirement: Internal Objects Not Exposed
**ID**: EAP-002
**Severity**: CRITICAL

Internal manager objects SHALL NOT be exposed to the page scripts via global variables.

#### Scenario: Manager Object Hidden
- The internal `categoryManager` object SHALL be kept within the closure of the injected script
- It SHALL NOT be assigned to any property of `window` or page-accessible globals
- The expression `window.categoryManager` in page context SHALL be `undefined`
- Page scripts attempting to access internal manager state SHALL fail

### Requirement: Message Handler Validation
**ID**: EAP-003
**Severity**: HIGH

All message handlers SHALL validate that requested operations are in an explicit allowlist.

#### Scenario: Only Safe Operations Allowed
- The content script SHALL maintain a whitelist of page-callable operations
- Each incoming message SHALL be checked against this whitelist
- Operations not in the whitelist SHALL be rejected with an error response
- The error response SHALL NOT expose implementation details or available operations

## Related Specs
- cross-world-communication
- storage-isolation
