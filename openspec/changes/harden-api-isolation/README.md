# Security Hardening: Isolate Extension APIs from Page Scripts

## Overview

This OpenSpec change addresses **5 critical security vulnerabilities** identified by Codex code review where page scripts can access privileged extension APIs through exposed globals.

## Change Summary

| Property | Value |
|----------|-------|
| **ID** | `harden-api-isolation` |
| **Status** | Proposal (Ready for Review) |
| **Severity** | CRITICAL - Multiple API security breaches |
| **Estimated Work** | 12-18 hours |
| **Phase Count** | 4 phases |
| **Spec Count** | 3 capabilities |
| **Task Count** | 19 tasks |

## Key Vulnerabilities Fixed

1. ✓ `window.debugCategoryManager` - Untrusted page scripts can call privileged methods
2. ✓ `window._scm_storage` - Page scripts can read/write extension storage
3. ✓ `categoryManagerReady` event - No nonce validation allows spoofing
4. ✓ Script injection CSP issues - Silent failures on strict sites
5. ✓ `window.categoryManager` - Internal state exposure

## Implementation Phases

### Phase 1: Cross-World Communication Hardening (4-6 hours)
- Implement nonce generation and validation
- Prevent event listener leaks
- Validate all initialization events

### Phase 2: Storage API Isolation (3-4 hours)
- Remove `window._scm_storage` global
- Implement secure message-passing handlers
- Replace localStorage with chrome.storage.local

### Phase 3: Extension API Protection (1-2 hours)
- Gate debug APIs behind build-time flags
- Remove internal object exposure
- Validate message handler allowlist

### Phase 4: Code Quality (2-3 hours)
- Optimize O(n²) → O(n log n) conflict detection
- Clean up event listeners
- Code review and validation

## Security Model

```
Isolated World (Secure)  ←→  Message Passing (Nonce Validated)  ←→  Main World (Untrusted)
  - chrome.* APIs              - Explicit allowlist                  - Page scripts
  - Extension storage          - Nonce validation                    - NO API access
  - Safe operations only       - Error isolation                     - NO storage access
```

## Files & Specifications

```
openspec/changes/harden-api-isolation/
├── proposal.md                    # Executive summary
├── design.md                      # Architectural decisions
├── README.md                      # This file
├── tasks.md                       # Detailed task list
└── specs/
    ├── cross-world-communication/spec.md   # CWC-001, CWC-002
    ├── storage-isolation/spec.md           # SI-001, SI-002, SI-003
    └── extension-api-protection/spec.md    # EAP-001, EAP-002, EAP-003
```

## Next Steps

1. **Code Review** - Review proposal.md and design.md for feedback
2. **Planning** - Refine timeline and resource allocation
3. **Phase 1 Implementation** - Start with nonce handshake
4. **Parallel Work** - Phases 2, 3, 4 can overlap after Phase 1
5. **Integration Testing** - Full test suite and manual QA
6. **Rollout** - Beta testing → full release

## Related Issues

- **Codex Review Report** - Full security analysis with line-by-line findings
- **Current Code**:
  - `src/content/init.js:47-57` - Unsecured event listener
  - `src/content/injected.js:320-333` - Debug API exposure
  - `src/shared/storage.js:399-536` - Global storage API
  - `src/shared/conflict-detector.js:22-78` - O(n²) complexity

## Questions & Clarifications

Before implementation, confirm:
- [ ] Timeline acceptable for security-critical changes?
- [ ] Build process supports `NODE_ENV` gating?
- [ ] CSP policy allows chrome.runtime.getURL script injection?
- [ ] Backward compatibility with existing installations acceptable?

---

**Created**: 2026-01-28
**Change ID**: harden-api-isolation
**Status**: ✅ Valid & Ready for Review
